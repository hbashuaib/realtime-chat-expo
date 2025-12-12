// src/common/Button.jsx
import { Text, TouchableOpacity } from "react-native";
import { theme } from "@/src/core/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function Button({ title, onPress }) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <TouchableOpacity
      style={{
        backgroundColor: currentTheme.colors.primary, // ✅ signature blue
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessible={true}
    >
      <Text
        style={{
          color: currentTheme.colors.headerText, // ✅ white text from theme
          fontSize: 16,
          fontWeight: "bold",
        }}
      >
        {String(title)}
      </Text>
    </TouchableOpacity>
  );
}

export default Button;