import EmojiPicker from "@/components/ui/EmojiPicker";
import ScreenContainer from "@/components/ui/ScreenContainer";
import { useSnackbar } from "@/components/ui/SnackbarProvider";
import { spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useFamilyStore } from "@/store/familyStore";
import { ThemeMode, useSettingsStore } from "@/store/settingsStore";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  IconButton,
  List,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export default function SettingsScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useSettingsStore();
  const {
    profile,
    signOut,
    updateProfile,
    loading: authLoading,
  } = useAuthStore();
  const {
    family,
    updateFamily,
    regenerateInviteCode,
    googleConnected,
    loading: familyLoading,
  } = useFamilyStore();
  const { showSuccess, showError } = useSnackbar();

  // Profile edit modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editEmoji, setEditEmoji] = useState(profile?.avatar_emoji ?? "😊");

  // Family rename modal
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [editFamilyName, setEditFamilyName] = useState(family?.name ?? "");

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    const { error } = await updateProfile(editName.trim(), editEmoji);
    if (error) showError(error);
    else {
      showSuccess("Profile updated!");
      setProfileModalVisible(false);
    }
  };

  const handleSaveFamily = async () => {
    if (!editFamilyName.trim()) return;
    const { error } = await updateFamily(editFamilyName.trim());
    if (error) showError(error);
    else {
      showSuccess("Family name updated!");
      setFamilyModalVisible(false);
    }
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      "Regenerate Invite Code",
      "The old code will stop working. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            const { error } = await regenerateInviteCode();
            if (error) showError(error);
            else showSuccess("Invite code regenerated!");
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: "700" }}>
          Settings
        </Text>
      </View>

      {/* Profile */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          My Profile
        </Text>
        <Card mode="elevated">
          <Card.Content style={styles.profileRow}>
            <Text style={styles.profileEmoji}>{profile?.avatar_emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>
                {profile?.name}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Parent
              </Text>
            </View>
            <IconButton
              icon="pencil"
              mode="contained-tonal"
              size={20}
              onPress={() => {
                setEditName(profile?.name ?? "");
                setEditEmoji(profile?.avatar_emoji ?? "😊");
                setProfileModalVisible(true);
              }}
            />
          </Card.Content>
        </Card>
      </View>

      {/* Appearance */}
      <Card mode="elevated" style={styles.card}>
        <Card.Title title="Appearance" subtitle="Customize how FamFi looks" />
        <Card.Content>
          <SegmentedButtons
            value={themeMode}
            onValueChange={(value) => setThemeMode(value as ThemeMode)}
            buttons={[
              { value: "light", label: "Light", icon: "weather-sunny" },
              { value: "dark", label: "Dark", icon: "weather-night" },
              { value: "system", label: "System", icon: "theme-light-dark" },
            ]}
          />
        </Card.Content>
      </Card>

      {/* Family */}
      {family && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Family
          </Text>
          <Card mode="outlined">
            <Card.Content style={styles.familyCardContent}>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: "700" }}>
                  {family.name}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Members can join with your code
                </Text>
              </View>
              <View style={styles.inviteContainer}>
                <Text
                  variant="headlineSmall"
                  style={[styles.inviteText, { color: theme.colors.primary }]}
                >
                  {family.invite_code}
                </Text>
              </View>
            </Card.Content>
            <Card.Actions>
              <Button
                onPress={() => {
                  setEditFamilyName(family.name);
                  setFamilyModalVisible(true);
                }}
                icon="pencil"
              >
                Rename
              </Button>
              <Button
                onPress={handleRegenerateCode}
                icon="refresh"
                textColor={theme.colors.background}
              >
                New Code
              </Button>
            </Card.Actions>
          </Card>

          <List.Item
            title="Google Tasks Integration"
            description={
              googleConnected ? "Connected ✓" : "Sync chore lists from Google"
            }
            left={(props) => (
              <List.Icon
                {...props}
                icon="google"
                color={googleConnected ? theme.colors.primary : undefined}
              />
            )}
            onPress={() => router.push("/(parent)/google-tasks")}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      {/* Account */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Account
        </Text>
        <Card mode="outlined">
          <List.Item
            title="Sign Out"
            left={(props) => (
              <List.Icon {...props} icon="logout" color={theme.colors.error} />
            )}
            onPress={signOut}
          />
        </Card>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          About
        </Text>
        <Card mode="outlined">
          <List.Item
            title="Version"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
        </Card>
      </View>

      {/* Profile Edit Modal */}
      <Portal>
        <Modal
          visible={profileModalVisible}
          onDismiss={() => setProfileModalVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", marginBottom: spacing.md }}
          >
            Edit Profile
          </Text>
          <TextInput
            label="Your Name"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            style={{ marginBottom: spacing.md }}
            textColor={theme.colors.onSurface}
          />
          <Text variant="titleSmall" style={{ marginBottom: spacing.sm }}>
            Pick an Avatar
          </Text>
          <EmojiPicker selected={editEmoji} onSelect={setEditEmoji} />
          <View style={styles.modalActions}>
            <Button onPress={() => setProfileModalVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={authLoading}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Family Rename Modal */}
      <Portal>
        <Modal
          visible={familyModalVisible}
          onDismiss={() => setFamilyModalVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", marginBottom: spacing.md }}
          >
            Rename Family
          </Text>
          <TextInput
            label="Family Name"
            value={editFamilyName}
            onChangeText={setEditFamilyName}
            mode="outlined"
            left={<TextInput.Icon icon="home" />}
            textColor={theme.colors.onSurface}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setFamilyModalVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSaveFamily}
              loading={familyLoading}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileEmoji: { fontSize: 40 },
  familyCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  inviteContainer: {
    backgroundColor: "rgba(43, 158, 179, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  inviteText: { fontWeight: "800", letterSpacing: 2 },
  modal: { margin: spacing.lg, padding: spacing.lg, borderRadius: 16 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
