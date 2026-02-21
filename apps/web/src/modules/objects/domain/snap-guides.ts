import type { BoardObject } from '../contracts.ts';

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;  // the x (for vertical) or y (for horizontal) coordinate
  from: number;      // start of the guide line
  to: number;        // end of the guide line
}

export interface SnapResult {
  guides: SnapGuide[];
  snappedX: number | null;  // snapped x position for the dragged object, or null if no snap
  snappedY: number | null;  // snapped y position for the dragged object, or null if no snap
}

export const SNAP_THRESHOLD = 8;

export function computeSnapGuides(
  draggingBounds: { x: number; y: number; width: number; height: number },
  otherObjects: BoardObject[],
  threshold: number = SNAP_THRESHOLD
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedX: number | null = null;
  let snappedY: number | null = null;

  // Dragging object edges
  const dragLeft = draggingBounds.x;
  const dragRight = draggingBounds.x + draggingBounds.width;
  const dragCenterX = draggingBounds.x + draggingBounds.width / 2;
  const dragTop = draggingBounds.y;
  const dragBottom = draggingBounds.y + draggingBounds.height;
  const dragCenterY = draggingBounds.y + draggingBounds.height / 2;

  let bestDx = threshold + 1;
  let bestDy = threshold + 1;

  for (const obj of otherObjects) {
    // Skip connectors (no meaningful position)
    if (obj.type === 'connector') continue;

    const objLeft = obj.x;
    const objRight = obj.x + obj.width;
    const objCenterX = obj.x + obj.width / 2;
    const objTop = obj.y;
    const objBottom = obj.y + obj.height;
    const objCenterY = obj.y + obj.height / 2;

    // Check vertical alignments (x-axis)
    const verticalChecks = [
      { dragEdge: dragLeft, objEdge: objLeft },
      { dragEdge: dragLeft, objEdge: objRight },
      { dragEdge: dragRight, objEdge: objLeft },
      { dragEdge: dragRight, objEdge: objRight },
      { dragEdge: dragCenterX, objEdge: objCenterX },
    ];

    for (const { dragEdge, objEdge } of verticalChecks) {
      const dx = Math.abs(dragEdge - objEdge);
      if (dx < threshold && dx < bestDx) {
        bestDx = dx;
        snappedX = draggingBounds.x + (objEdge - dragEdge);
        // Create guide line spanning both objects
        const minY = Math.min(dragTop, objTop) - 20;
        const maxY = Math.max(dragBottom, objBottom) + 20;
        // Clear previous vertical guides
        for (let i = guides.length - 1; i >= 0; i--) {
          if (guides[i].type === 'vertical') guides.splice(i, 1);
        }
        guides.push({ type: 'vertical', position: objEdge, from: minY, to: maxY });
      }
    }

    // Check horizontal alignments (y-axis)
    const horizontalChecks = [
      { dragEdge: dragTop, objEdge: objTop },
      { dragEdge: dragTop, objEdge: objBottom },
      { dragEdge: dragBottom, objEdge: objTop },
      { dragEdge: dragBottom, objEdge: objBottom },
      { dragEdge: dragCenterY, objEdge: objCenterY },
    ];

    for (const { dragEdge, objEdge } of horizontalChecks) {
      const dy = Math.abs(dragEdge - objEdge);
      if (dy < threshold && dy < bestDy) {
        bestDy = dy;
        snappedY = draggingBounds.y + (objEdge - dragEdge);
        const minX = Math.min(dragLeft, objLeft) - 20;
        const maxX = Math.max(dragRight, objRight) + 20;
        for (let i = guides.length - 1; i >= 0; i--) {
          if (guides[i].type === 'horizontal') guides.splice(i, 1);
        }
        guides.push({ type: 'horizontal', position: objEdge, from: minX, to: maxX });
      }
    }
  }

  return { guides, snappedX, snappedY };
}
