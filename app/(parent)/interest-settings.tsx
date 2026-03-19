import ScreenContainer from "@/components/ui/ScreenContainer";
import { useSnackbar } from "@/components/ui/SnackbarProvider";
import { spacing } from "@/constants/theme";
import { useFamilyStore } from "@/store/familyStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

export default function InterestSettingsScreen() {
  const theme = useTheme();
  const { showSuccess, showError } = useSnackbar();
  const {
    bucketTemplates,
    interestSettings,
    fetchInterestSettings,
    fetchBucketTemplates,
    saveInterestSetting,
    processInterest,
    loading,
  } = useFamilyStore();

  // Local state: { [templateId]: { rate: string, match: boolean } }
  const [settings, setSettings] = useState<
    Record<string, { rate: string; match: boolean }>
  >({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBucketTemplates();
    fetchInterestSettings();
  }, []);

  // Sync from store to local state
  useEffect(() => {
    const initial: Record<string, { rate: string; match: boolean }> = {};
    bucketTemplates.forEach((bt) => {
      const existing = interestSettings.find((s) => s.template_id === bt.id);
      initial[bt.id] = {
        rate: existing ? existing.rate_percent.toString() : "0",
        match: existing ? existing.match_enabled : false,
      };
    });
    setSettings(initial);
  }, [bucketTemplates.length, interestSettings.length]);

  const handleSaveAll = async () => {
    let hasError = false;
    for (const [templateId, s] of Object.entries(settings)) {
      const rate = parseFloat(s.rate) || 0;
      const { error } = await saveInterestSetting(templateId, rate, s.match);
      if (error) {
        hasError = true;
      }
    }
    if (hasError) {
      showError("Some settings could not be saved.");
    } else {
      showSuccess("Interest settings saved!");
    }
  };

  const handleProcessInterest = async () => {
    setProcessing(true);
    const { error, processed } = await processInterest();
    setProcessing(false);
    if (error) {
      showError(`Error: ${error}`);
    } else if (processed === 0) {
      showError("No qualifying balances to process interest on.");
    } else {
      showSuccess(`Interest processed for ${processed} bucket(s)! 🎉`);
    }
  };

  return (
    <ScreenContainer scrollable>
      {/* <Stack.Screen options={{ title: 'Interest & Matching', headerShown: true }} /> */}

      <View style={styles.header}>
        <MaterialCommunityIcons name="percent" size={32} color="#7C4DFF" />
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Interest & Match
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Set a monthly interest rate for each savings bucket. Enable parent
          matching to double the bonus!
        </Text>
      </View>

      {bucketTemplates.length === 0 ? (
        <Card mode="outlined">
          <Card.Content>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              No bucket templates yet. Create some in Settings first.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          {bucketTemplates.map((bt, index) => {
            const s = settings[bt.id] || { rate: "0", match: false };
            return (
              <Card key={bt.id} mode="elevated" style={styles.card}>
                <Card.Content>
                  <View style={styles.bucketHeader}>
                    <View
                      style={[styles.colorDot, { backgroundColor: bt.color }]}
                    />
                    <Text style={styles.bucketEmoji}>{bt.emoji}</Text>
                    <Text
                      variant="titleMedium"
                      style={{ fontWeight: "700", flex: 1 }}
                    >
                      {bt.name}
                    </Text>
                  </View>

                  <View style={styles.rateRow}>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                    >
                      Monthly Rate (%)
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={s.rate}
                      onChangeText={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          [bt.id]: { ...prev[bt.id], rate: v },
                        }))
                      }
                      keyboardType="decimal-pad"
                      style={styles.rateInput}
                      right={<TextInput.Affix text="%" />}
                      textColor={theme.colors.onSurface}
                    />
                  </View>

                  <View style={styles.matchRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
                        Parent Match
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Double the interest bonus
                      </Text>
                    </View>
                    <Switch
                      value={s.match}
                      onValueChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          [bt.id]: { ...prev[bt.id], match: v },
                        }))
                      }
                      trackColor={{ true: "#7C4DFF" }}
                    />
                  </View>
                </Card.Content>
              </Card>
            );
          })}

          <Button
            mode="contained"
            onPress={handleSaveAll}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            icon="content-save"
          >
            Save Settings
          </Button>

          <Divider style={{ marginVertical: spacing.xl }} />

          <Card
            mode="outlined"
            style={[styles.processCard, { borderColor: "#7C4DFF40" }]}
          >
            <Card.Content>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "700", marginBottom: spacing.sm }}
              >
                Process Monthly Interest
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: spacing.md,
                }}
              >
                Calculate and credit interest to all children's qualifying
                buckets based on current balances.
              </Text>
              <Button
                mode="contained"
                onPress={handleProcessInterest}
                loading={processing}
                disabled={processing || loading}
                buttonColor="#7C4DFF"
                icon="bank-transfer"
              >
                Process Interest Now
              </Button>
            </Card.Content>
          </Card>
        </>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  headerTitle: { fontWeight: "800" },
  card: { marginBottom: spacing.md, borderRadius: 16 },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  bucketEmoji: { fontSize: 22 },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  rateInput: { width: 100 },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  saveButton: { marginTop: spacing.md },
  processCard: { borderRadius: 16, borderWidth: 1 },
});
