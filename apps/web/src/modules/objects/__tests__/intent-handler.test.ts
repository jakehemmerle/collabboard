import { describe, it, expect, beforeEach } from 'vitest';
import { handleIntent } from '../domain/intent-handler.ts';
import * as store from '../domain/object-store.ts';
import type { StickyNote, RectangleObject } from '../contracts.ts';
import { DEFAULT_STICKY_SIZE, DEFAULT_RECT_SIZE } from '../contracts.ts';

const ACTOR = 'user-1';

describe('intent-handler', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('create-sticky', () => {
    it('creates a sticky note with defaults', () => {
      const result = handleIntent({ kind: 'create-sticky', x: 10, y: 20 }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();

      const obj = store.getObject(result.objectId!) as StickyNote;
      expect(obj.type).toBe('sticky');
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(20);
      expect(obj.width).toBe(DEFAULT_STICKY_SIZE.width);
      expect(obj.height).toBe(DEFAULT_STICKY_SIZE.height);
      expect(obj.text).toBe('');
      expect(obj.color).toBe('yellow');
      expect(obj.createdBy).toBe(ACTOR);
    });

    it('accepts custom color and text', () => {
      const result = handleIntent(
        { kind: 'create-sticky', x: 0, y: 0, color: 'pink', text: 'hello' },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as StickyNote;
      expect(obj.color).toBe('pink');
      expect(obj.text).toBe('hello');
    });
  });

  describe('create-rectangle', () => {
    it('creates a rectangle with defaults', () => {
      const result = handleIntent({ kind: 'create-rectangle', x: 30, y: 40 }, ACTOR);
      expect(result.ok).toBe(true);

      const obj = store.getObject(result.objectId!) as RectangleObject;
      expect(obj.type).toBe('rectangle');
      expect(obj.x).toBe(30);
      expect(obj.y).toBe(40);
      expect(obj.width).toBe(DEFAULT_RECT_SIZE.width);
      expect(obj.height).toBe(DEFAULT_RECT_SIZE.height);
      expect(obj.fill).toBe('#E0E0E0');
      expect(obj.stroke).toBe('#9E9E9E');
      expect(obj.strokeWidth).toBe(1);
    });

    it('accepts custom fill', () => {
      const result = handleIntent(
        { kind: 'create-rectangle', x: 0, y: 0, fill: '#FF0000' },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as RectangleObject;
      expect(obj.fill).toBe('#FF0000');
    });
  });

  describe('move', () => {
    it('moves an existing object', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent({ kind: 'move', objectId: objectId!, x: 100, y: 200 }, ACTOR);
      expect(result.ok).toBe(true);

      const obj = store.getObject(objectId!)!;
      expect(obj.x).toBe(100);
      expect(obj.y).toBe(200);
    });

    it('returns ok true even for a nonexistent object (no existence check)', () => {
      const result = handleIntent({ kind: 'move', objectId: 'missing', x: 0, y: 0 }, ACTOR);
      expect(result.ok).toBe(true);
    });
  });

  describe('update-text', () => {
    it('updates text on a sticky note', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent(
        { kind: 'update-text', objectId: objectId!, text: 'new text' },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const obj = store.getObject(objectId!) as StickyNote;
      expect(obj.text).toBe('new text');
    });

    it('fails for a rectangle (no text field)', () => {
      const { objectId } = handleIntent({ kind: 'create-rectangle', x: 0, y: 0 }, ACTOR);
      const result = handleIntent(
        { kind: 'update-text', objectId: objectId!, text: 'fail' },
        ACTOR,
      );
      expect(result.ok).toBe(false);
    });

    it('fails for a nonexistent object', () => {
      const result = handleIntent(
        { kind: 'update-text', objectId: 'missing', text: 'fail' },
        ACTOR,
      );
      expect(result.ok).toBe(false);
    });
  });

  describe('update-color', () => {
    it('updates color on a sticky note', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'update-color', objectId: objectId!, color: 'blue' }, ACTOR);
      const obj = store.getObject(objectId!) as StickyNote;
      expect(obj.color).toBe('blue');
    });

    it('updates fill on a rectangle', () => {
      const { objectId } = handleIntent({ kind: 'create-rectangle', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'update-color', objectId: objectId!, color: '#00FF00' }, ACTOR);
      const obj = store.getObject(objectId!) as RectangleObject;
      expect(obj.fill).toBe('#00FF00');
    });

    it('fails for a nonexistent object', () => {
      const result = handleIntent(
        { kind: 'update-color', objectId: 'missing', color: 'red' },
        ACTOR,
      );
      expect(result.ok).toBe(false);
    });
  });

  describe('resize', () => {
    it('resizes an existing object', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent(
        { kind: 'resize', objectId: objectId!, width: 300, height: 400 },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const obj = store.getObject(objectId!)!;
      expect(obj.width).toBe(300);
      expect(obj.height).toBe(400);
    });

    it('returns ok true even for a nonexistent object (no existence check)', () => {
      const result = handleIntent(
        { kind: 'resize', objectId: 'missing', width: 100, height: 100 },
        ACTOR,
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('delete', () => {
    it('removes an existing object', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent({ kind: 'delete', objectId: objectId! }, ACTOR);
      expect(result.ok).toBe(true);
      expect(store.getObject(objectId!)).toBeUndefined();
    });

    it('succeeds even for a nonexistent object', () => {
      const result = handleIntent({ kind: 'delete', objectId: 'missing' }, ACTOR);
      expect(result.ok).toBe(true);
    });
  });
});
