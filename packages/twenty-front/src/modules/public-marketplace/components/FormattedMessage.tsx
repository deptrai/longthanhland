import styled from '@emotion/styled';
import React from 'react';

const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
`;

const SectionTitle = styled.div`
  font-weight: 700;
  font-size: 0.9375rem;
  margin-top: 0.5rem;
  margin-bottom: 0.125rem;
  color: inherit;
`;

const BoldText = styled.span`
  font-weight: 600;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.2);
  margin: 0.375rem 0;
`;

const ListItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  padding-left: 0.25rem;
`;

const ListBullet = styled.span`
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
`;

const HighlightBox = styled.div<{ $variant: 'info' | 'success' | 'warning' }>`
  background-color: ${({ theme, $variant }) =>
    $variant === 'info'
      ? theme.tag.background.blue
      : $variant === 'success'
        ? theme.tag.background.green
        : theme.tag.background.orange};
  border-left: 3px solid
    ${({ theme, $variant }) =>
      $variant === 'info'
        ? theme.color.blue
        : $variant === 'success'
          ? theme.color.green
          : theme.color.orange};
  border-radius: 0 6px 6px 0;
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0;
  font-size: 0.8125rem;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.25rem 0;
`;

const Tag = styled.span<{ $color?: string }>`
  background-color: ${({ theme, $color }) => $color || theme.tag.background.blue};
  color: ${({ theme, $color }) =>
    $color === 'rgba(34, 197, 94, 0.12)'
      ? theme.color.green
      : $color === 'rgba(245, 158, 11, 0.12)'
        ? theme.color.orange
        : theme.color.blue};
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
`;

const ProgressBar = styled.div`
  background-color: rgba(128, 128, 128, 0.15);
  border-radius: 999px;
  height: 6px;
  margin: 0.25rem 0;
  overflow: hidden;
  width: 100%;
`;

const ProgressFill = styled.div<{ $percent: number; $color?: string }>`
  background-color: ${({ theme, $color }) => $color || theme.color.blue};
  border-radius: 999px;
  height: 100%;
  transition: width 0.6s ease;
  width: ${({ $percent }) => $percent}%;
`;

const CompactTable = styled.div`
  border: 1px solid rgba(128, 128, 128, 0.15);
  border-radius: 8px;
  font-size: 0.8125rem;
  margin: 0.375rem 0;
  overflow: hidden;
`;

const TableRow = styled.div<{ $isHeader?: boolean }>`
  background-color: ${({ $isHeader }) =>
    $isHeader ? 'rgba(128, 128, 128, 0.06)' : 'transparent'};
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
  display: grid;
  font-weight: ${({ $isHeader }) => ($isHeader ? '600' : '400')};
  grid-template-columns: 1fr 1fr;
  padding: 0.375rem 0.625rem;

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div`
  padding: 0.125rem 0;
`;

const Paragraph = styled.p`
  margin: 0.125rem 0;
`;

type HighlightVariant = 'info' | 'success' | 'warning';

interface FormattedBlock {
  type:
    | 'title'
    | 'text'
    | 'list'
    | 'divider'
    | 'highlight'
    | 'tags'
    | 'progress'
    | 'table';
  content: string;
  variant?: HighlightVariant;
  items?: string[];
  percent?: number;
  color?: string;
  rows?: string[][];
  tagColors?: string[];
}

const parseBoldText = (text: string): React.ReactNode[] => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <BoldText key={i}>{part}</BoldText> : part,
  );
};

const detectHighlightVariant = (text: string): HighlightVariant => {
  if (
    text.includes('💡') ||
    text.includes('Khuyến nghị') ||
    text.includes('Lưu ý') ||
    text.includes('Tip')
  ) {
    return 'info';
  }
  if (
    text.includes('✅') ||
    text.includes('Ưu điểm') ||
    text.includes('Kết luận')
  ) {
    return 'success';
  }
  if (
    text.includes('⚠️') ||
    text.includes('Cảnh báo') ||
    text.includes('Rủi ro')
  ) {
    return 'warning';
  }
  return 'info';
};

const parseContent = (content: string): FormattedBlock[] => {
  const lines = content.split('\n');
  const blocks: FormattedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Section title: lines starting with ** and ending with **
    if (/^\*\*.+\*\*\s*$/.test(line)) {
      blocks.push({
        type: 'title',
        content: line.replace(/\*\*/g, ''),
      });
      i++;
      continue;
    }

    // Highlight box: lines starting with 💡, ⚠️, 🎯, ✅ followed by **
    if (/^(💡|⚠️|🎯|✅|📊|💎)\s*\*\*.+\*\*/.test(line)) {
      blocks.push({
        type: 'highlight',
        content: line.replace(/\*\*/g, ''),
        variant: detectHighlightVariant(line),
      });
      i++;
      continue;
    }

    // List items: lines starting with emoji + space or numbered emoji
    if (/^([\u{1F300}-\u{1FAD6}]|[1-9]️⃣|•|[-–])\s/u.test(line)) {
      blocks.push({
        type: 'list',
        content: line,
      });
      i++;
      continue;
    }

    // Regular text
    blocks.push({
      type: 'text',
      content: line,
    });
    i++;
  }

  return blocks;
};

const renderBlock = (block: FormattedBlock, index: number): React.ReactNode => {
  switch (block.type) {
    case 'title':
      return <SectionTitle key={index}>{block.content}</SectionTitle>;

    case 'highlight':
      return (
        <HighlightBox key={index} $variant={block.variant || 'info'}>
          {parseBoldText(block.content)}
        </HighlightBox>
      );

    case 'list': {
      const match = block.content.match(
        /^([\u{1F300}-\u{1FAD6}]|[1-9]️⃣|•|[-–])\s*(.*)/u,
      );
      if (match) {
        return (
          <ListItem key={index}>
            <ListBullet>{match[1]}</ListBullet>
            <span>{parseBoldText(match[2])}</span>
          </ListItem>
        );
      }
      return <Paragraph key={index}>{parseBoldText(block.content)}</Paragraph>;
    }

    case 'divider':
      return <Divider key={index} />;

    case 'text':
    default:
      return <Paragraph key={index}>{parseBoldText(block.content)}</Paragraph>;
  }
};

export const FormattedMessage = ({ content }: { content: string }) => {
  const blocks = parseContent(content);
  return <MessageContent>{blocks.map(renderBlock)}</MessageContent>;
};

// Re-export styled components for use in tests if needed
export {
    CompactTable, HighlightBox, ProgressBar,
    ProgressFill, TableCell, TableRow, Tag,
    TagRow
};

