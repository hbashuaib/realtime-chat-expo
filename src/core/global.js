// src/core/global.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ADDRESS } from './api';
import secure from './secure';
import utils from './utils';

//---------------------------------------
//    Socket Receive Message Handlers
//---------------------------------------

function responseFriendList(set, get, friendList) {
  set(() => ({ friendList: Array.isArray(friendList) ? friendList : [] }));
}

function responseFriendNew(set, get, friend) {
  const current = get().friendList;
  const safe = Array.isArray(current) ? current : [];
  set(() => ({ friendList: [friend, ...safe] }));
}

// function responseMessageList(set, get, data) {
//   const currentPage = get().messagesPage || 0;
//   const isFirstPage = currentPage === 0;

//   console.log("[Debug - Inbound] responseMessageList data:", data);
  
//   set((state) => ({
//     messagesList: isFirstPage ? data.messages : [...state.messagesList, ...data.messages],
//     messagesNext: data.next,
//     messagesUsername: data.friend.username,
//     messagesConnectionId: data.connection_id ?? data.friend?.connection_id ?? null,
//     messagesPage: data.next !== null ? state.messagesPage + 1 : state.messagesPage,

//     // ✅ also set activeConnectionId here
//     activeConnectionId: data.connection_id ?? data.friend?.connection_id ?? null,
//     activeFriend: data.friend,
//   }));
// }


function responseMessageList(set, get, data) {
  const currentPage = get().messagesPage || 0;
  const isFirstPage = currentPage === 0;

  console.log("[responseMessageList] START call",
              "currentPage:", currentPage,
              "isFirstPage:", isFirstPage,
              "incoming messages length:", data.messages?.length,
              "next:", data.next,
              "friend:", data.friend?.username,
              "connection_id:", data.connection_id);

  set((state) => {
    // ✅ Normalize connection_id first
    const connIdRaw = data.connection_id ?? state.messagesConnectionId;
    const connId = data.connection_id != null && !isNaN(Number(data.connection_id))
      ? Number(data.connection_id)
      : null;
    console.log("[responseMessageList] normalized connId:", connId);

    // ✅ Get existing messages for this connection
    let existingForConn = connId != null ? (state.messagesByConnection?.[connId] || []) : [];
    console.log("[responseMessageList] existingForConn length:", existingForConn.length);

    // ✅ Build merged list
    let merged;
    if (data.messages && data.messages.length > 0) {
      const optimistic = existingForConn.filter((m) => String(m.id).startsWith("local-") || m.delivered === false);
      const preservedOptimistic = optimistic.filter(
        (m) => !data.messages.some(
          (srv) => String(srv.connection_id) === String(m.connection_id) && srv.text.trim() === m.text.trim()
        )
      );
      const nonOptimistic = existingForConn.filter((m) => !String(m.id).startsWith("local-"));
      const newServerMessages = data.messages.filter((srv) => !existingForConn.some((m) => m.id === srv.id));

      merged = isFirstPage
        ? [...nonOptimistic, ...preservedOptimistic, ...data.messages]
        : [...nonOptimistic, ...preservedOptimistic, ...existingForConn, ...newServerMessages];
    } else {
      // ✅ If no new messages, fall back to global list
      merged = existingForConn;
    }

    console.log("[responseMessageList] merged length:", merged.length);

    const lastMessage = merged.length > 0
      ? merged[merged.length - 1].text
      : state.activeFriend?.lastMessage;
    
    // ✅ Only use existingForConn as fallback, not global list
    const fallbackList = existingForConn && existingForConn.length > 0
      ? [...existingForConn]
      : [];

    const newByConn = {
      ...state.messagesByConnection,
      ...(connId != null
        ? {
            [connId]:
              merged && merged.length > 0
                ? [...merged]
                : fallbackList
          }
        : {})
    };

    console.log("[responseMessageList] after update keys:", Object.keys(newByConn),
            "length for connId:", connId, newByConn[connId]?.length || 0);
    console.log("[responseMessageList] writing messagesByConnection for connId:", connId,
            "merged length:", merged.length);
    console.log("[responseMessageList] messagesByConnection keys after update:",
            Object.keys(newByConn));
    console.log("[responseMessageList] messagesByConnection[connId] length:",
            connId != null ? newByConn[connId]?.length : "N/A");

    // ✅ Update global shortcut
    const newMessagesList = merged;

    const newActiveFriend =
      data.friend && state.activeFriend?.username === data.friend.username
        ? state.activeFriend
        : (data.friend ? { ...data.friend, lastMessage } : state.activeFriend);

    console.log("[responseMessageList] returning UPDATED state",
              "connId:", connId,
              "newMessagesList length:", newMessagesList.length,
              "messagesPage:", state.messagesPage,
              "activeFriend username:", newActiveFriend?.username,
              "messagesNext:", data.next);

    console.log("[responseMessageList] FINAL state update:",
              "activeConnectionId:", connId,
              "messagesUsername:", data.friend?.username,
              "slice length:", newByConn[connId]?.length || 0);

    console.log("[responseMessageList] FINAL state:",
              "activeConnectionId:", state.activeConnectionId,
              "messagesConnectionId:", state.messagesConnectionId,
              "messagesUsername:", state.messagesUsername);


    return {
      ...state,
      messagesByConnection: newByConn,
      messagesList: newMessagesList,
      messagesNext: data.next,
      messagesUsername: data.friend?.username ?? state.messagesUsername,
      // ✅ Only update IDs if data.connection_id is present
      messagesConnectionId: data.connection_id != null ? connId : state.messagesConnectionId,
      activeConnectionId: data.connection_id != null ? connId : state.activeConnectionId,
      messagesPage: data.next !== null ? (state.messagesPage ?? 0) + 1 : state.messagesPage ?? 0,
      activeFriend: newActiveFriend,
    };

    console.log("[responseMessageList] FINAL state after return:",
        "activeConnectionId:", state.activeConnectionId,
        "messagesConnectionId:", state.messagesConnectionId,
        "messagesUsername:", state.messagesUsername,
        "slice length:", state.messagesByConnection?.[state.activeConnectionId]?.length || 0);

  });
}



// function responseMessageSend(set, get, data) {
//   if (!data?.message || !data?.friend) return;
//   const username = data.friend.username;
//   const activeId = get().messagesConnectionId;
//   const message = {
//     ...(data.message || {}),
//     waveform: Array.isArray(data.message?.waveform) ? data.message.waveform : [],
//     video_url: data.message?.video_url ?? null,
//     video_thumb_url: data.message?.video_thumb_url ?? null,
//     video_duration: data.message?.video_duration ?? null,
//   };
//   const currentFriends = get().friendList;
//   const safeFriendList = Array.isArray(currentFriends) ? [...currentFriends] : [];
//   const friendIndex = safeFriendList.findIndex(item => item.friend.username === username);
//   if (friendIndex >= 0) {
//     const item = { ...safeFriendList[friendIndex] };
//     item.preview = data.message.text;
//     item.updated = data.message.created;
//     const next = [...safeFriendList];
//     next.splice(friendIndex, 1);
//     next.unshift(item);
//     set(() => ({ friendList: next }));
//   }
//   if (activeId && message.connection_id && activeId !== message.connection_id) return;
//   if (username !== get().messagesUsername) return;
//   const messagesList = [...get().messagesList, message];
//   set(() => ({ messagesList, messagesTyping: null }));
// }

// New responseMessageSend with optimistic insert and friend preview update
function responseMessageSend(set, get, data) {
  if (!data?.message || !data?.friend) return;
  const username = data.friend.username;
  const activeId = get().messagesConnectionId;

  // ✅ Mark as optimistic
  const message = {
    id: `local-${Date.now()}`,
    ...(data.message || {}),
    delivered: false,
    waveform: Array.isArray(data.message?.waveform) ? data.message.waveform : [],
    video_url: data.message?.video_url ?? null,
    video_thumb_url: data.message?.video_thumb_url ?? null,
    video_duration: data.message?.video_duration ?? null,
  };

  // ✅ Update friend preview
  const currentFriends = get().friendList;
  const safeFriendList = Array.isArray(currentFriends) ? [...currentFriends] : [];
  const friendIndex = safeFriendList.findIndex(item => item.friend.username === username);
  if (friendIndex >= 0) {
    const item = { ...safeFriendList[friendIndex] };
    item.preview = data.message.text;
    item.updated = data.message.created;
    const next = [...safeFriendList];
    next.splice(friendIndex, 1);
    next.unshift(item);
    set(() => ({ friendList: next }));
  }

  // ✅ Only append if active chat matches
  if (activeId && message.connection_id && activeId !== message.connection_id) return;
  if (username !== get().messagesUsername) return;

  // ✅ Update both global shortcut and per-connection store
  const currentByConn = get().messagesByConnection || {};
  const existingForConn = currentByConn[message.connection_id] || [];
  const updatedForConn = [...existingForConn, message];

  set(() => ({
    messagesList: updatedForConn, // shortcut for active chat
    messagesByConnection: {
      ...currentByConn,
      [message.connection_id]: updatedForConn,
    },
    messagesTyping: null,
  }));
}


function responseMessageType(set, get, data) {
  if (data.username !== get().messagesUsername) return;
  set(() => ({ messagesTyping: new Date() }));
}

function responseRequestAccept(set, get, connection) {
  const user = get().user;
  if (user.username === connection.receiver.username) {
    const requestList = [...get().requestList];
    const requestIndex = requestList.findIndex(request => request.id === connection.id);
    if (requestIndex >= 0) {
      requestList.splice(requestIndex, 1);
      set(() => ({ requestList }));
    }
  }
  const sl = get().searchList;
  if (!sl) return;
  const searchList = [...sl];
  let searchIndex = -1;
  if (user.username === connection.receiver.username) {
    searchIndex = searchList.findIndex(u => u.username === connection.sender.username);
  } else {
    searchIndex = searchList.findIndex(u => u.username === connection.receiver.username);
  }
  if (searchIndex >= 0) {
    searchList[searchIndex].status = 'connected';
    set(() => ({ searchList }));
  }
}

function responseRequestConnect(set, get, connection) {
  const user = get().user;
  if (user.username === connection.sender.username) {
    const searchList = [...get().searchList];
    const searchIndex = searchList.findIndex(req => req.username === connection.receiver.username);
    if (searchIndex >= 0) {
      searchList[searchIndex].status = 'pending-them';
      set(() => ({ searchList }));
    }
  } else {
    const requestList = [...get().requestList];
    const requestIndex = requestList.findIndex(req => req.sender.username === connection.sender.username);
    if (requestIndex === -1) {
      requestList.unshift(connection);
      set(() => ({ requestList }));
    }
  }
}

function responseRequestList(set, get, requestList) {
  set(() => ({ requestList }));
}

function responseSearch(set, get, data) {
  set(() => ({ searchList: data }));
}

function responseThumbnail(set, get, data) {
  set(() => ({ user: data }));
}

function responseMessageSeen(set, get, data) {
  set((state) => ({
    messagesList: state.messagesList.map(msg =>
      msg.id === data.id ? { ...msg, seen: true } : msg
    )
  }));
}

function responseMessageDeleted(set, get, data) {
  set((state) => ({
    messagesList: state.messagesList.filter(m => m.id !== data.messageId)
  }));
}

//---------------------------------------
//    Global Store
//---------------------------------------

const useGlobal = create(
  persist(
    (set, get) => ({
      //--------------------------
      // Active Chat Context
      //--------------------------
      activeFriend: null,
      activeConnectionId: null,

      // ✅ Debug logs at startup
      debugLogState: () => {
        console.log("[Debug - Inbound] activeFriend:", get().activeFriend);
        console.log("[Debug - Inbound] activeConnectionId:", get().activeConnectionId);
        console.log("[Debug - Inbound] socketReady:", get().socketReady);
      },

      setActiveFriend: (friend) => {
        set(() => ({ activeFriend: friend }));
        // 🚨 also set connectionId if friend has one
        if (friend?.connection_id) {
          set(() => ({ activeConnectionId: friend.connection_id }));
        }
      },

      setActiveConnectionId: (id) => {
        set(() => ({ activeConnectionId: id }));
      },

      clearActiveFriend: () => {
        set(() => ({ activeFriend: null, activeConnectionId: null }));
      },

      //--------------------------
      // Inbound Share Queue
      //--------------------------
      inboundShare: null,
      setInboundShare: (payload) => set(() => ({ inboundShare: payload })),
      clearInboundShare: () => set(() => ({ inboundShare: null })),

      //--------------------------
      // Initialization
      //--------------------------
      initialized: false,

      //--------------------------
      // Theme Mode
      //--------------------------
      themeMode: null,
      toggleTheme: () => {
        set((state) => {
          const next = state.themeMode === 'light' ? 'dark' : 'light';
          return { themeMode: next };
        });
        const current = get().themeMode;
        secure.set('themeMode', current);
      },
      setTheme: async (scheme) => {
        await secure.set('themeMode', scheme);
        set(() => ({ themeMode: scheme }));
      },

      init: async () => {
        const savedTheme = await secure.get('themeMode');
        set(() => ({ themeMode: savedTheme || 'light' }));
        const credentials = await secure.get('credentials');
        if (credentials) {
          try {
            const response = await api({
              method: 'POST',
              url: '/chat/signin/',
              data: credentials
            });
            if (response.status !== 200) throw 'Authentication error!';
            const user = response.data.user;
            const tokens = response.data.tokens;
            secure.set('tokens', tokens);
            set(() => ({ initialized: true, authenticated: true, user }));
            try { get().socketConnect(); } catch (err) {
              utils.log("[Init] socketConnect failed:", err);
            }
            return;
          } catch (error) {
            console.log('useGlobal.init:', error);
          }
        }
        set(() => ({ initialized: true }));
      },

      //--------------------------
      // Authentication
      //--------------------------
      authenticated: false,
      user: {},
      login: (credentials, user, tokens) => {
        secure.set('credentials', credentials);
        secure.set('tokens', tokens);
        set(() => ({ authenticated: true, user }));
      },
      logout: () => {
        secure.wipe();
        set(() => ({ authenticated: false, user: {} }));
      },

      //--------------------------
      // WebSocket
      //--------------------------
      socket: null,
      socketReady: false,
      socketConnecting: false,

      socketConnect: async () => {
        if (get().socketConnecting || get().socketReady || get().socket) return;
        set(() => ({ socketConnecting: true }));

        const tokens = await secure.get('tokens');
        if (!tokens?.access) {
          utils.log("[Socket] No valid tokens on socketConnect");
          set(() => ({ socketConnecting: false, socketReady: false }));
          return;
        }

        const url = `wss://${ADDRESS}/chat/?token=${tokens.access}`;
        utils.log("[Socket] Connecting to:", url);

        const socket = new WebSocket(url);
        utils.log("[Debug - Inbound] socketConnect created WebSocket:", socket);

        // Immediately store socket object so it's never null
        set(() => ({ socket }));

        socket.onopen = () => {
          utils.log('socket.onopen');
          console.log("[Debug - Inbound] socket connected");

          set(() => ({
            socketReady: true,
            socketConnecting: false,        
            socket, // ✅ ensure socket is set here too    
          }));          

          // Initial requests once connected
          socket.send(JSON.stringify({ type: 'request.list' }));
          socket.send(JSON.stringify({ type: 'friend.list' }));
          socket.send(JSON.stringify({ type: 'message.list' }));
        };        

        // socket.onmessage with error handling and debug logs
        socket.onmessage = (event) => {
          let parsed;
          try {
            parsed = JSON.parse(event.data);
          } catch (err) {
            utils.log("[Error - Inbound] Failed to parse onmessage:", err, event.data);
            return;
          }

          utils.log("[Debug - Inbound] onmessage received:", parsed);

          const responses = {
            'friend.list': responseFriendList,
            'friend.new': responseFriendNew,
            'message.list': responseMessageList,
            'message.send': responseMessageSend,
            'message.type': responseMessageType,
            'request.accept': responseRequestAccept,
            'request.connect': responseRequestConnect,
            'request.list': responseRequestList,
            'search': responseSearch,
            'thumbnail': responseThumbnail,
            'message.seen': responseMessageSeen,
            'message.deleted': responseMessageDeleted,
          };

          const resp = responses[parsed.source];
          if (!resp) {
            utils.log("[Debug - Inbound] parsed.source not found:", parsed.source);
            return;
          }

          if (!parsed.data) {
            utils.log("[Debug - Inbound] parsed.data missing for source:", parsed.source);
            return;
          }

          resp(set, get, parsed.data);
        };


        socket.onerror = (e) => {
          utils.log('socket.onerror', e.message);
        };

        socket.onclose = (e) => {
          utils.log('socket.onclose', e.code, e.reason);
          set(() => ({ socketReady: false, socketConnecting: false, socket: null }));

          // Auto-reconnect with guard
          const retryMs = 2000;
          setTimeout(() => {
            const { authenticated } = get();
            if (authenticated) {
              utils.log("[Socket] Attempting auto-reconnect…");
              get().socketConnect();
            } else {
              utils.log("[Socket] Not authenticated; skipping auto-reconnect.");
            }
          }, retryMs);
        };

        set(() => ({ socket }));
      },

      socketClose: () => {
        const socket = get().socket;
        if (socket) {
          try { socket.close(); } catch {}
        }
        set(() => ({
          socket: null,
          socketReady: false,
          socketConnecting: false,
        }));
      },

      //--------------------------
      // Search
      //--------------------------
      searchList: null,

      searchUsers: (query) => {
        const socket = get().socket;
        if (query && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'search',
            query
          }));
        } else if (!query) {
          set(() => ({ searchList: null }));
        } else {
          utils.log("[Socket] Not connected, cannot send search");
        }
      },

      //--------------------------
      // Friends
      //--------------------------
      friendList: null,

      //--------------------------
      // Messages
      //--------------------------
      messagesList: [],
      messagesByConnection: {},
      messagesNext: null,
      messagesPage: 0,
      messagesTyping: null,

      // ✅ Active chat context values
      messagesUsername: null,
      setMessagesUsername: (username) => set(() => ({ messagesUsername: username })),   // NEW
      messagesConnectionId: null,
      setMessagesConnectionId: (id) => set(() => ({ messagesConnectionId: id })),      // NEW

      // messageList: (connectionId, page = 0) => {
      //   const socket = get().socket;
      //   if (!socket || socket.readyState !== WebSocket.OPEN) {
      //     utils.log("[Socket] Not connected, cannot send message.list");
      //     return;
      //   }

      //   if (page === 0) {
      //     set((state) => ({
      //       messagesList: [],
      //       messagesNext: null,
      //       messagesTyping: null,
      //       // ✅ correctly reference the current state
      //       messagesUsername: state.messagesUsername,
      //       messagesConnectionId: state.messagesConnectionId,       
      //       messagesPage: 0
      //     }));
      //   } else {
      //     set(() => ({ messagesNext: null }));
      //   }

      //   socket.send(JSON.stringify({
      //     type: 'message.list',
      //     connectionId,
      //     page
      //   }));
      // },

      
      messageList: (connectionId, page = 0) => {
        const socket = get().socket;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          utils.log("[Socket] Not connected, cannot send message.list");
          return;
        }

        // ✅ Guard: don’t request if we already have messages for this connection and page=0
        const existing = get().messagesByConnection?.[connectionId] || [];
        utils.log("[messageList] connId:", connectionId, "page:", page, "existing length:", existing.length);

        if (page === 0 && existing.length > 0) {
          utils.log("[Global] Already have messages for connId:", connectionId);
          return;
        }

        if (page === 0 && existing.length === 0) {
          utils.log("[messageList] resetting messagesList for connId:", connectionId);
          set((state) => ({
            messagesList: state.messagesList,   // ✅ don’t clear if already populated
            messagesNext: null,
            messagesTyping: null,
            messagesUsername: state.messagesUsername,
            messagesConnectionId: state.messagesConnectionId,       
            messagesPage: 0
          }));
        } else if (page > 0) {
          set(() => ({ messagesNext: null }));
        }

        socket.send(JSON.stringify({
          type: 'message.list',
          connectionId,
          page
        }));
      },


      loadMoreMessages: (connectionId) => {
        const next = get().messagesNext;
        if (next !== null) {
          get().messageList(connectionId, next);
        } else {
          utils.log("[Global] No more messages to load");
        }
      },

      // Helper: add inbound share directly to list
      addInboundMessage: (connectionId, text) => {
        set((state) => ({
          messagesList: [
            {
              id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // ✅ unique ID
              connection_id: connectionId,
              is_me: true,
              text,
              image: null,
              voice: null,
              video_url: null,
              video_thumb_url: null,
              video_duration: null,
              delivered: false,            // stays false until server confirms
              seen: false,
              created: new Date().toISOString(),
            },
            ...state.messagesList,
          ],
        }));
      },
      

      // New messageSend with optimistic insert + debug logs
      messageSend: (connectionId, message, media = null) => {
        const socket = get().socket;

        utils.log("[Debug - Inbound] messageSend invoked. socketReadyState:", socket?.readyState,
                  "connectionId:", connectionId, "message:", message);

        if (!socket || socket.readyState !== WebSocket.OPEN) {
          utils.log("[Socket - Inbound] Not connected, cannot send message.send");
          return;
        }

        // ✅ Optimistically insert into local store so UI shows immediately
        get().addInboundMessage(connectionId, message);        

        const data = {
          connection_id: connectionId,
          message: {
            text: message,
            created: new Date().toISOString(),
          },
          friend: { username: get().messagesUsername }
        };

        // Attach media if present
        if (media) {
          if (media.base64 && media.filename) {
            const ext = media.filename.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png'].includes(ext)) {
              data.message.image = media.base64;
              data.message.image_filename = media.filename;
            } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
              data.message.voice = media.base64;
              data.message.voice_filename = media.filename;
            }
          }
          if (media.video && media.video_filename) {
            data.message.video = media.video;
            data.message.video_filename = media.video_filename;
            data.message.video_url = media.video_url;
            data.message.video_thumb_url = media.video_thumb_url;
            data.message.video_duration = media.video_duration;
          }
        }

        const payload = {
          source: 'message.send',
          data,
        };

        utils.log("[Debug - Inbound] Sending payload:", payload);

        try {
          socket.send(JSON.stringify(payload));
          utils.log("[Debug - Inbound] socket.send executed successfully");
        } catch (err) {
          utils.log("[Error - Inbound] socket.send failed:", err);
        }
      },


      messageType: (username) => {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'message.type',
            username
          }));
        } else {
          utils.log("[Socket] Not connected, cannot send message.type");
        }
      },

      messageDelete: (connectionId, messageIds = []) => {
        const socket = get().socket;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          utils.log("[Socket] Not connected, cannot send message.delete");
          return;
        }
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;
        messageIds.forEach(id => {
          socket.send(JSON.stringify({
            type: 'message.delete',
            connectionId,
            messageId: id
          }));
        });
      },

      applyLocalDelete: (ids = []) => {
        set(state => ({
          messagesList: state.messagesList.filter(m => !ids.includes(m.id))
        }));
      },

      messageForward: (fromConnectionId, toConnectionId, messageIds = []) => {
        const socket = get().socket;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          utils.log("[Socket] Not connected, cannot send message.forward");
          return;
        }
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;
        socket.send(JSON.stringify({
          type: 'message.forward',
          fromConnectionId,
          toConnectionId,
          messageIds
        }));
      },

      addMessage: (msg) => {
        set((state) => ({
          messagesList: [
            ...state.messagesList,
            { id: Date.now(), ...msg }
          ]
        }));
      },

      //--------------------------
      // Requests
      //--------------------------
      requestList: null,

      requestAccept: (username) => {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'request.accept',
            username
          }));
        } else {
          utils.log("[Socket] Not connected, cannot send request.accept");
        }
      },

      requestConnect: (username) => {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'request.connect',
            username
          }));
        } else {
          utils.log("[Socket] Not connected, cannot send request.connect");
        }
      },


      //--------------------------
      // Thumbnail
      //--------------------------
      uploadThumbnail: (file) => {
        const socket = get().socket;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'thumbnail',
            base64: file.base64,
            filename: file.fileName
          }));
        } else {
          utils.log("[Socket] Not connected, cannot send thumbnail");
        }
      }
    }),
    {
      name: "bashchat-global", // storage key in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // ✅ exclude raw socket object from persistence
      partialize: (state) => ({
        inboundShare: state.inboundShare,
        initialized: state.initialized,
        themeMode: state.themeMode,
        authenticated: state.authenticated,
        user: state.user,
        socketReady: state.socketReady,
        socketConnecting: state.socketConnecting,
        searchList: state.searchList,
        friendList: state.friendList,
        messagesList: state.messagesList,
        messagesNext: state.messagesNext,
        messagesPage: state.messagesPage,
        messagesTyping: state.messagesTyping,
        messagesUsername: state.messagesUsername,
        requestList: state.requestList,
        // 🚨 persist activeFriend and activeConnectionId
        activeFriend: state.activeFriend,
        activeConnectionId: state.activeConnectionId,
      }),
    }
  )
);

// ✅ Export the raw store object so it exists at runtime
export const globalStore = useGlobal;
export default useGlobal;





// // src/core/global.js
// import { create } from 'zustand'
// import { persist, createJSONStorage } from 'zustand/middleware';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import api, { ADDRESS } from './api'
// import secure from './secure'
// import utils from './utils'

// //---------------------------------------
// //    Socket Receive Message Hundlers
// //---------------------------------------

// function responseFriendList(set, get, friendList) {
//     set((state) => ({
//         friendList: Array.isArray(friendList) ? friendList : []
//     }))
// }

// function responseFriendNew(set, get, friend) {
//     //const friendList = [friend, ...get().friendList]
//     const current = get().friendList
//     const safe = Array.isArray(current) ? current : []

//     set((state) => ({
//         friendList: [friend, ...safe]
//     }))
// }

// function responseMessageList(set, get, data) {
//     console.log('[responseMessageList] Received:', data);

//     const currentPage = get().messagesPage || 0
//     const isFirstPage = currentPage === 0

//     set((state) => ({
//         //messagesList: [...get().messagesList, ...data.messages],
//         messagesList: isFirstPage // Newly changed
//             ? data.messages
//             : [...state.messagesList, ...data.messages],
//         messagesNext: data.next,
//         messagesUsername: data.friend.username,
//         messagesConnectionId: data.connection_id ?? data.friend?.connection_id ?? null, // track id when provided
//         messagesPage: data.next !== null // Newly added
//             ? state.messagesPage + 1
//             : state.messagesPage

//     }))
// }


// // Latest responseMessageSend
// function responseMessageSend(set, get, data) {
//     if (!data?.message || !data?.friend) return;

//     const username = data.friend.username;
//     const activeId = get().messagesConnectionId;

//     console.log('[responseMessageSend] image:', data.message.image);

//     // Safely construct message object FIRST
//     const message = {
//         ...(data.message || {}),
//         waveform: Array.isArray(data.message?.waveform)
//             ? data.message.waveform
//             : [],
//         video_url: data.message?.video_url ?? null,
//         video_thumb_url: data.message?.video_thumb_url ?? null,
//         video_duration: data.message?.video_duration ?? null,
//     };

//     // Update friend preview
//     const currentFriends = get().friendList;
//     const safeFriendList = Array.isArray(currentFriends) ? [...currentFriends] : [];
//     const friendIndex = safeFriendList.findIndex(
//         item => item.friend.username === username
//     );
//     if (friendIndex >= 0) {
//         const item = { ...safeFriendList[friendIndex] };
//         item.preview = data.message.text;
//         item.updated = data.message.created;
//         const next = [...safeFriendList];
//         next.splice(friendIndex, 1);
//         next.unshift(item);
//         set(() => ({ friendList: next }));
//     }

//     // ✅ Now check connection_id safely
//     if (activeId && message.connection_id && activeId !== message.connection_id) return;
//     if (username !== get().messagesUsername) return;

//     // ✅ Append instead of prepend
//     const messagesList = [...get().messagesList, message];

//     set(() => ({
//         messagesList,
//         messagesTyping: null
//     }));
// }

// function responseMessageType(set, get, data) {
//     if (data.username !== get().messagesUsername) return
//     set((state) => ({
//         messagesTyping: new Date()
//     }))
// }

// function responseRequestAccept(set, get, connection) {
//     const user = get().user
//     // If I was the one that made the connect request,
//     // remove request from the requestList
//     if (user.username === connection.receiver.username) {
//         const requestList = [...get().requestList]
//         const requestIndex = requestList.findIndex(
//             request => request.id === connection.id
//         )
//         if (requestIndex >= 0) {
//             requestList.splice(requestIndex, 1)
//             set((state) => ({
//                 requestList: requestList
//             }))
//         }
//     } 
//     // If the corresponding user is contained within the
//     // searchList for the acceptor or the acceptee, update
//     // the state of the searchList item.
//     const sl = get().searchList
//     if (sl === null) {
//         return
//     }
//     const searchList = [...sl]

//     let searchIndex = -1
//     // If this user accepted
//     if (user.username === connection.receiver.username) {
//         searchIndex = searchList.findIndex(
//             user => user.username === connection.sender.username
//         )
//     } else {
//         searchIndex = searchList.findIndex(
//             user => user.username === connection.receiver.username
//         )
//     }
//     if (searchIndex >= 0) {
//         searchList[searchIndex].status = 'connected'
//         set((state) => ({
//             searchList: searchList
//         }))
//     }
// }

// function responseRequestConnect(set, get, connection) {
//     const user = get().user
//     // If I was the one that made the connect request,
//     // update the search list row
//     if (user.username === connection.sender.username) {
//         const searchList = [...get().searchList]
//         const searchIndex = searchList.findIndex(
//             request => request.username === connection.receiver.username
//         )
//         if (searchIndex >= 0) {
//             searchList[searchIndex].status = 'pending-them'
//             set((state) => ({
//                 searchList: searchList
//             }))
//         }

//     } else {
//         // If they were the one that sent the connect
//         // request, add request to request list
//         const requestList = [...get().requestList]
//         const requestIndex = requestList.findIndex(
//             request => request.sender.username === connection.sender.username
//         )
//         if (requestIndex === -1) {
//             requestList.unshift(connection)
//             set((state) => ({
//                 requestList: requestList
//             }))
//         }
//     }
// }


// function responseRequestList(set, get, requestList) {
//     set((state) => ({
//         requestList: requestList
//     }))
// }


// function responseSearch(set, get, data) {
//     set((state) => ({
//         searchList: data
//     }))
// }

// function responseThumbnail(set, get, data) {
//     set((state) => ({
//         user: data
//     }))
// }

// // Message Seen Handler
// function responseMessageSeen(set, get, data) {
//   set((state) => {
//     const updated = state.messagesList.map(msg =>
//       msg.id === data.id ? { ...msg, seen: true } : msg
//     );
//     return { messagesList: updated };
//   });
// }

// function responseMessageDeleted(set, get, data) {
//   set(state => ({
//     messagesList: state.messagesList.filter(m => m.id !== data.messageId)
//   }));
// }


// const useGlobal = create(
//     persist(
//         (set, get) => ({
//             //--------------------------
//             //      Inbound Share Queue
//             //--------------------------
//             inboundShare: null,
//             setInboundShare: (payload) => set(() => ({ inboundShare: payload })),
//             clearInboundShare: () => set(() => ({ inboundShare: null })),

//             //--------------------------
//             //      Initialization
//             //--------------------------
//             initialized: false,

//             //--------------------------
//             //      Theme Mode
//             //--------------------------    
//             themeMode: null, // start as null
            
//             toggleTheme: () => {
//                 set((state) => {
//                     const next = state.themeMode === 'light' ? 'dark' : 'light';
//                     return { themeMode: next };
//                 });
//                 const current = get().themeMode;
//                 secure.set('themeMode', current);
//             },

//             setTheme: async (scheme) => {
//             await secure.set('themeMode', scheme);
//             set(() => ({ themeMode: scheme }));
//             },    
            

//             init: async () => {
//                 // restore saved theme first
//                 const savedTheme = await secure.get('themeMode');
//                 if (savedTheme) {
//                     set(() => ({ themeMode: savedTheme }));
//                 } else {
//                     set(() => ({ themeMode: 'light' })); // fallback
//                 }

//                 const credentials = await secure.get('credentials')
//                 utils.log('Global Init Credentials: ', credentials)
//                 if (credentials) {
//                     try {
//                         const response = await api({
//                             method: 'POST',
//                             url: '/chat/signin/',
//                             data: {
//                                 username: credentials.username,
//                                 password: credentials.password
//                             }
//                         })
//                         if (response.status !== 200) {
//                             throw 'Authentication error!'
//                         }
//                         const user = response.data.user  
//                         const tokens = response.data.tokens
                        
//                         secure.set('tokens', tokens)

//                         set((state) => ({
//                             initialized: true,
//                             authenticated: true,
//                             user: user
//                         }))

//                         // Kick off socket connection immediately after successful login restoration
//                         try {
//                         get().socketConnect();
//                         } catch (err) {
//                         utils.log("[Init] socketConnect failed:", err);
//                         }

//                         return

//                     } catch (error) {
//                         console.log('useGlobal.init: ', error)
//                     }            
//                 }
//                 set((state) => ({
//                     initialized: true,            
//                 }))
//             },

//             //--------------------------
//             //      Authentication
//             //--------------------------
//             authenticated: false,
//             user: {},

//             login: (credentials, user, tokens) => {
//                 utils.log('Global login Credentials: ', credentials)
//                 secure.set('credentials', credentials)
//                 secure.set('tokens', tokens)
//                 set((state) => ({
//                     authenticated: true,
//                     user: user
//                 }))
//             },

//             logout: () => {
//                 secure.wipe()
//                 set((state) => ({
//                     authenticated: false,
//                     user: {}
//                 }))
//             },

//             //--------------------------
//             //      WebSocket
//             //--------------------------
//             socket: null,
//             socketReady: false,
//             socketConnecting: false,

//             socketConnect: async () => {
//                 // Prevent duplicate connects
//                 if (get().socketConnecting || get().socketReady || get().socket) {
//                     return;
//                 }
//                 set((state) => ({ socketConnecting: true }));

//                 const tokens = await secure.get('tokens') 

//                 if (!tokens || typeof tokens !== 'object' || !tokens.access) {
//                     utils.log("[Socket] No valid tokens on socketConnect; are we launching from Share before init?");
//                     set(() => ({ socketConnecting: false, socketReady: false }));
//                     return;
//                 }

//                 utils.log("[Auth] Tokens object:", tokens);

//                 // If we reach here, tokens are valid
//                 const url = `wss://${ADDRESS}/chat/?token=${tokens.access}`
//                 utils.log("[Socket] Connecting to:", url);

//                 const socket = new WebSocket(url) 

//                 socket.onopen = () => {
//                     utils.log('socket.onopen')
//                     //console.log('[WebSocket] Connected');

//                     set((state) => ({ socketReady: true, socketConnecting: false }));
                    
//                     socket.send(JSON.stringify({
//                         // source: 'request.list'
//                         type: 'request.list'
//                     }))

//                     socket.send(JSON.stringify({
//                         // source: 'friend.list'
//                         type: 'friend.list'
//                     }))

//                     socket.send(JSON.stringify({ 
//                         // source: 'message.list'
//                         type: 'message.list'                  
//                     }));
//                 }

//                 socket.onmessage = (event) => {
//                     // Convert data to javascrtipt object
//                     const parsed = JSON.parse(event.data)

//                     // Debug log formatted data
//                     utils.log('onmessage: ', parsed)

//                     const responses = {
//                         'friend.list': responseFriendList,
//                         'friend.new': responseFriendNew,
//                         'message.list': responseMessageList,
//                         'message.send': responseMessageSend,
//                         'message.type': responseMessageType,
//                         'request.accept': responseRequestAccept,
//                         'request.connect': responseRequestConnect,
//                         'request.list': responseRequestList,
//                         'search': responseSearch,
//                         'thumbnail': responseThumbnail,
//                         'message.seen': responseMessageSeen,
//                         'message.deleted': responseMessageDeleted,
//                     }

//                     const resp= responses[parsed.source]
//                     if (!resp) {
//                         utils.log('parsed.source "' + parsed.source + '" not found')
//                         return
//                     }

//                     // Call response function
//                     resp(set, get, parsed.data)
//                 }
//                 socket.onerror = (e) => {
//                     utils.log('socket.onerror', e.message)
//                 }
//                 // socket.onclose = (e) => {
//                 //     utils.log('socket.onclose',e.code, e.reason)
//                 //     set((state) => ({ socketReady: false, socketConnecting: false }));
//                 // }
//                 socket.onclose = (e) => {
//                     utils.log('socket.onclose', e.code, e.reason);
//                     set(() => ({ socketReady: false, socketConnecting: false, socket: null }));

//                     // Optional auto-reconnect with a small delay (guards inside socketConnect prevent duplicates)
//                     const retryMs = 2000;
//                     setTimeout(() => {
//                         const { authenticated } = get();
//                         if (authenticated) {
//                         utils.log("[Socket] Attempting auto-reconnect…");
//                         get().socketConnect();
//                         } else {
//                         utils.log("[Socket] Not authenticated; skipping auto-reconnect.");
//                         }
//                     }, retryMs);
//                 };
//                 set((state) => ({
//                     socket: socket,            
//                 }))
//             },

//             socketClose: () => {
//                 const socket = get().socket
//                 if (socket) {
//                     try { socket.close(); } catch {}
//                 }
//                 set((state) => ({
//                     socket: null,
//                     socketReady: false,
//                     socketConnecting: false,
//                 }))
//             },

//             //--------------------------
//             //      Search
//             //--------------------------

//             searchList: null,

//             searchUsers: (query) => {
//                 if (query) {
//                     const socket = get().socket
//                     socket.send(JSON.stringify({
//                         // source: 'search',
//                         type: 'search',
//                         query: query                
//                     }))
//                 } else {
//                     set((state) => ({
//                         searchList: null
//                     }))
//                 }        
//             },


//             //--------------------------
//             //      Friends
//             //--------------------------

//             friendList: null,

//             //--------------------------
//             //      Messages
//             //--------------------------

//             messagesList: [],
//             messagesNext: null,
//             messagesPage: 0, // Newly added
//             messagesTyping: null,
//             messagesUsername: null,

//             messageList: (connectionId, page=0) => {
//                 const socket = get().socket
//                 if (!socket) return; // prevent send before connect

//                 if (page === 0) {
//                     set((state) => ({
//                         messagesList: [],
//                         messagesNext: null,
//                         messagesTyping: null,
//                         messagesUsername: null,
//                         messagesPage: 0 // Newly added
//                     }))
//                 } else {
//                     set((state) => ({                
//                         messagesNext: null                
//                     }))
//                 }
//                 //const socket = get().socket
//                 socket.send(JSON.stringify({
//                     // source: 'message.list',
//                     type: 'message.list',
//                     connectionId,
//                     page
//                     //connectionId: connectionId,
//                     //page: page
//                 })) 
//             },

//             // Pagination Load More Messages
//             loadMoreMessages: (connectionId) => {
//                 const next = get().messagesNext;   // backend-provided "next" value
//                 console.log("[Global] Loading more messages, next:", next);

//                 if (next !== null) {
//                     // Use the backend's next value directly
//                     get().messageList(connectionId, next);
//                 } else {
//                     console.log("[Global] No more messages to load");
//                 }
//             },

//             // Latest messageSend with media support
//             messageSend: (connectionId, message, media = null) => {
//             const socket = get().socket;
//             if (!socket) return;

//             const payload = {
//                 source: 'message.send',
//                 connectionId,
//                 message, // always send text/emoji
//             };

//             if (media) {
//                 // Optional image/voice
//                 if (media.base64 && media.filename) {
//                 const ext = media.filename.split('.').pop().toLowerCase();
//                 if (['jpg', 'jpeg', 'png'].includes(ext)) {
//                     payload.image = media.base64;
//                     payload.image_filename = media.filename;
//                 } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
//                     payload.voice = media.base64;
//                     payload.voice_filename = media.filename;
//                 }
//                 }

//                 // Optional video
//                 if (media.video && media.video_filename) {
//                 payload.video = media.video;
//                 payload.video_filename = media.video_filename;
//                 payload.video_url = media.video_url;
//                 payload.video_thumb_url = media.video_thumb_url;
//                 payload.video_duration = media.video_duration;
//                 }
//             }

//             socket.send(JSON.stringify(payload));
//             },   
            

//             messageType: (username) => {
//                 const socket = get().socket
//                 if (socket && socket.readyState === WebSocket.OPEN) {
//                     socket.send(JSON.stringify({
//                         type: 'message.type',          
//                         username: username
//                     }));
//                 } else {
//                     utils.log("[Socket] Not connected, cannot send request.connect");
//                 }

//                 // socket.send(JSON.stringify({
//                 //     // source: 'message.type',  
//                 //     type: 'message.type',          
//                 //     username: username
//                 // })) 
//             },

//             messageDelete: (connectionId, messageIds = []) => {
//                 const socket = get().socket;
//                 if (!socket || !Array.isArray(messageIds) || messageIds.length === 0) return;
//                 messageIds.forEach(id => {
//                     socket.send(JSON.stringify({
//                     // source: 'message.delete',
//                     type: 'message.delete',
//                     connectionId,
//                     messageId: id
//                     }));
//                 });
//             },

//             applyLocalDelete: (ids = []) => {
//                 set(state => ({
//                     messagesList: state.messagesList.filter(m => !ids.includes(m.id))
//                 }));
//             },

//             messageForward: (fromConnectionId, toConnectionId, messageIds = []) => {
//                 const socket = get().socket;
//                 if (!socket || !Array.isArray(messageIds) || messageIds.length === 0) return;
//                 socket.send(JSON.stringify({
//                     // source: 'message.forward',
//                     type: 'message.forward',
//                     fromConnectionId,
//                     toConnectionId,
//                     messageIds
//                 }));
//             },

//             // Add a message locally (used for inbound shares)
//             addMessage: (msg) => {
//                 set((state) => ({
//                     messagesList: [
//                         ...state.messagesList,
//                         {
//                             id: Date.now(), // generate a local id (replace with UUID if you prefer)
//                             ...msg
//                         }
//                     ]
//                 }));
//             },


//             //--------------------------
//             //      Requests
//             //--------------------------

//             requestList: null,

//             requestAccept: (username) => {
//                 const socket = get().socket
//                 if (socket && socket.readyState === WebSocket.OPEN) {
//                     socket.send(JSON.stringify({
//                         type: 'request.accept',
//                         username: username
//                     }));
//                 } else {
//                     utils.log("[Socket] Not connected, cannot send request.connect");
//                 }

//                 // socket.send(JSON.stringify({
//                 //     // source: 'request.accept',
//                 //     type: 'request.accept',
//                 //     username: username
//                 // }))            
//             },

//             requestConnect: (username) => {
//                 const socket = get().socket
//                 if (socket && socket.readyState === WebSocket.OPEN) {
//                     socket.send(JSON.stringify({
//                         type: 'request.connect',
//                         username
//                     }));
//                 } else {
//                     utils.log("[Socket] Not connected, cannot send request.connect");
//                 }

//                 // socket.send(JSON.stringify({
//                 //     // source: 'request.connect',
//                 //     type: 'request.connect',
//                 //     username: username
//                 // }))            
//             },


//             //--------------------------
//             //      Thumbnail
//             //--------------------------
//             uploadThumbnail: (file) => {
//                 const socket = get().socket
//                 if (socket && socket.readyState === WebSocket.OPEN) {
//                     socket.send(JSON.stringify({
//                         type: 'thumbnail',
//                         base64: file.base64,
//                         filename: file.fileName
//                     }));
//                 } else {
//                     utils.log("[Socket] Not connected, cannot send request.connect");
//                 }

//                 // socket.send(JSON.stringify({
//                 //     // source: 'thumbnail',
//                 //     type: 'thumbnail',
//                 //     base64: file.base64,
//                 //     filename: file.fileName
//                 // }))
//             }
//         }),
//         {
//         name: "bashchat-global", // ✅ storage key in AsyncStorage
//         storage: createJSONStorage(() => AsyncStorage), // ✅ correct RN usage
//         }
//     )
// )

// // ✅ Export the raw store object so it exists at runtime
// export const globalStore = useGlobal;

// export default useGlobal
