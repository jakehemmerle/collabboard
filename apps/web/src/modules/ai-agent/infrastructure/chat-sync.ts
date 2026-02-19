import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../../core/firebase.ts';
import type { UIMessage } from 'ai';

/**
 * Subscribe to AI chat messages from Firestore subcollection: boards/{boardId}/ai-messages
 */
export function subscribeToChatMessages(
  boardId: string,
  onMessages: (messages: UIMessage[]) => void,
): () => void {
  const db = getFirebaseDb();
  const messagesRef = collection(db, `boards/${boardId}/ai-messages`);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: UIMessage[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id,
        role: data.role,
        parts: data.parts ?? [{ type: 'text' as const, text: data.content ?? '' }],
      };
    });
    onMessages(messages);
  });
}

/**
 * Persist the message list to Firestore. Writes each message as its own doc.
 */
export async function persistChatMessages(
  boardId: string,
  messages: UIMessage[],
): Promise<void> {
  const db = getFirebaseDb();
  const messagesRef = collection(db, `boards/${boardId}/ai-messages`);

  for (const msg of messages) {
    const docRef = doc(messagesRef, msg.id);
    // Extract text content from parts for storage
    const textContent = msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
    await setDoc(docRef, {
      id: msg.id,
      role: msg.role,
      content: textContent,
      parts: JSON.parse(JSON.stringify(msg.parts)),
      createdAt: Date.now(),
    }, { merge: true });
  }
}
