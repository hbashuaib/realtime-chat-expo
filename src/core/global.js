// src/core/global.js
import { create } from 'zustand'
import secure from './secure'
import api, { ADDRESS } from './api'
import utils from './utils'
import { useReducer } from 'react'

//---------------------------------------
//    Socket Receive Message Hundlers
//---------------------------------------

function responseFriendList(set, get, friendList) {
    set((state) => ({
        friendList: Array.isArray(friendList) ? friendList : []
    }))
}

function responseFriendNew(set, get, friend) {
    //const friendList = [friend, ...get().friendList]
    const current = get().friendList
    const safe = Array.isArray(current) ? current : []

    set((state) => ({
        friendList: [friend, ...safe]
    }))
}

function responseMessageList(set, get, data) {
    console.log('[responseMessageList] Received:', data);

    const currentPage = get().messagesPage || 0
    const isFirstPage = currentPage === 0

    set((state) => ({
        //messagesList: [...get().messagesList, ...data.messages],
        messagesList: isFirstPage // Newly changed
            ? data.messages
            : [...state.messagesList, ...data.messages],
        messagesNext: data.next,
        messagesUsername: data.friend.username,
        messagesConnectionId: data.connection_id ?? data.friend?.connection_id ?? null, // track id when provided
        messagesPage: data.next !== null // Newly added
            ? state.messagesPage + 1
            : state.messagesPage

    }))
}


// Latest responseMessageSend
function responseMessageSend(set, get, data) {
    if (!data?.message || !data?.friend) return;

    const username = data.friend.username;
    const activeId = get().messagesConnectionId;

    console.log('[responseMessageSend] image:', data.message.image);

    // Safely construct message object FIRST
    const message = {
        ...(data.message || {}),
        waveform: Array.isArray(data.message?.waveform)
            ? data.message.waveform
            : [],
        video_url: data.message?.video_url ?? null,
        video_thumb_url: data.message?.video_thumb_url ?? null,
        video_duration: data.message?.video_duration ?? null,
    };

    // Update friend preview
    const currentFriends = get().friendList;
    const safeFriendList = Array.isArray(currentFriends) ? [...currentFriends] : [];
    const friendIndex = safeFriendList.findIndex(
        item => item.friend.username === username
    );
    if (friendIndex >= 0) {
        const item = { ...safeFriendList[friendIndex] };
        item.preview = data.message.text;
        item.updated = data.message.created;
        const next = [...safeFriendList];
        next.splice(friendIndex, 1);
        next.unshift(item);
        set(() => ({ friendList: next }));
    }

    // ✅ Now check connection_id safely
    if (activeId && message.connection_id && activeId !== message.connection_id) return;
    if (username !== get().messagesUsername) return;

    // ✅ Append instead of prepend
    const messagesList = [...get().messagesList, message];

    set(() => ({
        messagesList,
        messagesTyping: null
    }));
}

function responseMessageType(set, get, data) {
    if (data.username !== get().messagesUsername) return
    set((state) => ({
        messagesTyping: new Date()
    }))
}

function responseRequestAccept(set, get, connection) {
    const user = get().user
    // If I was the one that made the connect request,
    // remove request from the requestList
    if (user.username === connection.receiver.username) {
        const requestList = [...get().requestList]
        const requestIndex = requestList.findIndex(
            request => request.id === connection.id
        )
        if (requestIndex >= 0) {
            requestList.splice(requestIndex, 1)
            set((state) => ({
                requestList: requestList
            }))
        }
    } 
    // If the corresponding user is contained within the
    // searchList for the acceptor or the acceptee, update
    // the state of the searchList item.
    const sl = get().searchList
    if (sl === null) {
        return
    }
    const searchList = [...sl]

    let searchIndex = -1
    // If this user accepted
    if (user.username === connection.receiver.username) {
        searchIndex = searchList.findIndex(
            user => user.username === connection.sender.username
        )
    } else {
        searchIndex = searchList.findIndex(
            user => user.username === connection.receiver.username
        )
    }
    if (searchIndex >= 0) {
        searchList[searchIndex].status = 'connected'
        set((state) => ({
            searchList: searchList
        }))
    }
}

function responseRequestConnect(set, get, connection) {
    const user = get().user
    // If I was the one that made the connect request,
    // update the search list row
    if (user.username === connection.sender.username) {
        const searchList = [...get().searchList]
        const searchIndex = searchList.findIndex(
            request => request.username === connection.receiver.username
        )
        if (searchIndex >= 0) {
            searchList[searchIndex].status = 'pending-them'
            set((state) => ({
                searchList: searchList
            }))
        }

    } else {
        // If they were the one that sent the connect
        // request, add request to request list
        const requestList = [...get().requestList]
        const requestIndex = requestList.findIndex(
            request => request.sender.username === connection.sender.username
        )
        if (requestIndex === -1) {
            requestList.unshift(connection)
            set((state) => ({
                requestList: requestList
            }))
        }
    }
}


function responseRequestList(set, get, requestList) {
    set((state) => ({
        requestList: requestList
    }))
}


function responseSearch(set, get, data) {
    set((state) => ({
        searchList: data
    }))
}

function responseThumbnail(set, get, data) {
    set((state) => ({
        user: data
    }))
}

// Message Seen Handler
function responseMessageSeen(set, get, data) {
  set((state) => {
    const updated = state.messagesList.map(msg =>
      msg.id === data.id ? { ...msg, seen: true } : msg
    );
    return { messagesList: updated };
  });
}

function responseMessageDeleted(set, get, data) {
  set(state => ({
    messagesList: state.messagesList.filter(m => m.id !== data.messageId)
  }));
}


const useGlobal = create((set, get) => ({
    //--------------------------
    //      Initialization
    //--------------------------
    initialized: false,

    //--------------------------
    //      Theme Mode
    //--------------------------    
    themeMode: null, // start as null
    
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
        // restore saved theme first
        const savedTheme = await secure.get('themeMode');
        if (savedTheme) {
            set(() => ({ themeMode: savedTheme }));
        } else {
            set(() => ({ themeMode: 'light' })); // fallback
        }

        const credentials = await secure.get('credentials')
        utils.log('Global Init Credentials: ', credentials)
        if (credentials) {
            try {
                const response = await api({
                    method: 'POST',
                    url: '/chat/signin/',
                    data: {
                        username: credentials.username,
                        password: credentials.password
                    }
                })
                if (response.status !== 200) {
                    throw 'Authentication error!'
                }
                const user = response.data.user  
                const tokens = response.data.tokens
                
                secure.set('tokens', tokens)

                set((state) => ({
                    initialized: true,
                    authenticated: true,
                    user: user
                }))
                return
            } catch (error) {
                console.log('useGlobal.init: ', error)
            }            
        }
        set((state) => ({
            initialized: true,            
        }))
    },

    //--------------------------
    //      Authentication
    //--------------------------
    authenticated: false,
    user: {},

    login: (credentials, user, tokens) => {
        utils.log('Global login Credentials: ', credentials)
        secure.set('credentials', credentials)
        secure.set('tokens', tokens)
        set((state) => ({
            authenticated: true,
            user: user
        }))
    },

    logout: () => {
        secure.wipe()
        set((state) => ({
            authenticated: false,
            user: {}
        }))
    },

    //--------------------------
    //      WebSocket
    //--------------------------
    socket: null,
    socketReady: false,
    socketConnecting: false,

    socketConnect: async () => {
        // Prevent duplicate connects
        if (get().socketConnecting || get().socketReady || get().socket) {
            return;
        }
        set((state) => ({ socketConnecting: true }));

        const tokens = await secure.get('tokens')
        
        // Improved logging: show exactly what was returned
        if (!tokens) {
            utils.log("[Auth] secure.get('tokens') returned null/undefined");
            } else {
            utils.log("[Auth] Tokens object:", tokens);
        }

        // Guard against missing or malformed tokens
        if (!tokens || !tokens.access) {
            utils.log("[Socket] No valid access token found, skipping socket connection");
            
            // Reset connection flags so the app doesn't get stuck
            set((state) => ({ socketConnecting: false, socketReady: false }));
            
            // Optionally, navigate back to SignIn or show a message
            // navigation.navigate("SignIn"); // if you have navigation available
            
            return;
        }

        // If we reach here, tokens are valid
        const url = `ws://${ADDRESS}/chat/?token=${tokens.access}`
        utils.log("[Socket] Connecting to:", url);

        const socket = new WebSocket(url) 

        socket.onopen = () => {
            utils.log('socket.onopen')
            //console.log('[WebSocket] Connected');

            set((state) => ({ socketReady: true, socketConnecting: false }));
            
            socket.send(JSON.stringify({
                source: 'request.list'
            }))

            socket.send(JSON.stringify({
                source: 'friend.list'
            }))

            socket.send(JSON.stringify({ 
                source: 'message.list'                 
            }));
        }

        socket.onmessage = (event) => {
            // Convert data to javascrtipt object
            const parsed = JSON.parse(event.data)

            // Debug log formatted data
            utils.log('onmessage: ', parsed)

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
            }

            const resp= responses[parsed.source]
            if (!resp) {
                utils.log('parsed.source "' + parsed.source + '" not found')
                return
            }

            // Call response function
            resp(set, get, parsed.data)
        }
        socket.onerror = (e) => {
            utils.log('socket.onerror', e.message)
        }
        socket.onclose = (e) => {
            utils.log('socket.onclose',e.code, e.reason)
            set((state) => ({ socketReady: false, socketConnecting: false }));
        }
        set((state) => ({
            socket: socket,            
        }))
    },

    socketClose: () => {
        const socket = get().socket
        if (socket) {
            try { socket.close(); } catch {}
        }
        set((state) => ({
            socket: null,
            socketReady: false,
            socketConnecting: false,
        }))
    },

    //--------------------------
    //      Search
    //--------------------------

    searchList: null,

    searchUsers: (query) => {
        if (query) {
            const socket = get().socket
            socket.send(JSON.stringify({
                source: 'search',
                query: query                
            }))
        } else {
            set((state) => ({
                searchList: null
            }))
        }        
    },


    //--------------------------
    //      Friends
    //--------------------------

    friendList: null,

    //--------------------------
    //      Messages
    //--------------------------

    messagesList: [],
    messagesNext: null,
    messagesPage: 0, // Newly added
    messagesTyping: null,
    messagesUsername: null,

    messageList: (connectionId, page=0) => {
        const socket = get().socket
        if (!socket) return; // prevent send before connect

        if (page === 0) {
            set((state) => ({
                messagesList: [],
                messagesNext: null,
                messagesTyping: null,
                messagesUsername: null,
                messagesPage: 0 // Newly added
            }))
        } else {
            set((state) => ({                
                messagesNext: null                
            }))
        }
        //const socket = get().socket
        socket.send(JSON.stringify({
            source: 'message.list',
            connectionId,
            page
            //connectionId: connectionId,
            //page: page
        })) 
    },

    // Pagination Load More Messages
    loadMoreMessages: (connectionId) => {
        const next = get().messagesNext;   // backend-provided "next" value
        console.log("[Global] Loading more messages, next:", next);

        if (next !== null) {
            // Use the backend's next value directly
            get().messageList(connectionId, next);
        } else {
            console.log("[Global] No more messages to load");
        }
    },

    // Latest messageSend with media support
    messageSend: (connectionId, message, media = null) => {
    const socket = get().socket;
    if (!socket) return;

    const payload = {
        source: 'message.send',
        connectionId,
        message, // always send text/emoji
    };

    if (media) {
        // Optional image/voice
        if (media.base64 && media.filename) {
        const ext = media.filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png'].includes(ext)) {
            payload.image = media.base64;
            payload.image_filename = media.filename;
        } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
            payload.voice = media.base64;
            payload.voice_filename = media.filename;
        }
        }

        // Optional video
        if (media.video && media.video_filename) {
        payload.video = media.video;
        payload.video_filename = media.video_filename;
        payload.video_url = media.video_url;
        payload.video_thumb_url = media.video_thumb_url;
        payload.video_duration = media.video_duration;
        }
    }

    socket.send(JSON.stringify(payload));
    },   
    

    messageType: (username) => {
        const socket = get().socket
        socket.send(JSON.stringify({
            source: 'message.type',            
            username: username
        })) 
    },

    messageDelete: (connectionId, messageIds = []) => {
        const socket = get().socket;
        if (!socket || !Array.isArray(messageIds) || messageIds.length === 0) return;
        messageIds.forEach(id => {
            socket.send(JSON.stringify({
            source: 'message.delete',
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
        if (!socket || !Array.isArray(messageIds) || messageIds.length === 0) return;
        socket.send(JSON.stringify({
            source: 'message.forward',
            fromConnectionId,
            toConnectionId,
            messageIds
        }));
    },


    //--------------------------
    //      Requests
    //--------------------------

    requestList: null,

    requestAccept: (username) => {
        const socket = get().socket
        socket.send(JSON.stringify({
            source: 'request.accept',
            username: username
        }))            
    },

    requestConnect: (username) => {
        const socket = get().socket
        socket.send(JSON.stringify({
            source: 'request.connect',
            username: username
        }))            
    },


    //--------------------------
    //      Thumbnail
    //--------------------------
    uploadThumbnail: (file) => {
        const socket = get().socket
        socket.send(JSON.stringify({
            source: 'thumbnail',
            base64: file.base64,
            filename: file.fileName
        }))
    }
}))

export default useGlobal
