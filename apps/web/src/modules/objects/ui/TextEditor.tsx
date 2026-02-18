import { useEffect, useRef, useState } from 'react';
import type { StickyNote, TextObject } from '../contracts.ts';
import { STICKY_COLORS } from '../contracts.ts';
import type { Camera } from '../../viewport/contracts.ts';

interface TextEditorProps {
  obj: StickyNote | TextObject;
  camera: Camera;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function TextEditor({ obj, camera, onSave, onCancel }: TextEditorProps) {
  const [text, setText] = useState(obj.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const screenX = obj.x * camera.scale + camera.x;
  const screenY = obj.y * camera.scale + camera.y;
  const scaledWidth = obj.width * camera.scale;
  const scaledHeight = obj.height * camera.scale;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onSave(text);
    }
  }

  function handleBlur() {
    onSave(text);
  }

  const isSticky = obj.type === 'sticky';
  const bgColor = isSticky
    ? (STICKY_COLORS[(obj as StickyNote).color] ?? STICKY_COLORS.yellow)
    : '#ffffff';
  const fontSize = isSticky ? 14 : (obj as TextObject).fontSize;

  return (
    <textarea
      ref={textareaRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: scaledWidth,
        height: Math.max(scaledHeight, 40 * camera.scale),
        background: bgColor,
        border: '2px solid #2196F3',
        borderRadius: isSticky ? 8 * camera.scale : 2,
        padding: isSticky ? 12 * camera.scale : 4 * camera.scale,
        fontSize: fontSize * camera.scale,
        fontFamily: 'sans-serif',
        color: '#333',
        resize: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    />
  );
}
