import { Group, Rect, Text } from 'react-konva';
import { useState } from 'react';

const EMOJI_PALETTE = ['\u{1F44D}', '\u{1F44E}', '\u{2764}\u{FE0F}', '\u{1F389}', '\u{1F914}', '\u{2B50}'];

interface StickyReactionsProps {
  reactions: Record<string, string[]>;
  currentUserId: string;
  stickyWidth?: number;
  stickyHeight: number;
  onToggleReaction: (emoji: string) => void;
}

const BADGE_HEIGHT = 22;
const BADGE_PAD_X = 8;
const BADGE_GAP = 4;
const FONT_SIZE = 12;

function estimateBadgeWidth(emoji: string, count: number): number {
  const text = `${emoji} ${count}`;
  return text.length * (FONT_SIZE * 0.65) + BADGE_PAD_X * 2;
}

export function StickyReactions({
  reactions,
  currentUserId,
  stickyHeight,
  onToggleReaction,
}: StickyReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  let cursorX = 0;

  return (
    <Group y={stickyHeight + 4}>
      {entries.map(([emoji, users]) => {
        const userReacted = users.includes(currentUserId);
        const badgeW = estimateBadgeWidth(emoji, users.length);
        const x = cursorX;
        cursorX += badgeW + BADGE_GAP;

        return (
          <Group
            key={emoji}
            x={x}
            y={0}
            onClick={(e) => {
              e.cancelBubble = true;
              onToggleReaction(emoji);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onToggleReaction(emoji);
            }}
          >
            <Rect
              width={badgeW}
              height={BADGE_HEIGHT}
              fill={userReacted ? '#E3F2FD' : '#F5F5F5'}
              cornerRadius={10}
            />
            <Text
              x={BADGE_PAD_X}
              y={4}
              text={`${emoji} ${users.length}`}
              fontSize={FONT_SIZE}
              fill="#333"
              listening={false}
            />
          </Group>
        );
      })}

      {/* Add reaction button */}
      <Group
        x={cursorX}
        y={0}
        onClick={(e) => {
          e.cancelBubble = true;
          setShowPicker((prev) => !prev);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          setShowPicker((prev) => !prev);
        }}
      >
        <Rect
          width={28}
          height={BADGE_HEIGHT}
          fill="#F5F5F5"
          cornerRadius={10}
        />
        <Text
          x={7}
          y={4}
          text="+"
          fontSize={FONT_SIZE}
          fontStyle="bold"
          fill="#666"
          listening={false}
        />
      </Group>

      {/* Emoji picker */}
      {showPicker && (
        <Group x={0} y={BADGE_HEIGHT + 4}>
          <Rect
            width={EMOJI_PALETTE.length * 30 + 8}
            height={30}
            fill="#fff"
            stroke="#ddd"
            strokeWidth={1}
            cornerRadius={8}
            shadowColor="#000"
            shadowBlur={4}
            shadowOpacity={0.1}
          />
          {EMOJI_PALETTE.map((emoji, i) => (
            <Group
              key={emoji}
              x={4 + i * 30}
              y={2}
              onClick={(e) => {
                e.cancelBubble = true;
                onToggleReaction(emoji);
                setShowPicker(false);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onToggleReaction(emoji);
                setShowPicker(false);
              }}
            >
              <Rect
                width={26}
                height={26}
                fill="transparent"
                cornerRadius={4}
              />
              <Text
                x={3}
                y={5}
                text={emoji}
                fontSize={14}
                listening={false}
              />
            </Group>
          ))}
        </Group>
      )}
    </Group>
  );
}
