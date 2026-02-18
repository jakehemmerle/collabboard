import { describe, it, expect, beforeEach } from 'vitest';
import * as clipboard from '../domain/clipboard.ts';
import * as store from '../domain/object-store.ts';
import { handleIntent } from '../domain/intent-handler.ts';
import type { StickyNote, LineObject } from '../contracts.ts';

const ACTOR = 'user-1';

describe('clipboard', () => {
  beforeEach(() => {
    store.clear();
    clipboard.clearClipboard();
  });

  it('copy stores objects, paste creates new ones', () => {
    const { objectId } = handleIntent({ kind: 'create-sticky', x: 100, y: 200, text: 'hi', color: 'green' }, ACTOR);
    clipboard.copy([objectId!]);

    const pasted = clipboard.paste(500, 500, ACTOR);
    expect(pasted).toHaveLength(1);
    expect(pasted[0].id).not.toBe(objectId);

    const p = pasted[0] as StickyNote;
    expect(p.text).toBe('hi');
    expect(p.color).toBe('green');
    expect(p.type).toBe('sticky');
  });

  it('paste centers objects at target point', () => {
    // Create two objects: one at (0,0) size 100x100, one at (200,0) size 100x100
    // Bounding box: (0,0)-(300,100), center = (150, 50)
    const r1 = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
    const r2 = handleIntent({ kind: 'create-sticky', x: 200, y: 0 }, ACTOR);

    clipboard.copy([r1.objectId!, r2.objectId!]);

    // Paste centered at (500, 500)
    // Original center: stickies are 200x150 each
    // obj1 at (0,0) size 200x150 → maxX=200, maxY=150
    // obj2 at (200,0) size 200x150 → maxX=400, maxY=150
    // Bounding center: (0+400)/2=200, (0+150)/2=75
    // Offset: 500-200=300, 500-75=425
    const pasted = clipboard.paste(500, 500, ACTOR);
    expect(pasted).toHaveLength(2);
    expect(pasted[0].x).toBe(300); // 0 + 300
    expect(pasted[0].y).toBe(425); // 0 + 425
    expect(pasted[1].x).toBe(500); // 200 + 300
    expect(pasted[1].y).toBe(425); // 0 + 425
  });

  it('paste adjusts line x2/y2', () => {
    const { objectId } = handleIntent({ kind: 'create-line', x: 10, y: 20, x2: 210, y2: 20 }, ACTOR);
    clipboard.copy([objectId!]);

    // Line bounding box: x=10, y=20, width=200, height=0
    // But width/height from object properties matter for centering
    const original = store.getObject(objectId!) as LineObject;
    const centerX = (original.x + original.x + original.width) / 2;
    const centerY = (original.y + original.y + original.height) / 2;

    const pasted = clipboard.paste(centerX + 100, centerY + 100, ACTOR);
    const p = pasted[0] as LineObject;
    expect(p.x).toBe(original.x + 100);
    expect(p.y).toBe(original.y + 100);
    expect(p.x2).toBe(original.x2 + 100);
    expect(p.y2).toBe(original.y2 + 100);
  });

  it('hasClipboardData returns false when empty', () => {
    expect(clipboard.hasClipboardData()).toBe(false);
  });

  it('hasClipboardData returns true after copy', () => {
    const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
    clipboard.copy([objectId!]);
    expect(clipboard.hasClipboardData()).toBe(true);
  });

  it('paste with empty clipboard returns empty array', () => {
    const result = clipboard.paste(0, 0, ACTOR);
    expect(result).toHaveLength(0);
  });

  it('clearClipboard empties the clipboard', () => {
    const { objectId } = handleIntent({ kind: 'create-sticky', x: 0, y: 0 }, ACTOR);
    clipboard.copy([objectId!]);
    expect(clipboard.hasClipboardData()).toBe(true);
    clipboard.clearClipboard();
    expect(clipboard.hasClipboardData()).toBe(false);
  });

  it('paste can be called multiple times from same copy', () => {
    const { objectId } = handleIntent({ kind: 'create-sticky', x: 100, y: 100 }, ACTOR);
    clipboard.copy([objectId!]);

    const paste1 = clipboard.paste(200, 200, ACTOR);
    const paste2 = clipboard.paste(300, 300, ACTOR);

    expect(paste1).toHaveLength(1);
    expect(paste2).toHaveLength(1);
    // Different IDs for each paste
    expect(paste1[0].id).not.toBe(paste2[0].id);
    // Total: 1 original + 2 pastes = 3
    expect(store.getAllObjects()).toHaveLength(3);
  });
});
