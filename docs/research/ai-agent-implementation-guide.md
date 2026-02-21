# AI Agent Implementation Guide — Epic 5 Research

Research compiled for implementing the CollabBoard AI Board Agent (Epic 5) using Vercel AI SDK v6, LangSmith observability, and Firebase Cloud Functions v2.

---

## Table of Contents

1. [Version Alignment & Package Updates](#1-version-alignment--package-updates)
2. [Vercel AI SDK v6 — Core Concepts](#2-vercel-ai-sdk-v6--core-concepts)
3. [Tool Definitions with `tool()` and Zod](#3-tool-definitions-with-tool-and-zod)
4. [Agentic Loop with `maxSteps` / `stopWhen`](#4-agentic-loop-with-maxsteps--stopwhen)
5. [Streaming to Node.js Response](#5-streaming-to-nodejs-response)
6. [`useChat` Hook — Client Side](#6-usechat-hook--client-side)
7. [LangSmith Integration](#7-langsmith-integration)
8. [Firebase Cloud Functions v2](#8-firebase-cloud-functions-v2)
9. [@ai-sdk/anthropic Provider](#9-ai-sdkanthropic-provider)
10. [Chat Persistence Pattern](#10-chat-persistence-pattern)
11. [Critical Gotchas & Decisions](#11-critical-gotchas--decisions)
12. [Complete Implementation Skeleton](#12-complete-implementation-skeleton)

---

## 1. Version Alignment & Package Updates

### Current State (Mismatched)

| Package | `apps/web/` | `firebase/functions/` |
|---------|------------|----------------------|
| `ai` | `^6.0.91` | `^4.0.0` (outdated) |
| `@ai-sdk/react` | `^3.0.93` | N/A |
| `@ai-sdk/anthropic` | N/A | `^1.0.0` (outdated) |
| `langsmith` | N/A | **missing** |

### Required Updates for `firebase/functions/package.json`

```json
{
  "dependencies": {
    "ai": "^6.0.0",
    "@ai-sdk/anthropic": "^3.0.0",
    "langsmith": "^0.5.0",
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0",
    "zod": "^3.23.0"
  }
}
```

### Version Compatibility Matrix

| `ai` | `@ai-sdk/anthropic` | `@ai-sdk/react` | Status |
|------|---------------------|-----------------|--------|
| 4.x | 1.x | 1.x | Old, works but missing v6 features |
| 5.x | 2.x | 2.x | Intermediate |
| **6.x** | **3.x** | **3.x** | **Current — use this** |

### Key Breaking Changes v4 → v6

**Must know for implementation:**

- `CoreMessage` type removed — use `ModelMessage` instead
- `convertToCoreMessages()` → `convertToModelMessages()` (now async)
- `generateObject()` deprecated — use `generateText()` with `Output.object()`
- `ToolCallOptions` → `ToolExecutionOptions`
- `maxSteps` replaced by `stopWhen: stepCountIs(n)` in v6 (see Section 4)
- UI helpers renamed: `isToolUIPart()` → `isStaticToolUIPart()`
- Token usage: `cachedInputTokens` → `inputTokenDetails.cacheReadTokens`
- `useChat` no longer manages `input` state — use your own `useState`
- `handleInputChange`/`handleSubmit` gone — use `sendMessage({ text })`
- `initialMessages` → `messages` on hook options
- `isLoading` → `status` (`'submitted' | 'streaming' | 'ready' | 'error'`)
- `append` → `sendMessage`, `reload` → `regenerate`
- Headers/body/credentials configured on `transport`, not hook

**Auto-migration available:** `npx @ai-sdk/codemod v6`

---

## 2. Vercel AI SDK v6 — Core Concepts

### `streamText` Function

The primary function for streaming LLM responses with tool execution.

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  system: 'You are a collaborative whiteboard assistant.',
  messages,          // ModelMessage[] or UIMessage[] (auto-converted)
  tools,             // Record<string, Tool>
  maxSteps: 10,      // v4/v5 API; see stopWhen for v6
  onStepFinish: ({ text, toolCalls, toolResults }) => {
    console.log('Step completed');
  },
});
```

**Key `streamText` options:**

| Option | Type | Description |
|--------|------|-------------|
| `model` | `LanguageModel` | The LLM model instance |
| `system` | `string` | System prompt |
| `messages` | `Message[]` | Conversation history |
| `tools` | `Record<string, Tool>` | Tool definitions |
| `maxSteps` | `number` | Max agentic loop rounds (v4/v5) |
| `stopWhen` | `StopCondition` | Loop termination (v6) |
| `toolChoice` | `'auto' \| 'required' \| 'none'` | Tool selection strategy |
| `maxTokens` | `number` | Max output tokens |
| `temperature` | `number` | Sampling temperature |
| `onStepFinish` | `callback` | Called after each tool round |

**Result object methods:**

| Method | Returns | Use |
|--------|---------|-----|
| `result.textStream` | `AsyncIterable<string>` | Consume text chunks |
| `result.fullStream` | `AsyncIterable<StreamPart>` | All events (text, tools, errors) |
| `result.text` | `Promise<string>` | Final text after streaming |
| `result.toUIMessageStream()` | `ReadableStream` | For piping to HTTP responses |
| `result.toUIMessageStreamResponse()` | `Response` | Web API Response object |
| `result.pipeUIMessageStreamToResponse(res)` | `void` | Pipe to Node.js ServerResponse |
| `result.consumeStream()` | `void` | Ensure stream completes even if not read |

---

## 3. Tool Definitions with `tool()` and Zod

### Basic Tool Pattern

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  createStickyNote: tool({
    description: 'Create a new sticky note on the whiteboard',
    parameters: z.object({
      text: z.string().describe('Text content of the sticky note'),
      x: z.number().describe('X position in world coordinates'),
      y: z.number().describe('Y position in world coordinates'),
      color: z.enum(['yellow', 'pink', 'blue', 'green', 'purple'])
        .default('yellow')
        .describe('Sticky note color'),
    }),
    execute: async ({ text, x, y, color }) => {
      // Server-side: write to Firestore via Admin SDK
      const id = generateId();
      const obj = {
        id, type: 'sticky', text, x, y, color,
        width: 200, height: 150,
        createdBy: 'ai-agent',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.collection(`boards/${boardId}/objects`).doc(id).set(obj);
      return { success: true, objectId: id };
    },
  }),
};
```

### Tool Schema Requirements

- **`description`**: Required. Tells the LLM what the tool does. Be specific.
- **`parameters`**: Zod schema. The AI SDK validates inputs against this before calling `execute`.
- **`execute`**: Async function. Runs server-side. Return value is fed back to the LLM as the tool result.

### Full Tool Definitions for CollabBoard

```typescript
// All 9 tools from the spec:

const createToolDefinitions = (db: Firestore, boardId: string) => ({

  createStickyNote: tool({
    description: 'Create a sticky note on the board',
    parameters: z.object({
      text: z.string().describe('Text content'),
      x: z.number().describe('X position'),
      y: z.number().describe('Y position'),
      color: z.enum(['yellow','pink','blue','green','purple']).default('yellow'),
    }),
    execute: async ({ text, x, y, color }) => { /* Firestore write */ },
  }),

  createShape: tool({
    description: 'Create a shape (rectangle or circle) on the board',
    parameters: z.object({
      type: z.enum(['rectangle', 'circle']),
      x: z.number(), y: z.number(),
      width: z.number().default(200), height: z.number().default(150),
      color: z.string().default('#4A90D9').describe('Fill color hex'),
    }),
    execute: async (params) => { /* Firestore write */ },
  }),

  createFrame: tool({
    description: 'Create a frame to group content areas',
    parameters: z.object({
      title: z.string(),
      x: z.number(), y: z.number(),
      width: z.number().default(400), height: z.number().default(300),
    }),
    execute: async (params) => { /* Firestore write */ },
  }),

  createConnector: tool({
    description: 'Create a connector line/arrow between two objects',
    parameters: z.object({
      fromId: z.string().describe('Source object ID'),
      toId: z.string().describe('Target object ID'),
      style: z.enum(['arrow', 'line']).default('arrow'),
    }),
    execute: async (params) => { /* Firestore write */ },
  }),

  moveObject: tool({
    description: 'Move an object to a new position',
    parameters: z.object({
      objectId: z.string(),
      x: z.number().describe('New X position'),
      y: z.number().describe('New Y position'),
    }),
    execute: async ({ objectId, x, y }) => { /* Firestore update */ },
  }),

  resizeObject: tool({
    description: 'Resize an object',
    parameters: z.object({
      objectId: z.string(),
      width: z.number(), height: z.number(),
    }),
    execute: async (params) => { /* Firestore update */ },
  }),

  updateText: tool({
    description: 'Update the text content of a sticky note or text element',
    parameters: z.object({
      objectId: z.string(),
      newText: z.string(),
    }),
    execute: async ({ objectId, newText }) => { /* Firestore update */ },
  }),

  changeColor: tool({
    description: 'Change the color of an object',
    parameters: z.object({
      objectId: z.string(),
      color: z.string().describe('New color (hex or named color)'),
    }),
    execute: async ({ objectId, color }) => { /* Firestore update */ },
  }),

  getBoardState: tool({
    description: 'Get a summary of all objects currently on the board',
    parameters: z.object({}),
    execute: async () => {
      const snap = await db.collection(`boards/${boardId}/objects`).get();
      const objects = snap.docs.map(doc => {
        const d = doc.data();
        return { id: d.id, type: d.type, x: d.x, y: d.y,
                 width: d.width, height: d.height,
                 text: d.text || d.title || undefined,
                 color: d.color || d.fill || undefined };
      });
      return { objectCount: objects.length, objects };
    },
  }),
});
```

### Tool Overhead

Each tool-using request adds ~346 tokens to the system prompt (invisible but affects billing). Each tool definition adds tokens proportional to its schema complexity.

---

## 4. Agentic Loop with `maxSteps` / `stopWhen`

### How the Loop Works

When `maxSteps` (v4/v5) or `stopWhen` (v6) is set, the AI SDK runs an agentic loop:

1. Send messages + tools to LLM
2. LLM responds with text and/or tool calls
3. If tool calls present: execute each tool's `execute` function
4. Feed tool results back as new messages
5. Send updated messages back to LLM
6. Repeat until LLM responds with text only (no tool calls) OR step limit reached

Each iteration = 1 "step". A step includes one LLM call + any resulting tool executions.

### v4/v5 API (simpler)

```typescript
const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  messages,
  tools,
  maxSteps: 10,  // Up to 10 LLM round-trips
});
```

### v6 API

```typescript
import { streamText, stepCountIs } from 'ai';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  messages,
  tools,
  stopWhen: stepCountIs(10),  // Equivalent to maxSteps: 10
});
```

Default `stopWhen` in v6 is `stepCountIs(20)`.

### Practical Considerations

- **SWOT template** (4 frames + sticky notes): ~4-8 tool calls = 2-4 steps
- **Single creation**: 1 tool call = 1-2 steps
- **Grid layout** (move N objects): N tool calls, may batch in 1-3 steps
- Recommend `maxSteps: 10` for our use case
- Each step adds latency (~1-3s per LLM call)
- Total timeout for complex commands: up to 30s

### `onStepFinish` Callback

```typescript
streamText({
  // ...
  onStepFinish: ({ text, toolCalls, toolResults, usage }) => {
    console.log(`Step done. Tools called: ${toolCalls.length}`);
    console.log(`Tokens used: ${usage.totalTokens}`);
  },
});
```

---

## 5. Streaming to Node.js Response

### Method 1: `pipeUIMessageStreamToResponse` (Simplest)

For Express-style `req/res` (Firebase Cloud Functions):

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  system: systemPrompt,
  messages,
  tools,
  maxSteps: 10,
});

result.pipeUIMessageStreamToResponse(res);
```

This sets the correct headers and pipes the SSE stream automatically.

### Method 2: Manual Piping (More Control)

```typescript
import { streamText, pipeUIMessageStreamToResponse, createUIMessageStream } from 'ai';

pipeUIMessageStreamToResponse({
  response: res,
  stream: createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic('claude-sonnet-4-6'),
        messages,
        tools,
        maxSteps: 10,
      });
      writer.merge(result.toUIMessageStream());
    },
  }),
});
```

### Method 3: Custom Stream Piping

```typescript
// Set SSE headers manually
res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('X-Accel-Buffering', 'no');
res.setHeader('Connection', 'keep-alive');
res.setHeader('x-vercel-ai-ui-message-stream', 'v1');

const stream = result.toUIMessageStream();
const reader = stream.getReader();
const decoder = new TextDecoder();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(decoder.decode(value, { stream: true }));
  }
} finally {
  res.end();
}
```

### SSE Event Format (What the Client Receives)

Each event is prefixed with `data: `:

```
data: {"type":"start","messageId":"msg_001"}
data: {"type":"text-start","id":"txt_001"}
data: {"type":"text-delta","id":"txt_001","delta":"I'll create"}
data: {"type":"text-delta","id":"txt_001","delta":" a sticky note..."}
data: {"type":"text-end","id":"txt_001"}
data: {"type":"tool-input-start","toolCallId":"tc_001","toolName":"createStickyNote"}
data: {"type":"tool-input-available","toolCallId":"tc_001","toolName":"createStickyNote","input":{"text":"Hello","x":100,"y":200,"color":"yellow"}}
data: {"type":"tool-output-available","toolCallId":"tc_001","output":{"success":true,"objectId":"abc123"}}
data: {"type":"finish"}
data: [DONE]
```

---

## 6. `useChat` Hook — Client Side

### v6 API (Breaking Changes from Earlier Versions)

```tsx
import { useChat, DefaultChatTransport } from '@ai-sdk/react';
import { useState } from 'react';

export function AiChatPanel({ boardId }: { boardId: string }) {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    id: `board-${boardId}`,
    transport: new DefaultChatTransport({
      api: import.meta.env.VITE_AI_FUNCTION_URL,
      body: { boardId },
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong>
          {msg.parts.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      {error && <div className="error">{error.message}</div>}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !isLoading) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
        disabled={isLoading}
      />
      <button
        onClick={() => { sendMessage({ text: input }); setInput(''); }}
        disabled={isLoading || !input.trim()}
      >
        Send
      </button>
    </div>
  );
}
```

### Key `useChat` v6 Return Values

| Return | Type | Description |
|--------|------|-------------|
| `messages` | `UIMessage[]` | All messages (user + assistant) |
| `status` | `'submitted' \| 'streaming' \| 'ready' \| 'error'` | Current state |
| `error` | `Error \| undefined` | Last error |
| `sendMessage` | `(content, options?) => void` | Send user message |
| `stop` | `() => void` | Abort streaming |
| `setMessages` | `(messages) => void` | Replace messages (no API call) |
| `regenerate` | `(options?) => void` | Re-request last response |
| `clearError` | `() => void` | Reset error |

### `DefaultChatTransport` Options

| Option | Type | Description |
|--------|------|-------------|
| `api` | `string` | Endpoint URL (full URL for Cloud Function) |
| `body` | `object \| () => object` | Extra payload merged with messages |
| `headers` | `object \| () => object` | Custom headers (auth tokens) |
| `credentials` | `RequestCredentials` | Fetch credentials mode |

### Message Format (v6 `UIMessage`)

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: UIMessagePart[];
  metadata?: Record<string, unknown>;
}

// Parts:
type UIMessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool-*'; toolCallId: string; toolName: string;
      input: any; output?: any; state: string }
  | { type: 'reasoning'; text: string }
  | { type: 'source-url'; sourceId: string; url: string }
  | { type: 'file'; url: string; mediaType: string }
  // ... etc
```

### Error Handling

- **Unreachable endpoint**: `status` → `'error'`, `error` is `TypeError: Failed to fetch`
- **CORS errors**: Same as unreachable (browsers hide CORS details)
- **Server errors**: Server can send `{"type":"error","errorText":"..."}` in the stream
- Use `onError` callback and `regenerate()` for retry UI

---

## 7. LangSmith Integration

### Installation

```bash
cd firebase/functions && pnpm add langsmith
```

### Package Info

- Package: `langsmith` (npm)
- Latest version: `0.5.4`
- Peer deps: All optional (`openai`, `@opentelemetry/*`)
- No required peer deps — just install `langsmith` itself

### Setup Pattern: `wrapAISDK`

```typescript
import * as ai from 'ai';
import { wrapAISDK } from 'langsmith/experimental/vercel';

// Wrap the entire ai module — returns wrapped versions of streamText, generateText, etc.
const { streamText } = wrapAISDK(ai);

// Now all streamText calls are automatically traced
const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  messages,
  tools,
  maxSteps: 10,
});
```

**IMPORTANT:** The import path is `langsmith/experimental/vercel` — NOT `langsmith/wrappers/vercel`. You pass the entire `ai` module (not individual functions) to `wrapAISDK`, and it returns wrapped versions of `streamText`, `generateText`, `streamObject`, and `generateObject`.

### Environment Variables

Set these on the Cloud Function:

| Variable | Required | Value |
|----------|----------|-------|
| `LANGSMITH_TRACING` | Yes | `"true"` |
| `LANGSMITH_API_KEY` | Yes | Your LangSmith API key (from smith.langchain.com) |
| `LANGSMITH_PROJECT` | No | `"collabboard-ai-agent"` (defaults to `"default"`) |
| `LANGSMITH_ENDPOINT` | No | `"https://api.smith.langchain.com"` (default; only change for self-hosted) |

Note: Older docs reference `LANGCHAIN_TRACING_V2` and `LANGCHAIN_API_KEY`. The newer `LANGSMITH_*` prefix is the current convention, but both are accepted for backward compatibility.

### What Gets Traced Automatically

When using `wrapAISDK`:

- LLM calls (model, system prompt, messages, response)
- Tool invocations (tool name, input parameters, output)
- Token usage (input/output/total)
- Latency per step and total
- Model information
- Error traces (including graceful error responses)
- Multi-step agentic loop structure

### Trace Structure in Dashboard

For a multi-step command like "Create a SWOT analysis":

```
Root: streamText (total: 15s)
├── Step 1: LLM call (2s)
│   ├── Tool: createFrame ("Strengths") (200ms)
│   ├── Tool: createFrame ("Weaknesses") (200ms)
│   ├── Tool: createFrame ("Opportunities") (200ms)
│   └── Tool: createFrame ("Threats") (200ms)
├── Step 2: LLM call (2s)
│   ├── Tool: createStickyNote (100ms)
│   ├── Tool: createStickyNote (100ms)
│   └── ... more stickies
└── Step 3: LLM call (1s) → final text response
```

### Performance Impact

- LangSmith SDK uses **async background export** — does not block your function
- Traces are batched before sending to reduce HTTP overhead
- If LangSmith is down, your agent keeps running normally
- In serverless (Cloud Functions): must ensure traces flush before function exits

### Flushing in Serverless (CRITICAL)

In serverless environments (Cloud Functions), traces are batched asynchronously. If the function exits before the batch is flushed, traces are lost.

```typescript
import { Client } from 'langsmith';
import * as ai from 'ai';
import { wrapAISDK } from 'langsmith/experimental/vercel';

// Create client explicitly for flush control
const langsmithClient = new Client();

const { streamText } = wrapAISDK(ai, {
  client: langsmithClient,
});

// In your handler, flush in a finally block:
try {
  const result = streamText({ ... });
  result.pipeUIMessageStreamToResponse(res);
  await result.text; // Wait for stream to complete
} finally {
  await langsmithClient.awaitPendingTraceBatches();
}
```

### Per-Call Configuration

```typescript
import { createLangSmithProviderOptions } from 'langsmith/experimental/vercel';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  messages,
  tools,
  providerOptions: {
    langsmith: createLangSmithProviderOptions({
      name: 'swot-analysis-run',
      metadata: { boardId, userId },
    }),
  },
});
```

### Dashboard Features

- **Prebuilt dashboards**: Auto-generated per project (latency, token usage, error rates)
- **Custom dashboards**: Configurable charts for cost breakdowns, P50/P99 latency, feedback scores
- **Trace detail view**: Step-by-step inspection with prompts, outputs, tool calls
- **Filtering**: By time range, model, error status, latency
- **Alerts**: Webhooks or PagerDuty for anomalies

---

## 8. Firebase Cloud Functions v2

### HTTP Handler with Streaming

```typescript
import { onRequest } from 'firebase-functions/v2/https';

export const aiChat = onRequest(
  {
    cors: true,              // Handle CORS preflight automatically
    timeoutSeconds: 300,     // 5 min (agentic loops can be slow)
    memory: '512MiB',        // LLM response buffering
    region: 'us-central1',
  },
  async (req, res) => {
    // req.body contains { messages, boardId }
    // Use streamText + pipeUIMessageStreamToResponse(res)
  }
);
```

### HttpsOptions Reference

| Option | Type | Values | Description |
|--------|------|--------|-------------|
| `cors` | `boolean \| string \| string[]` | `true` / `['https://myapp.com']` | CORS handling |
| `timeoutSeconds` | `number` | 0-3600 (HTTP) | Function timeout |
| `memory` | `MemoryOption` | `'128MiB'` to `'32GiB'` | RAM allocation |
| `region` | `string` | `'us-central1'` etc. | Deployment region |
| `maxInstances` | `number` | 1-1000 | Max concurrent instances |
| `minInstances` | `number` | 0+ | Warm instances |
| `concurrency` | `number` | 1-1000 (default 80) | Requests per instance |
| `secrets` | `SecretParam[]` | `[anthropicKey]` | Secret env vars |
| `invoker` | `string` | `'public'` | Access control |

### CRITICAL: Direct Function URL vs Hosting Rewrite

**Firebase Hosting BUFFERS entire responses before forwarding.** This completely breaks SSE streaming — the client sees nothing until the LLM finishes.

**Solution:** Call the Cloud Function URL directly.

```
# WRONG — Hosting rewrite (breaks streaming)
firebase.json: { "rewrites": [{ "source": "/api/ai", "function": "aiChat" }] }
Client: useChat({ api: '/api/ai' })

# CORRECT — Direct function URL
Client: useChat({ api: 'https://us-central1-PROJECT.cloudfunctions.net/aiChat' })
```

Store the URL in `VITE_AI_FUNCTION_URL` env var.

### SSE Headers for Streaming

The `pipeUIMessageStreamToResponse` method handles headers automatically. If piping manually:

```typescript
res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('X-Accel-Buffering', 'no');  // Prevents proxy buffering
res.setHeader('Connection', 'keep-alive');
```

### Firebase Admin SDK — Firestore Operations

```typescript
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

// READ a collection
const snapshot = await db.collection(`boards/${boardId}/objects`).get();
const objects = snapshot.docs.map(doc => doc.data());

// READ a single document
const docSnap = await db.collection(`boards/${boardId}/objects`).doc(objectId).get();
const data = docSnap.data();

// WRITE a document (create or overwrite)
await db.collection(`boards/${boardId}/objects`).doc(id).set({
  id, type: 'sticky', text: 'Hello', x: 100, y: 200,
  color: 'yellow', width: 200, height: 150,
  createdBy: 'ai-agent', createdAt: Date.now(), updatedAt: Date.now(),
});

// UPDATE specific fields
await db.collection(`boards/${boardId}/objects`).doc(objectId).update({
  x: 300, y: 400, updatedAt: Date.now(),
});

// DELETE
await db.collection(`boards/${boardId}/objects`).doc(objectId).delete();

// BATCH WRITE (multiple operations atomically)
const batch = db.batch();
batch.set(db.collection(`boards/${boardId}/objects`).doc(id1), obj1);
batch.set(db.collection(`boards/${boardId}/objects`).doc(id2), obj2);
await batch.commit();
```

**Security note:** Cloud Functions with Admin SDK bypass Firestore security rules.

### Environment Variables / Secrets

```typescript
import { defineSecret } from 'firebase-functions/params';

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');
const langchainKey = defineSecret('LANGCHAIN_API_KEY');

export const aiChat = onRequest(
  { secrets: [anthropicKey, langchainKey] },
  async (req, res) => {
    const apiKey = anthropicKey.value();
    // ...
  }
);
```

Set secrets via CLI:
```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set LANGCHAIN_API_KEY
```

For non-secret env vars, use `.env` files in the functions directory or `defineString`/`defineInt` from `firebase-functions/params`.

### Deployment

```bash
cd firebase/functions && pnpm run build
firebase deploy --only functions
```

`firebase.json` config:
```json
{
  "functions": {
    "source": "firebase/functions",
    "runtime": "nodejs20"
  }
}
```

### Function URL Format

```
https://<REGION>-<PROJECT_ID>.cloudfunctions.net/<FUNCTION_NAME>
https://us-central1-collabboard-12345.cloudfunctions.net/aiChat
```

---

## 9. @ai-sdk/anthropic Provider

### Setup

```typescript
import { anthropic } from '@ai-sdk/anthropic';
// Reads ANTHROPIC_API_KEY from env automatically

// OR explicit:
import { createAnthropic } from '@ai-sdk/anthropic';
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Model Selection

```typescript
const model = anthropic('claude-sonnet-4-6');
// Also: anthropic.languageModel('...'), anthropic.chat('...')
```

### Recommended Model for CollabBoard

`claude-sonnet-4-6` — best balance of cost, speed, and tool-calling quality.

### Anthropic-Specific Options

```typescript
streamText({
  model: anthropic('claude-sonnet-4-6'),
  providerOptions: {
    anthropic: {
      disableParallelToolUse: true,  // Force sequential tool calls
    },
  },
});
```

### Error Handling

| HTTP Status | Error Type | Action |
|-------------|-----------|--------|
| 400 | `invalid_request_error` | Check request format |
| 401 | `authentication_error` | Check API key |
| 429 | `rate_limit_error` | Auto-retried with backoff |
| 500 | `api_error` | Auto-retried |
| 529 | `overloaded_error` | Retry later |

The underlying SDK auto-retries 429, 409, and 500+ errors with exponential backoff.

### Pricing (Claude Sonnet 4)

| Metric | Cost |
|--------|------|
| Input tokens | $3 / MTok |
| Output tokens | $15 / MTok |
| Cache read | $0.30 / MTok |

Estimated per-command costs:
- Single-step creation: ~500-1000 tokens = ~$0.002-0.005
- SWOT analysis (multi-step): ~3000-8000 tokens = ~$0.01-0.04
- getBoardState (large board): ~2000-5000 tokens = ~$0.008-0.02

---

## 10. Chat Persistence Pattern

### Architecture

1. User sends message via `useChat` → Cloud Function
2. Cloud Function streams response + writes to Firestore
3. All clients see board changes via existing `onSnapshot` on objects
4. Chat messages persisted to `boards/{boardId}/ai-messages` subcollection
5. On page load, hydrate `useChat` with `messages` from Firestore

### Server-Side Persistence (Recommended)

```typescript
// In Cloud Function, after stream completes:
const result = streamText({ ... });

result.pipeUIMessageStreamToResponse(res);

// Also persist messages after completion
result.consumeStream(); // Ensure stream completes even if client disconnects

// Use onFinish or await result completion
const finalText = await result.text;
// Save to Firestore...
```

### Client-Side Hydration

```tsx
const [savedMessages, setSavedMessages] = useState<UIMessage[]>([]);
const [loaded, setLoaded] = useState(false);

useEffect(() => {
  async function load() {
    const snap = await getDocs(collection(db, 'boards', boardId, 'ai-messages'));
    const msgs = snap.docs
      .map(d => d.data() as UIMessage)
      .sort((a, b) => (a.metadata?.timestamp ?? 0) - (b.metadata?.timestamp ?? 0));
    setSavedMessages(msgs);
    setLoaded(true);
  }
  load();
}, [boardId]);

// Only render chat UI after messages are loaded
if (!loaded) return <LoadingSpinner />;

const { messages, sendMessage, setMessages, status } = useChat({
  id: `board-${boardId}`,
  messages: savedMessages,
  transport: new DefaultChatTransport({
    api: import.meta.env.VITE_AI_FUNCTION_URL,
    body: { boardId },
  }),
});
```

### Cross-User Sync

```tsx
useEffect(() => {
  const unsub = onSnapshot(
    collection(db, 'boards', boardId, 'ai-messages'),
    (snap) => {
      if (status === 'ready') {
        // Only sync when not actively streaming
        const msgs = snap.docs.map(d => d.data() as UIMessage);
        setMessages(msgs);
      }
    }
  );
  return unsub;
}, [boardId, status, setMessages]);
```

The `status === 'ready'` guard prevents overwriting in-progress streaming.

---

## 11. Critical Gotchas & Decisions

### Decision: AI SDK Version in Functions

**Use `ai@^6.0.0`** in both `apps/web` and `firebase/functions`. The functions package currently has `ai@^4.0.0` which is two major versions behind. Since we're writing new code (not migrating existing), start with v6 to match the web app.

**Action:** Update `firebase/functions/package.json`:
```json
"ai": "^6.0.0",
"@ai-sdk/anthropic": "^3.0.0"
```

### Decision: `maxSteps` vs `stopWhen`

In v6, `maxSteps` is replaced by `stopWhen: stepCountIs(n)`. However, `maxSteps` may still work as a deprecated alias. Use `stopWhen` for future-proofing:

```typescript
import { stepCountIs } from 'ai';
// stopWhen: stepCountIs(10)
```

### Gotcha: Firebase Hosting Breaks Streaming

**Never add a hosting rewrite for the AI endpoint.** Firebase Hosting buffers the entire response. Always use the direct Cloud Function URL.

### Gotcha: `convertToModelMessages` is Async in v6

```typescript
// v4/v5: const modelMsgs = convertToCoreMessages(messages);
// v6: const modelMsgs = await convertToModelMessages(messages);
```

### Gotcha: `useChat` v6 Does Not Manage Input State

You must use your own `useState` for the input field. `handleInputChange` and `handleSubmit` no longer exist.

### Gotcha: LangSmith in Serverless

Traces are exported asynchronously. In Cloud Functions, ensure traces flush before the function returns. Options:
1. The AI SDK response streaming naturally keeps the function alive
2. Call `await client.flush()` explicitly if needed

### Gotcha: Tool Execution is Server-Side Only

With our architecture, tools execute in the Cloud Function via Firebase Admin SDK. The client's `useChat` only displays streamed text and tool call metadata. No client-side tool execution logic needed.

### Gotcha: CORS with Credentials

If sending auth cookies/tokens, the server must respond with a specific origin (not `*`) in `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`. Using `cors: true` in Cloud Functions options handles basic CORS, but for credentialed requests you may need to configure allowed origins explicitly.

### Gotcha: Message Format Between Client and Server

`useChat` sends `UIMessage[]` to the server. The server must convert these to `ModelMessage[]` for the LLM:

```typescript
import { convertToModelMessages } from 'ai';
const modelMessages = await convertToModelMessages(req.body.messages);
```

---

## 12. Complete Implementation Skeleton

### Cloud Function (`firebase/functions/src/ai-chat.ts`)

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createAnthropic } from '@ai-sdk/anthropic';
import * as ai from 'ai';
import { convertToModelMessages, stepCountIs } from 'ai';
import { Client } from 'langsmith';
import { wrapAISDK } from 'langsmith/experimental/vercel';
import { createToolDefinitions } from './tools/tool-definitions.js';
import { systemPrompt } from './system-prompt.js';

initializeApp();
const db = getFirestore();

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');
const langchainKey = defineSecret('LANGCHAIN_API_KEY');

// Create LangSmith client for flush control in serverless
const langsmithClient = new Client();

// Wrap AI SDK for LangSmith tracing
const { streamText } = wrapAISDK(ai, { client: langsmithClient });

export const aiChat = onRequest(
  {
    cors: true,
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: [anthropicKey, langchainKey],
  },
  async (req, res) => {
    const { messages, boardId } = req.body;

    const anthropic = createAnthropic({
      apiKey: anthropicKey.value(),
    });

    const tools = createToolDefinitions(db, boardId);
    const modelMessages = await convertToModelMessages(messages);

    try {
      const result = streamText({
        model: anthropic('claude-sonnet-4-6'),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(10),
      });

      result.pipeUIMessageStreamToResponse(res);
    } finally {
      // Flush LangSmith traces before function exits
      await langsmithClient.awaitPendingTraceBatches();
    }
  }
);
```

### Client Component (`modules/ai-agent/ui/AiChatPanel.tsx`)

```tsx
import { useChat, DefaultChatTransport } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';

interface Props {
  boardId: string;
  initialMessages?: UIMessage[];
}

export function AiChatPanel({ boardId, initialMessages }: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: `board-${boardId}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: import.meta.env.VITE_AI_FUNCTION_URL,
      body: { boardId },
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="ai-chat-panel">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.parts.map((part, i) => {
              if (part.type === 'text') return <p key={i}>{part.text}</p>;
              return null;
            })}
          </div>
        ))}
        {isLoading && <div className="loading">AI is thinking...</div>}
        {error && (
          <div className="error">
            Error: {error.message}
            <button onClick={clearError}>Dismiss</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask the AI to modify the board..."
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## Sources

- [AI SDK v6 Introduction](https://ai-sdk.dev/docs/introduction)
- [AI SDK v6 Migration Guide (5→6)](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK v5 Migration Guide (4→5)](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [AI SDK Tools and Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK Agents](https://ai-sdk.dev/docs/ai-sdk-core/agents)
- [AI SDK useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK Chatbot Guide](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [AI SDK Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
- [AI SDK Express Cookbook](https://ai-sdk.dev/cookbook/api-servers/express)
- [AI SDK pipeUIMessageStreamToResponse](https://ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response)
- [AI SDK Transport Layer](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [LangSmith + Vercel AI SDK Tracing](https://docs.smith.langchain.com/observability/how_to_guides/trace_with_vercel_ai_sdk)
- [LangSmith AI SDK Integration (AI SDK docs)](https://ai-sdk.dev/providers/observability/langsmith)
- [LangSmith Observability](https://www.langchain.com/langsmith/observability)
- [Firebase Cloud Functions HTTP Events](https://firebase.google.com/docs/functions/http-events)
- [Firebase Cloud Functions Config/Env](https://firebase.google.com/docs/functions/config-env)
- [Firebase Admin Firestore](https://firebase.google.com/docs/firestore/query-data/get-data)
- [langsmith npm](https://www.npmjs.com/package/langsmith)
- [@ai-sdk/anthropic npm](https://www.npmjs.com/package/@ai-sdk/anthropic)
