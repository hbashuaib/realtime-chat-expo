// src/screens/EmojiTest.jsx
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, Text } from "react-native";
import EmojiPicker from "../components/EmojiPicker";

export default function EmojiTest() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        {/* Wrap any emoji/text output in <Text> */}
        <EmojiPicker
          onSelect={(emoji) => {
            console.log("Selected:", emoji);
          }}
          renderEmoji={(emoji) => (
            <Text style={styles.emoji}>{emoji}</Text>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4fa",
  },
  wrapper: {
    flex: 1,
    paddingTop: 8,
  },
  emoji: {
    fontSize: 28, // adjust size as needed
  },
});

