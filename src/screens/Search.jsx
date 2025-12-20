// src/screens/Search.jsx
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Cell from "../common/Cell";
import Empty from "../common/Empty";
import Thumbnail from "../common/Thumbnail";
import useGlobal from "../core/global";

import { useColorScheme } from "@/hooks/use-color-scheme"; // ✅ hook
import { theme } from "@/src/core/theme"; // ✅ named import

function SearchButton({ user }) {
  const requestConnect = useGlobal((state) => state.requestConnect);
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  // Add tick if user is already connected
  if (user.status === "connected") {
    return (
      <FontAwesomeIcon
        icon="circle-check"
        size={30}
        color={currentTheme.colors.primary} // ✅ theme color
        style={{ marginRight: currentTheme.spacing.sm }}
      />
    );
  }

  const data = {};

  switch (user.status) {
    case "no-connection":
      data.text = "Connect";
      data.disabled = false;
      data.onPress = () => requestConnect(user.username);
      break;
    case "pending-them":
      data.text = "Pending";
      data.disabled = true;
      data.onPress = () => {};
      break;
    case "pending-me":
      data.text = "Accept";
      data.disabled = false;
      data.onPress = () => {};
      break;
    default:
      break;
  }

  return (
    <TouchableOpacity
      style={{
        backgroundColor: data.disabled
          ? currentTheme.colors.border
          : currentTheme.colors.primary,
        paddingHorizontal: currentTheme.spacing.md,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: currentTheme.radius.md,
      }}
      disabled={data.disabled}
      onPress={data.onPress}
    >
      <Text
        style={{
          color: data.disabled
            ? currentTheme.colors.textSecondary
            : currentTheme.colors.headerText,
          fontWeight: "bold",
        }}
      >
        {data.text}
      </Text>
    </TouchableOpacity>
  );
}

function SearchRow({ user }) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <Cell>
      <Thumbnail url={user.thumbnail} size={76} />
      <View style={{ flex: 1, paddingHorizontal: currentTheme.spacing.md }}>
        <Text
          style={{
            fontWeight: "bold",
            color: currentTheme.colors.textPrimary,
            marginBottom: 4,
          }}
        >
          {user.name}
        </Text>
        <Text style={{ color: currentTheme.colors.textSecondary }}>
          {user.username}
        </Text>
      </View>
      <SearchButton user={user} />
    </Cell>
  );
}

function SearchScreen() {
  const [query, setQuery] = useState("");

  const searchList = useGlobal((state) => state.searchList);
  const searchUsers = useGlobal((state) => state.searchUsers);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  useEffect(() => {
    searchUsers(query);
  }, [query]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header row: Back arrow + Search bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: currentTheme.spacing.md,
          borderBottomWidth: 1,
          borderColor: currentTheme.colors.border,
        }}
      >
        {/* Back Arrow */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/Friends")}
          style={{ marginRight: currentTheme.spacing.sm }}
        >
          <FontAwesomeIcon
            icon="arrow-left"
            size={22}
            color={currentTheme.colors.primary}   // ✅ Bluish signature
          />
        </TouchableOpacity>

        {/* Search Input with magnifying glass */}
        <View style={{ flex: 1 }}>
          <TextInput
            style={{
              backgroundColor: currentTheme.colors.inputBackground,
              height: 52,
              borderRadius: 26,
              paddingHorizontal: currentTheme.spacing.md,
              fontSize: currentTheme.fontSize.md,
              color: currentTheme.colors.textPrimary,
              paddingLeft: 40, // space for magnifying glass
            }}
            value={query}
            onChangeText={setQuery}
            placeholder="Search..."
            placeholderTextColor={currentTheme.colors.textSecondary}
          />
          <FontAwesomeIcon
            icon="magnifying-glass"
            size={20}
            color={currentTheme.colors.textSecondary}
            style={{
              position: "absolute",
              left: 12,
              top: 16,
            }}
          />
        </View>
      </View>

      {/* Results / Empty states */}
      {searchList === null ? (
        <Empty
          icon="magnifying-glass"
          message={"Search for friends!"}
          centered={false}
        />
      ) : searchList.length === 0 ? (
        <Empty
          icon="triangle-exclamation"
          message={'No users found for "' + query + '"'}
          centered={false}
        />
      ) : (
        <FlatList
          data={searchList}
          renderItem={({ item }) => <SearchRow user={item} />}
          keyExtractor={(item) => item.username}
        />
      )}
    </SafeAreaView>
  );
}

export default SearchScreen;
