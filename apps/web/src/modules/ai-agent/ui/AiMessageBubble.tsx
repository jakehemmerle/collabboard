import { memo, useState } from 'react';
import type { UIMessage } from 'ai';
import { isToolUIPart, getToolOrDynamicToolName } from 'ai';
import Markdown from 'react-markdown';
import { v } from '../../../shared/theme/theme-utils.ts';

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

// --- ToolCallDisplay (Feature 3) ---

interface ToolCallDisplayProps {
  toolName: string;
  input: Record<string, unknown>;
  state: string;
  output?: Record<string, unknown>;
}

export function ToolCallDisplay({ toolName, input, state, output }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const done = state === 'output-available';
  const isError = done && output && typeof output === 'object' && 'error' in output;
  const description = describeToolResult(toolName, input, output, done);

  return (
    <div
      role="button"
      onClick={() => setExpanded(!expanded)}
      style={{
        fontSize: 12,
        margin: '4px 0',
        padding: '6px 8px',
        borderRadius: 6,
        background: isError ? v('--cb-error-light') : v('--cb-bg-surface'),
        border: `1px solid ${isError ? v('--cb-error-border') : v('--cb-border-subtle')}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {done && !isError && <span>✓</span>}
        {done && isError && <span style={{ color: v('--cb-error') }}>✗</span>}
        {!done && <span style={{ color: v('--cb-text-tertiary') }}>⏳</span>}
        <span style={{ fontWeight: 700 }}>{toolName}</span>
      </div>
      <div
        style={{
          color: isError ? v('--cb-error') : v('--cb-text-tertiary'),
          fontStyle: 'italic',
          marginTop: 2,
        }}
      >
        {description}
      </div>
      {expanded && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Input:</div>
          <pre
            style={{
              background: 'rgba(0,0,0,0.06)',
              borderRadius: 4,
              padding: '4px 6px',
              fontSize: 11,
              fontFamily: 'monospace',
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(input, null, 2)}
          </pre>
          {output && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, marginTop: 6 }}>Output:</div>
              <pre
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {JSON.stringify(output, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
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
          background: isUser ? v('--cb-primary') : v('--cb-bg-surface-raised'),
          color: isUser ? v('--cb-text-on-primary') : v('--cb-text-primary'),
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
          if (isToolUIPart(part)) {
            const toolName = getToolOrDynamicToolName(part);
            const args = ('input' in part ? (part.input ?? {}) : {}) as Record<string, unknown>;
            const output = ('output' in part ? part.output : undefined) as
              | Record<string, unknown>
              | undefined;

            return (
              <ToolCallDisplay
                key={i}
                toolName={toolName}
                input={args}
                state={part.state}
                output={output}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
});
