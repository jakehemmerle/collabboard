import { describe, it, expect, beforeEach } from 'vitest';
import {
  addObject,
  setObject,
  getObject,
  getAllObjects,
  updateObject,
  moveObject,
  removeObject,
  clear,
  hydrateFromSnapshot,
} from '../domain/object-store.ts';
import type { StickyNote, RectangleObject } from '../contracts.ts';

function makeSticky(overrides: Partial<StickyNote> = {}): StickyNote {
  return {
    id: 'sticky-1',
    type: 'sticky',
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    text: 'hello',
    color: 'yellow',
    createdBy: 'user-1',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeRect(overrides: Partial<RectangleObject> = {}): RectangleObject {
  return {
    id: 'rect-1',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    fill: '#E0E0E0',
    stroke: '#9E9E9E',
    strokeWidth: 1,
    createdBy: 'user-1',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('object-store', () => {
  beforeEach(() => {
    clear();
  });

  describe('addObject / getObject', () => {
    it('stores and retrieves a sticky note', () => {
      const sticky = makeSticky();
      addObject(sticky);
      expect(getObject('sticky-1')).toEqual(sticky);
    });

    it('stores and retrieves a rectangle', () => {
      const rect = makeRect();
      addObject(rect);
      expect(getObject('rect-1')).toEqual(rect);
    });

    it('returns undefined for missing id', () => {
      expect(getObject('nonexistent')).toBeUndefined();
    });
  });

  describe('setObject', () => {
    it('adds a new object', () => {
      const sticky = makeSticky();
      setObject(sticky);
      expect(getObject('sticky-1')).toEqual(sticky);
    });

    it('overwrites an existing object with the same id', () => {
      addObject(makeSticky({ text: 'original' }));
      const replacement = makeSticky({ text: 'replaced', color: 'pink' });
      setObject(replacement);
      expect(getObject('sticky-1')).toEqual(replacement);
      expect(getAllObjects()).toHaveLength(1);
    });
  });

  describe('getAllObjects', () => {
    it('returns empty array when store is empty', () => {
      expect(getAllObjects()).toEqual([]);
    });

    it('returns all added objects', () => {
      addObject(makeSticky());
      addObject(makeRect());
      expect(getAllObjects()).toHaveLength(2);
    });
  });

  describe('updateObject', () => {
    it('patches an existing object', () => {
      addObject(makeSticky());
      updateObject('sticky-1', { text: 'updated' } as Partial<StickyNote>);
      const obj = getObject('sticky-1') as StickyNote;
      expect(obj.text).toBe('updated');
    });

    it('updates the updatedAt timestamp', () => {
      addObject(makeSticky({ updatedAt: 1000 }));
      updateObject('sticky-1', { text: 'updated' } as Partial<StickyNote>);
      const obj = getObject('sticky-1')!;
      expect(obj.updatedAt).toBeGreaterThan(1000);
    });

    it('preserves unpatched fields', () => {
      addObject(makeSticky({ text: 'keep', color: 'pink', x: 42 }));
      updateObject('sticky-1', { text: 'changed' } as Partial<StickyNote>);
      const obj = getObject('sticky-1') as StickyNote;
      expect(obj.text).toBe('changed');
      expect(obj.color).toBe('pink');
      expect(obj.x).toBe(42);
    });

    it('does nothing for a missing id', () => {
      updateObject('nonexistent', { x: 50 });
      expect(getObject('nonexistent')).toBeUndefined();
    });
  });

  describe('moveObject', () => {
    it('updates x and y coordinates', () => {
      addObject(makeSticky());
      moveObject('sticky-1', 50, 75);
      const obj = getObject('sticky-1')!;
      expect(obj.x).toBe(50);
      expect(obj.y).toBe(75);
    });
  });

  describe('removeObject', () => {
    it('removes an existing object', () => {
      addObject(makeSticky());
      removeObject('sticky-1');
      expect(getObject('sticky-1')).toBeUndefined();
    });

    it('does nothing for a missing id', () => {
      removeObject('nonexistent');
      expect(getAllObjects()).toEqual([]);
    });
  });

  describe('hydrateFromSnapshot', () => {
    it('replaces all objects with the snapshot', () => {
      addObject(makeSticky({ id: 'old' }));
      const newSticky = makeSticky({ id: 'new-1' });
      const newRect = makeRect({ id: 'new-2' });
      hydrateFromSnapshot([newSticky, newRect]);

      expect(getObject('old')).toBeUndefined();
      expect(getObject('new-1')).toEqual(newSticky);
      expect(getObject('new-2')).toEqual(newRect);
      expect(getAllObjects()).toHaveLength(2);
    });

    it('clears the store when given an empty array', () => {
      addObject(makeSticky());
      hydrateFromSnapshot([]);
      expect(getAllObjects()).toEqual([]);
    });
  });
});
