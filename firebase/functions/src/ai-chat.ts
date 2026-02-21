import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as ai from 'ai';
import { convertToModelMessages, stepCountIs } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { Client } from 'langsmith';
import { wrapAISDK } from 'langsmith/experimental/vercel';
import { createToolDefinitions } from './tools/tool-definitions.js';
import { SYSTEM_PROMPT } from './system-prompt.js';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Firebase secrets — encrypted at rest, only available to functions that declare them
const anthropicKey = defineSecret('ANTHROPIC_API_KEY');
const langsmithKey = defineSecret('LANGSMITH_API_KEY');

// LangSmith client for flush control in serverless
const langsmithClient = new Client();

// Wrap AI SDK for automatic LangSmith tracing of LLM calls, tool invocations, and latency
const { streamText } = wrapAISDK(ai, { client: langsmithClient });

export const aiChat = onRequest(
  {
    cors: true,
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: [anthropicKey, langsmithKey],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Authenticate: require a valid Firebase Auth ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authentication token' });
      return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    let uid: string;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    console.log(`[aiChat] Authenticated user: ${uid}`);
    const { messages, boardId } = req.body;

    if (!boardId || !messages) {
      res.status(400).json({ error: 'Missing boardId or messages' });
      return;
    }

    // Verify the board exists
    const boardDoc = await db.doc(`boards/${boardId}`).get();
    if (!boardDoc.exists) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    if (!anthropicKey.value()) {
      res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
      return;
    }

    try {
      const anthropic = createAnthropic({
        apiKey: anthropicKey.value(),
      });

      const tools = createToolDefinitions(db, boardId);
      const modelMessages = await convertToModelMessages(messages);

      const result = streamText({
        model: anthropic('claude-sonnet-4-6'),
        system: SYSTEM_PROMPT,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(10),
      });

      // Pipe streaming response to client
      result.pipeUIMessageStreamToResponse(res);

      // Ensure stream completes even if client disconnects
      // (prevents partially-applied tool executions)
      result.consumeStream();
    } catch (error) {
      console.error('[aiChat] Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    } finally {
      // Flush LangSmith traces before the serverless function exits
      await langsmithClient.awaitPendingTraceBatches();
    }
  },
);
