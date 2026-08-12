import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  initials: string;
  avatarColor: string;
  name: string;
  time: string;
  unread?: boolean;
  preview: string;
  tag: string;
  onPress?: () => void;
};

export default function ConversationItem({
  initials,
  avatarColor,
  name,
  time,
  unread = false,
  preview,
  tag,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.timeWrap}>
            <Text style={styles.time}>{time}</Text>
            {unread && <View style={styles.unreadDot} />}
          </View>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
        <View style={styles.tagPill}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  timeWrap: {
    alignItems: "flex-end",
    gap: 5,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentDark,
  },
  preview: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  tagPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.iconBgGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
