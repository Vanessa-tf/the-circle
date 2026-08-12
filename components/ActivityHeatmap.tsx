import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii } from "../constants/theme";

const ROWS = 7;
const COLS = 16;
const TOTAL_DAYS = ROWS * COLS;
const DAY_MS = 24 * 60 * 60 * 1000;

const levelColors = [colors.iconBgGray, colors.iconBgGreen, colors.accent, colors.accentDark];

type Props = {
  dates: string[];
};

function buildLevels(dates: string[]): number[] {
  const counts = new Array(TOTAL_DAYS).fill(0);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const windowStart = todayStart - (TOTAL_DAYS - 1) * DAY_MS;

  for (const iso of dates) {
    const d = new Date(iso);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayIndex = Math.round((dayStart - windowStart) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < TOTAL_DAYS) {
      counts[dayIndex] += 1;
    }
  }

  return counts.map((count) => Math.min(levelColors.length - 1, count));
}

export default function ActivityHeatmap({ dates }: Props) {
  const levels = useMemo(() => buildLevels(dates), [dates]);

  return (
    <View style={styles.card}>
      <View style={styles.grid}>
        {Array.from({ length: ROWS }).map((_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: COLS }).map((_, col) => {
              const dayIndex = col * ROWS + row;
              return (
                <View
                  key={col}
                  style={[styles.cell, { backgroundColor: levelColors[levels[dayIndex]] }]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <Text style={styles.caption}>Verified activity · last 16 weeks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
  },
  grid: {
    gap: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
