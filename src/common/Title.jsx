// src/common/Title.jsx
import { Text } from "react-native";

function Title({ text, color, variant = "splash" }) {
  const baseStyle = {
    textAlign: "center",
    color,
  };

  const stylesByVariant = {
    splash: {
      fontSize: 48,
      fontFamily: "LeckerliOne-Regular",
      marginBottom: 30,
    },
    friends: {
      fontFamily: "MontserratExtraBold",
      fontSize: 24,
      letterSpacing: 1,
      textShadowColor: "rgba(0,0,0,0.1)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
  };

  return (
    <Text style={{ ...baseStyle, ...stylesByVariant[variant] }}>
      {text}
    </Text>
  );
}

export default Title;
