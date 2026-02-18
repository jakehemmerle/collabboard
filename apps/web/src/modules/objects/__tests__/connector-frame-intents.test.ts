import { describe, it, expect, beforeEach } from 'vitest';
import { handleIntent } from '../domain/intent-handler.ts';
import * as store from '../domain/object-store.ts';
import type { ConnectorObject, FrameObject } from '../contracts.ts';
import { DEFAULT_FRAME_SIZE } from '../contracts.ts';

const ACTOR = 'user-1';

describe('connector and frame intents', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('create-connector', () => {
    it('creates connector with sourceId, targetId, and defaults', () => {
      const result = handleIntent(
        { kind: 'create-connector', sourceId: 'src-1', targetId: 'tgt-1' },
        ACTOR,
      );
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();

      const obj = store.getObject(result.objectId!) as ConnectorObject;
      expect(obj.type).toBe('connector');
      expect(obj.sourceId).toBe('src-1');
      expect(obj.targetId).toBe('tgt-1');
      expect(obj.style).toBe('arrow');
      expect(obj.stroke).toBe('#616161');
      expect(obj.strokeWidth).toBe(2);
      expect(obj.createdBy).toBe(ACTOR);
    });

    it('accepts custom style and stroke', () => {
      const result = handleIntent(
        { kind: 'create-connector', sourceId: 'a', targetId: 'b', style: 'line', stroke: '#FF0000' },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as ConnectorObject;
      expect(obj.style).toBe('line');
      expect(obj.stroke).toBe('#FF0000');
    });
  });

  describe('create-frame', () => {
    it('creates frame with defaults', () => {
      const result = handleIntent(
        { kind: 'create-frame', x: 100, y: 200 },
        ACTOR,
      );
      expect(result.ok).toBe(true);
      expect(result.objectId).toBeDefined();

      const obj = store.getObject(result.objectId!) as FrameObject;
      expect(obj.type).toBe('frame');
      expect(obj.x).toBe(100);
      expect(obj.y).toBe(200);
      expect(obj.width).toBe(DEFAULT_FRAME_SIZE.width);
      expect(obj.height).toBe(DEFAULT_FRAME_SIZE.height);
      expect(obj.title).toBe('Frame');
      expect(obj.fill).toBe('rgba(200, 200, 200, 0.1)');
      expect(obj.children).toEqual([]);
      expect(obj.createdBy).toBe(ACTOR);
    });

    it('accepts custom title and fill', () => {
      const result = handleIntent(
        { kind: 'create-frame', x: 0, y: 0, title: 'My Frame', fill: '#AABBCC' },
        ACTOR,
      );
      const obj = store.getObject(result.objectId!) as FrameObject;
      expect(obj.title).toBe('My Frame');
      expect(obj.fill).toBe('#AABBCC');
    });
  });

  describe('update-frame-children', () => {
    it('sets children array on a frame', () => {
      const { objectId } = handleIntent(
        { kind: 'create-frame', x: 0, y: 0 },
        ACTOR,
      );
      const result = handleIntent(
        { kind: 'update-frame-children', objectId: objectId!, children: ['child-1', 'child-2'] },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const obj = store.getObject(objectId!) as FrameObject;
      expect(obj.children).toEqual(['child-1', 'child-2']);
    });

    it('fails on non-frame object', () => {
      const { objectId } = handleIntent(
        { kind: 'create-rectangle', x: 0, y: 0 },
        ACTOR,
      );
      const result = handleIntent(
        { kind: 'update-frame-children', objectId: objectId!, children: ['a'] },
        ACTOR,
      );
      expect(result.ok).toBe(false);
    });

    it('fails on nonexistent object', () => {
      const result = handleIntent(
        { kind: 'update-frame-children', objectId: 'missing', children: ['a'] },
        ACTOR,
      );
      expect(result.ok).toBe(false);
    });
  });

  describe('move with frame', () => {
    it('moving a frame also moves its children', () => {
      // Create a frame at (0, 0)
      const { objectId: frameId } = handleIntent(
        { kind: 'create-frame', x: 0, y: 0 },
        ACTOR,
      );

      // Create two child objects
      const { objectId: childId1 } = handleIntent(
        { kind: 'create-rectangle', x: 50, y: 50 },
        ACTOR,
      );
      const { objectId: childId2 } = handleIntent(
        { kind: 'create-sticky', x: 100, y: 100 },
        ACTOR,
      );

      // Set children on frame
      handleIntent(
        { kind: 'update-frame-children', objectId: frameId!, children: [childId1!, childId2!] },
        ACTOR,
      );

      // Move frame from (0,0) to (200, 300) — delta is (200, 300)
      const result = handleIntent(
        { kind: 'move', objectId: frameId!, x: 200, y: 300 },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const frame = store.getObject(frameId!) as FrameObject;
      expect(frame.x).toBe(200);
      expect(frame.y).toBe(300);

      const child1 = store.getObject(childId1!)!;
      expect(child1.x).toBe(250); // 50 + 200
      expect(child1.y).toBe(350); // 50 + 300

      const child2 = store.getObject(childId2!)!;
      expect(child2.x).toBe(300); // 100 + 200
      expect(child2.y).toBe(400); // 100 + 300
    });
  });

  describe('update-color on connector', () => {
    it('updates stroke on connector', () => {
      const { objectId } = handleIntent(
        { kind: 'create-connector', sourceId: 'a', targetId: 'b' },
        ACTOR,
      );
      handleIntent(
        { kind: 'update-color', objectId: objectId!, color: '#00FF00' },
        ACTOR,
      );

      const obj = store.getObject(objectId!) as ConnectorObject;
      expect(obj.stroke).toBe('#00FF00');
    });
  });

  describe('update-color on frame', () => {
    it('updates fill on frame', () => {
      const { objectId } = handleIntent(
        { kind: 'create-frame', x: 0, y: 0 },
        ACTOR,
      );
      handleIntent(
        { kind: 'update-color', objectId: objectId!, color: '#DDDDDD' },
        ACTOR,
      );

      const obj = store.getObject(objectId!) as FrameObject;
      expect(obj.fill).toBe('#DDDDDD');
    });
  });

  describe('duplicate connector', () => {
    it('clears sourceId and targetId on duplicated connector', () => {
      const { objectId } = handleIntent(
        { kind: 'create-connector', sourceId: 'src-1', targetId: 'tgt-1' },
        ACTOR,
      );
      const result = handleIntent(
        { kind: 'duplicate', objectIds: [objectId!] },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const dup = store.getObject(result.objectId!) as ConnectorObject;
      expect(dup.type).toBe('connector');
      expect(dup.sourceId).toBe('');
      expect(dup.targetId).toBe('');
    });
  });

  describe('duplicate frame', () => {
    it('clears children array on duplicated frame', () => {
      const { objectId: frameId } = handleIntent(
        { kind: 'create-frame', x: 0, y: 0 },
        ACTOR,
      );
      handleIntent(
        { kind: 'update-frame-children', objectId: frameId!, children: ['c1', 'c2'] },
        ACTOR,
      );

      const result = handleIntent(
        { kind: 'duplicate', objectIds: [frameId!] },
        ACTOR,
      );
      expect(result.ok).toBe(true);

      const dup = store.getObject(result.objectId!) as FrameObject;
      expect(dup.type).toBe('frame');
      expect(dup.children).toEqual([]);
    });
  });
});
