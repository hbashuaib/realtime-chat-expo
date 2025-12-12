// src/components/CompanySignature.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { theme } from "@/src/core/theme";

export default function CompanySignature() {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];
  const currentYear = new Date().getFullYear();


  return (
    <View style={styles.container}>
      <Text style={[styles.name, { color: currentTheme.colors.textSecondary }]}>
        Hussein A. Bashuaib
      </Text>
      <View style={styles.row}>
        <FontAwesomeIcon
          icon={["far", "copyright"]}   // 👈 regular copyright
          size={14}
          color={currentTheme.colors.primary}
          style={{ marginTop: -2 }}     // fine-tune vertical alignment
        />
        <Text
          style={[
            styles.company,
            { color: currentTheme.colors.primary, fontFamily: currentTheme.fontFamily.header }
          ]}
        >
          BashSoft - {currentYear}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  name: { fontSize: 16, fontWeight: "500" },
  company: { fontSize: 16, fontWeight: "700", marginLeft: 6, letterSpacing: 1.2 },
});