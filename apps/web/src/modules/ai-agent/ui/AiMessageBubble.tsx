import { memo } from 'react';
import type { UIMessage } from 'ai';
import Markdown from 'react-markdown';

interface AiMessageBubbleProps {
  message: UIMessage;
}

function describeToolResult(
  toolName: string,
  args: Record<string, unknown> | undefined,
  output: Record<string, unknown> | undefined,
  done: boolean,
): string {
  if (done && output && typeof output === 'object' && 'error' in output) {
    return String(output.error);
  }

  const verb = (past: string, present: string) => (done ? past : `${present}...`);

  switch (toolName) {
    case 'createStickyNote': {
      const text = args?.text ? `'${truncate(String(args.text), 40)}'` : '';
      return `${verb('Created sticky note', 'Creating sticky note')}${text ? `: ${text}` : ''}`;
    }
    case 'createShape': {
      const type = args?.type ? String(args.type) : 'shape';
      return verb(`Created ${type}`, `Creating ${type}`);
    }
    case 'createFrame': {
      const title = args?.title ? `: '${truncate(String(args.title), 40)}'` : '';
      return `${verb('Created frame', 'Creating frame')}${title}`;
    }
    case 'createConnector':
      return verb('Connected objects', 'Connecting objects');
    case 'moveObject':
      return verb('Moved object', 'Moving object');
    case 'resizeObject':
      return verb('Resized object', 'Resizing object');
    case 'updateText':
      return verb('Updated text', 'Updating text');
    case 'changeColor':
      return verb('Changed color', 'Changing color');
    case 'deleteObject':
      return verb('Deleted object', 'Deleting object');
    case 'getBoardState': {
      if (done && output && typeof output.objectCount === 'number') {
        return `Read board state (${output.objectCount} objects)`;
      }
      return verb('Read board state', 'Reading board state');
    }
    case 'createMultipleObjects': {
      if (done && output && typeof output.created === 'number') {
        return `Created ${output.created} objects`;
      }
      return verb('Created objects', 'Creating objects');
    }
    case 'addToFrame':
      return verb('Added objects to frame', 'Adding objects to frame');
    default:
      return verb(`Used ${toolName}`, `Calling ${toolName}`);
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

const markdownStyles: Record<string, React.CSSProperties> = {
  p: { margin: '0 0 4px' },
  ul: { margin: '2px 0', paddingLeft: 20 },
  ol: { margin: '2px 0', paddingLeft: 20 },
  li: { margin: '1px 0' },
  code: {
    background: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    padding: '1px 4px',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  pre: {
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 6,
    padding: '6px 8px',
    margin: '4px 0',
    overflow: 'auto',
    fontSize: 13,
  },
};

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
          wordBreak: 'break-word',
        }}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            if (isUser) {
              return (
                <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
                  {part.text}
                </span>
              );
            }
            return (
              <Markdown
                key={i}
                components={{
                  p: ({ children }) => <p style={markdownStyles.p}>{children}</p>,
                  ul: ({ children }) => <ul style={markdownStyles.ul}>{children}</ul>,
                  ol: ({ children }) => <ol style={markdownStyles.ol}>{children}</ol>,
                  li: ({ children }) => <li style={markdownStyles.li}>{children}</li>,
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    if (isBlock) {
                      return (
                        <pre style={markdownStyles.pre}>
                          <code style={{ fontFamily: 'monospace', fontSize: 13 }}>{children}</code>
                        </pre>
                      );
                    }
                    return <code style={markdownStyles.code}>{children}</code>;
                  },
                  pre: ({ children }) => <>{children}</>,
                }}
              >
                {part.text}
              </Markdown>
            );
          }
          if (part.type === 'dynamic-tool') {
            const done = part.state === 'output-available';
            const args = (part.input ?? undefined) as Record<string, unknown> | undefined;
            const output = ('output' in part ? part.output : undefined) as
              | Record<string, unknown>
              | undefined;
            const description = describeToolResult(part.toolName, args, output, done);
            const isError = done && output && typeof output === 'object' && 'error' in output;

            return (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: isError ? '#D32F2F' : isUser ? '#B3D4FC' : '#999',
                  fontStyle: 'italic',
                  margin: '4px 0',
                }}
              >
                {done && !isError ? '✓ ' : ''}
                {description}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
});
