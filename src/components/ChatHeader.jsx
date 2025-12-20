// src/components/ChatHeader.jsx
import { useColorScheme } from "@/hooks/use-color-scheme";
import FriendTitle from "@/src/components/FriendTitle";
import HeaderMenu from "@/src/components/HeaderMenu";
import { theme } from "@/src/core/theme";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useNavigation } from "expo-router";
import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ChatHeaderBase({ 
  friend, 
  showDelete = false, 
  onDelete,
  onForward,
  onCancelSelection,
  onShare,
  selectedMessages,
}) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: currentTheme.colors.background }}>
      <View style={styles(currentTheme).container}>
        {/* Left side */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <FontAwesomeIcon icon="arrow-left" size={22} color={currentTheme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ marginLeft: currentTheme.spacing.sm }}>
            <FriendTitle friend={friend} />
          </View>
        </View>

        {/* New Added for Delete & Forward icons */}
        {/* Right side */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {showDelete && (
            <>
              {/* Share */}
              <TouchableOpacity onPress={onShare} style={{ marginRight: 12 }}>
                <FontAwesomeIcon icon="share-nodes" size={20} color={currentTheme.colors.actionBlue} />
              </TouchableOpacity>

              {/* Forward */}
              <TouchableOpacity
                onPress={onForward}
                style={{ marginRight: currentTheme.spacing.sm }}
              >
                <FontAwesomeIcon icon="paper-plane" size={20} color={currentTheme.colors.actionBlue} />
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={onDelete}
                style={{ marginRight: currentTheme.spacing.sm }}
              >
                <FontAwesomeIcon icon="trash" size={20} color={currentTheme.colors.actionBlue} />
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                onPress={onCancelSelection}
                style={{ marginRight: currentTheme.spacing.sm }}
              >
                <FontAwesomeIcon icon="times" size={20} color={currentTheme.colors.actionRed} />
              </TouchableOpacity>
            </>
          )}
          <HeaderMenu screen="Message" selectedMessages={selectedMessages} />
        </View>

        {/* Right side */}
        {/* <View style={{ flexDirection: "row", alignItems: "center" }}>
          {showDelete && (
            <TouchableOpacity onPress={onDelete} style={{ marginRight: currentTheme.spacing.sm }}>
              <FontAwesomeIcon icon="trash" size={20} color={currentTheme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <HeaderMenu screen="Message" />
        </View> */}        
      </View>
    </SafeAreaView>
  );
}

export default memo(ChatHeaderBase);

const styles = (t) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: t.spacing.lg,
      paddingRight: t.spacing.xs, // menu hugs right edge
      paddingVertical: t.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border,
    },
  });