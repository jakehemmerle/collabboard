import { generateId } from '../../../core/ids.ts';
import type {
  ObjectIntent, ApplyResult, StickyNote, RectangleObject,
  CircleObject, LineObject, TextObject,
} from '../contracts.ts';
import {
  DEFAULT_STICKY_SIZE, DEFAULT_RECT_SIZE, DEFAULT_CIRCLE_SIZE,
  DEFAULT_LINE_LENGTH, DEFAULT_TEXT_SIZE,
} from '../contracts.ts';
import * as store from './object-store.ts';

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
      store.moveObject(intent.objectId, intent.x, intent.y);
      return { ok: true, objectId: intent.objectId };
    }
    case 'update-text': {
      const obj = store.getObject(intent.objectId);
      if (!obj || (obj.type !== 'sticky' && obj.type !== 'text')) return { ok: false };
      store.updateObject(intent.objectId, { text: intent.text } as Partial<StickyNote>);
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
      }
      return { ok: true, objectId: intent.objectId };
    }
    case 'resize': {
      store.updateObject(intent.objectId, { width: intent.width, height: intent.height });
      return { ok: true, objectId: intent.objectId };
    }
    case 'delete': {
      store.removeObject(intent.objectId);
      return { ok: true, objectId: intent.objectId };
    }
  }
}
