// src/screens/About.jsx
import React from "react";
import { Text, StyleSheet, Linking, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { theme } from "@/src/core/theme";
import { useRouter } from "expo-router";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";

import CompanySignature from '../components/CompanySignature'

export default function AboutScreen() {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];
  const router = useRouter();

  const open = (url) => {
    try {
      Linking.openURL(url);
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesomeIcon icon="arrow-left" size={20} color={currentTheme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.colors.primary }]}>
          About BashChat
        </Text>
      </View>     
      
      {/* Content */}
      <Text style={[styles.paragraph, { color: currentTheme.colors.textPrimary }]}>
        BashChat is a modern, real‑time messaging app crafted with care to bring
        friends and communities closer together. It blends speed, simplicity, and bold design
        with features like text, emoji, pictures, and voice messages — built for reliability and scale.
      </Text>

      <Text 
        style={[styles.subtitle, { color: currentTheme.colors.textPrimary }]}>
          Created 
      </Text>
      <CompanySignature />  

      <Text style={[styles.subtitle, { color: currentTheme.colors.textPrimary }]}>
        Contact
      </Text>
      <Text
        style={[styles.link, { color: currentTheme.colors.primary }]}
        onPress={() => open("mailto:husseinbashuaib@gmail.com")}
      >
        📧 Email: husseinbashuaib@gmail.com
      </Text>
      <Text
        style={[styles.link, { color: currentTheme.colors.primary }]}
        onPress={() => open("tel:+967734222096")}
      >
        📱 Phone 1: +967‑734‑222‑096
      </Text>
      <Text
        style={[styles.link, { color: currentTheme.colors.primary }]}
        onPress={() => open("tel:+967775518001")}
      >
        📱 Phone 2: +967‑775‑518‑001
      </Text>
      
      <Text
        style={[styles.link, { color: currentTheme.colors.primary }]}
        onPress={() => open("https://www.bashsoft.com")}
      >
        🌐 Website: www.bashsoft.com
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12, marginTop: 10 },
  subtitle: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 6 },
  paragraph: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  link: { fontSize: 16, marginBottom: 8 },
  company: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
});