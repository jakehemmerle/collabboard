import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { AiMessageBubble } from './AiMessageBubble.tsx';
import { getModuleApi } from '../../../app/module-registry.ts';
import { AI_AGENT_MODULE_ID } from '../index.ts';
import { AUTH_MODULE_ID } from '../../auth/index.ts';
import type { AiAgentApi } from '../contracts.ts';
import type { AuthApi } from '../../auth/contracts.ts';

interface AiChatPanelProps {
  boardId: string;
  initialMessages?: UIMessage[];
  onNewMessages?: (messages: UIMessage[]) => void;
}

export function AiChatPanel({ boardId, initialMessages, onNewMessages }: AiChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  let functionUrl = '';
  try {
    const api = getModuleApi<AiAgentApi>(AI_AGENT_MODULE_ID);
    functionUrl = api.getConfig().functionUrl;
  } catch {
    // Module not ready yet
  }

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: functionUrl,
      body: { boardId },
      headers: async (): Promise<Record<string, string>> => {
        const authApi = getModuleApi<AuthApi>(AUTH_MODULE_ID);
        const token = await authApi.getIdToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    [functionUrl, boardId],
  );

  const { messages, sendMessage, status, setMessages, error, clearError } = useChat({
    id: `board-${boardId}`,
    transport,
    messages: initialMessages,
  });

  // Sync initial messages when they arrive from Firestore
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  // Notify parent of new messages for persistence
  useEffect(() => {
    if (messages.length > prevLenRef.current && onNewMessages) {
      onNewMessages(messages);
    }
    prevLenRef.current = messages.length;
  }, [messages, onNewMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || !functionUrl) return;
      sendMessage({ text });
      setInputValue('');
    },
    [inputValue, functionUrl, sendMessage],
  );

  const isLoading = status === 'streaming' || status === 'submitted';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#1976D2',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 20,
        }}
        title="Open AI Chat"
      >
        AI
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 380,
        height: 500,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1976D2',
          color: '#fff',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>AI Assistant</span>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 18,
            padding: '0 4px',
          }}
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Ask me to create objects, organize the board, or build templates.
            <br /><br />
            Try: &quot;Create a SWOT analysis&quot;
          </div>
        )}
        {messages.map((m) => (
          <AiMessageBubble key={m.id} message={m} />
        ))}
        {isLoading && (
          <div style={{ color: '#999', fontSize: 13, fontStyle: 'italic', padding: '4px 0' }}>
            Thinking...
          </div>
        )}
        {error && (
          <div style={{
            padding: '8px 12px',
            margin: '4px 0',
            background: '#FFF3F3',
            border: '1px solid #FFCDD2',
            borderRadius: 8,
            fontSize: 13,
            color: '#D32F2F',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Error: {error.message}</span>
            <button
              onClick={clearError}
              style={{
                background: 'none',
                border: 'none',
                color: '#D32F2F',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
              }}
            >
              &times;
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={functionUrl ? 'Type a command...' : 'AI not configured'}
          disabled={!functionUrl || isLoading}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || !functionUrl || isLoading}
          style={{
            padding: '8px 16px',
            background: !inputValue.trim() || !functionUrl || isLoading ? '#ccc' : '#1976D2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: !inputValue.trim() || !functionUrl || isLoading ? 'default' : 'pointer',
            fontSize: 14,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
