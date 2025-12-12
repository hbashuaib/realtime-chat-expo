// src/screens/Message.jsx
import React, { memo, useMemo  } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAvoidingView, 
  LayoutAnimation,
  FlatList,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Alert,  
} from "react-native";
import Share from "react-native-share";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Thumbnail from "../common/Thumbnail";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Audio } from "expo-av";
import bg from "../assets/images/chat-background.png";
import useGlobal from "../core/global";
import VoicePlayer from "../components/VoicePlayer";
import VideoPlayer from "../components/VideoPlayer";
import WaveformView from "../components/WaveformView";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import EmojiPicker from "../components/EmojiPicker";
import { SectionList } from "react-native";
import { format, isToday, isYesterday } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import ShareMenu from "react-native-share-menu";
import * as FileSystem from "expo-file-system";



import { theme } from "@/src/core/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams, useNavigation } from "expo-router";
import HeaderMenu from '@/src/components/HeaderMenu';
import ChatHeader from "@/src/components/ChatHeader";
import { router } from "expo-router"; // ✅ use router instead of useNavigation

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
  const navigation = useNavigation();  
  const { id: connectionIdRaw, friend: friendParam } = useLocalSearchParams();
  const connectionId = Number(connectionIdRaw); // ✅ force integer

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

  const messagesList = useGlobal((state) => state.messagesList);  
    
  // ✅ Share Selection
  // **Helper:** infer MIME from URI
  function inferMimeFromUri(uri) {
    const ext = uri?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg": return "image/jpeg";
      case "png": return "image/png";
      case "webp": return "image/webp";
      case "mp4": return "video/mp4";
      case "m4a": return "audio/m4a";
      case "aac": return "audio/aac";
      case "mp3": return "audio/mpeg";
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
  async function downloadToCache(remoteUri, fallbackName, expectedMime) {
    const filename = getFilenameFromUri(remoteUri, fallbackName);
    const localPath = FileSystem.cacheDirectory + filename; // e.g., .../Cache/share.jpg
    await FileSystem.downloadAsync(remoteUri, localPath);
    // react-native-share expects a file:// prefix
    const fileUri = localPath.startsWith("file://") ? localPath : "file://" + localPath;
    const type = expectedMime || inferMimeFromUri(remoteUri);
    return { url: fileUri, type };
  }

  // Helper: normalize shared item into your messageSend payload
  async function toBashChatPayload(item) {
    // item: {mimeType, data, extra, type} varies by OS/source
    // Common cases:
    // - Text: item.data (string)
    // - Media: item.data (uri or array), item.mimeType (e.g., image/*, video/*, audio/*)
    const mime = (item?.mimeType || "").toLowerCase();

    // Text/emoji
    if (mime === "text/plain" || typeof item?.data === "string" && !mime.startsWith("image/") && !mime.startsWith("video/") && !mime.startsWith("audio/")) {
      return { kind: "text", text: String(item.data || "") };
    }

    // Single media URI (Android often provides content:// or file://)
    const uri = Array.isArray(item?.data) ? item.data[0] : item?.data;
    if (typeof uri !== "string" || uri.length === 0) {
      return { kind: "text", text: "[Unsupported share payload]" };
    }

    // Extract filename fallback
    const filename = getFilenameFromUri(uri, "shared");

    // Convert to base64 (best-effort). Expo FileSystem reads file://; content:// may need copy.
    let base64 = null;
    try {
      // Attempt to read directly
      base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch (e) {
      // Fallback: copy to cache then read
      try {
        const cachePath = FileSystem.cacheDirectory + filename;
        await FileSystem.copyAsync({ from: uri, to: cachePath });
        base64 = await FileSystem.readAsStringAsync(cachePath, { encoding: FileSystem.EncodingType.Base64 });
      } catch (e2) {
        console.log("[Share] Failed to read shared URI:", e, e2);
      }
    }

    // Map by mime type to your messageSend fields
    if (mime.startsWith("image/")) {
      return {
        kind: "image",
        payload: { base64, filename: filename.endsWith(".jpg") ? filename : `${filename}.jpg` },
      };
    }
    if (mime.startsWith("video/")) {
      return {
        kind: "video",
        payload: {
          video: base64,
          video_filename: filename.endsWith(".mp4") ? filename : `${filename}.mp4`,
          // Optional extras if provided by source app
          video_url: uri,
          video_thumb_url: null,
          video_duration: null,
        },
      };
    }
    if (mime.startsWith("audio/")) {
      return {
        kind: "voice",
        payload: {
          base64,
          filename: filename.endsWith(".m4a") ? filename : `${filename}.m4a`,
          voice: uri, // for immediate local playback
        },
      };
    }

    // Default fallback to text
    return { kind: "text", text: uri };
  }


  // **Helper:** build payload for a single message (async because of downloads)
  async function getPayloadForSingleAsync(m) {
    if (m.text) {
      return { message: m.text }; // text/emoji
    }
    if (m.image) {
      return await downloadToCache(m.image, "share.jpg", "image/jpeg");
    }
    if (m.voice) {
      return await downloadToCache(m.voice, "share.m4a", "audio/m4a");
    }
    if (m.video_url) {
      return await downloadToCache(m.video_url, "share.mp4", "video/mp4");
    }
    return { message: "[Unsupported message type]" };
  }
  

  // ✅ Share Selection with react-native-share + local file download
  async function handleShare() {
    const ids = selectedMessages;
    if (!Array.isArray(ids) || ids.length === 0) return;

    const toShare = (messagesList || []).filter(m => ids.includes(m.id));
    if (toShare.length === 0) return;

    try {
      if (toShare.length === 1) {
        const payload = await getPayloadForSingleAsync(toShare[0]); // note: await
        await Share.open(payload);
      } else {
        // Multiple selection → fallback to readable text summary
        const shareText = toShare.map(m => {
          if (m.text) return m.text;
          if (m.image) return "[Image]";
          if (m.voice) return "[Voice]";
          if (m.video_url) return "[Video]";
          return "[Unsupported]";
        }).join("\n\n");

        await Share.open({ message: shareText });
      }
    } catch (e) {
      console.log("[Share] Error:", e);
    }

    clearSelection();
  }  
  
  const loadMoreMessages = useGlobal((state) => state.loadMoreMessages);

  const messageList = useGlobal((state) => state.messageList);
  const messageSend = useGlobal((state) => state.messageSend);
  const messageType = useGlobal((state) => state.messageType); 
  const socket = useGlobal((state) => state.socket); // ✅ use socket instead of connection
  const socketReady = useGlobal((state) => state.socketReady);


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
  const { messagesUsername, messagesConnectionId } = useGlobal.getState();
  const byId = messagesConnectionId && messagesConnectionId === connectionId;
  const byUser = friend?.username && messagesUsername === friend.username;
  const isActiveChat = byId || byUser;
  const chatMessages = isActiveChat ? (messagesList || []) : [];
  const groupedSections = useMemo(() => groupMessagesByDay(chatMessages), [chatMessages]);


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


  // Debug nav state (optional)
  useEffect(() => {
    try {
      console.log("navigation state:", navigation?.getState?.());
    } catch {}
  }, []);
 

  // Request messages when connectionId changes and socket ready
  useEffect(() => {
    if (!socketReady) { // (!connection || connection.readyState !== 1)
      console.log("[MessageScreen] Socket not ready");
      return;
    }
    if (!connectionId) {
      console.log("[MessageScreen] Missing connectionId");
      return;
    }
    console.log("[MessageScreen] Requesting messages for:", connectionId);
    messageList(connectionId);

    // ✅ Trigger "seen" for any unseen messages in this chat
    chatMessages
      .filter(msg => !msg.is_me && !msg.seen)
      .forEach(msg => {
        socket.send(JSON.stringify({
          source: "message.seen",
          connectionId,
          messageId: msg.id
        }));
      });
  }, [socketReady, connectionId]);

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
  

  // Inbound share: initial share when app is opened via share
  useEffect(() => {
    ShareMenu.getInitialShare(async (item) => {
      if (!item) return;
      try {
        console.log("[ShareMenu] initial:", item);
        const normalized = await toBashChatPayload(item);
        if (!connectionId) return; // require an active chat
        if (normalized.kind === "text") {
          const text = (normalized.text || "").trim();
          if (text.length > 0) messageSend(connectionId, text);
        } else {
          messageSend(connectionId, "", normalized.payload);
        }
      } catch (e) {
        console.log("[ShareMenu] initial error:", e);
      }
    });
  }, [connectionId, messageSend]);


  // Inbound share: while app is running / coming from background
  useEffect(() => {
    const unsubscribe = ShareMenu.addNewShareListener(async (item) => {
      if (!item) return;
      try {
        console.log("[ShareMenu] new:", item);
        const normalized = await toBashChatPayload(item);
        if (!connectionId) return;
        if (normalized.kind === "text") {
          const text = (normalized.text || "").trim();
          if (text.length > 0) messageSend(connectionId, text);
        } else {
          messageSend(connectionId, "", normalized.payload);
        }
      } catch (e) {
        console.log("[ShareMenu] new error:", e);
      }
    });
    return () => unsubscribe && unsubscribe.remove && unsubscribe.remove();
  }, [connectionId, messageSend]);


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

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingUri(uri);
      
      console.log("Recorded URI:", uri);

      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        const filename = `voice_${Date.now()}.m4a`;        

        messageSend(connectionId, "", {
          base64,
          filename,
          voice: uri,
          //newMessage
        });
        // ✅ also attach voice for immediate playback
        //newMessage.voice = newMessage.localUri;
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  }

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


// Map a single message to a Share.open payload
  // function getPayloadForSingle(m) {
  //   if (m.text) return { message: m.text };                // text/emoji
  //   if (m.image) return { url: m.image, type: inferMimeFromUri(m.image) || "image/jpeg" };
  //   if (m.voice) return { url: m.voice, type: inferMimeFromUri(m.voice) || "audio/m4a" };
  //   if (m.video_url) return { url: m.video_url, type: inferMimeFromUri(m.video_url) || "video/mp4" };
  //   return { message: "[Unsupported message type]" };
  // }

  // Download media locally and prepare payload
  // async function getPayloadForSingle(m) {
  //   if (m.text) return { message: m.text };

  //   if (m.image) {
  //     // Download to cache
  //     const localUri = FileSystem.cacheDirectory + 'share.jpg';
  //     await FileSystem.downloadAsync(m.image, localUri);
  //     return { url: 'file://' + localUri, type: 'image/jpeg' };
  //   }

  //   if (m.voice) {
  //     const localUri = FileSystem.cacheDirectory + 'share.m4a';
  //     await FileSystem.downloadAsync(m.voice, localUri);
  //     return { url: 'file://' + localUri, type: 'audio/m4a' };
  //   }

  //   if (m.video_url) {
  //     const localUri = FileSystem.cacheDirectory + 'share.mp4';
  //     await FileSystem.downloadAsync(m.video_url, localUri);
  //     return { url: 'file://' + localUri, type: 'video/mp4' };
  //   }

  //   return { message: "[Unsupported message type]" };
  // }

// ✅ Share Selection with react-native-share
  // async function handleShare() {
  //   const ids = selectedMessages;
  //   if (!Array.isArray(ids) || ids.length === 0) return;

  //   const toShare = (messagesList || []).filter(m => ids.includes(m.id));
  //   if (toShare.length === 0) return;

  //   try {
  //     if (toShare.length === 1) {
  //       const payload = getPayloadForSingle(toShare[0]);
  //       await Share.open(payload);
  //     } else {
  //       // Multiple selection → fallback to readable text summary
  //       const shareText = toShare.map(m => {
  //         if (m.text) return m.text;
  //         if (m.image) return "[Image]";
  //         if (m.voice) return "[Voice]";
  //         if (m.video_url) return "[Video]";
  //         return "[Unsupported]";
  //       }).join("\n\n");

  //       await Share.open({ message: shareText });
  //     }
  //   } catch (e) {
  //     console.log("[Share] Error:", e);
  //   }

  //   clearSelection();
  // }

  // async function handleShare() {
  //   const ids = selectedMessages;
  //   if (!Array.isArray(ids) || ids.length === 0) return;

  //   const toShare = (messagesList || []).filter(m => ids.includes(m.id));
  //   if (toShare.length === 0) return;

  //   try {
  //     // Case 1: Single message selected
  //     if (toShare.length === 1) {
  //       const m = toShare[0];

  //       // Text or emoji
  //       if (m.text) {
  //         await Share.share({ message: m.text });
  //       }
  //       // Image
  //       else if (m.image) {
  //         await Share.share({
  //           url: m.image,                // ✅ actual file URI
  //           message: "Shared from BashChat",
  //         });
  //       }
  //       // Voice
  //       else if (m.voice) {
  //         await Share.share({
  //           url: m.voice,                // ✅ actual file URI
  //           message: "Shared from BashChat",
  //         });
  //       }
  //       // Video
  //       else if (m.video_url) {
  //         await Share.share({
  //           url: m.video_url,            // ✅ actual file URI
  //           message: "Shared from BashChat",
  //         });
  //       }
  //       else {
  //         await Share.share({ message: "[Unsupported message type]" });
  //       }
  //     }

  //     // Case 2: Multiple messages selected → fallback to text summary
  //     else {
  //       const shareText = toShare.map(m => {
  //         if (m.text) return m.text;
  //         if (m.image) return "[Image]";
  //         if (m.voice) return "[Voice]";
  //         if (m.video_url) return "[Video]";
  //         return "[Unsupported]";
  //       }).join("\n\n");

  //       await Share.share({ message: shareText });
  //     }
  //   } catch (e) {
  //     console.log("[Share] Error:", e);
  //   }

  //   clearSelection();
  // }

  // async function handleShare() {
  //   const ids = selectedMessages;
  //   if (!Array.isArray(ids) || ids.length === 0) return;

  //   //const { messagesList } = useGlobal.getState();
  //   const toShare = (messagesList || []).filter(m => ids.includes(m.id));

  //   if (toShare.length === 0) return;

  //   // Build a concise, readable share payload
  //   const shareText = toShare.map(m => {
  //     if (m.text) return m.text;
  //     if (m.image) return `Image: ${m.image}`;
  //     if (m.voice) return `Voice: ${m.voice}`;
  //     if (m.video_url) return `Video: ${m.video_url}`;
  //     return "[Unsupported message type]";
  //   }).join("\n\n");

  //   try {
  //     await Share.share({ message: shareText });
  //   } catch (e) {
  //     console.log("[Share] Error:", e);
  //   }

  //   clearSelection();
  // }



// if (!result.canceled && result.assets?.length > 0) {
    //   const asset = result.assets[0];
    //   const res = await fetch(asset.uri);
    //   const blob = await res.blob();
    //   const reader = new FileReader();

    //   reader.onloadend = () => {
    //     const base64String = reader.result.split(",")[1];

    //     // ✅ use base64String here, not base64
    //     console.log("onPickVideo sending:", {
    //       video: base64String,
    //       video_filename: `video_${Date.now()}.mp4`,
    //       video_thumb_url: asset.thumbnailBase64,
    //       video_duration: asset.duration,
    //     });

    //     messageSend(connectionId, "", {
    //       video: base64String,                           // what messageSend expects
    //       video_filename: `video_${Date.now()}.mp4`,            // what messageSend expects
    //       video_thumb_url: asset.thumbnailBase64,         // optional
    //       video_duration: asset.duration,                       // optional
    //     });
    //   };

      //reader.readAsDataURL(blob);
    //}
  //}




//   return message.is_me ? (
//     <MessageBubbleMe
//       text={message.text}
//       image={message.image}
//       voice={message.voice}
//       waveform={message.waveform}
//       message={message}
//     />
//   ) : (
//     <MessageBubbleFriend
//       text={message.text}
//       image={message.image}
//       voice={message.voice}
//       waveform={message.waveform}
//       friend={friend}
//     />
//   );
// });

// return (
  //   <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
  //     <KeyboardAvoidingView
  //       style={{ flex: 1 }}
  //       behavior={Platform.OS === "ios" ? "padding" : "height"}
  //       //keyboardVerticalOffset={statusBarHeight > 0 ? statusBarHeight : 0}
  //       keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
  //     >
  //       <SafeAreaView
  //         edges={['bottom']}
  //         style={{ flex: 1, backgroundColor: currentTheme.colors.background }}
  //       >
  //         {/* ✅ custom header row */}
  //         <ChatHeader
  //           friend={friend}
  //           showDelete={isSelecting} // toggle true when you want a delete button
  //           onDelete={handleDelete}
  //           onForward={handleForward}
  //           onCancelSelection={clearSelection}
  //         /> 

  //         <ImageBackground source={bg} style={{ flex: 1 }}>
            
  //           {/* New Days SectionList */}
  //           <SectionList
  //             ref={flatListRef}
  //             //sections={groupMessagesByDay(chatMessages)}
  //             sections={groupedSections}
  //             inverted
  //             keyExtractor={(item) => String(item.id)}
  //             renderItem={({ item }) => (
  //               <MessageBubble 
  //                 message={item} 
  //                 friend={friend} 
  //                 isSelected={selectedMessages.includes(item.id)}
  //                 isSelecting={isSelecting}
  //                 onLongPress={() => toggleSelect(item.id)}
  //                 onPress={() => {
  //                   if (isSelecting) toggleSelect(item.id);
  //                 }}
  //               />
  //             )}
  //             // In inverted lists, use footer so chips appear correctly
  //             renderSectionFooter={({ section: { title } }) => (
  //               <View style={{ alignItems: "center", marginVertical: 10 }}>
  //                 <Text
  //                   style={{
  //                     backgroundColor: currentTheme.colors.inputBackground,
  //                     color: currentTheme.colors.textSecondary,
  //                     paddingHorizontal: 12,
  //                     paddingVertical: 4,
  //                     borderRadius: 12,
  //                     fontSize: currentTheme.fontSize.sm,
  //                   }}
  //                 >
  //                   {title}
  //                 </Text>
  //               </View>
  //             )}              

  //             // ListHeaderComponent with memo
  //             ListHeaderComponent={
  //               showTyping ? <MessageBubbleFriend friend={friend} typing={true} /> : null
  //             }

  //             contentContainerStyle={{
  //               paddingTop: currentTheme.spacing.lg,
  //             }}
  //             keyboardShouldPersistTaps="handled"
  //             automaticallyAdjustKeyboardInsets={false}
  //             removeClippedSubviews={true} // changed from false
  //             keyboardDismissMode="on-drag"
  //             maintainVisibleContentPosition={{
  //               minIndexForVisible: 0,
  //               autoscrollToTopThreshold: 10,
  //             }}
  //             // Pagination: scrolling up reaches the "end" in inverted lists
  //             onEndReached={() => {
  //               console.log("[MessageScreen] Load older messages…");
  //               loadMoreMessages(connectionId);
  //             }}
  //             onEndReachedThreshold={0.2}
  //             initialNumToRender={10} // Changed from 20
  //             maxToRenderPerBatch={10} // Changed from 20
  //             windowSize={5} // Changed from 10
  //           />
  //             {/* Input bar stays in layout flow */}
  //             <View style={styles.inputWrapper}>
  //               <MessageInput
  //                 message={message}
  //                 setMessage={onType}
  //                 onSend={onSend}
  //                 inputRef={inputRef}
  //                 showEmojiPicker={showEmojiPicker}
  //                 setShowEmojiPicker={setShowEmojiPicker}
  //                 startRecording={startRecording}
  //                 stopRecording={stopRecording}
  //                 onPickImage={onPickImage}
  //                 recording={isRecording}
  //               />
  //             </View>

  //             {showEmojiPicker && (
  //               <View style={styles.emojiTray}>
  //                 <EmojiPicker
  //                   onSelect={(emoji) => {
  //                     setMessage((prev) => prev + emoji);
  //                     if (friend?.username) {
  //                       messageType(friend.username);
  //                     }
  //                   }}
  //                   columns={8}
  //                   style={{
  //                     height: 300,
  //                     backgroundColor: currentTheme.colors.inputBackground,
  //                     borderTopLeftRadius: currentTheme.radius.md,
  //                     borderTopRightRadius: currentTheme.radius.md,
  //                     paddingTop: currentTheme.spacing.sm,
  //                   }}
  //                   emojiStyle={{ fontSize: currentTheme.fontSize.lg }}
  //                 />
  //               </View>
  //             )}
  //         </ImageBackground>
  //       </SafeAreaView>
  //     </KeyboardAvoidingView>
  //   </View>
  // );
