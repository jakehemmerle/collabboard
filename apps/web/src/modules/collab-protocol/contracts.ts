export type ObjectOperationType = 'create' | 'update' | 'move' | 'delete';

export interface BoardOperation {
  opId: string;
  actorId: string;
  boardId: string;
  objectId: string;
  type: ObjectOperationType;
  payload: unknown;
  baseVersion: number;
  clientTs: number;
  serverTs?: number;
}
