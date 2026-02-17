export type BoardSessionState = 'idle' | 'entering' | 'active' | 'leaving';

export interface BoardSessionApi {
  enter(boardId: string): Promise<void>;
  leave(): Promise<void>;
  observeState(cb: (state: BoardSessionState) => void): () => void;
  currentBoardId(): string | null;
}
