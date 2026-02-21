// src/screens/Friends.jsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Cell from "../common/Cell";
import Empty from "../common/Empty";
import Thumbnail from "../common/Thumbnail";
import useGlobal from "../core/global";
import utils from "../core/utils";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { theme } from "@/src/core/theme";

function FriendRow({ item, currentTheme, onSelectFriend }) {
  return (
    <TouchableOpacity onPress={() => onSelectFriend(item)}>
      <Cell>
        <Thumbnail url={item.friend.thumbnail} size={44} />
        <View
          style={{
            flex: 1,
            paddingHorizontal: currentTheme.spacing.md,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              color: currentTheme.colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {item.friend.name}
          </Text>
          <Text style={{ color: currentTheme.colors.textSecondary }}>
            {item.preview}{" "}
            <Text
              style={{
                color: currentTheme.colors.textSecondary,
                fontSize: currentTheme.fontSize.sm,
              }}
            >
              {" "}
              {utils.formatTime(item.updated)}
            </Text>
          </Text>
        </View>
      </Cell>
    </TouchableOpacity>
  );  
}

function FriendsScreen() {
  const friendList = useGlobal((state) => state.friendList);
  const { messageForward } = useGlobal.getState(); // ✅ access global action

  const inboundShare = useGlobal((s) => s.inboundShare);
  const clearInboundShare = useGlobal((s) => s.clearInboundShare);

  // Read forwarding params (if present)
  const { forwardFromConnectionId, forwardMessageIds } = useLocalSearchParams(); // ✅

  const forwardingUsed = useRef(false);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  function onSelectFriend(item) {
    // Inbound share handoff
    if (inboundShare) {
      router.push({
        pathname: "/Message",
        params: {
          friend: JSON.stringify(item.friend),
          id: item.id,
          fromShare: "1",
        },
      });
      // ❌ Do NOT clearInboundShare here
      return;
    }

    // If we arrived here with forwarding payload, forward then navigate
    if (forwardFromConnectionId && forwardMessageIds && !forwardingUsed.current) {
      forwardingUsed.current = true;   // ✅ mark as consumed
      
      const fromId = Number(forwardFromConnectionId);
      // forwardMessageIds comes as string or array depending on caller; normalize to array of numbers
      const ids = Array.isArray(forwardMessageIds)
        ? forwardMessageIds.map((v) => Number(v))
        : String(forwardMessageIds)
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((v) => !Number.isNaN(v));

      messageForward(fromId, item.id, ids);      

      // ✅ Navigate into chat WITHOUT forwarding params
      router.push({
        pathname: "/Message",
        params: {
          friend: JSON.stringify(item.friend),
          id: item.id,
        },
      });    

      return;
    }

    // Normal flow: just open the chat
    router.push({
      pathname: "/Message",
      params: {
        friend: JSON.stringify(item.friend),
        id: item.id,
      },
    });
  }

  if (friendList === null) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (friendList.length === 0) {
    return <Empty icon="inbox" message="No Messages yet!" />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.colors.background,
      }}
    >
      {inboundShare && (
        <View style={{
          padding: currentTheme.spacing.md,
          backgroundColor: currentTheme.colors.bannerBackground,
          borderBottomWidth: 1,
          borderBottomColor: currentTheme.colors.border,
        }}>
          <Text style={{
            color: currentTheme.colors.onPrimary,
            fontWeight: "bold",
            textAlign: "center",
          }}>
            Shared content ready — select a friend to send
          </Text>
        </View>
      )}

      {/* ✅ Forwarding banner */}
      {forwardFromConnectionId && forwardMessageIds && !forwardingUsed.current && (
        <View
          style={{
            padding: currentTheme.spacing.md,
            backgroundColor: currentTheme.colors.bannerBackground,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.colors.border,
          }}
        >
          <Text
            style={{
              color: currentTheme.colors.onPrimary,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Forwarding mode: Select a friend to forward {String(forwardMessageIds).split(",").length} message(s)
          </Text>
        </View>
      )}

      <FlatList
        data={friendList}
        renderItem={({ item }) => (
          <FriendRow
            item={item}
            currentTheme={currentTheme}
            onSelectFriend={onSelectFriend} // ✅ pass callback
          />
        )}
        keyExtractor={(item) => String(item.id)} // ✅ ensure string key
      />
    </SafeAreaView>
  );
}

export default FriendsScreen;
