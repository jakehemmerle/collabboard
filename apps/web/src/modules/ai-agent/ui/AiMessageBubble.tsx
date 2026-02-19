import { memo } from 'react';
import type { UIMessage } from 'ai';

interface AiMessageBubbleProps {
  message: UIMessage;
}

export const AiMessageBubble = memo(function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: 12,
          background: isUser ? '#1976D2' : '#F5F5F5',
          color: isUser ? '#fff' : '#333',
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return <span key={i}>{part.text}</span>;
          }
          if (part.type === 'dynamic-tool') {
            const done = part.state === 'output-available';
            return (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: isUser ? '#B3D4FC' : '#999',
                  fontStyle: 'italic',
                  margin: '4px 0',
                }}
              >
                {done
                  ? `Used ${part.toolName}`
                  : `Calling ${part.toolName}...`}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
});
