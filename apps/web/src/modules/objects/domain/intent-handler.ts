import { generateId } from '../../../core/ids.ts';
import type { ObjectIntent, ApplyResult, StickyNote, RectangleObject } from '../contracts.ts';
import { DEFAULT_STICKY_SIZE, DEFAULT_RECT_SIZE } from '../contracts.ts';
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
    case 'move': {
      store.moveObject(intent.objectId, intent.x, intent.y);
      return { ok: true, objectId: intent.objectId };
    }
    case 'update-text': {
      const obj = store.getObject(intent.objectId);
      if (!obj || obj.type !== 'sticky') return { ok: false };
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
