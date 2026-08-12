import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, PanResponder, Animated } from "react-native";
import { colors } from "../constants/theme";

type Props = {
  scrollX: number;
  contentWidth: number;
  containerWidth: number;
  onScrollTo: (x: number) => void;
};

export default function ScrollTrack({ scrollX, contentWidth, containerWidth, onScrollTo }: Props) {
  const trackWidthRef = useRef(1);
  const isDraggingRef = useRef(false);
  const currentLeftRef = useRef(0);
  const startLeftRef = useRef(0);
  const thumbLeft = useRef(new Animated.Value(0)).current;

  const maxScroll = Math.max(1, contentWidth - containerWidth);
  const thumbWidthRatio = Math.min(1, containerWidth / contentWidth);

  const latest = useRef({ maxScroll, thumbWidthRatio, onScrollTo });
  latest.current = { maxScroll, thumbWidthRatio, onScrollTo };

  // Keep the thumb synced when the row scrolls by other means (arrows, finger-swipe).
  useEffect(() => {
    if (isDraggingRef.current) return;
    const travel = trackWidthRef.current * (1 - thumbWidthRatio);
    const ratio = Math.min(1, scrollX / maxScroll);
    const next = ratio * travel;
    currentLeftRef.current = next;
    thumbLeft.setValue(next);
  }, [scrollX, maxScroll, thumbWidthRatio, thumbLeft]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          isDraggingRef.current = true;
          startLeftRef.current = currentLeftRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const { maxScroll, thumbWidthRatio, onScrollTo } = latest.current;
          const travel = trackWidthRef.current * (1 - thumbWidthRatio);
          if (travel <= 0) return;
          const nextLeft = Math.max(0, Math.min(travel, startLeftRef.current + gestureState.dx));
          currentLeftRef.current = nextLeft;
          thumbLeft.setValue(nextLeft);
          onScrollTo((nextLeft / travel) * maxScroll);
        },
        onPanResponderRelease: () => {
          isDraggingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
        },
      }),
    [thumbLeft]
  );

  return (
    <View
      style={styles.track}
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View
        {...panResponder.panHandlers}
        hitSlop={{ top: 10, bottom: 10 }}
        style={[
          styles.thumb,
          {
            width: `${thumbWidthRatio * 100}%`,
            transform: [{ translateX: thumbLeft }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 24,
  },
  thumb: {
    position: "absolute",
    height: 8,
    top: -2,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
});
