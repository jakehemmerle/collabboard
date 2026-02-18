import type { BoardRole, BoardCapability } from '../permissions/contracts.ts';

export interface BoardMeta {
  id: string;
  title: string;
  ownerId: string;
  createdAt: number;
}

export interface Membership {
  userId: string;
  role: BoardRole;
  joinedAt: number;
}

export interface CreateBoardInput {
  title?: string;
}

export interface BoardAccessApi {
  createBoard(input: CreateBoardInput): Promise<{ boardId: string }>;
  getBoard(boardId: string): Promise<BoardMeta | null>;
  canAccess(boardId: string, capability: BoardCapability): Promise<boolean>;
  joinBoard(boardId: string): Promise<void>;
  grantMembership(boardId: string, userId: string, role: BoardRole): Promise<void>;
  observeMembership(boardId: string, cb: (m: Membership | null) => void): () => void;
}
