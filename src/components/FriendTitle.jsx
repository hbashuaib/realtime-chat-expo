// src/components/FriendTitle.jsx
import React from "react";
import { View, Text } from "react-native";
import Thumbnail from "@/src/common/Thumbnail";
import { theme } from "@/src/core/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function FriendTitle({ friend }) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Thumbnail url={friend?.thumbnail} size={30} />
      <Text
        style={{
          color: currentTheme.colors.textPrimary,
          marginLeft: currentTheme.spacing.sm,
          fontSize: currentTheme.fontSize.md,
          fontWeight: "bold",
        }}
      >
        {friend?.name ?? ""}
      </Text>
    </View>
  );
}