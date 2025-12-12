// src/common/Cell.jsx
import { View, Text } from "react-native";

function Cell({ children }) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
        minHeight: 72,
        paddingVertical: 10,
      }}
    >
      {typeof children === "string" ? <Text>{children}</Text> : children}
    </View>
  );
}

export default Cell;