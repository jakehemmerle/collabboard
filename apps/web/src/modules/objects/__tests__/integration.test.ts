import { describe, it, expect, beforeEach } from 'vitest';
import { handleIntent, cloneObject } from '../domain/intent-handler.ts';
import * as store from '../domain/object-store.ts';
import { computeViewportBounds, getVisibleObjects } from '../domain/viewport-culling.ts';
import { findObjectsInBounds } from '../domain/frame-logic.ts';
import type { BoardObject, StickyNote, RectangleObject, CircleObject, LineObject, TextObject, ConnectorObject, FrameObject } from '../contracts.ts';

const ACTOR = 'test-user';

describe('integration: intent -> store -> culling pipeline', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('viewport culling filters objects at known positions', () => {
    it('returns only objects within the viewport bounds', () => {
      // Create objects at known positions
      handleIntent({ kind: 'create-sticky', x: 100, y: 100 }, ACTOR);
      handleIntent({ kind: 'create-sticky', x: 500, y: 400 }, ACTOR);
      handleIntent({ kind: 'create-rectangle', x: 5000, y: 5000 }, ACTOR); // way off-screen
      handleIntent({ kind: 'create-circle', x: 800, y: 600 }, ACTOR);
      handleIntent({ kind: 'create-text', x: 9000, y: 9000 }, ACTOR); // way off-screen

      // Viewport: camera at origin, 1920x1080 screen, margin=0 for exact bounds
      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const allObjects = store.getAllObjects();
      const visible = getVisibleObjects(allObjects, bounds);

      // Only the first three that fit within [0, 0] -> [1920, 1080] should be visible
      // sticky at (100,100) with 200x150 -> visible
      // sticky at (500,400) with 200x150 -> visible
      // rect at (5000,5000) -> hidden
      // circle at (800,600) with 100x100 -> visible
      // text at (9000,9000) -> hidden
      expect(visible).toHaveLength(3);
      const visibleTypes = visible.map((o) => `${o.type}@${o.x},${o.y}`).sort();
      expect(visibleTypes).toEqual([
        'circle@800,600',
        'sticky@100,100',
        'sticky@500,400',
      ]);
    });

    it('excludes objects just outside the viewport', () => {
      // With margin=0, an object at x=1921 (width=200) starts at 1921 which is > maxX=1920
      handleIntent({ kind: 'create-rectangle', x: 1921, y: 0 }, ACTOR);
      handleIntent({ kind: 'create-rectangle', x: 0, y: 1081 }, ACTOR);

      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const visible = getVisibleObjects(store.getAllObjects(), bounds);
      expect(visible).toHaveLength(0);
    });

    it('includes objects that partially overlap the viewport edge', () => {
      // Object extends from x=-100 to x=100 (width=200), overlaps viewport starting at x=0
      handleIntent({ kind: 'create-rectangle', x: -100, y: 100 }, ACTOR);

      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const visible = getVisibleObjects(store.getAllObjects(), bounds);
      expect(visible).toHaveLength(1);
    });
  });

  describe('connector visibility', () => {
    it('connector is visible when both source and target are visible', () => {
      const src = handleIntent({ kind: 'create-sticky', x: 100, y: 100 }, ACTOR);
      const tgt = handleIntent({ kind: 'create-rectangle', x: 400, y: 300 }, ACTOR);
      handleIntent({ kind: 'create-connector', sourceId: src.objectId!, targetId: tgt.objectId! }, ACTOR);

      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const visible = getVisibleObjects(store.getAllObjects(), bounds);

      // All three should be visible: source, target, connector
      expect(visible).toHaveLength(3);
      expect(visible.some((o) => o.type === 'connector')).toBe(true);
    });

    it('connector is hidden when both source and target are off-screen', () => {
      const src = handleIntent({ kind: 'create-sticky', x: 5000, y: 5000 }, ACTOR);
      const tgt = handleIntent({ kind: 'create-rectangle', x: 6000, y: 6000 }, ACTOR);
      handleIntent({ kind: 'create-connector', sourceId: src.objectId!, targetId: tgt.objectId! }, ACTOR);

      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const visible = getVisibleObjects(store.getAllObjects(), bounds);

      expect(visible).toHaveLength(0);
    });

    it('connector is visible when only source is on-screen', () => {
      const src = handleIntent({ kind: 'create-sticky', x: 100, y: 100 }, ACTOR);
      const tgt = handleIntent({ kind: 'create-rectangle', x: 5000, y: 5000 }, ACTOR);
      handleIntent({ kind: 'create-connector', sourceId: src.objectId!, targetId: tgt.objectId! }, ACTOR);

      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const visible = getVisibleObjects(store.getAllObjects(), bounds);

      expect(visible).toHaveLength(2); // source + connector
      const types = visible.map((o) => o.type).sort();
      expect(types).toEqual(['connector', 'sticky']);
    });

    it('connector is visible when only target is on-screen', () => {
      const src = handleIntent({ kind: 'create-sticky', x: 5000, y: 5000 }, ACTOR);
      const tgt = handleIntent({ kind: 'create-rectangle', x: 400, y: 300 }, ACTOR);
      handleIntent({ kind: 'create-connector', sourceId: src.objectId!, targetId: tgt.objectId! }, ACTOR);

      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);
      const visible = getVisibleObjects(store.getAllObjects(), bounds);

      expect(visible).toHaveLength(2); // target + connector
      const types = visible.map((o) => o.type).sort();
      expect(types).toEqual(['connector', 'rectangle']);
    });
  });

  describe('full CRUD cycle', () => {
    it('create -> move -> resize -> delete maintains store consistency', () => {
      // CREATE
      const createResult = handleIntent({ kind: 'create-sticky', x: 50, y: 60, text: 'CRUD test' }, ACTOR);
      expect(createResult.ok).toBe(true);
      const id = createResult.objectId!;

      let obj = store.getObject(id) as StickyNote;
      expect(obj).toBeDefined();
      expect(obj.type).toBe('sticky');
      expect(obj.x).toBe(50);
      expect(obj.y).toBe(60);
      expect(obj.text).toBe('CRUD test');
      expect(store.getAllObjects()).toHaveLength(1);

      // MOVE
      const moveResult = handleIntent({ kind: 'move', objectId: id, x: 200, y: 300 }, ACTOR);
      expect(moveResult.ok).toBe(true);

      obj = store.getObject(id) as StickyNote;
      expect(obj.x).toBe(200);
      expect(obj.y).toBe(300);
      expect(obj.text).toBe('CRUD test'); // text unchanged
      expect(store.getAllObjects()).toHaveLength(1);

      // RESIZE
      const resizeResult = handleIntent({ kind: 'resize', objectId: id, width: 400, height: 250 }, ACTOR);
      expect(resizeResult.ok).toBe(true);

      obj = store.getObject(id) as StickyNote;
      expect(obj.width).toBe(400);
      expect(obj.height).toBe(250);
      expect(obj.x).toBe(200); // position unchanged
      expect(obj.y).toBe(300);
      expect(store.getAllObjects()).toHaveLength(1);

      // DELETE
      const deleteResult = handleIntent({ kind: 'delete', objectId: id }, ACTOR);
      expect(deleteResult.ok).toBe(true);

      expect(store.getObject(id)).toBeUndefined();
      expect(store.getAllObjects()).toHaveLength(0);
    });

    it('create -> update-text -> update-color -> delete cycle', () => {
      const { objectId: id } = handleIntent({ kind: 'create-text', x: 10, y: 20, text: 'initial' }, ACTOR);

      handleIntent({ kind: 'update-text', objectId: id!, text: 'updated' }, ACTOR);
      expect((store.getObject(id!) as TextObject).text).toBe('updated');

      handleIntent({ kind: 'update-color', objectId: id!, color: '#FF0000' }, ACTOR);
      expect((store.getObject(id!) as TextObject).fill).toBe('#FF0000');

      handleIntent({ kind: 'delete', objectId: id! }, ACTOR);
      expect(store.getObject(id!)).toBeUndefined();
    });
  });

  describe('frame children recompute after move', () => {
    it('finds objects inside frame bounds and loses them after moving out', () => {
      // Create a frame at (0, 0) with default size 400x300
      const frameResult = handleIntent({ kind: 'create-frame', x: 0, y: 0, title: 'Test Frame' }, ACTOR);
      const frameId = frameResult.objectId!;
      const frame = store.getObject(frameId) as FrameObject;

      // Create objects inside the frame bounds
      const s1 = handleIntent({ kind: 'create-sticky', x: 50, y: 50 }, ACTOR);
      const s2 = handleIntent({ kind: 'create-circle', x: 150, y: 100 }, ACTOR);
      // Create an object outside the frame
      handleIntent({ kind: 'create-rectangle', x: 2000, y: 2000 }, ACTOR);

      // Compute which objects are inside the frame bounds
      const allObjects = store.getAllObjects();
      const frameBounds = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
      const children = findObjectsInBounds(allObjects, frameBounds);

      // s1 center: (50 + 100, 50 + 75) = (150, 125) -> inside (0,0)-(400,300)
      // s2 center: (150 + 50, 100 + 50) = (200, 150) -> inside (0,0)-(400,300)
      // s3 center: (2000 + 100, 2000 + 75) = (2100, 2075) -> outside
      expect(children).toHaveLength(2);
      const childIds = children.map((c) => c.id).sort();
      expect(childIds).toContain(s1.objectId!);
      expect(childIds).toContain(s2.objectId!);

      // Move s1 far outside the frame
      handleIntent({ kind: 'move', objectId: s1.objectId!, x: 3000, y: 3000 }, ACTOR);

      // Recompute children
      const updatedObjects = store.getAllObjects();
      const childrenAfterMove = findObjectsInBounds(updatedObjects, frameBounds);

      // Only s2 should remain inside
      expect(childrenAfterMove).toHaveLength(1);
      expect(childrenAfterMove[0].id).toBe(s2.objectId!);
    });

    it('excludes frames and connectors from frame children', () => {
      const frameResult = handleIntent({ kind: 'create-frame', x: 0, y: 0 }, ACTOR);
      const frame = store.getObject(frameResult.objectId!) as FrameObject;

      // Create another frame inside the first one
      handleIntent({ kind: 'create-frame', x: 50, y: 50 }, ACTOR);
      // Create a connector (at 0,0 with 0 size, so its center is at origin, inside frame)
      const src = handleIntent({ kind: 'create-sticky', x: 50, y: 50 }, ACTOR);
      const tgt = handleIntent({ kind: 'create-sticky', x: 150, y: 150 }, ACTOR);
      handleIntent({ kind: 'create-connector', sourceId: src.objectId!, targetId: tgt.objectId! }, ACTOR);

      const allObjects = store.getAllObjects();
      const frameBounds = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
      const children = findObjectsInBounds(allObjects, frameBounds);

      // findObjectsInBounds excludes frames and connectors
      const childTypes = children.map((c) => c.type);
      expect(childTypes).not.toContain('frame');
      expect(childTypes).not.toContain('connector');
      // The two sticky notes should be found
      expect(children).toHaveLength(2);
    });
  });

  describe('clone/serialization round-trip', () => {
    it('preserves sticky note properties except id, createdBy, createdAt, updatedAt, and offset position', () => {
      const { objectId } = handleIntent(
        { kind: 'create-sticky', x: 100, y: 200, color: 'pink', text: 'clone me' },
        ACTOR,
      );
      const original = store.getObject(objectId!) as StickyNote;
      const clone = cloneObject(original, 'other-user', 30, 40) as StickyNote;

      // Different identity
      expect(clone.id).not.toBe(original.id);
      expect(clone.createdBy).toBe('other-user');
      expect(clone.createdBy).not.toBe(original.createdBy);

      // Offset position
      expect(clone.x).toBe(original.x + 30);
      expect(clone.y).toBe(original.y + 40);

      // Preserved properties
      expect(clone.type).toBe('sticky');
      expect(clone.width).toBe(original.width);
      expect(clone.height).toBe(original.height);
      expect(clone.text).toBe('clone me');
      expect(clone.color).toBe('pink');
    });

    it('preserves rectangle properties on clone', () => {
      const { objectId } = handleIntent(
        { kind: 'create-rectangle', x: 50, y: 60, fill: '#FF0000' },
        ACTOR,
      );
      const original = store.getObject(objectId!) as BoardObject;
      const clone = cloneObject(original, 'other-user', 10, 10);

      expect(clone.id).not.toBe(original.id);
      expect(clone.x).toBe(60);
      expect(clone.y).toBe(70);
      expect(clone.type).toBe('rectangle');
      expect((clone as RectangleObject).fill).toBe('#FF0000');
      expect((clone as RectangleObject).stroke).toBe((original as RectangleObject).stroke);
    });

    it('preserves circle properties on clone', () => {
      const { objectId } = handleIntent(
        { kind: 'create-circle', x: 0, y: 0, fill: '#00FF00' },
        ACTOR,
      );
      const original = store.getObject(objectId!);
      const clone = cloneObject(original!, 'other-user', 5, 5);

      expect(clone.type).toBe('circle');
      expect((clone as CircleObject).fill).toBe('#00FF00');
      expect(clone.x).toBe(5);
      expect(clone.y).toBe(5);
    });

    it('preserves line properties and offsets x2/y2 on clone', () => {
      const { objectId } = handleIntent(
        { kind: 'create-line', x: 10, y: 20, x2: 300, y2: 150, stroke: '#E91E63' },
        ACTOR,
      );
      const original = store.getObject(objectId!) as BoardObject;
      const clone = cloneObject(original, 'other-user', 15, 25);

      expect(clone.type).toBe('line');
      expect(clone.x).toBe(25);  // 10 + 15
      expect(clone.y).toBe(45);  // 20 + 25
      expect((clone as LineObject).x2).toBe(315); // 300 + 15
      expect((clone as LineObject).y2).toBe(175); // 150 + 25
      expect((clone as LineObject).stroke).toBe('#E91E63');
    });

    it('preserves text properties on clone', () => {
      const { objectId } = handleIntent(
        { kind: 'create-text', x: 0, y: 0, text: 'Hello', fontSize: 24 },
        ACTOR,
      );
      const original = store.getObject(objectId!);
      const clone = cloneObject(original!, 'other-user', 0, 0);

      expect(clone.type).toBe('text');
      expect((clone as TextObject).text).toBe('Hello');
      expect((clone as TextObject).fontSize).toBe(24);
      expect((clone as TextObject).fontFamily).toBe('sans-serif');
    });

    it('clears sourceId and targetId on connector clone', () => {
      const src = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
      const tgt = handleIntent({ kind: 'create-rectangle', x: 200, y: 200 }, ACTOR);
      const { objectId } = handleIntent(
        { kind: 'create-connector', sourceId: src.objectId!, targetId: tgt.objectId! },
        ACTOR,
      );
      const original = store.getObject(objectId!) as ConnectorObject;
      const clone = cloneObject(original, 'other-user', 0, 0) as ConnectorObject;

      expect(clone.type).toBe('connector');
      expect(clone.sourceId).toBe('');
      expect(clone.targetId).toBe('');
      expect(clone.style).toBe(original.style);
      expect(clone.stroke).toBe(original.stroke);
    });

    it('clears children on frame clone', () => {
      const { objectId: frameId } = handleIntent({ kind: 'create-frame', x: 0, y: 0, title: 'My Frame' }, ACTOR);
      // Manually set children on the frame
      store.updateObject(frameId!, { children: ['child-1', 'child-2'] } as Partial<FrameObject>);

      const original = store.getObject(frameId!) as FrameObject;
      expect(original.children).toEqual(['child-1', 'child-2']);

      const clone = cloneObject(original, 'other-user', 10, 10) as FrameObject;

      expect(clone.type).toBe('frame');
      expect(clone.children).toEqual([]);
      expect(clone.title).toBe('My Frame');
    });
  });

  describe('bulk create 500 objects, verify culling returns subset', () => {
    it('creates 500 objects spread across a large area and culls to a proper subset', () => {
      // Create 500 sticky notes in a 50x10 grid, each spaced 200px apart
      // This spreads objects from (0,0) to (9800, 1800)
      for (let i = 0; i < 500; i++) {
        const col = i % 50;
        const row = Math.floor(i / 50);
        handleIntent({ kind: 'create-sticky', x: col * 200, y: row * 200 }, ACTOR);
      }

      expect(store.getAllObjects()).toHaveLength(500);

      // Small viewport: 800x600, no margin, camera at origin
      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 800, 600, 0);
      const allObjects = store.getAllObjects();
      const visible = getVisibleObjects(allObjects, bounds);

      // Visible objects should be a proper subset
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length).toBeLessThan(500);

      // Verify all visible objects actually overlap the viewport
      for (const obj of visible) {
        const overlapsX = obj.x + obj.width >= bounds.minX && obj.x <= bounds.maxX;
        const overlapsY = obj.y + obj.height >= bounds.minY && obj.y <= bounds.maxY;
        expect(overlapsX && overlapsY).toBe(true);
      }
    });

    it('culling with a panned camera returns a different subset', () => {
      // Create 500 objects spread across a large area
      for (let i = 0; i < 500; i++) {
        const col = i % 50;
        const row = Math.floor(i / 50);
        handleIntent({ kind: 'create-sticky', x: col * 200, y: row * 200 }, ACTOR);
      }

      const allObjects = store.getAllObjects();

      // Viewport at origin
      const bounds1 = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 800, 600, 0);
      const visible1 = getVisibleObjects(allObjects, bounds1);

      // Viewport panned far to the right (camera offset shifts world coords)
      const bounds2 = computeViewportBounds({ x: -5000, y: -1000, scale: 1 }, 800, 600, 0);
      const visible2 = getVisibleObjects(allObjects, bounds2);

      // Both should be proper subsets but with different objects
      expect(visible1.length).toBeGreaterThan(0);
      expect(visible2.length).toBeGreaterThan(0);
      expect(visible1.length).toBeLessThan(500);
      expect(visible2.length).toBeLessThan(500);

      // The two sets should have different objects (different viewport positions)
      const ids1 = new Set(visible1.map((o) => o.id));
      const ids2 = new Set(visible2.map((o) => o.id));
      const overlap = [...ids1].filter((id) => ids2.has(id));
      expect(overlap.length).toBeLessThan(ids1.size);
    });

    it('culling 500 objects completes in under 10ms', () => {
      for (let i = 0; i < 500; i++) {
        handleIntent({ kind: 'create-sticky', x: i * 100, y: i * 50 }, ACTOR);
      }

      const allObjects = store.getAllObjects();
      const bounds = computeViewportBounds({ x: 0, y: 0, scale: 1 }, 1920, 1080, 0);

      const start = performance.now();
      const visible = getVisibleObjects(allObjects, bounds);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length).toBeLessThan(500);
    });
  });
});
