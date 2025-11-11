import React from 'react';

/**
 * Simple markdown renderer for policy content
 * Supports: headers, bold, italic, lists, paragraphs
 */
export const renderMarkdown = (content) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = null;
  let listItems = [];

  const flushList = () => {
    if (currentList && listItems.length > 0) {
      const ListTag = currentList === 'ul' ? 'ul' : 'ol';
      elements.push(
        <ListTag key={`list-${elements.length}`} className="list-disc list-inside mb-4 space-y-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-foreground">{item}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      currentList = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-lg font-semibold mb-2 mt-4 text-foreground">
          {trimmed.substring(4)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-xl font-semibold mb-3 mt-5 text-foreground">
          {trimmed.substring(3)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={index} className="text-2xl font-bold mb-4 mt-6 text-foreground">
          {trimmed.substring(2)}
        </h1>
      );
    }
    // Unordered lists
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (currentList !== 'ul') {
        flushList();
        currentList = 'ul';
      }
      listItems.push(processInlineFormatting(trimmed.substring(2)));
    }
    // Ordered lists
    else if (/^\d+\.\s/.test(trimmed)) {
      if (currentList !== 'ol') {
        flushList();
        currentList = 'ol';
      }
      listItems.push(processInlineFormatting(trimmed.replace(/^\d+\.\s/, '')));
    }
    // Empty line
    else if (trimmed === '') {
      flushList();
      // Add spacing
      if (elements.length > 0 && elements[elements.length - 1].type !== 'br') {
        elements.push(<br key={`br-${index}`} />);
      }
    }
    // Regular paragraph
    else {
      flushList();
      const processed = processInlineFormatting(trimmed);
      elements.push(
        <p key={index} className="mb-4 text-foreground leading-relaxed">
          {processed}
        </p>
      );
    }
  });

  flushList();

  return <div className="prose prose-sm max-w-none">{elements}</div>;
};

/**
 * Process inline formatting (bold, italic)
 */
const processInlineFormatting = (text) => {
  const parts = [];
  let currentIndex = 0;

  // Process bold (**text**)
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  const boldMatches = [];
  while ((match = boldRegex.exec(text)) !== null) {
    boldMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    });
  }

  // Process italic (*text*)
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
  const italicMatches = [];
  while ((match = italicRegex.exec(text)) !== null) {
    italicMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    });
  }

  // Combine and sort all matches
  const allMatches = [
    ...boldMatches.map(m => ({ ...m, type: 'bold' })),
    ...italicMatches.map(m => ({ ...m, type: 'italic' }))
  ].sort((a, b) => a.start - b.start);

  // Remove overlapping matches (bold takes precedence)
  const filteredMatches = [];
  for (const match of allMatches) {
    const overlaps = filteredMatches.some(
      existing => !(match.end <= existing.start || match.start >= existing.end)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }

  // Build parts
  filteredMatches.forEach((match, idx) => {
    // Add text before match
    if (match.start > currentIndex) {
      parts.push(text.substring(currentIndex, match.start));
    }

    // Add formatted text
    if (match.type === 'bold') {
      parts.push(
        <strong key={`bold-${idx}`} className="font-semibold text-foreground">
          {match.content}
        </strong>
      );
    } else {
      parts.push(
        <em key={`italic-${idx}`} className="italic text-foreground">
          {match.content}
        </em>
      );
    }

    currentIndex = match.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? parts : text;
};

