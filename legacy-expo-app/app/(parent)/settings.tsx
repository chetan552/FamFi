import EmojiPicker from "@/components/ui/EmojiPicker";
import ScreenContainer from "@/components/ui/ScreenContainer";
import { useSnackbar } from "@/components/ui/SnackbarProvider";
import { spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useFamilyStore } from "@/store/familyStore";
import { ThemeMode, useSettingsStore } from "@/store/settingsStore";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
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

type ConfirmAction = {
  title: string;
  message: string;
  actionLabel: string;
  run: () => Promise<{ error: string | null }>;
  successMessage?: string;
  destructive?: boolean;
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode, defaultChoreAmount, setDefaultChoreAmount } = useSettingsStore();
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
    clearCompletedChores,
    clearAllChores,
    clearTransactionHistory,
    resetInterestSettings,
    fetchFamily,
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

  // Password change modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [defaultAmountModalVisible, setDefaultAmountModalVisible] = useState(false);
  const [defaultAmountDraft, setDefaultAmountDraft] = useState(defaultChoreAmount.toFixed(2));
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  React.useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      showError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("New passwords do not match.");
      return;
    }
    const { error } = await useAuthStore.getState().updatePassword(currentPassword, newPassword);
    if (error) {
      showError(error);
    } else {
      showSuccess("Password updated successfully!");
      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

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
    setConfirmAction({
      title: "Regenerate Invite Code",
      message: "The old code will stop working. Are you sure?",
      actionLabel: "Regenerate",
      run: regenerateInviteCode,
      successMessage: "Invite code regenerated!",
      destructive: true,
    });
  };

  const handleSaveDefaultAmount = () => {
    const amount = Number(defaultAmountDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      showError("Please enter a valid amount.");
      return;
    }
    setDefaultChoreAmount(amount);
    setDefaultAmountModalVisible(false);
    showSuccess("Default chore reward updated.");
  };

  const confirmAndRun = (
    title: string,
    message: string,
    actionLabel: string,
    run: () => Promise<{ error: string | null }>,
    successMessage: string,
    destructive = true,
  ) => {
    setConfirmAction({ title, message, actionLabel, run, successMessage, destructive });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const action = confirmAction;
    const { error } = await action.run();
    if (error) {
      showError(error);
    } else if (action.successMessage) {
      showSuccess(action.successMessage);
    }
    setConfirmAction(null);
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

      {/* Data Management */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Data Management
        </Text>
        <Card mode="outlined">
          <List.Item
            title="Default Chore Reward"
            description={`$${defaultChoreAmount.toFixed(2)} — pre-filled when creating chores`}
            left={(props) => <List.Icon {...props} icon="currency-usd" />}
            onPress={() => {
              setDefaultAmountDraft(defaultChoreAmount.toFixed(2));
              setDefaultAmountModalVisible(true);
            }}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <List.Item
            title="Clear Completed Chores"
            description="Remove all done and approved chores"
            titleStyle={{ color: "#F57C00" }}
            left={(props) => <List.Icon {...props} icon="check-circle-outline" color="#F57C00" />}
            onPress={() =>
              confirmAndRun(
                "Clear Completed Chores",
                "This will permanently delete all chores marked as done or approved. Assigned chores will not be affected.",
                "Clear",
                clearCompletedChores,
                "Completed chores cleared.",
              )
            }
          />
          <List.Item
            title="Clear All Chores"
            description="Remove every chore for all children"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="playlist-remove" color={theme.colors.error} />}
            onPress={() =>
              confirmAndRun(
                "Clear All Chores",
                "This will permanently delete all chores for every child. This cannot be undone.",
                "Delete All",
                clearAllChores,
                "All chores cleared.",
              )
            }
          />
          <List.Item
            title="Clear Transaction History"
            description="Deletes all transactions and resets balances to $0"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="receipt-text-remove-outline" color={theme.colors.error} />}
            onPress={() =>
              confirmAndRun(
                "Clear Transaction History",
                "This will permanently delete all transactions and reset every bucket balance to $0. This cannot be undone.",
                "Delete All",
                clearTransactionHistory,
                "Transaction history cleared and balances reset.",
              )
            }
          />
          <List.Item
            title="Reset Interest Settings"
            description="Remove all interest and match rates"
            titleStyle={{ color: "#F57C00" }}
            left={(props) => <List.Icon {...props} icon="percent" color="#F57C00" />}
            onPress={() =>
              confirmAndRun(
                "Reset Interest Settings",
                "This will delete all interest and parent-match settings for every savings bucket.",
                "Reset",
                resetInterestSettings,
                "Interest settings reset.",
              )
            }
          />
        </Card>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Account
        </Text>
        <Card mode="outlined">
          <List.Item
            title="Change Password"
            left={(props) => (
              <List.Icon {...props} icon="lock-reset" color={theme.colors.onSurface} />
            )}
            onPress={() => setPasswordModalVisible(true)}
          />
          <List.Item
            title="Sign Out"
            left={(props) => (
              <List.Icon {...props} icon="logout" color={theme.colors.onSurface} />
            )}
            onPress={signOut}
          />
          <List.Item
            title="Delete Account"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => (
              <List.Icon {...props} icon="delete" color={theme.colors.error} />
            )}
            onPress={() =>
              confirmAndRun(
                "Delete Account",
                "Are you absolutely sure? This will instantly delete your family, all members, and all data. This action cannot be undone.",
                "Delete My Account",
                () => useAuthStore.getState().deleteAccount(),
                "",
              )
            }
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

      {/* Legal */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Legal
        </Text>
        <Card mode="outlined">
          <List.Item
            title="Terms of Service"
            left={(props) => <List.Icon {...props} icon="file-document-outline" />}
            onPress={() => {
              import('expo-web-browser').then(wb => wb.openBrowserAsync('https://famfibank.app/terms'));
            }}
            right={(props) => <List.Icon {...props} icon="open-in-new" />}
          />
          <List.Item
            title="Privacy Policy"
            left={(props) => <List.Icon {...props} icon="shield-check-outline" />}
            onPress={() => {
              import('expo-web-browser').then(wb => wb.openBrowserAsync('https://famfibank.app/privacy'));
            }}
            right={(props) => <List.Icon {...props} icon="open-in-new" />}
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

      {/* Password Change Modal */}
      <Portal>
        <Modal
          visible={passwordModalVisible}
          onDismiss={() => {
            setPasswordModalVisible(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }}
          contentContainerStyle={[
            styles.modal,
            { 
              backgroundColor: theme.colors.surface,
              maxWidth: 400,
              width: "100%",
              alignSelf: "center",
            },
          ]}
        >
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", marginBottom: spacing.md }}
          >
            Change Password
          </Text>
          <TextInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            mode="outlined"
            secureTextEntry
            left={<TextInput.Icon icon="lock-outline" />}
            style={{ marginBottom: spacing.md }}
            textColor={theme.colors.onSurface}
          />
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            mode="outlined"
            secureTextEntry
            left={<TextInput.Icon icon="lock" />}
            style={{ marginBottom: spacing.md }}
            textColor={theme.colors.onSurface}
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            left={<TextInput.Icon icon="lock-check" />}
            style={{ marginBottom: spacing.md }}
            textColor={theme.colors.onSurface}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => {
              setPasswordModalVisible(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleUpdatePassword}
              loading={authLoading}
            >
              Update
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Default Chore Reward Modal */}
      <Portal>
        <Modal
          visible={defaultAmountModalVisible}
          onDismiss={() => setDefaultAmountModalVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", marginBottom: spacing.md }}
          >
            Default Chore Reward
          </Text>
          <TextInput
            label="Amount"
            value={defaultAmountDraft}
            onChangeText={setDefaultAmountDraft}
            mode="outlined"
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon="currency-usd" />}
            textColor={theme.colors.onSurface}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setDefaultAmountModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveDefaultAmount}>Save</Button>
          </View>
        </Modal>
      </Portal>

      {/* Confirm Action Modal */}
      <Portal>
        <Modal
          visible={!!confirmAction}
          onDismiss={() => setConfirmAction(null)}
          contentContainerStyle={[
            styles.modal,
            {
              backgroundColor: theme.colors.surface,
              maxWidth: 460,
              width: "100%",
              alignSelf: "center",
            },
          ]}
        >
          <Text
            variant="titleLarge"
            style={{ fontWeight: "800", marginBottom: spacing.sm }}
          >
            {confirmAction?.title}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {confirmAction?.message}
          </Text>
          <View style={styles.modalActions}>
            <Button onPress={() => setConfirmAction(null)} disabled={familyLoading || authLoading}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmAction}
              loading={familyLoading || authLoading}
              disabled={familyLoading || authLoading}
              buttonColor={confirmAction?.destructive ? theme.colors.error : undefined}
              textColor={confirmAction?.destructive ? theme.colors.onError : undefined}
            >
              {confirmAction?.actionLabel}
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
