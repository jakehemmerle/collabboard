export interface CursorState {
  uid: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  lastUpdated: number;
}

export interface PresenceUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  color: string;
  online: boolean;
  lastSeen: number;
}

export interface PresenceApi {
  start(
    boardId: string,
    user: { uid: string; displayName: string; photoURL: string | null },
  ): Promise<void>;
  stop(): Promise<void>;
  publishCursor(worldPos: { x: number; y: number }): void;
  observeCursors(cb: (cursors: CursorState[]) => void): () => void;
  observeOnlineUsers(cb: (users: PresenceUser[]) => void): () => void;
}
