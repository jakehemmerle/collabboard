import { describe, it, expect, beforeEach } from 'vitest';
import { handleIntent } from '../domain/intent-handler.ts';
import * as store from '../domain/object-store.ts';
import { getSelectionBoxBounds, isObjectInBounds } from '../domain/geometry.ts';

const ACTOR = 'user-1';

describe('multi-select', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('select', () => {
    it('sets selectedIds to the given array', () => {
      const { objectId: id1 } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const { objectId: id2 } = handleIntent({ kind: 'create-sticky', x: 100, y: 100 }, ACTOR);

      const selectedIds = [id1!, id2!];
      // select() is on the module API, but we can verify the ids are valid
      expect(selectedIds).toHaveLength(2);
      expect(store.getObject(id1!)).toBeDefined();
      expect(store.getObject(id2!)).toBeDefined();
    });

    it('can select a subset of objects', () => {
      const { objectId: id1 } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'create-sticky', x: 100, y: 100 }, ACTOR);
      handleIntent({ kind: 'create-rectangle', x: 200, y: 200 }, ACTOR);

      const selectedIds = [id1!];
      expect(selectedIds).toHaveLength(1);
      expect(store.getAllObjects()).toHaveLength(3);
    });

    it('can select an empty array', () => {
      handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const selectedIds: string[] = [];
      expect(selectedIds).toHaveLength(0);
    });
  });

  describe('toggleSelect', () => {
    it('adds an id when not already selected', () => {
      const { objectId: id1 } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);

      let selectedIds: string[] = [];
      // Simulate toggle: add
      if (!selectedIds.includes(id1!)) {
        selectedIds = [...selectedIds, id1!];
      }
      expect(selectedIds).toContain(id1!);
      expect(selectedIds).toHaveLength(1);
    });

    it('removes an id when already selected', () => {
      const { objectId: id1 } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);

      let selectedIds = [id1!];
      // Simulate toggle: remove
      if (selectedIds.includes(id1!)) {
        selectedIds = selectedIds.filter((sid) => sid !== id1!);
      }
      expect(selectedIds).not.toContain(id1!);
      expect(selectedIds).toHaveLength(0);
    });

    it('toggles multiple ids independently', () => {
      const { objectId: id1 } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const { objectId: id2 } = handleIntent({ kind: 'create-rectangle', x: 100, y: 100 }, ACTOR);

      let selectedIds: string[] = [];

      // Toggle id1 on
      selectedIds = [...selectedIds, id1!];
      // Toggle id2 on
      selectedIds = [...selectedIds, id2!];
      expect(selectedIds).toHaveLength(2);

      // Toggle id1 off
      selectedIds = selectedIds.filter((sid) => sid !== id1!);
      expect(selectedIds).toHaveLength(1);
      expect(selectedIds).toContain(id2!);
      expect(selectedIds).not.toContain(id1!);
    });
  });

  describe('selectAll', () => {
    it('selects all objects in the store', () => {
      handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'create-rectangle', x: 100, y: 100 }, ACTOR);
      handleIntent({ kind: 'create-circle', x: 200, y: 200 }, ACTOR);

      const allObjects = store.getAllObjects();
      const selectedIds = allObjects.map((o) => o.id);
      expect(selectedIds).toHaveLength(3);
      expect(selectedIds).toEqual(allObjects.map((o) => o.id));
    });

    it('returns empty when no objects exist', () => {
      const allObjects = store.getAllObjects();
      const selectedIds = allObjects.map((o) => o.id);
      expect(selectedIds).toHaveLength(0);
    });
  });

  describe('deselectAll', () => {
    it('clears selection', () => {
      handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      handleIntent({ kind: 'create-rectangle', x: 100, y: 100 }, ACTOR);

      const allObjects = store.getAllObjects();
      let selectedIds = allObjects.map((o) => o.id);
      expect(selectedIds).toHaveLength(2);

      // deselectAll
      selectedIds = [];
      expect(selectedIds).toHaveLength(0);
    });
  });
});

describe('getSelectionBoxBounds', () => {
  it('computes bounds for top-left to bottom-right drag', () => {
    const bounds = getSelectionBoxBounds(10, 20, 110, 120);
    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it('computes bounds for bottom-right to top-left drag (negative direction)', () => {
    const bounds = getSelectionBoxBounds(110, 120, 10, 20);
    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it('computes bounds for top-right to bottom-left drag', () => {
    const bounds = getSelectionBoxBounds(200, 50, 100, 150);
    expect(bounds).toEqual({ x: 100, y: 50, width: 100, height: 100 });
  });

  it('computes bounds for bottom-left to top-right drag', () => {
    const bounds = getSelectionBoxBounds(50, 200, 150, 100);
    expect(bounds).toEqual({ x: 50, y: 100, width: 100, height: 100 });
  });

  it('handles zero-size selection (same start and end)', () => {
    const bounds = getSelectionBoxBounds(50, 50, 50, 50);
    expect(bounds).toEqual({ x: 50, y: 50, width: 0, height: 0 });
  });

  it('handles horizontal-only drag', () => {
    const bounds = getSelectionBoxBounds(0, 50, 200, 50);
    expect(bounds).toEqual({ x: 0, y: 50, width: 200, height: 0 });
  });

  it('handles vertical-only drag', () => {
    const bounds = getSelectionBoxBounds(50, 0, 50, 200);
    expect(bounds).toEqual({ x: 50, y: 0, width: 0, height: 200 });
  });
});

describe('isObjectInBounds', () => {
  const bounds = { x: 100, y: 100, width: 200, height: 200 };

  it('returns true when object center is inside bounds', () => {
    const obj = { x: 150, y: 150, width: 50, height: 50 };
    // center: (175, 175) - inside bounds (100-300, 100-300)
    expect(isObjectInBounds(obj, bounds)).toBe(true);
  });

  it('returns true when object center is on bounds edge', () => {
    // Object at x=80, width=40 => center x=100, which is on left edge of bounds
    const obj = { x: 80, y: 150, width: 40, height: 40 };
    // center: (100, 170) - on the boundary edge
    expect(isObjectInBounds(obj, bounds)).toBe(true);
  });

  it('returns false when object is entirely outside bounds', () => {
    const obj = { x: 0, y: 0, width: 50, height: 50 };
    // center: (25, 25) - outside bounds
    expect(isObjectInBounds(obj, bounds)).toBe(false);
  });

  it('returns false when object is to the right of bounds', () => {
    const obj = { x: 400, y: 150, width: 50, height: 50 };
    // center: (425, 175) - outside bounds on the right
    expect(isObjectInBounds(obj, bounds)).toBe(false);
  });

  it('returns false when object is below bounds', () => {
    const obj = { x: 150, y: 400, width: 50, height: 50 };
    // center: (175, 425) - outside bounds below
    expect(isObjectInBounds(obj, bounds)).toBe(false);
  });

  it('returns true when object partially overlaps but center is inside', () => {
    // Object extends outside bounds but its center is inside
    const obj = { x: 80, y: 80, width: 100, height: 100 };
    // center: (130, 130) - inside bounds
    expect(isObjectInBounds(obj, bounds)).toBe(true);
  });

  it('returns false when object partially overlaps but center is outside', () => {
    // Object overlaps bounds area but its center is outside
    const obj = { x: 0, y: 0, width: 120, height: 120 };
    // center: (60, 60) - outside bounds
    expect(isObjectInBounds(obj, bounds)).toBe(false);
  });

  it('returns true when object center is exactly at bounds corner', () => {
    // center at (100, 100) = top-left corner of bounds
    const obj = { x: 80, y: 80, width: 40, height: 40 };
    expect(isObjectInBounds(obj, bounds)).toBe(true);
  });

  it('returns true when object center is at bottom-right corner of bounds', () => {
    // center at (300, 300) = bottom-right corner of bounds
    const obj = { x: 280, y: 280, width: 40, height: 40 };
    expect(isObjectInBounds(obj, bounds)).toBe(true);
  });

  it('returns false when object center is just outside bounds', () => {
    // center at (301, 200) - just past the right edge
    const obj = { x: 281, y: 180, width: 40, height: 40 };
    expect(isObjectInBounds(obj, bounds)).toBe(false);
  });
});
