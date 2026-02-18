import { generateId } from '../../../core/ids.ts';
import type {
  ObjectIntent, ApplyResult, StickyNote, RectangleObject,
  CircleObject, LineObject, TextObject, ConnectorObject, FrameObject, BoardObject,
} from '../contracts.ts';
import {
  DEFAULT_STICKY_SIZE, DEFAULT_RECT_SIZE, DEFAULT_CIRCLE_SIZE,
  DEFAULT_LINE_LENGTH, DEFAULT_TEXT_SIZE, DEFAULT_FRAME_SIZE,
} from '../contracts.ts';
import * as store from './object-store.ts';

export function cloneObject(source: BoardObject, actorId: string, offsetX: number, offsetY: number): BoardObject {
  const now = Date.now();
  const newId = generateId();
  const clone = {
    ...source,
    id: newId,
    x: source.x + offsetX,
    y: source.y + offsetY,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  if (source.type === 'line') {
    (clone as LineObject).x2 = (source as LineObject).x2 + offsetX;
    (clone as LineObject).y2 = (source as LineObject).y2 + offsetY;
  }
  // Connectors reference other objects by ID — clear references on clone
  if (source.type === 'connector') {
    (clone as ConnectorObject).sourceId = '';
    (clone as ConnectorObject).targetId = '';
  }
  // Frames lose their children on clone
  if (source.type === 'frame') {
    (clone as FrameObject).children = [];
  }
  return clone as BoardObject;
}

export function handleIntent(intent: ObjectIntent, actorId: string): ApplyResult {
  const now = Date.now();

  switch (intent.kind) {
    case 'create-sticky': {
      const id = generateId();
      const sticky: StickyNote = {
        id, type: 'sticky',
        x: intent.x, y: intent.y,
        width: DEFAULT_STICKY_SIZE.width, height: DEFAULT_STICKY_SIZE.height,
        text: intent.text ?? '', color: intent.color ?? 'yellow',
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(sticky);
      return { ok: true, objectId: id };
    }
    case 'create-rectangle': {
      const id = generateId();
      const rect: RectangleObject = {
        id, type: 'rectangle',
        x: intent.x, y: intent.y,
        width: DEFAULT_RECT_SIZE.width, height: DEFAULT_RECT_SIZE.height,
        fill: intent.fill ?? '#E0E0E0', stroke: '#9E9E9E', strokeWidth: 1,
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(rect);
      return { ok: true, objectId: id };
    }
    case 'create-circle': {
      const id = generateId();
      const circle: CircleObject = {
        id, type: 'circle',
        x: intent.x, y: intent.y,
        width: DEFAULT_CIRCLE_SIZE.width, height: DEFAULT_CIRCLE_SIZE.height,
        fill: intent.fill ?? '#90CAF9', stroke: '#42A5F5', strokeWidth: 2,
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(circle);
      return { ok: true, objectId: id };
    }
    case 'create-line': {
      const id = generateId();
      const x2 = intent.x2 ?? intent.x + DEFAULT_LINE_LENGTH;
      const y2 = intent.y2 ?? intent.y;
      const line: LineObject = {
        id, type: 'line',
        x: intent.x, y: intent.y,
        width: Math.abs(x2 - intent.x) || DEFAULT_LINE_LENGTH,
        height: Math.abs(y2 - intent.y) || 0,
        x2, y2,
        stroke: intent.stroke ?? '#616161', strokeWidth: 2,
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(line);
      return { ok: true, objectId: id };
    }
    case 'create-text': {
      const id = generateId();
      const textObj: TextObject = {
        id, type: 'text',
        x: intent.x, y: intent.y,
        width: DEFAULT_TEXT_SIZE.width, height: DEFAULT_TEXT_SIZE.height,
        text: intent.text ?? 'Text', fontSize: intent.fontSize ?? 18,
        fontFamily: 'sans-serif', fill: '#333333',
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(textObj);
      return { ok: true, objectId: id };
    }
    case 'move': {
      // If moving a frame, also move its children
      const moveObj = store.getObject(intent.objectId);
      if (moveObj && moveObj.type === 'frame') {
        const frame = moveObj as FrameObject;
        const dx = intent.x - frame.x;
        const dy = intent.y - frame.y;
        for (const childId of frame.children) {
          const child = store.getObject(childId);
          if (child) {
            store.moveObject(childId, child.x + dx, child.y + dy);
          }
        }
      }
      store.moveObject(intent.objectId, intent.x, intent.y);
      return { ok: true, objectId: intent.objectId };
    }
    case 'update-text': {
      const obj = store.getObject(intent.objectId);
      if (!obj) return { ok: false };
      if (obj.type === 'sticky' || obj.type === 'text') {
        store.updateObject(intent.objectId, { text: intent.text } as Partial<StickyNote>);
      } else if (obj.type === 'frame') {
        store.updateObject(intent.objectId, { title: intent.text } as Partial<FrameObject>);
      } else {
        return { ok: false };
      }
      return { ok: true, objectId: intent.objectId };
    }
    case 'update-color': {
      const obj = store.getObject(intent.objectId);
      if (!obj) return { ok: false };
      if (obj.type === 'sticky') {
        store.updateObject(intent.objectId, { color: intent.color } as Partial<StickyNote>);
      } else if (obj.type === 'rectangle') {
        store.updateObject(intent.objectId, { fill: intent.color } as Partial<RectangleObject>);
      } else if (obj.type === 'circle') {
        store.updateObject(intent.objectId, { fill: intent.color } as Partial<CircleObject>);
      } else if (obj.type === 'line') {
        store.updateObject(intent.objectId, { stroke: intent.color } as Partial<LineObject>);
      } else if (obj.type === 'text') {
        store.updateObject(intent.objectId, { fill: intent.color } as Partial<TextObject>);
      } else if (obj.type === 'connector') {
        store.updateObject(intent.objectId, { stroke: intent.color } as Partial<ConnectorObject>);
      } else if (obj.type === 'frame') {
        store.updateObject(intent.objectId, { fill: intent.color } as Partial<FrameObject>);
      }
      return { ok: true, objectId: intent.objectId };
    }
    case 'resize': {
      store.updateObject(intent.objectId, { width: intent.width, height: intent.height });
      return { ok: true, objectId: intent.objectId };
    }
    case 'rotate': {
      store.updateObject(intent.objectId, { rotation: intent.rotation });
      return { ok: true, objectId: intent.objectId };
    }
    case 'delete': {
      store.removeObject(intent.objectId);
      return { ok: true, objectId: intent.objectId };
    }
    case 'duplicate': {
      const newIds: string[] = [];
      const ox = intent.offsetX ?? 20;
      const oy = intent.offsetY ?? 20;
      for (const sourceId of intent.objectIds) {
        const source = store.getObject(sourceId);
        if (!source) continue;
        const clone = cloneObject(source, actorId, ox, oy);
        store.addObject(clone);
        newIds.push(clone.id);
      }
      return { ok: true, objectId: newIds[0], objectIds: newIds };
    }
    case 'create-connector': {
      const id = generateId();
      // Connector uses dummy width/height — endpoints computed from source/target at render time
      const connector: ConnectorObject = {
        id, type: 'connector',
        x: 0, y: 0, width: 0, height: 0,
        sourceId: intent.sourceId, targetId: intent.targetId,
        style: intent.style ?? 'arrow',
        stroke: intent.stroke ?? '#616161', strokeWidth: 2,
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(connector);
      return { ok: true, objectId: id };
    }
    case 'create-frame': {
      const id = generateId();
      const frame: FrameObject = {
        id, type: 'frame',
        x: intent.x, y: intent.y,
        width: DEFAULT_FRAME_SIZE.width, height: DEFAULT_FRAME_SIZE.height,
        title: intent.title ?? 'Frame',
        fill: intent.fill ?? 'rgba(200, 200, 200, 0.1)',
        children: [],
        createdBy: actorId, createdAt: now, updatedAt: now,
      };
      store.addObject(frame);
      return { ok: true, objectId: id };
    }
    case 'update-frame-children': {
      const obj = store.getObject(intent.objectId);
      if (!obj || obj.type !== 'frame') return { ok: false };
      store.updateObject(intent.objectId, { children: intent.children } as Partial<FrameObject>);
      return { ok: true, objectId: intent.objectId };
    }
  }
}
