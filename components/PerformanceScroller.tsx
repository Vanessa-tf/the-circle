import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import CircularProgress from "./CircularProgress";
import ScrollTrack from "./ScrollTrack";
import { colors, radii } from "../constants/theme";

type PerformanceItem = {
  label: string;
  progress: number;
  color: string;
};

type Props = {
  data: PerformanceItem[];
};

const CARD_WIDTH = 126;

export default function PerformanceScroller({ data }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [contentWidth, setContentWidth] = useState(1);
  const [containerWidth, setContainerWidth] = useState(1);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  };

  const scrollBy = (delta: number) => {
    const maxX = Math.max(0, contentWidth - containerWidth);
    const next = Math.max(0, Math.min(maxX, scrollX + delta));
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  const scrollTo = (x: number) => {
    scrollRef.current?.scrollTo({ x, animated: false });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable style={styles.scrollArrow} onPress={() => scrollBy(-CARD_WIDTH)} hitSlop={8}>
          <Feather name="chevron-left" size={16} color={colors.textMuted} />
        </Pressable>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={(w) => setContentWidth(w)}
          style={styles.scroll}
        >
          {data.map((p) => (
            <View key={p.label} style={styles.card}>
              <CircularProgress size={64} strokeWidth={6} progress={p.progress} color={p.color}>
                <Text style={styles.percent}>{Math.round(p.progress * 100)}%</Text>
              </CircularProgress>
              <Text style={styles.label}>{p.label}</Text>
            </View>
          ))}
        </ScrollView>
        <Pressable style={styles.scrollArrow} onPress={() => scrollBy(CARD_WIDTH)} hitSlop={8}>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollTrack
        scrollX={scrollX}
        contentWidth={contentWidth}
        containerWidth={containerWidth}
        onScrollTo={scrollTo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scrollArrow: {
    width: 24,
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  card: {
    alignItems: "center",
    width: 116,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: 18,
    marginRight: 10,
  },
  percent: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 10,
  },
});
