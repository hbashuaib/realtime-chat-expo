// src/screens/Message.jsx
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { format, isToday, isYesterday } from "date-fns";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Share from "react-native-share";
import bg from "../assets/images/chat-background.png";
import Thumbnail from "../common/Thumbnail";
import EmojiPicker from "../components/EmojiPicker";
import VideoPlayer from "../components/VideoPlayer";
import VoicePlayer from "../components/VoicePlayer";
import WaveformView from "../components/WaveformView";
import useGlobal from "../core/global";
import { useRoute } from "@react-navigation/native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import ChatHeader from "@/src/components/ChatHeader";
import { theme } from "@/src/core/theme";
import { router, useLocalSearchParams } from "expo-router";
import { shallow } from 'zustand/shallow';

// import BashShareModule from "bash-share-module";

import { NativeModules } from "react-native";
const { BashShareModule } = NativeModules;

// WhatsApp-like compact time (e.g., 14:07)
function formatTimeShort(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d)) return "";
  return format(d, "HH:mm");
}

// ----------------------------- CONTENT ----------------------------------------
function MessageContent({ text, image, voice, waveform, video_url, video_thumb_url, video_duration }) {
  const safeWaveform = Array.isArray(waveform) ? waveform : [];
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];
  const [progress, setProgress] = useState(0);
  
  const sampleWaveform = [0.2,0.4,0.6,0.3,0.5,0.7,0.2,0.4,0.6,0.3];
  const waveformToUse = useMemo(() => {
    const safe = Array.isArray(waveform) ? waveform : [];
    const hasEnergy = safe.some(v => v > 0);
    return hasEnergy ? safe : sampleWaveform;
  }, [waveform]);

  console.log("MessageContent props:", { video_url, video_thumb_url, video_duration });

  return (
    <View>
      {text ? (
        <Text
          style={{
            color: currentTheme.colors.textPrimary,
            fontSize: currentTheme.fontSize.md,
            lineHeight: currentTheme.fontSize.md + 2,
            fontFamily: currentTheme.fontFamily.regular,
            marginBottom: image || voice ? currentTheme.spacing.sm : 0,
          }}
        >
          {text}
        </Text>
      ) : null}

      {image ? (
        <Image
          source={{ uri: image }}
          style={{
            width: 200,
            height: 200,
            borderRadius: currentTheme.radius.md,
            marginBottom: voice ? currentTheme.spacing.sm : 0,
          }}
          resizeMode="cover"
        />
      ) : null}

      {voice &&  ( // removed safeWaveform.length > 0 &&
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: currentTheme.spacing.sm,
            flexShrink: 1,
          }}
        >
          <VoicePlayer 
            uri={String(voice || '')} // uri={voice} 
            onProgress={setProgress}
          />
          {/* {safeWaveform.length > 0 && ( */}
            <View 
              style={{ 
                marginLeft: currentTheme.spacing.sm,
                flex: 1,
                flexShrink: 1,                
            }}>
              <WaveformView 
                waveform={waveformToUse}                 
                height={50}
                progress={progress}
              />
            </View>
          {/* )} */}
        </View>
      )}

      {video_url && (
        <View style={{ marginTop: currentTheme.spacing.sm }}>
          <VideoPlayer
            uri={String(video_url)}            // ✅ backend sends video_url
            thumbnail={video_thumb_url}        // ✅ optional thumbnail
            duration={video_duration}          // ✅ optional duration
          />
        </View>
      )}

    </View>
  );
}

// New ReadReceipt Function code:
const CheckIcon = memo(({ color, size = 12 }) => (
  <FontAwesomeIcon icon="check" size={size} color={color} />
));

const DoubleCheckIcon = memo(({ color, size = 12 }) => (
  <FontAwesomeIcon icon="check-double" size={size} color={color} />
));

const ReadReceipt = memo(function ReadReceipt({ message, themeColors }) {
  const time = formatTimeShort(message?.created);

  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 2 }}>
      <Text style={{ fontSize: 10, color: themeColors.textSecondary, marginRight: 4, fontWeight: "400" }}>
        {time}
      </Text>

      {!message?.delivered && <CheckIcon color={themeColors.textSecondary} />}

      {message?.delivered && !message?.seen && (
        <DoubleCheckIcon color={themeColors.textSecondary} />
      )}

      {message?.delivered && message?.seen && (
        <DoubleCheckIcon color={themeColors.primary} />
      )}
    </View>
  );
});


// ---------------------------------- BUBBLES ----------------------------------------
// New MessageBubleMe with memo:
const MessageBubbleMe = memo(function MessageBubbleMe({ text = "", image = null, voice = null, waveform = null, message }) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <View style={{ flexDirection: "row", padding: currentTheme.spacing.xs, paddingRight: currentTheme.spacing.md }}>
      <View style={{ flex: 1 }} />
      <View
        style={{
          backgroundColor: currentTheme.colors.bubbleMe,
          borderRadius: currentTheme.radius.lg,
          maxWidth: "75%",
          flexShrink: 1,    // ✅ allow children to shrink
          flexGrow: 1,              // ✅ bubble can grow to fit waveform
          alignSelf: "flex-start",  // ✅ bubble sizes to content row
          //flex: 1,
          paddingHorizontal: currentTheme.spacing.lg,
          paddingVertical: currentTheme.spacing.sm,
          marginRight: currentTheme.spacing.md,
        }}
      >
        <MessageContent 
          text={text} 
          image={image} 
          voice={voice} 
          waveform={waveform} 
          video_url={message.video_url}
          video_thumb_url={message.video_thumb_url}
          video_duration={message.video_duration}

        />
        <ReadReceipt message={message} themeColors={currentTheme.colors} />
      </View>
    </View>
  );
});


// --------------------------------- TYPING ANIMATION ----------------------------------------
function MessageTypingAnimation({ offset }) {
  const y = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  useEffect(() => {
    const total = 1000;
    const bump = 200;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(bump * offset),
        Animated.timing(y, {
          toValue: 1,
          duration: bump,
          easing: Easing.linear,
          useNativeDriver: false, // was true
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: bump,
          easing: Easing.linear,
          useNativeDriver: false, // was true
        }),
        Animated.delay(total - bump * 2 - bump * offset),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, []);

  const translateY = y.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        marginHorizontal: 1.5,
        borderRadius: 4,
        backgroundColor: currentTheme.colors.textSecondary,
        transform: [{ translateY }],
      }}
    />
  );
}


// New MessageBubbleFriend with Memo:
const MessageBubbleFriend = memo(function MessageBubbleFriend({
  text = "",
  image = null,
  voice = null,
  waveform = null,
  video_url = null,
  video_thumb_url = null,
  video_duration = null,
  friend,
  typing = false,
}) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  return (
    <View style={{ flexDirection: "row", padding: currentTheme.spacing.xs, paddingLeft: currentTheme.spacing.md }}>
      <Thumbnail url={friend?.thumbnail} size={42} />
      <View
        style={{
          backgroundColor: currentTheme.colors.bubbleFriend,
          borderRadius: currentTheme.radius.lg,
          maxWidth: "75%",
          flexShrink: 1,    // ✅ allow children to shrink
          flexGrow: 1,              // ✅ bubble can grow to fit waveform
          alignSelf: "flex-start",  // ✅ bubble sizes to content row
          //flex: 1,
          paddingHorizontal: currentTheme.spacing.md,
          paddingVertical: currentTheme.spacing.sm,
          marginLeft: currentTheme.spacing.sm,
        }}
      >
        {typing ? (
          <View style={{ flexDirection: "row" }}>
            <MessageTypingAnimation offset={0} />
            <MessageTypingAnimation offset={1} />
            <MessageTypingAnimation offset={2} />
          </View>
        ) : (
          <MessageContent 
            text={text} 
            image={image} 
            voice={voice} 
            waveform={waveform} 
            video_url={video_url}
            video_thumb_url={video_thumb_url}
            video_duration={video_duration}
          />
        )}
      </View>
      <View style={{ flex: 1 }} />
    </View>
  );
});


// New MessageBubble with Memo:
const MessageBubble = memo(function MessageBubble({ 
  message, 
  friend,
  isSelected = false,
  isSelecting = false,
  onLongPress,
  onPress,
}) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  const highlight = isSelected ? currentTheme.colors.primary + "22" : "transparent";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={onLongPress}
      onPress={onPress}
      style={{ backgroundColor: highlight, borderRadius: currentTheme.radius.md }}
    >
      {message.is_me ? (
        <MessageBubbleMe
          text={message.text}
          image={message.image}
          voice={message.voice}
          waveform={message.waveform}
          video_url={message.video_url}
          video_thumb_url={message.video_thumb_url}
          video_duration={message.video_duration}
          message={message}
        />
      ) : (
        <MessageBubbleFriend
          text={message.text}
          image={message.image}
          voice={message.voice}
          waveform={message.waveform}
          video_url={message.video_url}
          video_thumb_url={message.video_thumb_url}
          video_duration={message.video_duration}
          friend={friend}
        />
      )}
    </TouchableOpacity>
  );
});

// ------------------------------------------- INPUT ----------------------------------------
// New MessageInput with Memo
const SmileIcon = memo(({ active, color }) => (
  <FontAwesomeIcon icon={active ? "keyboard" : "smile"} size={20} color={color} />
));

const PaperclipIcon = memo(({ color }) => <FontAwesomeIcon icon="paperclip" size={20} color={color} />);
const CameraIcon = memo(({ color }) => <FontAwesomeIcon icon="camera" size={20} color={color} />);
const MicIcon = memo(({ color }) => <FontAwesomeIcon icon="microphone" size={22} color={color} />);
const SendIcon = memo(({ color }) => <FontAwesomeIcon icon="paper-plane" size={20} color={color} />);

const MessageInput = React.memo(function MessageInput({
  message,
  setMessage,
  onSend,
  showEmojiPicker,
  setShowEmojiPicker,
  inputRef,
  style,
  startRecording,
  stopRecording,
  onPickImage,
  onPickVideo,
  recording
}) {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // keep references to loop instances so we can stop them
  const pulseLoopRef = useRef(null);
  const glowLoopRef = useRef(null);

  useEffect(() => {
    // stop any previous loops before starting new ones
    if (pulseLoopRef.current) {
      try { pulseLoopRef.current.stop(); } catch {}
      pulseLoopRef.current = null;
    }
    if (glowLoopRef.current) {
      try { glowLoopRef.current.stop(); } catch {}
      glowLoopRef.current = null;
    }

    if (recording) {
      // Pulse animation (native driver, only transforms)
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();

      // Glow animation (JS driver, shadowRadius cannot use native driver)
      glowLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      glowLoopRef.current.start();
    } else {
      // reset values and ensure loops are stopped
      pulseAnim.setValue(1);
      glowAnim.setValue(0.5);
    }

    // cleanup when component unmounts or deps change
    return () => {
      if (pulseLoopRef.current) {
        try { pulseLoopRef.current.stop(); } catch {}
        pulseLoopRef.current = null;
      }
      if (glowLoopRef.current) {
        try { glowLoopRef.current.stop(); } catch {}
        glowLoopRef.current = null;
      }
    };
  }, [recording, pulseAnim, glowAnim]);
    
  return (
    <View style={[
      {  
        paddingHorizontal: currentTheme.spacing.md,
        paddingBottom: 0, //currentTheme.spacing.md
        backgroundColor: currentTheme.colors.background,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: currentTheme.colors.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }, style]}>
      <View 
        style={{ 
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderRadius: currentTheme.radius.lg,
          borderColor: currentTheme.colors.border,
          backgroundColor: currentTheme.colors.inputBackground,
          height: 50,
          paddingHorizontal: currentTheme.spacing.md, 
        }}>
        <TouchableOpacity
          onPress={() => {
            if (showEmojiPicker) {
              setShowEmojiPicker(false);
              inputRef?.current?.focus();
            } else {
              inputRef?.current?.blur();
              setShowEmojiPicker(true);
            }
          }}
        >
          <SmileIcon active={showEmojiPicker} color={currentTheme.colors.primary} />
        </TouchableOpacity>

        {/* your existing TextInput */}
        <TextInput
          placeholder="Message..."
          placeholderTextColor={currentTheme.colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          ref={inputRef}
          style={{
            flex: 1,
            fontSize: currentTheme.fontSize.md,
            fontFamily: currentTheme.fontFamily.regular,
            color: currentTheme.colors.textPrimary,
            paddingVertical: 0,
          }}
          submitBehavior="submit"
          onSubmitEditing={() => {
            onSend();
            inputRef?.current?.focus();
          }}
          returnKeyType="send"
        />

        <TouchableOpacity 
          onPress={() => onPickImage?.("library")}
          style={{ marginRight: currentTheme.spacing.sm }}
        >
          <PaperclipIcon color={currentTheme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onPickImage?.("camera")}>
          <CameraIcon color={currentTheme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onPickVideo?.("library")} style={{ marginLeft: currentTheme.spacing.sm }}>
          <FontAwesomeIcon icon="video" size={20} color={currentTheme.colors.primary} />
        </TouchableOpacity>

      </View>

      {message.trim().length === 0 ? (
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={{
            backgroundColor: recording ? "red" : currentTheme.colors.primary, // 🔴 red when recording
            borderRadius: currentTheme.radius.lg,
            width: recording ? 64 : 44,   // 📏 larger when recording
            height: recording ? 64 : 44,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: currentTheme.spacing.md,
            // static shadow base
            shadowColor: "red",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            elevation: recording ? 10 : 2, // Android glow
          }}
        >          
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }], // native driver only
            }}
          >
            <Animated.View
              style={{
                // JS driver only; do NOT include transform here
                shadowRadius: glowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [6, 12],
                }),
                // keep the shadow base on this inner node
                shadowColor: "red",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                // optional: match parent sizing
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {recording ? (
                <FontAwesomeIcon icon="circle" size={38} color={currentTheme.colors.headerText} />
              ) : (
                <MicIcon color={currentTheme.colors.headerText} />
              )}
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onSend}
          style={{
            backgroundColor: currentTheme.colors.primary,
            borderRadius: currentTheme.radius.lg,
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: currentTheme.spacing.md,
          }}
        >
          <SendIcon color={currentTheme.colors.headerText} />
        </TouchableOpacity>
      )}
    </View>
  );
});


function getDayLabel(dateString) {
  const date = new Date(dateString);

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";

  // fallback: full weekday + date
  return format(date, "EEEE, dd MMM"); // e.g. Monday, 24 Nov
}

function groupMessagesByDay(messages) {
  const groups = {};

  messages.forEach((msg) => {
    if (!msg.created) return;
    const date = new Date(msg.created);
    if (isNaN(date)) return;

    const key = format(date, "yyyy-MM-dd");
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  });  

  // Latest ordering
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b) - new Date(a)) // sort days newest→oldest
    .map(([date, msgs]) => ({
      title: getDayLabel(date),
      data: msgs.sort((m1, m2) => new Date(m2.created) - new Date(m1.created)), // sort msgs newest→oldest
    }));
}

// --------------------------------------- SCREEN --------------------------------------
export default function MessageScreen() {  
  const { id: connectionIdRaw, friend: friendParam, fromShare, payload } = useLocalSearchParams();
  const connectionId = Number(connectionIdRaw); // ✅ force integer
  
  const inboundShare = useGlobal((s) => s.inboundShare);
  const setInboundShare = useGlobal((s) => s.setInboundShare);
  const clearInboundShare = useGlobal((s) => s.clearInboundShare);
  
  // If friend is passed as JSON string, parse; else assume object
  const friend = (() => {
    if (typeof friendParam === "string") {
      try {
        return JSON.parse(friendParam);
      } catch {
        return { name: String(friendParam), thumbnail: null, username: String(friendParam) };
      }
    }
    return friendParam;
  })();  

  const screenHeight = Dimensions.get("window").height;
  const statusBarHeight = StatusBar.currentHeight || 0;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const route = useRoute();   // ✅ define route  
  const [inputValue, setInputValue] = useState("");   
  
  // const messageList = useGlobal((state) => state.messageList); 
  // const messagesByConnection = useGlobal((s) => s.messagesByConnection || {});
  // const messagesList = messagesByConnection[activeConnectionId] || [];
  // const chatMessages = messagesByConnection[activeConnectionId] || [];
  // const chatMessages = messagesList;
  // const messagesPage = useGlobal((s) => s.messagesPage);   // ✅ select it
  // const messagesPage = useGlobal((s) => s.messagesPage);
  
  const loadMoreMessages = useGlobal((state) => state.loadMoreMessages);

  const messageListFn = useGlobal((s) => s.messageList); 
  const messageType = useGlobal((state) => state.messageType);   
  const socketConnect = useGlobal((state) => state.socketConnect);
  const messagesUsername = useGlobal((s) => s.messagesUsername);
  const messagesConnectionId = useGlobal((s) => s.messagesConnectionId);
  const socket = useGlobal((s) => s.socket);
  const socketReady = useGlobal((s) => s.socketReady);
  const setMessagesUsername = useGlobal((s) => s.setMessagesUsername);
  const setMessagesConnectionId = useGlobal((s) => s.setMessagesConnectionId);  
  const addInboundMessage = useGlobal((s) => s.addInboundMessage);
  const messageSend = useGlobal((s) => s.messageSend);  

  // ✅ Select per-connection messages
  const activeConnectionId = useGlobal((s) => s.activeConnectionId);   // ✅ select the right field  
  const messagesList = useGlobal((s) => s.messagesList || []);   // ✅ shortcut maintained by store  

  // ✅ Select the count of messages for the active connection
  const chatMessagesCount = useGlobal(
    (s) => (s.messagesByConnection?.[activeConnectionId]?.length ?? 0)
  );

  // Define a stable empty array once
  const EMPTY_ARRAY = [];
  
  // ✅ Subscribe safely without creating new arrays
  const chatMessages = useGlobal(
    (s) => s.messagesByConnection?.[activeConnectionId] || EMPTY_ARRAY,
    shallow
  );

  // ✅ Function to request messages
  const requestMessages = useGlobal((s) => s.loadMoreMessages);

  // const chatMessages = isActiveChat ? messagesList : [];
  const groupedSections = useMemo(
    () => groupMessagesByDay(chatMessages),
    [chatMessagesCount]
  );

  // ✅ Option 2: initialize slice from global list if empty
  useEffect(() => {
    const state = useGlobal.getState();

    console.log("[Message.jsx] slice init check:",
      "connId:", activeConnectionId,
      "global list length:", messagesList.length,
      "slice length:", useGlobal.getState().messagesByConnection?.[activeConnectionId]?.length || 0);

    if (
      activeConnectionId &&
      (!state.messagesByConnection?.[activeConnectionId] ||
        state.messagesByConnection[activeConnectionId].length === 0) &&
      state.messagesList.length > 0
    ) {
      console.log("[Message.jsx] Initializing slice from global list for connId:", activeConnectionId);
      useGlobal.setState({
        messagesByConnection: {
          ...state.messagesByConnection,
          [activeConnectionId]: [...state.messagesList], // force copy
        },
      });
    }
  }, [activeConnectionId, messagesList.length]);

  useEffect(() => {
    console.log("[Debug - Inbound] socket object changed:", socket);
  }, [socket]);

  // ✅ Initialize store context from route params when screen mounts
  useEffect(() => {
    try {
      const friendParam = route?.params?.friend;
      const friend = typeof friendParam === "string" ? JSON.parse(friendParam) : friendParam;
      const connId = route?.params?.id ? Number(route.params.id) : null;

      if (friend?.username && connId) {
        // ✅ set each field independently if missing
        if (!messagesUsername) {
          setMessagesUsername(friend.username);
        }
        if (!messagesConnectionId) {
          setMessagesConnectionId(connId);
        }
        if (!activeConnectionId) {
          setActiveConnectionId(connId);
        }
        console.log("[Message] Context initialized from route params:",
                    "username=", friend.username,
                    "connId=", connId);
      } else {
        console.warn("[Message] Missing route params, cannot initialize context");
      }
    } catch (err) {
      console.error("[Message] Failed to parse friend params:", err);
    }
  }, []);   // run once on mount

  // ✅ Ensure store switches to the route's connId
  useEffect(() => {
    console.log("[Message.jsx] Store updated:",
      "activeConnectionId:", useGlobal.getState().activeConnectionId,
      "messagesConnectionId:", useGlobal.getState().messagesConnectionId,
      "messagesUsername:", useGlobal.getState().messagesUsername);

    if (params?.id) {
      const connId = Number(params.id);
      console.log("[Message.jsx] Forcing activeConnectionId/messagesConnectionId to:", connId);
      useGlobal.setState((state) => ({
        ...state,
        activeConnectionId: connId,
        messagesConnectionId: connId,
        messagesUsername: params?.friend?.username || state.messagesUsername,
        activeFriend: params?.friend ? JSON.parse(params.friend) : state.activeFriend,
      }));
    }
  }, [params?.id, params?.friend]);


  // ✅ Helper function
  function deliverInboundPayload(payload) {
    try {
      const effectiveConnectionId =
        messagesConnectionId || connectionId || route?.params?.id;

      if (payload.kind === "text") {
        const text = (payload.payload?.text || "").trim();
        if (text.length > 0) {
          setInputValue(text);

          console.log("[Debug - Inbound] Attempting delivery. socketReady:", socketReady,
                      "socket=", socket,
                      "messagesUsername=", messagesUsername,
                      "messagesConnectionId=", messagesConnectionId,
                      "connId=", effectiveConnectionId);

          const username = messagesUsername || route?.params?.friend?.username;
          const connId = messagesConnectionId || connectionId || route?.params?.id;

          if (socketReady && socket && connId && username) {
            // ✅ Insert inbound share into local list immediately
            addInboundMessage(connId, text);

            // Then send over socket
            messageSend(connId, text);
            console.log("[MessageScreen - Inbound] Sent text payload for user:", username);
          } else {
            console.warn("[MessageScreen - Inbound] Skipped delivery. Context not ready...");
          }
        }
      } else if (payload.kind === "media") {
        if (socketReady && socket && effectiveConnectionId && messagesUsername && messagesConnectionId) {
          messageSend(effectiveConnectionId, "", payload.payload);
          console.log("[MessageScreen - Inbound] Sent media payload for user:", messagesUsername);
        } else {
          console.warn("[MessageScreen - Inbound] Skipped media delivery. Context not ready.");
        }
      }
    } catch (err) {
      console.error("[MessageScreen - Inbound] Exception delivering inbound share:", err);
    }
  }

  // Track whether current inboundShare has been delivered
  const hasDeliveredInbound = useRef(false);

  // Reset flag whenever a new inboundShare arrives
  useEffect(() => {
    if (inboundShare) {
      hasDeliveredInbound.current = false;
    }
  }, [inboundShare]);

  // Effect: consume inbound share once friend context and socket are ready
  useEffect(() => {
    if (!inboundShare) return;

    if (!hasDeliveredInbound.current &&
        messagesUsername &&
        messagesConnectionId &&
        socketReady &&
        socket) {
      console.log("[MessageScreen - Inbound] Delivering inbound payload once:", inboundShare,
                  "username:", messagesUsername, "connId=", messagesConnectionId);

      // ✅ Only send over socket here
      messageSend(messagesConnectionId, inboundShare.payload.text);

      // ✅ Optimistic insert handled separately in responseMessageList
      hasDeliveredInbound.current = true;
      clearInboundShare();
    }
  }, [inboundShare, messagesUsername, messagesConnectionId, socketReady, socket]);


  // 🔎 Consume inbound payload passed via route params
  // useEffect(() => {
  //   if (payload) {
  //     try {
  //       const parsed = JSON.parse(payload);
  //       console.log("[MessageScreen] Consuming inbound payload:", parsed);

  //       if (parsed.kind === "text") {
  //         const text = (parsed.payload?.text || "").trim(); // ✅ always read from payload.text
  //         if (text.length > 0) {
  //           messageSend(connectionId, text);
  //         }
  //       } else if (parsed.kind === "media") {
  //         messageSend(connectionId, "", parsed.payload);
  //       }   

  //       clearInboundShare(); // ✅ clear banner/global after sending
        
  //     } catch (e) {
  //       console.error("[MessageScreen] Failed to parse inbound payload:", e);
  //     }
  //   }
  // }, [payload, connectionId, messageSend, clearInboundShare]);

  // // 🔎 Consume inbound payload from global state only when friend is selected
  // useEffect(() => {
  //   if (inboundShare && route?.params?.fromShare === "1" && route?.params?.friend) {
  //     console.log("[MessageScreen] Consuming inbound payload (global with friend):", inboundShare);

  //     if (inboundShare.kind === "text") {
  //       const text = (inboundShare.payload?.text || "").trim();
  //       if (text.length > 0) {
  //         messageSend(connectionId, text);
  //       }
  //     } else if (inboundShare.kind === "media") {
  //       messageSend(connectionId, "", inboundShare.payload);
  //     }

  //     clearInboundShare(); // ✅ clear after sending
  //     BashShareModule?.getAndConsumePendingShare?.();
  //   }
  // }, [inboundShare, connectionId, messageSend, clearInboundShare, route?.params]);



  // // 🔎 Consume pending share when screen mounts
  // useEffect(() => {
  //   if (fromShare === "1") {
  //     (async () => {
  //       try {
  //         const pending = await BashShareModule.consumePendingShare();
  //         if (pending) {
  //           console.log("[Message Inbound Share] Consuming inbound share (mount):", pending);

  //           let parsed;
  //           try {
  //             parsed = typeof pending === "string" ? JSON.parse(pending) : pending;
  //           } catch {
  //             parsed = { kind: "text", text: String(pending).trim() };
  //           }

  //           // ✅ Send immediately instead of re‑parsing or re‑setting global
  //           if (parsed.kind === "text") {
  //             const text = (parsed.text || parsed.payload?.text || "").trim();
  //             if (text.length > 0) {
  //               messageSend(connectionId, text);
  //             }
  //           } else {
  //             messageSend(connectionId, "", parsed.payload);
  //           }

  //           clearInboundShare(); // clear after sending
  //         }
  //       } catch (e) {
  //         console.error("[Message Inbound Share] Error consuming share:", e);
  //       }
  //     })();
  //   }
  // }, [fromShare, connectionId, messageSend, clearInboundShare]);


  // // Final Effect: listens to inboundShare changes and retries when socketReady changes, ensuring share is consumed as soon as possible
  // useEffect(() => {
  //   if (fromShare !== "1" || !connectionId || !socketReady || !inboundShare) return;

  //   console.log("[Message Inbound Share] Consuming inbound share:", inboundShare);

  //   if (inboundShare.kind === "text") {
  //     const text = (inboundShare.text || "").trim();
  //     if (text.length > 0) {
  //       messageSend(connectionId, text);
  //     }
  //   } else {
  //     messageSend(connectionId, "", inboundShare.payload);
  //   }

  //   clearInboundShare(); // ✅ clear after sending
  // }, [fromShare, connectionId, socketReady, inboundShare]);

  const keyboardOffset = Platform.OS === "ios" ? 60 : statusBarHeight + 30;
  const emojiPickerHeight = 300;

  const [message, setMessage] = useState("");

  // Selection state
  const [selectedMessages, setSelectedMessages] = useState([]);
  const isSelecting = selectedMessages.length > 0;

  function toggleSelect(messageId) {
    setSelectedMessages(prev =>
      prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]
    );
  }

  function clearSelection() {
    setSelectedMessages([]);
  }

  // Delete Selection
  function handleDelete() {
    // Only act if there are selected messages
    const ids = selectedMessages;
    if (!Array.isArray(ids) || ids.length === 0) return;

    const { messageDelete, applyLocalDelete } = useGlobal.getState();

    // Optimistic update: remove locally first
    applyLocalDelete(ids);
    // Notify backend for each id as implemented in global.js
    messageDelete(connectionId, ids);

    // Exit selection mode
    clearSelection();
  }

  // Forward Selection
  function handleForward() {
    const ids = selectedMessages;
    if (!Array.isArray(ids) || ids.length === 0) return;    

    // ✅ Use expo-router's router directly (no hooks inside handlers)
    router.push({
      pathname: "/Friends",
      params: {
        // strings are safest for params; Friends will normalize them
        forwardFromConnectionId: String(connectionId),
        forwardMessageIds: String(ids.join(",")),
      },
    });

    clearSelection();
  }

  // const messagesList = useGlobal((state) => state.messagesList);  
  const addMessage = useGlobal((state) => state.addMessage);
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log("[Message] Screen mounted, params:", params);
  }, [params]);  
  

  // ✅ Share Selection
  // **Helper:** infer MIME from URI
  function inferMimeFromUri(uri) {
    const ext = uri?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg": return "image/jpeg";
      case "png": return "image/png";
      case "gif": return "image/gif";
      case "webp": return "image/webp";
      case "mp4": return "video/mp4";
      case "mov": return "video/quicktime";
      case "m4a": return "audio/m4a";
      case "aac": return "audio/aac";
      case "mp3": return "audio/mpeg";
      case "wav": return "audio/wav";
      default: return undefined;
    }
  }

  // **Helper:** derive a cache filename from the URL
  function getFilenameFromUri(uri, fallback = "share") {
    try {
      const last = uri.split("?")[0].split("/").pop();
      return last || fallback;
    } catch {
      return fallback;
    }
  }


  // **Helper:** download remote URL to a local file, return file:// URI
  // ✅ Download helper with MIME inference
  async function downloadToCache(remoteUri, fallbackName, expectedMime) {
    const filename = getFilenameFromUri(remoteUri, fallbackName);
    const localPath = FileSystem.cacheDirectory + filename;

    // http(s) → download; content:// or file:// → copy
    if (/^https?:\/\//i.test(remoteUri)) {
      await FileSystem.downloadFileAsync(remoteUri, localPath);
    } else {
      const file = new File(remoteUri);
      await file.copy(localPath);
    }

    const fileUri = localPath.startsWith("file://") ? localPath : "file://" + localPath;
    const type = expectedMime || inferMimeFromUri(remoteUri);
    return { url: fileUri, type };
  }


  // **Helper:** build payload for a single message (async because of downloads)
  // ✅ Build payload for a single message
  async function getPayloadForSingleAsync(m) {
    if (m.text) {
      return { message: m.text };
    }
    if (m.image) {
      const mime = inferMimeFromUri(m.image) || "image/jpeg";
      return await downloadToCache(m.image, "share.jpg", mime);
    }
    if (m.voice) {
      const mime = inferMimeFromUri(m.voice) || "audio/m4a";
      return await downloadToCache(m.voice, "share.m4a", mime);
    }
    if (m.video_url) {
      const mime = inferMimeFromUri(m.video_url) || "video/mp4";
      return await downloadToCache(m.video_url, "share.mp4", mime);
    }
    return { message: "[Unsupported message type]" };
  }
  

  // ✅ Share Selection with react-native-share + local file download
  async function handleShare() {
    const ids = selectedMessages;
    if (!Array.isArray(ids) || ids.length === 0) return;

    const toShare = (messagesList || []).filter((m) => ids.includes(m.id));
    if (toShare.length === 0) return;

    try {
      if (toShare.length === 1) {
        const payload = await getPayloadForSingleAsync(toShare[0]);
        await Share.open(payload); // ✅ Correct MIME-aware payloads
      } else {
        const shareText = toShare
          .map((m) => {
            if (m.text) return m.text;
            if (m.image) return "[Image]";
            if (m.voice) return "[Voice]";
            if (m.video_url) return "[Video]";
            return "[Unsupported]";
          })
          .join("\n\n");

        await Share.open({ message: shareText });
      }
    } catch (e) {
      console.log("[Share] Error:", e);
    }

    clearSelection();
  }
  
  // const loadMoreMessages = useGlobal((state) => state.loadMoreMessages);

  // const messageList = useGlobal((state) => state.messageList);
  // // const messageSend = useGlobal((state) => state.messageSend);
  // const messageType = useGlobal((state) => state.messageType); 
  // // const socket = useGlobal((state) => state.socket); // ✅ use socket instead of connection
  // // const socketReady = useGlobal((state) => state.socketReady);
  // const socketConnect = useGlobal((state) => state.socketConnect);

  // Ensure we actively connect when arriving (e.g., via Share) and socket isn’t ready
  useEffect(() => {
    if (!socketReady) {
      console.log("[Message] socketReady=false → invoking socketConnect()");
      socketConnect(); // triggers auth check and websocket setup
    }
  }, [socketReady, socketConnect]);

  // Optional: visibility into readiness changes
  useEffect(() => {
    console.log("[Message] socketReady changed:", socketReady);
  }, [socketReady]);


  const inputRef = useRef(null);

  const [keyboardHeight, setKeyboardHeight] = useState(300); // default fallback
  const slideAnim = useRef(new Animated.Value(emojiPickerHeight)).current;

  const [layoutReady, setLayoutReady] = useState(false);
  const [recording, setRecording] = useState(null);
  const isRecording = !!recording; // true if recording object exists
  const [recordingUri, setRecordingUri] = useState(null);

  // const filteredMessages =
  //   messagesList?.filter((msg) => String(msg.connection_id) === String(connectionId)) || [];
  // Show messages only for the active friend/chat
  
  // const { messagesUsername, messagesConnectionId } = useGlobal.getState();
  // const byId = messagesConnectionId && messagesConnectionId === connectionId;
  // const byUser = friend?.username && messagesUsername === friend.username;
  // const isActiveChat = byId || byUser;
  // const chatMessages = isActiveChat ? (messagesList || []) : [];
  // const groupedSections = useMemo(() => groupMessagesByDay(chatMessages), [chatMessages]);

  const byId = messagesConnectionId && messagesConnectionId === connectionId;
  const byUser = friend?.username && messagesUsername === friend.username;
  const isActiveChat = byId || byUser;
  // const chatMessages = isActiveChat ? (messagesList || []) : [];
  // const groupedSections = useMemo(() => groupMessagesByDay(chatMessages), [chatMessages]);


  const messagesTyping = useGlobal((s) => s.messagesTyping);
  const [showTyping, setShowTyping] = useState(false);

  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];
  const insets = useSafeAreaInsets();

  const flatListRef = useRef(null); 
  

  // Styles
  const styles = StyleSheet.create({
    headerTitle: {
      fontFamily: currentTheme.fontFamily.header,
      fontSize: currentTheme.fontSize.md,
      color: currentTheme.colors.headerText,
    },
    messageText: {
      fontFamily: currentTheme.fontFamily.regular,
      fontSize: currentTheme.fontSize.md,
      color: currentTheme.colors.textPrimary,
    },
    inputWrapper: {      
      backgroundColor: currentTheme.colors.background,
      paddingBottom: 0,   // ✅ no extra bottom padding
    },
    emojiTray: {
      height: emojiPickerHeight,
      backgroundColor: currentTheme.colors.background,
      borderTopWidth: 1,
      borderColor: currentTheme.colors.border,
    },
    emojiPicker: {
      flex: 1,
      backgroundColor: currentTheme.colors.background,
    },
  });

  // Show Typing - only for the active chat
  useEffect(() => {
    if (!isActiveChat || !messagesTyping) {
      setShowTyping(false);
      return;
    }
    setShowTyping(true);
    const timer = setInterval(() => {
      const now = new Date();
      const ms = now - messagesTyping;
      if (ms > 10000) setShowTyping(false);
    }, 1000);
    return () => clearInterval(timer);
  }, [isActiveChat, messagesTyping]);
  

  // Emoji picker slide animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showEmojiPicker ? 0 : emojiPickerHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showEmojiPicker]);

  // Keyboard event listeners
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setShowEmojiPicker(false);   // ✅ auto-close emoji tray
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });    

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // New Keyboard Animation
  useEffect(() => {
    const showAnim = Keyboard.addListener("keyboardWillShow", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    const hideAnim = Keyboard.addListener("keyboardWillHide", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });

    return () => {
      showAnim.remove();
      hideAnim.remove();
    };
  }, []);


  // Request messages when connectionId changes and socket ready
  // useEffect(() => {
  //   if (!socketReady) { // (!connection || connection.readyState !== 1)
  //     console.log("[MessageScreen] Socket not ready");
  //     return;
  //   }
  //   if (!connectionId) {
  //     console.log("[MessageScreen] Missing connectionId");
  //     return;
  //   }
  //   console.log("[MessageScreen] Requesting messages for:", connectionId);
  //   messageList(connectionId);

  //   // ✅ Trigger "seen" for any unseen messages in this chat
  //   chatMessages
  //     .filter(msg => !msg.is_me && !msg.seen)
  //     .forEach(msg => {
  //       socket.send(JSON.stringify({
  //         source: "message.seen",
  //         connectionId,
  //         messageId: msg.id
  //       }));
  //     });
  // }, [socketReady, connectionId]);

  // ✅ Use a Set to track which connections have already been requested
  const requestedRef = useRef(new Set());

  // ✅ Select once at top level with shallow comparison
  const existingMessagesCount = useGlobal(
    (s) => (s.messagesByConnection?.[messagesConnectionId]?.length ?? 0)
  );

  console.log("[Message.jsx] activeConnectionId:", activeConnectionId,
            "chatMessagesCount:", chatMessagesCount,
            "chatMessages sample:", chatMessages.slice(0,3));

  console.log("[Message.jsx] messagesList length:", messagesList.length,
            "messagesByConnection keys:", Object.keys(useGlobal.getState().messagesByConnection || {}),
            "messagesByConnection[activeConnectionId] length:",
            useGlobal.getState().messagesByConnection?.[activeConnectionId]?.length || 0);


  // Effect 1: request messages only once per connection/socket change
  useEffect(() => {
    console.log("[Effect1] socketReady:", socketReady,
                "messagesConnectionId:", messagesConnectionId,
                "alreadyRequested:", requestedRef.current.has(messagesConnectionId),
                "existingMessagesCount:", existingMessagesCount);

    if (!socketReady || !socket || !messagesConnectionId) return;
    if (requestedRef.current.has(messagesConnectionId)) return;

    if (existingMessagesCount === 0) {
      console.log("[Effect1] Requesting messages for connId:", messagesConnectionId);
      messageListFn(messagesConnectionId);
      requestedRef.current.add(messagesConnectionId);
    }
  }, [socketReady, messagesConnectionId, existingMessagesCount]);

  // Effect 2: mark messages as seen when chatMessages changes
  useEffect(() => {
    console.log("[Effect2] socketReady:", socketReady,
                "activeConnectionId:", activeConnectionId,
                "chatMessages length:", chatMessages.length);

    if (!socketReady || !activeConnectionId) return;

    const unseen = chatMessages.filter(msg => !msg.is_me && !msg.seen);
    if (unseen.length === 0) return;

    unseen.forEach(msg => {
      console.log("[Effect2] Marking message as seen:", msg.id);
      socket.send(JSON.stringify({
        source: "message.seen",
        connectionId: activeConnectionId,
        messageId: msg.id
      }));
    });
  }, [socketReady, activeConnectionId, chatMessagesCount]);

  useEffect(() => {
    console.log('[MessageScreen] Requesting messages for:', connectionId);
    console.log('[MessageScreen] friend:', friend?.username);
  }, [connectionId, friend?.username]);

  useEffect(() => {
    const s = useGlobal.getState();
    console.log('[Store] messagesUsername:', s.messagesUsername);
    console.log('[Store] messagesConnectionId:', s.messagesConnectionId);
    console.log('[Store] messagesList length:', s.messagesList?.length ?? 0);
  });

  function onSend() {
    const cleaned = message.replace(/\s+/g, " ").trim();
    if (cleaned.length === 0) return;
    messageSend(connectionId, cleaned);
    setMessage("");
  }
  
  // Voice Recording
  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  // Stop recording and send message
  async function stopRecording() {
    try {
      if (!recording) {
        console.warn("[stopRecording] No active recording");
        return;
      }

      // Stop and unload the recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingUri(uri);

      console.log("Recorded URI:", uri);

      // ✅ Read file directly as base64 using FileSystem
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filename = `voice_${Date.now()}.m4a`;

      // Send the voice message payload
      messageSend(connectionId, "", {
        base64,
        filename,
        voice: uri, // keep URI for immediate playback
      });
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  }


  // Typing indicator
  function onType(value) {
    setMessage(value);
    if (friend?.username) {
      messageType(friend.username);
    }
  }

  // Image Picker
  async function onPickImage(source = "library") {
    console.log("[onPickImage] Source:", source);

    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();

    if (!mediaPerm.granted || !cameraPerm.granted) {
      alert("Camera and gallery permissions are required!");
      return;
    }

    const pickerOptions = {
      quality: 0.8,
      mediaTypes:ImagePicker.MediaTypeOptions.Images, // ✅ updated// ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
    };

    let result = null;

    try {
      result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      console.log("Picker result:", result);
    } catch (err) {
      console.error("[Camera launch failed]", err);
      return;
    }

    let asset = null;
    if (!result.canceled) {
      if (result.assets?.length > 0) {
        asset = result.assets[0];
      } else if (result.uri) {
        asset = { uri: result.uri };
      }
    }

    if (!asset) {
      console.warn("No valid image asset found");
      return;
    }

    console.log("Selected asset:", asset);

    if (!asset?.uri || typeof asset.uri !== "string") {
      console.error("Invalid asset URI:", asset.uri);
      return;
    }

    try {
      const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });

      if (!manipulated.base64) {
        console.error("No base64 found after manipulation");
        return;
      }

      messageSend(connectionId, "", {
        //base64: `data:image/jpeg;base64,${manipulated.base64}`,
        base64: manipulated.base64,
        filename: `image_${Date.now()}.jpg`,
      });
    } catch (err) {
      console.error("Manipulation failed:", err);
    }
  }

  // Video Picker
  async function onPickVideo(source = "library") {
    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();

    if (!mediaPerm.granted || !cameraPerm.granted) {
      alert("Camera and gallery permissions are required!");
      return;
    }

    const pickerOptions = {
      //mediaTypes: [ImagePicker.MediaType.video],
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    };

    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    // ✅ robust guards: ensure we have an asset before proceeding
    if (result?.canceled || !result?.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    const res = await fetch(asset.uri);
    const blob = await res.blob();
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = String(reader.result).split(",")[1] || "";

      // ✅ payload aligned with your backend serializer fields
      messageSend(connectionId, "", {
        video: base64String,
        video_url: asset.uri,
        video_filename: `video_${Date.now()}.mp4`,
        video_thumb_url: asset.thumbnailBase64 || null,  // may be undefined for videos
        video_duration: asset.duration ?? null,
      });
    };

    reader.readAsDataURL(blob);
  }

    

  // Helpful logs (optional)
  useEffect(() => {
    console.log("connectionId:", connectionId);  
    console.log("messagesUsername:", useGlobal.getState().messagesUsername);
    console.log("chatMessages:", chatMessages.length);
    console.log("params friend:", friend);
  }, [connectionId, chatMessages.length, friend]);

  // Track keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  
  // New Return block to solve the black row
  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}   // ✅ padding for iOS, height for Android
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}   // ✅ header height offset
      >
        <SafeAreaView
          edges={keyboardVisible ? ['top'] : ['top','bottom']}    // ✅ drop bottom inset when keyboard is open
          //edges={['top', 'bottom']}
          style={{ flex: 1, backgroundColor: currentTheme.colors.background }}
        >
          {/* Header */}
          <ChatHeader
            friend={friend}
            showDelete={isSelecting}
            onDelete={handleDelete}
            onForward={handleForward}
            onCancelSelection={clearSelection}
            onShare={handleShare}
            selectedMessages={selectedMessages}
          />

          <ImageBackground source={bg} style={{ flex: 1 }}>
            {/* Messages list */}
            <SectionList
              ref={flatListRef}
              sections={groupedSections}
              inverted
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  friend={friend}
                  isSelected={selectedMessages.includes(item.id)}
                  isSelecting={isSelecting}
                  onLongPress={() => toggleSelect(item.id)}
                  onPress={() => {
                    if (isSelecting) toggleSelect(item.id);
                  }}
                />
              )}
              renderSectionFooter={({ section: { title } }) => (
                <View style={{ alignItems: "center", marginVertical: 10 }}>
                  <Text
                    style={{
                      backgroundColor: currentTheme.colors.inputBackground,
                      color: currentTheme.colors.textSecondary,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      fontSize: currentTheme.fontSize.sm,
                    }}
                  >
                    {title}
                  </Text>
                </View>
              )}
              ListHeaderComponent={
                showTyping ? <MessageBubbleFriend friend={friend} typing={true} /> : null
              }
              contentContainerStyle={{ paddingTop: currentTheme.spacing.lg }}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={false}
              removeClippedSubviews={true}
              keyboardDismissMode="on-drag"
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              onEndReached={() => {
                console.log("[MessageScreen] Load older messages…");
                loadMoreMessages(connectionId);
              }}
              onEndReachedThreshold={0.2}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />

            {/* Input bar */}
            <View style={styles.inputWrapper}>
              <MessageInput
                message={message}
                setMessage={onType}
                onSend={onSend}
                inputRef={inputRef}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                startRecording={startRecording}
                stopRecording={stopRecording}
                onPickImage={onPickImage}
                onPickVideo={onPickVideo}
                recording={isRecording}
              />
            </View>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <View style={styles.emojiTray}>
                <EmojiPicker
                  onSelect={(emoji) => {
                    setMessage((prev) => prev + emoji);
                    if (friend?.username) {
                      messageType(friend.username);
                    }
                  }}
                  columns={8}
                  style={{
                    height: 300,
                    backgroundColor: currentTheme.colors.inputBackground,
                    borderTopLeftRadius: currentTheme.radius.md,
                    borderTopRightRadius: currentTheme.radius.md,
                    paddingTop: currentTheme.spacing.sm,
                  }}
                  emojiStyle={{ fontSize: currentTheme.fontSize.lg }}
                />
              </View>
            )}
          </ImageBackground>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

