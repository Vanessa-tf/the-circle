import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { colors, radii } from "../constants/theme";

type Point = { label: string; value: number };

type Props = {
  data: Point[];
  color?: string;
};

const CHART_HEIGHT = 120;
const PADDING_Y = 14;

export default function ScoreLineChart({ data, color = colors.accent }: Props) {
  const [width, setWidth] = useState(0);

  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No score history yet — verified credits will show up here.</Text>
        </View>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y =
      CHART_HEIGHT - PADDING_Y - ((d.value - min) / range) * (CHART_HEIGHT - PADDING_Y * 2);
    return { x, y };
  });

  const last = points[points.length - 1];

  return (
    <View style={styles.card}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.chartArea}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {points.length > 1 && (
              <Polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <Circle cx={last.x} cy={last.y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
          </Svg>
        )}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d) => (
          <Text key={d.label} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
  },
  chartArea: {
    height: CHART_HEIGHT,
  },
  emptyState: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
