export type SyncConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting';

export interface SyncEvent {
  type: 'added' | 'modified' | 'removed';
  objectId: string;
  data: Record<string, unknown> | null;
}

export interface SyncApi {
  connect(input: { boardId: string; actorId: string }): Promise<void>;
  disconnect(): Promise<void>;
  status(): SyncConnectionStatus;
  observeStatus(cb: (status: SyncConnectionStatus) => void): () => void;
  publish(objectId: string, data: Record<string, unknown> | null): Promise<void>;
  onRemoteChange(cb: (events: SyncEvent[]) => void): () => void;
}
