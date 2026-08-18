import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

export type FairnessSignals = {
  peer_share: number;
  repeat_verifier: boolean;
  recent_rate: number | null;
  recent_n: number;
  prior_rate: number | null;
  prior_n: number;
};

const PEER_SHARE_THRESHOLD = 0.5;
const TREND_THRESHOLD = 0.1;

type Trend = "rising" | "steady" | "declining" | "new";

function getTrend(signals: FairnessSignals): Trend {
  if (signals.recent_n < 3 || signals.prior_n < 3 || signals.recent_rate == null || signals.prior_rate == null) {
    return "new";
  }
  const diff = signals.recent_rate - signals.prior_rate;
  if (diff > TREND_THRESHOLD) return "rising";
  if (diff < -TREND_THRESHOLD) return "declining";
  return "steady";
}

const TREND_META: Record<Trend, { icon: React.ComponentProps<typeof Feather>["name"]; label: string; color: string }> = {
  rising: { icon: "trending-up", label: "Reliability trending up", color: colors.accentDark },
  steady: { icon: "minus", label: "Reliability holding steady", color: colors.textSecondary },
  declining: { icon: "trending-down", label: "Reliability trending down", color: "#B9791E" },
  new: { icon: "clock", label: "Not enough history yet", color: colors.textMuted },
};

export default function ReliabilityCard({ signals }: { signals: FairnessSignals }) {
  const hasAnySignal = signals.peer_share > 0 || signals.repeat_verifier || signals.recent_n + signals.prior_n > 0;
  if (!hasAnySignal) return null;

  const trend = getTrend(signals);
  const trendMeta = TREND_META[trend];
  const mostlyPeerVerified = signals.peer_share >= PEER_SHARE_THRESHOLD;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Feather name={trendMeta.icon} size={16} color={trendMeta.color} />
        <Text style={[styles.rowText, { color: trendMeta.color }]}>{trendMeta.label}</Text>
      </View>

      {mostlyPeerVerified && (
        <View style={styles.row}>
          <Feather name="users" size={16} color="#B9791E" />
          <Text style={styles.rowText}>
            {Math.round(signals.peer_share * 100)}% of this score comes from peer verification
          </Text>
        </View>
      )}

      {signals.repeat_verifier && (
        <View style={styles.row}>
          <Feather name="repeat" size={16} color="#B9791E" />
          <Text style={styles.rowText}>Several credits share the same verifier contact</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
});
