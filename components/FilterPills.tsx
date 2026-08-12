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
import ScrollTrack from "./ScrollTrack";
import { colors, radii } from "../constants/theme";

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export default function FilterPills({ options, value, onChange }: Props) {
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
    setScrollX(x);
    scrollRef.current?.scrollTo({ x, animated: false });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable style={styles.arrow} onPress={() => scrollBy(-120)} hitSlop={8}>
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
          contentContainerStyle={styles.scrollContent}
        >
          {options.map((option) => {
            const active = option === value;
            return (
              <Pressable
                key={option}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => onChange(option)}
              >
                <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={styles.arrow} onPress={() => scrollBy(120)} hitSlop={8}>
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
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  arrow: {
    width: 20,
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: 2,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  pillLabelActive: {
    color: "#fff",
  },
});
