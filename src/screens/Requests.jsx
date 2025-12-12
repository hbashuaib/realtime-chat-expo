// src/screens/Requests.jsx
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import useGlobal from "../core/global";
import Empty from "../common/Empty";
import Cell from "../common/Cell";
import Thumbnail from "../common/Thumbnail";
import utils from "../core/utils";

import { useNavigation } from "@react-navigation/native";
import { Button } from "react-native";

import { theme } from "@/src/core/theme";          // ✅ named import
import { useColorScheme } from "@/hooks/use-color-scheme"; // ✅ hook

function RequestAccept({ item }) {
  const requestAccept = useGlobal((state) => state.requestAccept);
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <TouchableOpacity
      style={{
        backgroundColor: currentTheme.colors.primary, // ✅ theme color
        paddingHorizontal: currentTheme.spacing.md,
        height: 36,
        borderRadius: currentTheme.radius.md,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={() => requestAccept(item.sender.username)}
    >
      <Text
        style={{
          color: currentTheme.colors.headerText,
          fontWeight: "bold",
        }}
      >
        Accept
      </Text>
    </TouchableOpacity>
  );
}

function RequestRow({ item }) {
  const message = "Requested to connect with you";
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <Cell>
      <Thumbnail url={item.sender.thumbnail} size={76} />
      <View
        style={{
          flex: 1,
          paddingHorizontal: currentTheme.spacing.md,
        }}
      >
        <Text
          style={{
            fontWeight: "bold",
            color: currentTheme.colors.textPrimary, // ✅ theme color
            marginBottom: 4,
          }}
        >
          {item.sender.name}
        </Text>
        <Text style={{ color: currentTheme.colors.textSecondary }}>
          {message}{" "}
          <Text
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: currentTheme.fontSize.sm,
            }}
          >
            {" "}
            {utils.formatTime(item.created)}
          </Text>
        </Text>
      </View>
      <RequestAccept item={item} />
    </Cell>
  );
}

function RequestsScreen({ navigation }) {
  const requestList = useGlobal((state) => state.requestList);
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  // show loading indicator
  if (requestList === null) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  // Show empty if no requests
  if (requestList.length === 0) {
    return <Empty icon="bell" message="No requests!" />;
  }

  // Show request list
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={requestList}
        renderItem={({ item }) => <RequestRow item={item} />}
        keyExtractor={(item) => item.sender.username}        
      />
    </SafeAreaView>
  );
}

export default RequestsScreen;
