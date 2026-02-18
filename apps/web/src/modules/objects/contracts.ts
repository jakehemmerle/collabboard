// --- Types ---

export type BoardObjectType = 'sticky' | 'rectangle' | 'circle' | 'line' | 'text';

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
export const DEFAULT_CIRCLE_SIZE = { width: 100, height: 100 };
export const DEFAULT_LINE_LENGTH = 200;
export const DEFAULT_TEXT_SIZE = { width: 200, height: 40 };

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

export interface CircleObject extends BoardObjectBase {
  type: 'circle';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineObject extends BoardObjectBase {
  type: 'line';
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface TextObject extends BoardObjectBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
}

export type BoardObject = StickyNote | RectangleObject | CircleObject | LineObject | TextObject;

// --- Intents (local user actions) ---

export type ObjectIntent =
  | { kind: 'create-sticky'; x: number; y: number; color?: StickyColor; text?: string }
  | { kind: 'create-rectangle'; x: number; y: number; fill?: string }
  | { kind: 'create-circle'; x: number; y: number; fill?: string }
  | { kind: 'create-line'; x: number; y: number; x2?: number; y2?: number; stroke?: string }
  | { kind: 'create-text'; x: number; y: number; text?: string; fontSize?: number }
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
  selectedIds: string[];
}

// --- Module API ---

export interface ObjectsApi {
  applyLocal(intent: ObjectIntent): ApplyResult;
  applyRemote(event: { type: 'added' | 'modified' | 'removed'; objectId: string; data: Record<string, unknown> | null }): void;
  hydrateFromSnapshot(objects: BoardObject[]): void;
  select(ids: string[]): void;
  toggleSelect(id: string): void;
  selectAll(): void;
  deselectAll(): void;
  getSnapshot(): ObjectsState;
  observeObjects(cb: (state: ObjectsState) => void): () => void;
}
