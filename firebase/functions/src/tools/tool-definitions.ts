import { tool } from 'ai';
import { z } from 'zod';
import { type Firestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Creates Vercel AI SDK tool definitions that read/write Firestore directly.
 * Each tool's `execute` function uses Firebase Admin SDK — changes propagate
 * to all clients via their existing `onSnapshot` listeners.
 */
export function createToolDefinitions(db: Firestore, boardId: string) {
  const objectsRef = db.collection(`boards/${boardId}/objects`);

  function generateId(): string {
    return crypto.randomUUID();
  }

  return {
    createStickyNote: tool({
      description: 'Create a sticky note on the board',
      inputSchema: z.object({
        text: z.string().describe('The text content of the sticky note'),
        x: z.number().describe('X position on the board'),
        y: z.number().describe('Y position on the board'),
        color: z.enum(['yellow', 'pink', 'blue', 'green', 'purple']).optional()
          .describe('Sticky note color. Defaults to yellow'),
      }),
      execute: async ({ text, x, y, color }) => {
        const id = generateId();
        const now = Date.now();
        const obj = {
          id, type: 'sticky',
          x, y, width: 200, height: 150,
          text, color: color ?? 'yellow',
          createdBy: 'ai-agent', createdAt: now, updatedAt: now,
        };
        await objectsRef.doc(id).set(obj);
        return { id, type: 'sticky', text, x, y, color: obj.color };
      },
    }),

    createShape: tool({
      description: 'Create a shape (rectangle or circle) on the board',
      inputSchema: z.object({
        type: z.enum(['rectangle', 'circle']).describe('Shape type'),
        x: z.number().describe('X position'),
        y: z.number().describe('Y position'),
        width: z.number().optional().describe('Width. Defaults to 200 for rectangle, 100 for circle'),
        height: z.number().optional().describe('Height. Defaults to 150 for rectangle, 100 for circle'),
        color: z.string().optional().describe('Fill color as hex string. Defaults to #E0E0E0 for rectangle, #90CAF9 for circle'),
      }),
      execute: async ({ type, x, y, width, height, color }) => {
        const id = generateId();
        const now = Date.now();
        const defaults = type === 'rectangle'
          ? { width: 200, height: 150, fill: '#E0E0E0', stroke: '#9E9E9E' }
          : { width: 100, height: 100, fill: '#90CAF9', stroke: '#42A5F5' };
        const obj = {
          id, type,
          x, y,
          width: width ?? defaults.width,
          height: height ?? defaults.height,
          fill: color ?? defaults.fill,
          stroke: defaults.stroke,
          strokeWidth: type === 'rectangle' ? 1 : 2,
          createdBy: 'ai-agent', createdAt: now, updatedAt: now,
        };
        await objectsRef.doc(id).set(obj);
        return { id, type, x, y, width: obj.width, height: obj.height };
      },
    }),

    createFrame: tool({
      description: 'Create a frame to group and organize content areas on the board',
      inputSchema: z.object({
        title: z.string().describe('Frame title text'),
        x: z.number().describe('X position'),
        y: z.number().describe('Y position'),
        width: z.number().optional().describe('Width. Defaults to 400'),
        height: z.number().optional().describe('Height. Defaults to 300'),
      }),
      execute: async ({ title, x, y, width, height }) => {
        const id = generateId();
        const now = Date.now();
        const obj = {
          id, type: 'frame',
          x, y,
          width: width ?? 400, height: height ?? 300,
          title,
          fill: 'rgba(200, 200, 200, 0.1)',
          children: [] as string[],
          createdBy: 'ai-agent', createdAt: now, updatedAt: now,
        };
        await objectsRef.doc(id).set(obj);
        return { id, type: 'frame', title, x, y, width: obj.width, height: obj.height };
      },
    }),

    createConnector: tool({
      description: 'Create a connector (arrow or line) between two objects on the board',
      inputSchema: z.object({
        fromId: z.string().describe('ID of the source object'),
        toId: z.string().describe('ID of the target object'),
        style: z.enum(['arrow', 'line']).optional().describe('Connector style. Defaults to arrow'),
      }),
      execute: async ({ fromId, toId, style }) => {
        const [fromDoc, toDoc] = await Promise.all([
          objectsRef.doc(fromId).get(),
          objectsRef.doc(toId).get(),
        ]);
        if (!fromDoc.exists) return { error: `Source object ${fromId} not found` };
        if (!toDoc.exists) return { error: `Target object ${toId} not found` };
        const id = generateId();
        const now = Date.now();
        const obj = {
          id, type: 'connector',
          x: 0, y: 0, width: 0, height: 0,
          sourceId: fromId, targetId: toId,
          style: style ?? 'arrow',
          stroke: '#616161', strokeWidth: 2,
          createdBy: 'ai-agent', createdAt: now, updatedAt: now,
        };
        await objectsRef.doc(id).set(obj);
        return { id, type: 'connector', fromId, toId, style: obj.style };
      },
    }),

    moveObject: tool({
      description: 'Move an existing object to a new position',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to move'),
        x: z.number().describe('New X position'),
        y: z.number().describe('New Y position'),
      }),
      execute: async ({ objectId, x, y }) => {
        const doc = await objectsRef.doc(objectId).get();
        if (!doc.exists) return { error: 'Object not found' };
        const now = Date.now();
        await objectsRef.doc(objectId).update({ x, y, updatedAt: now });
        return { objectId, x, y };
      },
    }),

    resizeObject: tool({
      description: 'Resize an existing object',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to resize'),
        width: z.number().describe('New width'),
        height: z.number().describe('New height'),
      }),
      execute: async ({ objectId, width, height }) => {
        const doc = await objectsRef.doc(objectId).get();
        if (!doc.exists) return { error: 'Object not found' };
        const now = Date.now();
        await objectsRef.doc(objectId).update({ width, height, updatedAt: now });
        return { objectId, width, height };
      },
    }),

    updateText: tool({
      description: 'Update the text content of a sticky note, text element, or frame title',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to update'),
        newText: z.string().describe('New text content'),
      }),
      execute: async ({ objectId, newText }) => {
        const now = Date.now();
        const doc = await objectsRef.doc(objectId).get();
        if (!doc.exists) return { error: 'Object not found' };
        const data = doc.data()!;
        if (data.type === 'frame') {
          await objectsRef.doc(objectId).update({ title: newText, updatedAt: now });
        } else {
          await objectsRef.doc(objectId).update({ text: newText, updatedAt: now });
        }
        return { objectId, newText };
      },
    }),

    changeColor: tool({
      description: 'Change the color of an object',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to recolor'),
        color: z.string().describe('New color. For sticky notes use: yellow, pink, blue, green, purple. For shapes use hex like #FF0000'),
      }),
      execute: async ({ objectId, color }) => {
        const now = Date.now();
        const doc = await objectsRef.doc(objectId).get();
        if (!doc.exists) return { error: 'Object not found' };
        const data = doc.data()!;
        if (data.type === 'sticky') {
          await objectsRef.doc(objectId).update({ color, updatedAt: now });
        } else if (data.type === 'line' || data.type === 'connector') {
          await objectsRef.doc(objectId).update({ stroke: color, updatedAt: now });
        } else if (data.type === 'text') {
          await objectsRef.doc(objectId).update({ fill: color, updatedAt: now });
        } else {
          await objectsRef.doc(objectId).update({ fill: color, updatedAt: now });
        }
        return { objectId, color };
      },
    }),

    deleteObject: tool({
      description: 'Delete an object from the board',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to delete'),
      }),
      execute: async ({ objectId }) => {
        await objectsRef.doc(objectId).delete();
        return { objectId, deleted: true };
      },
    }),

    getBoardState: tool({
      description: 'Get the current state of all objects on the board. Use this before manipulation commands to understand what exists on the board.',
      inputSchema: z.object({}),
      execute: async () => {
        const snapshot = await objectsRef.get();
        const objects = snapshot.docs.map((doc) => {
          const d = doc.data();
          const summary: Record<string, unknown> = {
            id: d.id,
            type: d.type,
            x: Math.round(d.x),
            y: Math.round(d.y),
            width: Math.round(d.width),
            height: Math.round(d.height),
          };
          if (d.text) summary.text = d.text;
          if (d.title) summary.title = d.title;
          if (d.color) summary.color = d.color;
          if (d.fill) summary.fill = d.fill;
          if (d.sourceId) summary.sourceId = d.sourceId;
          if (d.targetId) summary.targetId = d.targetId;
          return summary;
        });
        return { objectCount: objects.length, objects };
      },
    }),

    createMultipleObjects: tool({
      description: 'Create multiple objects on the board in a single batch operation. Use this for templates and multi-object layouts.',
      inputSchema: z.object({
        objects: z.array(z.object({
          type: z.enum(['sticky', 'rectangle', 'circle', 'frame', 'connector']),
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          text: z.string().optional(),
          title: z.string().optional(),
          color: z.string().optional(),
          fill: z.string().optional(),
          sourceId: z.string().optional(),
          targetId: z.string().optional(),
          style: z.enum(['arrow', 'line']).optional(),
        })).describe('Array of objects to create'),
      }),
      execute: async ({ objects }) => {
        const batch = db.batch();
        const now = Date.now();
        const results: Array<Record<string, unknown>> = [];

        for (const obj of objects) {
          const id = generateId();
          let doc: Record<string, unknown>;

          switch (obj.type) {
            case 'sticky':
              doc = {
                id, type: 'sticky',
                x: obj.x ?? 0, y: obj.y ?? 0,
                width: obj.width ?? 200, height: obj.height ?? 150,
                text: obj.text ?? '', color: obj.color ?? 'yellow',
                createdBy: 'ai-agent', createdAt: now, updatedAt: now,
              };
              break;
            case 'rectangle':
              doc = {
                id, type: 'rectangle',
                x: obj.x ?? 0, y: obj.y ?? 0,
                width: obj.width ?? 200, height: obj.height ?? 150,
                fill: obj.fill ?? '#E0E0E0', stroke: '#9E9E9E', strokeWidth: 1,
                createdBy: 'ai-agent', createdAt: now, updatedAt: now,
              };
              break;
            case 'circle':
              doc = {
                id, type: 'circle',
                x: obj.x ?? 0, y: obj.y ?? 0,
                width: obj.width ?? 100, height: obj.height ?? 100,
                fill: obj.fill ?? '#90CAF9', stroke: '#42A5F5', strokeWidth: 2,
                createdBy: 'ai-agent', createdAt: now, updatedAt: now,
              };
              break;
            case 'frame':
              doc = {
                id, type: 'frame',
                x: obj.x ?? 0, y: obj.y ?? 0,
                width: obj.width ?? 400, height: obj.height ?? 300,
                title: obj.title ?? '',
                fill: 'rgba(200, 200, 200, 0.1)',
                children: [] as string[],
                createdBy: 'ai-agent', createdAt: now, updatedAt: now,
              };
              break;
            case 'connector':
              doc = {
                id, type: 'connector',
                x: 0, y: 0, width: 0, height: 0,
                sourceId: obj.sourceId ?? '', targetId: obj.targetId ?? '',
                style: obj.style ?? 'arrow',
                stroke: '#616161', strokeWidth: 2,
                createdBy: 'ai-agent', createdAt: now, updatedAt: now,
              };
              break;
          }

          batch.set(objectsRef.doc(id), doc!);
          results.push({ id, type: obj.type });
        }

        await batch.commit();
        return { created: results.length, objects: results };
      },
    }),

    addToFrame: tool({
      description: 'Add one or more existing objects to a frame, making them children of that frame',
      inputSchema: z.object({
        frameId: z.string().describe('ID of the frame to add objects to'),
        objectIds: z.array(z.string()).describe('IDs of objects to add to the frame'),
      }),
      execute: async ({ frameId, objectIds }) => {
        const frameDoc = await objectsRef.doc(frameId).get();
        if (!frameDoc.exists) return { error: 'Frame not found' };
        if (frameDoc.data()!.type !== 'frame') return { error: 'Target is not a frame' };
        await objectsRef.doc(frameId).update({
          children: FieldValue.arrayUnion(...objectIds),
          updatedAt: Date.now(),
        });
        return { frameId, addedObjects: objectIds };
      },
    }),
  };
}
