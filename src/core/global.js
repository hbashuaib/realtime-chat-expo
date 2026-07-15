// src/core/global.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ADDRESS } from './api';
import secure from './secure';
import utils from './utils';
import { jwtDecode } from "jwt-decode";

//---------------------------------------
//    Socket Receive Message Handlers
//---------------------------------------

function responseFriendList(set, get, payload) {
  const friends = Array.isArray(payload.friends) ? payload.friends : [];
  utils.log("[responseFriendList] updating store with friends length:", friends.length);
  set(() => ({ friendList: friends }));
}

function responseFriendNew(set, get, friend) {
  const current = get().friendList;
  const safe = Array.isArray(current) ? current : [];
  set(() => ({ friendList: [friend, ...safe] }));
}

function responseMessageList(set, get, data) {
  const currentPage = get().messagesPage || 0;
  const isFirstPage = currentPage === 0;

  // ✅ Normalize connId once, outside the set() call
  const connId = data.connection_id
    ? Number(data.connection_id)
    : (get().messagesConnectionId ?? get().activeConnectionId);
 
  set((state) => {
    // ✅ Get existing messages for this connection
    let existingForConn = connId != null ? (state.messagesByConnection?.[connId] || []) : [];
    
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
      merged = existingForConn;
    }

    // ✅ Deduplicate by message.id
    const deduped = merged.filter(
      (msg, index, self) =>
        index === self.findIndex(m => m.id === msg.id)
    );

    console.log("[responseMessageList] merged length:", merged.length, "deduped length:", deduped.length);

    // ✅ Build global messagesList with deduplication
    const combinedGlobal = [...state.messagesList, ...deduped];
    const dedupedGlobal = combinedGlobal.filter(
      (msg, index, self) =>
        index === self.findIndex(m => m.id === msg.id)
    );
    
    console.log("[responseMessageList] global:", combinedGlobal.length, "deduped global:", dedupedGlobal.length);
    console.log("[responseMessageList] connId:", connId, "updated length:", deduped.length);

    const lastMessage = deduped.length > 0
      ? deduped[deduped.length - 1].text
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
              deduped && deduped.length > 0
                ? [...deduped]   // only messages for this connection
                : []            // start empty, not global list
          }
        : {})
    };    

    // Do not reuse global list for per-connection slices
    const newMessagesList = [];

    const newActiveFriend =
      data.friend && state.activeFriend?.username === data.friend.username
        ? state.activeFriend
        : (data.friend ? { ...data.friend, lastMessage } : state.activeFriend);

        
    return {
      ...state,
      messagesByConnection: newByConn,      
      messagesList: dedupedGlobal,
      messagesNext: data.next,
      messagesUsername: data.friend?.username ?? state.messagesUsername,
      messagesConnectionId: connId,        // ✅ force normalized connId
      activeConnectionId: connId,          // ✅ force normalized connId
      messagesPage: data.next !== null ? (state.messagesPage ?? 0) + 1 : state.messagesPage ?? 0,
      activeFriend: newActiveFriend,
    };
    
  });
}

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

  // ✅ Update only per-connection store (no global list here)
  const currentByConn = get().messagesByConnection || {};
  const existingForConn = currentByConn[message.connection_id] || [];
  const updatedForConn = [...existingForConn, message];

  set(() => ({
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

function responseRequestList(set, get, payload) {
  const requests = Array.isArray(payload.requests) ? payload.requests : [];
  utils.log("[responseRequestList] updating store with requests length:", requests.length);
  set(() => ({ requestList: requests }));
}

function responseSearch(set, get, data) {
  utils.log("[responseSearch] updating store with search results length:", Array.isArray(data) ? data.length : 0);
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


// Simple helper to refresh token if expired
async function refreshAccessTokenIfNeeded(accessToken, refreshToken) {
  try {
    const { exp } = jwtDecode(accessToken);   // ✅ use jwtDecode
    const now = Math.floor(Date.now() / 1000);

    if (exp && exp > now) {
      return accessToken; // still valid
    }

    // expired → refresh
    const response = await fetch(`https://${ADDRESS}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      console.error("[Auth] Failed to refresh token:", response.status);
      return null;
    }

    const data = await response.json();
    return data.access;
  } catch (err) {
    console.error("[Auth] Exception refreshing token:", err);
    return null;
  }
}


//---------------------------------------
//    Global Store
//---------------------------------------

const useGlobal = create(
  persist(
    (set, get) => ({
      //--------------------------
      // Authentication / Tokens
      //--------------------------
      tokens: null,   // ✅ add tokens to global state
      setTokens: (creds) => set(() => ({ tokens: creds })),

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
              url: '/api/signin/',
              data: credentials
            });
            if (response.status !== 200) throw 'Authentication error!';
            const user = response.data.user;
            const tokens = response.data.tokens;

            // ✅ Save tokens into both secure storage and global state
            await secure.set('tokens', tokens);
            set(() => ({
              tokens,
              initialized: true,
              authenticated: true,
              user,
              socket: null,
              socketReady: false,
              socketConnecting: false,
            }));

            // ✅ Only connect once tokens are in state
            get().socketConnect();
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
        // ✅ Save credentials and tokens securely
        secure.set('credentials', credentials);
        secure.set('tokens', tokens);

        // ✅ Update global state with tokens and user
        set(() => ({
          tokens,
          authenticated: true,
          user,
          socket: null,
          socketReady: false,
          socketConnecting: false,
        }));

        // ✅ Immediately connect socket after login
        get().socketConnect();
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
        utils.log("[Debug] socketConnect invoked");   
        
        // Prevent duplicate connects
        if (get().socketConnecting || get().socketReady || get().socket) return;
        set(() => ({ socketConnecting: true }));

        // Use tokens already in global state (populated by RootLayout after secure.get)
        const tokens = get().tokens;
                
        // Use refresh token to validate session
        if (!tokens?.refresh) {
          utils.log("[Socket] No refresh token, skipping connect");
          set(() => ({ socketConnecting: false, socketReady: false, socket: null }));
          return;
        }

        // Use a helper to refresh if expired
        const freshAccess = await refreshAccessTokenIfNeeded(tokens.access, tokens.refresh);
        if (!freshAccess) {
          utils.log("[Socket] Failed to refresh access token, skipping connect");
          set(() => ({ socketConnecting: false, socketReady: false, socket: null }));
          return;
        }

        // ✅ Debugging tip: log token expiry before using it
        const { exp } = jwtDecode(freshAccess);
        console.log("[Socket] Token exp:", exp, "now:", Math.floor(Date.now()/1000));

        // ✅ Debug ADDRESS before building URL
        utils.log("[Socket] ADDRESS value:", ADDRESS);

        // const url = `wss://${ADDRESS}/chat/?token=${tokens.access}`;
        const url = `wss://${ADDRESS}/chat/?token=${freshAccess}`;
        utils.log("[Socket] Connecting to:", url);

        let socket;
        try {
          socket = new WebSocket(url);
          utils.log("[Socket] Created WebSocket object, waiting for onopen...");

          // ✅ Store once here
          set(() => ({ socket }));
        } catch (err) {
          console.error("[Socket] Failed to create WebSocket:", err);
          set(() => ({ socketConnecting: false, socketReady: false, socket: null }));
          return;
        }                  

        // ✅ Attach handlers immediately
        const inboundHandler = (event) => {
          // utils.log("[Inbound Dispatch] RAW event.data:", event.data);

          let parsed;
          try {
            parsed = JSON.parse(event.data);
          } catch (err) {
            utils.log("[Error - Inbound] Failed to parse onmessage:", err, event.data);
            return;
          }

          // utils.log("[Inbound Dispatch] parsed.type:", parsed.type);

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

          const resp = responses[parsed.type];
          if (!resp) {
            utils.log("[Inbound] No handler for type:", parsed.type, "parsed:", parsed);
            return;
          }

          // ✅ Event-specific normalization
          let payload;

          if (parsed.type === "friend.list") {
            // Friend list is an array of connections
            payload = { friends: parsed.data ?? [] };
            utils.log("[Inbound Dispatch] friend.list received, count:", payload.friends.length);

          } else if (parsed.type === "request.list") {
            // Request list is an array of requests
            payload = { requests: parsed.data ?? [] };
            utils.log("[Inbound Dispatch] request.list received, count:", payload.requests.length);

          } else if (parsed.type === "message.list") {
            // Message list normalization
            let connId = parsed.data?.connection_id || parsed.connectionId;
            if (!connId && Array.isArray(parsed.data?.messages) && parsed.data.messages.length > 0) {
              connId = parsed.data.messages[0].connection_id;
            }
            payload = {
              ...parsed.data,
              connection_id: connId,
              friend: parsed.data?.friend ?? null,
              next: parsed.data?.next ?? null,
              messages: parsed.data?.messages ?? [],
            };

          } else {
            // Fallback for other events
            payload = { ...parsed.data };
          }

          // ✅ Simplified logging
          utils.log("[Inbound Dispatch]", 
                    "type:", parsed.type,
                    "connId:", payload.connection_id,
                    "messages:", payload.messages?.length ?? 0,
                    "friend:", payload.friend?.username ?? "-");

          utils.log("[Inbound Dispatch] Handler:", parsed.type);


          resp(set, get, payload);
        };

        // ✅ Attach both styles for compatibility
        socket.onmessage = inboundHandler;
        socket.addEventListener("message", inboundHandler);       

        // ✅ Keep onopen separate, don’t re‑store socket
        socket.onopen = () => {
          utils.log("socket.onopen fired");
          console.log("[Debug - Inbound] socket connected, readyState:", socket.readyState);
          
          set(() => ({
            socketReady: true,
            socketConnecting: false,        
            // ❌ Do not overwrite socket here  
          })); 

          // Log outgoing requests
          const send = (payload) => {
            utils.log("[Socket] Sending:", payload);
            socket.send(JSON.stringify(payload));
          };

          send({ type: "request.list" });
          send({ type: "friend.list" });

          const connId = get().activeConnectionId;
          if (connId) {
            send({ type: "message.list", connectionId: connId, page: 0 });
          }

        };  

        socket.onerror = (e) => {
          utils.log("socket.onerror fired", e.message);
        };

        socket.onclose = (e) => {
          utils.log("socket.onclose fired", e.code, e.reason);
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
            
      messageList: (connectionId, page = 0) => {
        utils.log("[messageList] sending payload:", {
          type: 'message.list',
          connectionId,
          page
        });

        const socket = get().socket;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          utils.log("[Socket] Not connected, cannot send message.list");
          return;
        }

        // ✅ Guard: don’t request if we already have messages for this connection and page=0
        const existing = get().messagesByConnection?.[connectionId] || [];
        utils.log("[messageList] connId:", connectionId, "page:", page, "existing length:", existing.length);

        if (page === 0 && existing.length > 0) {
            utils.log("[Global] Already have messages for connId:", connectionId, "length:", existing.length);
            return; // ✅ only skip if this specific connection already has messages
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
          type: 'message.send',
          ...data,
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
        tokens: state.tokens,
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

