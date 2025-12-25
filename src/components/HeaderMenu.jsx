// src/components/HeaderMenu.jsx
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import * as FileSystem from "expo-file-system";
import { File } from "expo-file-system"; // new File API
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Menu, MenuOption, MenuOptions, MenuTrigger, renderers } from 'react-native-popup-menu';
import Share from "react-native-share";

import { useColorScheme } from '@/hooks/use-color-scheme';
import useGlobal from "@/src/core/global";
import { theme } from '@/src/core/theme';
import { router } from 'expo-router';

const { Popover } = renderers;

const Divider = ({ color }) => (
  <View
    style={{
      height: 1,
      backgroundColor: color,
      marginVertical: 6,
    }}
  />
);

const HeaderMenu = ({ screen, selectedMessages = [] }) => {
  const options = {
    Friends: ['New Group', 'Archived', 'Settings', 'About'],
    Requests: ['Refresh', 'Sort by Date', 'Help'],
    Profile: ['Edit Profile', 'Theme', 'Logout'],
    Message: ['View contact', 'Search', 'Clear chat', 'Share']
  };

  const optionIcons = {
    "New Group": "users",
    "Archived": "box-archive",
    "Settings": "cog",
    "About": "info-circle",
    "Refresh": "sync",
    "Sort by Date": "sort",
    "Help": "question-circle",
    "Edit Profile": "user-edit",
    "Theme": "palette",
    "Logout": "sign-out-alt",
    "View contact": "address-book",
    "Search": "search",
    "Clear chat": "trash",
    "Share": "share-nodes",
  };

  const slideAnim = useRef(new Animated.Value(-10)).current;
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme];

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={{ paddingRight: currentTheme.spacing.sm }}>
      <Menu
        renderer={Popover}
        rendererProps={{
          placement: 'bottom',
          preferredPlacement: 'bottom',
          anchorStyle: { marginTop: 0 },
        }}
      >
        <MenuTrigger
          customStyles={{
            TriggerTouchableComponent: TouchableOpacity,
            triggerWrapper: {
              padding: currentTheme.spacing.sm,
              justifyContent: 'center',
              alignItems: 'center',
            },
          }}
        >
          <FontAwesomeIcon
            icon={faEllipsisVertical}
            size={20}
            color={currentTheme.colors.textPrimary}
          />
        </MenuTrigger>

        <MenuOptions
          customStyles={{
            optionsContainer: {
              marginTop: 8,
              zIndex: 1000,
              elevation: 10,
              backgroundColor: currentTheme.colors.inputBackground,
              borderColor: currentTheme.colors.border,
              borderWidth: 1,
              borderRadius: currentTheme.radius.sm,
              paddingVertical: 6,
              paddingHorizontal: 8,
              minWidth: 160,
            },
          }}
        >
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            {(options[screen] || []).map((label, index) => (
              <React.Fragment key={index}>
                {label === "About" && (
                  <Divider color={currentTheme.colors.border} />
                )}
                <MenuOption
                  onSelect={async () => {
                    if (label === "About") {
                      router.push("/About");
                    } else if (label === "Share") {
                      const { messagesList } = useGlobal.getState();
                      const selectedIds = selectedMessages || [];
                      const toShare = (messagesList || []).filter(m => selectedIds.includes(m.id));
                      if (toShare.length === 0) return;

                      // Helpers
                      const inferMimeFromUri = (uri) => {
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
                      };
                      const getFilenameFromUri = (uri, fallback = "share") => {
                        try {
                          const last = uri.split("?")[0].split("/").pop();
                          return last || fallback;
                        } catch {
                          return fallback;
                        }
                      };
                      const downloadToCache = async (remoteUri, fallbackName, expectedMime) => {
                        const filename = getFilenameFromUri(remoteUri, fallbackName);
                        const localPath = FileSystem.cacheDirectory + filename;

                        if (/^https?:\/\//i.test(remoteUri)) {
                          await FileSystem.downloadFileAsync(remoteUri, localPath);
                        } else {
                          const file = new File(remoteUri);
                          await file.copy(localPath);
                        }

                        const fileUri = localPath.startsWith("file://") ? localPath : "file://" + localPath;
                        const type = expectedMime || inferMimeFromUri(remoteUri);
                        return { url: fileUri, type };
                      };
                      const getPayloadForSingleAsync = async (m) => {
                        if (m.text) return { message: m.text };
                        if (m.image) return await downloadToCache(m.image, "share.jpg", "image/jpeg");
                        if (m.voice) return await downloadToCache(m.voice, "share.m4a", "audio/m4a");
                        if (m.video_url) return await downloadToCache(m.video_url, "share.mp4", "video/mp4");
                        return { message: "[Unsupported message type]" };
                      };

                      try {
                        if (toShare.length === 1) {
                          const payload = await getPayloadForSingleAsync(toShare[0]);
                          await Share.open(payload);
                        } else {
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
                        console.log("[HeaderMenu Share] Error:", e);
                      }
                    } else {
                      // handle other options later
                    }
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FontAwesomeIcon
                      icon={optionIcons[label]}
                      size={16}
                      color={
                        label === "Clear chat" || label === "Logout"
                          ? currentTheme.colors.actionRed   // 🔴 destructive actions
                          : currentTheme.colors.actionBlue  // 🔵 normal actions
                      }
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        color: currentTheme.colors.textPrimary,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                </MenuOption>
              </React.Fragment>
            ))}
          </Animated.View>
        </MenuOptions>
      </Menu>
    </View>
  );
};

export default HeaderMenu;




// // src/components/HeaderMenu.jsx
// import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
// import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// import * as FileSystem from "expo-file-system";
// import React, { useEffect, useRef } from 'react';
// import { Animated, Text, TouchableOpacity, View } from 'react-native';
// import { Menu, MenuOption, MenuOptions, MenuTrigger, renderers } from 'react-native-popup-menu';
// import Share from "react-native-share";

// import { useColorScheme } from '@/hooks/use-color-scheme';
// import useGlobal from "@/src/core/global";
// import { theme } from '@/src/core/theme';
// import { router } from 'expo-router';

// const { Popover, SlideInMenu } = renderers;

// const Divider = ({ color }) => (
//   <View
//     style={{
//       height: 1,
//       backgroundColor: color,
//       marginVertical: 6,
//     }}
//   />
// );

// const HeaderMenu = ({ screen, selectedMessages = [] }) => {
//   const options = {
//     Friends: ['New Group', 'Archived', 'Settings', 'About'],
//     Requests: ['Refresh', 'Sort by Date', 'Help'],
//     Profile: ['Edit Profile', 'Theme', 'Logout'],
//     Message: ['View contact', 'Search', 'Clear chat', 'Share']
//   };

//   // Add this mapping near the top of HeaderMenu.jsx
//   const optionIcons = {
//     "New Group": "users",
//     "Archived": "box-archive",
//     "Settings": "cog",
//     "About": "info-circle",
//     "Refresh": "sync",
//     "Sort by Date": "sort",
//     "Help": "question-circle",
//     "Edit Profile": "user-edit",
//     "Theme": "palette",
//     "Logout": "sign-out-alt",
//     "View contact": "address-book",
//     "Search": "search",
//     "Clear chat": "trash",
//     "Share": "share-nodes",
//   };

//   const slideAnim = useRef(new Animated.Value(-10)).current;
//   const colorScheme = useColorScheme();
//   const currentTheme = theme[colorScheme];

//   useEffect(() => {
//     Animated.timing(slideAnim, {
//       toValue: 0,
//       duration: 200,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   return (
//     <View style={{ paddingRight: currentTheme.spacing.sm }}>
//       <Menu
//         renderer={Popover}
//         rendererProps={{
//           placement: 'bottom',
//           preferredPlacement: 'bottom',
//           anchorStyle: { marginTop: 0 },
//           //verticalOffset: 40,
//         }}        
//       >
//         <MenuTrigger
//           customStyles={{
//             TriggerTouchableComponent: TouchableOpacity,
//             triggerWrapper: {
//               padding: currentTheme.spacing.sm,
//               justifyContent: 'center',
//               alignItems: 'center',
//             },
//           }}
//         >
//           <FontAwesomeIcon
//             icon={faEllipsisVertical}
//             size={20}
//             color={currentTheme.colors.textPrimary}
//           />
//         </MenuTrigger>

//         <MenuOptions
//           customStyles={{
//             optionsContainer: {
//               //backgroundColor: 'yellow', // debug
//               // ensure the menu appears above the header
//               marginTop: 8,
//               zIndex: 1000,
//               elevation: 10,
//               backgroundColor: currentTheme.colors.inputBackground,
//               borderColor: currentTheme.colors.border,
//               borderWidth: 1,
//               borderRadius: currentTheme.radius.sm,
//               paddingVertical: 6,
//               paddingHorizontal: 8,
//               minWidth: 160,
//             },
//           }}
//         >
//           <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
//             {(options[screen] || []).map((label, index) => (
//               <React.Fragment key={index}>
//                 {label === "About" && (
//                   <Divider color={currentTheme.colors.border} />
//                 )}
//                 <MenuOption
//                   onSelect={async () => {
//                     if (label === "About") {
//                       router.push("/About");
//                     } else if (label === "Share") {  
//                       const { messagesList } = useGlobal.getState();
//                       const selectedIds = selectedMessages || [];
//                       const toShare = (messagesList || []).filter(m => selectedIds.includes(m.id));
//                       if (toShare.length === 0) return;

//                       // Helpers
//                       const inferMimeFromUri = (uri) => {
//                         const ext = uri?.split(".").pop()?.toLowerCase();
//                         switch (ext) {
//                           case "jpg":
//                           case "jpeg": return "image/jpeg";
//                           case "png": return "image/png";
//                           case "webp": return "image/webp";
//                           case "mp4": return "video/mp4";
//                           case "m4a": return "audio/m4a";
//                           case "aac": return "audio/aac";
//                           case "mp3": return "audio/mpeg";
//                           default: return undefined;
//                         }
//                       };
//                       const getFilenameFromUri = (uri, fallback = "share") => {
//                         try {
//                           const last = uri.split("?")[0].split("/").pop();
//                           return last || fallback;
//                         } catch {
//                           return fallback;
//                         }
//                       };
//                       const downloadToCache = async (remoteUri, fallbackName, expectedMime) => {
//                         const filename = getFilenameFromUri(remoteUri, fallbackName);
//                         const localPath = FileSystem.cacheDirectory + filename;
//                         await FileSystem.downloadAsync(remoteUri, localPath);
//                         const fileUri = localPath.startsWith("file://") ? localPath : "file://" + localPath;
//                         const type = expectedMime || inferMimeFromUri(remoteUri);
//                         return { url: fileUri, type };
//                       };
//                       const getPayloadForSingleAsync = async (m) => {
//                         if (m.text) return { message: m.text };
//                         if (m.image) return await downloadToCache(m.image, "share.jpg", "image/jpeg");
//                         if (m.voice) return await downloadToCache(m.voice, "share.m4a", "audio/m4a");
//                         if (m.video_url) return await downloadToCache(m.video_url, "share.mp4", "video/mp4");
//                         return { message: "[Unsupported message type]" };
//                       };

//                       try {
//                         if (toShare.length === 1) {
//                           const payload = await getPayloadForSingleAsync(toShare[0]);
//                           await Share.open(payload);
//                         } else {
//                           const shareText = toShare.map(m => {
//                             if (m.text) return m.text;
//                             if (m.image) return "[Image]";
//                             if (m.voice) return "[Voice]";
//                             if (m.video_url) return "[Video]";
//                             return "[Unsupported]";
//                           }).join("\n\n");

//                           await Share.open({ message: shareText });
//                         }
//                       } catch (e) {
//                         console.log("[HeaderMenu Share] Error:", e);
//                       }                        
//                     } else {
//                       // handle other options later
//                     }
//                   }} 
//                 >
//                   <View style={{ flexDirection: "row", alignItems: "center" }}>
//                     <FontAwesomeIcon
//                       icon={optionIcons[label]}
//                       size={16}
//                       color={
//                         label === "Clear chat" || label === "Logout"
//                           ? currentTheme.colors.actionRed   // 🔴 destructive actions
//                           : currentTheme.colors.actionBlue  // 🔵 normal actions
//                       }
//                       style={{ marginRight: 8 }}
//                     />
//                     <Text
//                       style={{
//                         fontSize: 15,
//                         color: currentTheme.colors.textPrimary,
//                       }}
//                     >
//                       {label}
//                     </Text>
//                   </View>

//                   {/* <Text
//                     style={{
//                       fontSize: 15,
//                       color: currentTheme.colors.textPrimary,
//                     }}
//                   >
//                     {label}
//                   </Text> */}
//                 </MenuOption>
//               </React.Fragment>              
//             ))}
//           </Animated.View>
//         </MenuOptions>
//       </Menu>
//     </View>
//   );
// };

// export default HeaderMenu;




                      // const { messagesList } = useGlobal.getState();
                      // const selectedIds = selectedMessages || [];
                      // const toShare = (messagesList || []).filter(m => selectedIds.includes(m.id));
                      // if (toShare.length === 0) return;

                      // // Local helpers (copy of the ones from Message.jsx if you prefer to keep them here)
                      // const inferMimeFromUri = (uri) => {
                      //   const ext = uri?.split(".").pop()?.toLowerCase();
                      //   switch (ext) {
                      //     case "jpg":
                      //     case "jpeg": return "image/jpeg";
                      //     case "png": return "image/png";
                      //     case "webp": return "image/webp";
                      //     case "mp4": return "video/mp4";
                      //     case "m4a": return "audio/m4a";
                      //     case "aac": return "audio/aac";
                      //     case "mp3": return "audio/mpeg";
                      //     default: return undefined;
                      //   }
                      // };
                      // const getPayloadForSingle = (m) => {
                      //   if (m.text) return { message: m.text };
                      //   if (m.image) return { url: m.image, type: inferMimeFromUri(m.image) || "image/jpeg" };
                      //   if (m.voice) return { url: m.voice, type: inferMimeFromUri(m.voice) || "audio/m4a" };
                      //   if (m.video_url) return { url: m.video_url, type: inferMimeFromUri(m.video_url) || "video/mp4" };
                      //   return { message: "[Unsupported message type]" };
                      // };

                      // try {
                      //   if (toShare.length === 1) {
                      //     await Share.open(getPayloadForSingle(toShare[0]));
                      //   } else {
                      //     const shareText = toShare.map(m => {
                      //       if (m.text) return m.text;
                      //       if (m.image) return "[Image]";
                      //       if (m.voice) return "[Voice]";
                      //       if (m.video_url) return "[Video]";
                      //       return "[Unsupported]";
                      //     }).join("\n\n");

                      //     await Share.open({ message: shareText });
                      //   }
                      // } catch (e) {
                      //   console.log("[HeaderMenu Share] Error:", e);
                      // }                      
                  
                      // const { messagesList } = useGlobal.getState();
                      // const selectedIds = selectedMessages || [];
                      // const toShare = (messagesList || []).filter(m => selectedIds.includes(m.id));

                      // if (toShare.length > 0) {
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
                      //     console.log("[HeaderMenu Share] Error:", e);
                      //   }