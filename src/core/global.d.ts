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

  messagesList: any[];
  messagesNext: any | null;
  messagesPage: number;
  messagesTyping: string | null;
  messagesUsername: string | null;
  messageList: (connectionId: string | number, page?: number) => void;
  loadMoreMessages: (connectionId: string | number) => void;
  messageSend: (
    connectionId: string | number,
    message: string,
    media?: {
      base64?: string;
      filename?: string;
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