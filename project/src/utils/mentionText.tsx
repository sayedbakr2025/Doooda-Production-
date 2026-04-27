import React from 'react';

export function renderMentionText(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} style={{ color: '#3b82f6', fontWeight: 600 }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}