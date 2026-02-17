// --- Types ---

export type BoardObjectType = 'sticky' | 'rectangle';

export type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export const STICKY_COLORS: Record<StickyColor, string> = {
  yellow: '#FFF9C4',
  pink: '#F8BBD0',
  blue: '#BBDEFB',
  green: '#C8E6C9',
  purple: '#E1BEE7',
};

export const DEFAULT_STICKY_SIZE = { width: 200, height: 150 };
export const DEFAULT_RECT_SIZE = { width: 200, height: 150 };

// --- Object models ---

interface BoardObjectBase {
  id: string;
  type: BoardObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface StickyNote extends BoardObjectBase {
  type: 'sticky';
  text: string;
  color: StickyColor;
}

export interface RectangleObject extends BoardObjectBase {
  type: 'rectangle';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type BoardObject = StickyNote | RectangleObject;

// --- Intents (local user actions) ---

export type ObjectIntent =
  | { kind: 'create-sticky'; x: number; y: number; color?: StickyColor; text?: string }
  | { kind: 'create-rectangle'; x: number; y: number; fill?: string }
  | { kind: 'move'; objectId: string; x: number; y: number }
  | { kind: 'update-text'; objectId: string; text: string }
  | { kind: 'update-color'; objectId: string; color: string }
  | { kind: 'resize'; objectId: string; width: number; height: number }
  | { kind: 'delete'; objectId: string };

export interface ApplyResult {
  ok: boolean;
  objectId?: string;
}

// --- State ---

export interface ObjectsState {
  objects: BoardObject[];
  selectedId: string | null;
}

// --- Module API ---

export interface ObjectsApi {
  applyLocal(intent: ObjectIntent): ApplyResult;
  select(objectId: string | null): void;
  getSnapshot(): ObjectsState;
  observeObjects(cb: (state: ObjectsState) => void): () => void;
}
