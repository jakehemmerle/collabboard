import { describe, it, expect, beforeEach } from 'vitest';
import { handleIntent } from '../domain/intent-handler.ts';
import * as store from '../domain/object-store.ts';
import type { StickyNote, RectangleObject, CircleObject, LineObject, TextObject } from '../contracts.ts';
import { DEFAULT_STICKY_SIZE, DEFAULT_RECT_SIZE, DEFAULT_CIRCLE_SIZE, DEFAULT_LINE_LENGTH, DEFAULT_TEXT_SIZE } from '../contracts.ts';

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

    it('updates text on a text object', () => {
      const { objectId } = handleIntent({ kind: 'create-text', x: 0, y: 0 }, ACTOR);
      const result = handleIntent(
        { kind: 'update-text', objectId: objectId!, text: 'updated text' },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const obj = store.getObject(objectId!) as TextObject;
      expect(obj.text).toBe('updated text');
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

    it('updates fill on a circle', () => {
      const { objectId } = handleIntent({ kind: 'create-circle', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'update-color', objectId: objectId!, color: '#FF5722' }, ACTOR);
      const obj = store.getObject(objectId!) as CircleObject;
      expect(obj.fill).toBe('#FF5722');
    });

    it('updates stroke on a line', () => {
      const { objectId } = handleIntent({ kind: 'create-line', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'update-color', objectId: objectId!, color: '#4CAF50' }, ACTOR);
      const obj = store.getObject(objectId!) as LineObject;
      expect(obj.stroke).toBe('#4CAF50');
    });

    it('updates fill on a text object', () => {
      const { objectId } = handleIntent({ kind: 'create-text', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'update-color', objectId: objectId!, color: '#FF0000' }, ACTOR);
      const obj = store.getObject(objectId!) as TextObject;
      expect(obj.fill).toBe('#FF0000');
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

  describe('rotate', () => {
    it('sets rotation on an existing object', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent({ kind: 'rotate', objectId: objectId!, rotation: 45 }, ACTOR);
      expect(result.ok).toBe(true);

      const obj = store.getObject(objectId!)!;
      expect(obj.rotation).toBe(45);
    });

    it('updates rotation to a new value', () => {
      const { objectId } = handleIntent({ kind: 'create-rectangle', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'rotate', objectId: objectId!, rotation: 90 }, ACTOR);
      handleIntent({ kind: 'rotate', objectId: objectId!, rotation: 180 }, ACTOR);

      const obj = store.getObject(objectId!)!;
      expect(obj.rotation).toBe(180);
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

  describe('create-circle', () => {
    it('creates a circle with defaults', () => {
      const result = handleIntent({ kind: 'create-circle', x: 50, y: 60 }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();

      const obj = store.getObject(result.objectId!) as CircleObject;
      expect(obj.type).toBe('circle');
      expect(obj.x).toBe(50);
      expect(obj.y).toBe(60);
      expect(obj.width).toBe(DEFAULT_CIRCLE_SIZE.width);
      expect(obj.height).toBe(DEFAULT_CIRCLE_SIZE.height);
      expect(obj.fill).toBe('#90CAF9');
      expect(obj.stroke).toBe('#42A5F5');
      expect(obj.strokeWidth).toBe(2);
      expect(obj.createdBy).toBe(ACTOR);
    });

    it('accepts custom fill', () => {
      const result = handleIntent(
        { kind: 'create-circle', x: 0, y: 0, fill: '#FF5722' },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as CircleObject;
      expect(obj.fill).toBe('#FF5722');
    });
  });

  describe('create-line', () => {
    it('creates a line with defaults', () => {
      const result = handleIntent({ kind: 'create-line', x: 10, y: 20 }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();

      const obj = store.getObject(result.objectId!) as LineObject;
      expect(obj.type).toBe('line');
      expect(obj.x).toBe(10);
      expect(obj.y).toBe(20);
      expect(obj.x2).toBe(10 + DEFAULT_LINE_LENGTH);
      expect(obj.y2).toBe(20);
      expect(obj.stroke).toBe('#616161');
      expect(obj.strokeWidth).toBe(2);
      expect(obj.createdBy).toBe(ACTOR);
    });

    it('accepts custom x2, y2, and stroke', () => {
      const result = handleIntent(
        { kind: 'create-line', x: 0, y: 0, x2: 300, y2: 150, stroke: '#E91E63' },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as LineObject;
      expect(obj.x2).toBe(300);
      expect(obj.y2).toBe(150);
      expect(obj.stroke).toBe('#E91E63');
    });
  });

  describe('create-text', () => {
    it('creates a text object with defaults', () => {
      const result = handleIntent({ kind: 'create-text', x: 70, y: 80 }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();

      const obj = store.getObject(result.objectId!) as TextObject;
      expect(obj.type).toBe('text');
      expect(obj.x).toBe(70);
      expect(obj.y).toBe(80);
      expect(obj.width).toBe(DEFAULT_TEXT_SIZE.width);
      expect(obj.height).toBe(DEFAULT_TEXT_SIZE.height);
      expect(obj.text).toBe('Text');
      expect(obj.fontSize).toBe(18);
      expect(obj.fontFamily).toBe('sans-serif');
      expect(obj.fill).toBe('#333333');
      expect(obj.createdBy).toBe(ACTOR);
    });

    it('accepts custom text and fontSize', () => {
      const result = handleIntent(
        { kind: 'create-text', x: 0, y: 0, text: 'Hello World', fontSize: 24 },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as TextObject;
      expect(obj.text).toBe('Hello World');
      expect(obj.fontSize).toBe(24);
    });
  });

  describe('duplicate', () => {
    it('duplicates a single sticky note with offset', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 100, y: 200, text: 'hello', color: 'pink' }, ACTOR);
      const result = handleIntent({ kind: 'duplicate', objectIds: [objectId!] }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();
      expect(result.objectIds).toHaveLength(1);

      const original = store.getObject(objectId!) as StickyNote;
      const dup = store.getObject(result.objectId!) as StickyNote;
      expect(dup.id).not.toBe(original.id);
      expect(dup.x).toBe(120); // 100 + 20 offset
      expect(dup.y).toBe(220); // 200 + 20 offset
      expect(dup.text).toBe('hello');
      expect(dup.color).toBe('pink');
      expect(dup.type).toBe('sticky');
    });

    it('duplicates multiple objects', () => {
      const r1 = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const r2 = handleIntent({ kind: 'create-rectangle', x: 100, y: 100 }, ACTOR);
      const result = handleIntent({ kind: 'duplicate', objectIds: [r1.objectId!, r2.objectId!] }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectIds).toHaveLength(2);

      // Total objects should be 4 (2 originals + 2 duplicates)
      expect(store.getAllObjects()).toHaveLength(4);
    });

    it('preserves line x2/y2 with offset', () => {
      const { objectId } = handleIntent({ kind: 'create-line', x: 10, y: 20, x2: 310, y2: 20 }, ACTOR);
      const result = handleIntent({ kind: 'duplicate', objectIds: [objectId!] }, ACTOR);

      const dup = store.getObject(result.objectId!) as LineObject;
      expect(dup.x).toBe(30);  // 10 + 20
      expect(dup.y).toBe(40);  // 20 + 20
      expect(dup.x2).toBe(330); // 310 + 20
      expect(dup.y2).toBe(40);  // 20 + 20
    });

    it('uses custom offset', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent({ kind: 'duplicate', objectIds: [objectId!], offsetX: 50, offsetY: 100 }, ACTOR);

      const dup = store.getObject(result.objectId!);
      expect(dup!.x).toBe(50);
      expect(dup!.y).toBe(100);
    });

    it('skips nonexistent objects', () => {
      const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const result = handleIntent({ kind: 'duplicate', objectIds: ['missing', objectId!] }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectIds).toHaveLength(1);
      expect(store.getAllObjects()).toHaveLength(2);
    });

    it('returns ok with no IDs for empty array', () => {
      const result = handleIntent({ kind: 'duplicate', objectIds: [] }, ACTOR);
      expect(result.ok).toBe(true);
      expect(result.objectIds).toHaveLength(0);
    });

    it('duplicates all object types preserving type-specific fields', () => {
      const sticky = handleIntent({ kind: 'create-sticky', x: 0, y: 0, color: 'blue', text: 'test' }, ACTOR);
      const rect = handleIntent({ kind: 'create-rectangle', x: 0, y: 0, fill: '#FF0000' }, ACTOR);
      const circle = handleIntent({ kind: 'create-circle', x: 0, y: 0, fill: '#00FF00' }, ACTOR);
      const text = handleIntent({ kind: 'create-text', x: 0, y: 0, text: 'hello', fontSize: 24 }, ACTOR);

      const result = handleIntent({
        kind: 'duplicate',
        objectIds: [sticky.objectId!, rect.objectId!, circle.objectId!, text.objectId!],
      }, ACTOR);

      expect(result.objectIds).toHaveLength(4);

      const dupSticky = store.getObject(result.objectIds![0]) as StickyNote;
      expect(dupSticky.color).toBe('blue');
      expect(dupSticky.text).toBe('test');

      const dupRect = store.getObject(result.objectIds![1]) as RectangleObject;
      expect(dupRect.fill).toBe('#FF0000');

      const dupCircle = store.getObject(result.objectIds![2]) as CircleObject;
      expect(dupCircle.fill).toBe('#00FF00');

      const dupText = store.getObject(result.objectIds![3]) as TextObject;
      expect(dupText.text).toBe('hello');
      expect(dupText.fontSize).toBe(24);
    });
  });
});
