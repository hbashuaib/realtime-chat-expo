// src/core/global.d.ts
import { StoreApi } from "zustand";

export interface GlobalState {
  inboundShare: any | null;
  setInboundShare: (payload: any) => void;
  clearInboundShare: () => void;

  initialized: boolean;
  init: () => Promise<void>;

  themeMode: string | null;
  toggleTheme: () => void;
  setTheme: (scheme: string) => Promise<void>;

  authenticated: boolean;
  user: Record<string, any>;
  login: (credentials: any, user: any, tokens: any) => void;
  logout: () => void;

  socket: WebSocket | null;
  socketReady: boolean;
  socketConnecting: boolean;
  socketConnect: () => Promise<void>;
  socketClose: () => void;

  searchList: any | null;
  searchUsers: (query: string) => void;

  friendList: any | null;

  // ✅ New active chat context
  activeFriend: any | null;
  // activeConnectionId: string | number | null;
  activeConnectionId: number | null;
  setActiveFriend: (friend: any) => void;
  setActiveConnectionId: (id: number | null) => void;   // ✅ NEW
  clearActiveFriend: () => void;

  // ✅ Debug helper
  debugLogState: () => void;

  messagesList: any[];
  messagesNext: any | null;
  messagesPage: number;
  messagesTyping: string | null;

  // ✅ Active chat context
  messagesUsername: string | null;
  setMessagesUsername: (username: string | null) => void;   // NEW
  
  // messagesConnectionId: string | number | null;
  // setMessagesConnectionId: (id: string | number | null) => void;  // NEW

  // 🔧 Normalize connection IDs strictly as numbers
  messagesConnectionId: number | null;
  setMessagesConnectionId: (id: number | null) => void;
  messagesByConnection: Record<number, any[]>;   // ✅ add this

  // messageList: (connectionId: string | number, page?: number) => void;
  // loadMoreMessages: (connectionId: string | number) => void;
  // addInboundMessage: (connectionId: string | number, text: string) => void;

  messageList: (connectionId: number, page?: number) => void;
  loadMoreMessages: (connectionId: number) => void;
  addInboundMessage: (connectionId: number, text: string) => void;

  messageSend: (
    connectionId: string | number,
    message: string,
    media?: {
      base64?: string;
      filename?: string;
      image?: string;
      image_filename?: string;
      voice?: string;
      voice_filename?: string;
      video?: string;
      video_filename?: string;
      video_url?: string;
      video_thumb_url?: string;
      video_duration?: number;
    } | null
  ) => void;
  messageType: (username: string) => void;
  messageDelete: (connectionId: string | number, messageIds?: (string | number)[]) => void;
  applyLocalDelete: (ids?: (string | number)[]) => void;
  messageForward: (fromConnectionId: string | number, toConnectionId: string | number, messageIds?: (string | number)[]) => void;
  addMessage: (msg: any) => void;

  requestList: any | null;
  requestAccept: (username: string) => void;
  requestConnect: (username: string) => void;

  uploadThumbnail: (file: { base64: string; fileName: string }) => void;
}

// ✅ Declare the hook type and default export
export declare const useGlobal: <T>(selector: (state: GlobalState) => T) => T;
export default useGlobal;

// ✅ Add declaration for the raw store object
export declare const globalStore: StoreApi<GlobalState>;