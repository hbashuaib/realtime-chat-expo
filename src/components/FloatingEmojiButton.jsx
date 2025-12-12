// src/components/FloatingEmojiButton.jsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ✅ import safe area insets

export default function FloatingEmojiButton() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); // ✅ get safe area values

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { bottom: 70 + insets.bottom } // ✅ raise button above tab bar dynamically
      ]}
      onPress={() => navigation.navigate('EmojiTest')}
    >
      <Text style={styles.text}>😀</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 100,
  },
  text: {
    fontSize: 28,
    color: '#fff',
  },
});