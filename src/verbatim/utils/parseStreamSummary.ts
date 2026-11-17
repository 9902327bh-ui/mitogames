import type { TranscriptHighlight } from '../types.ts';

export interface ParsedStreamContent {
  category: 'reaction' | 'electro' | 'not_science';
  isChemistry: boolean;
  rejectionReason: string;
  spokenLanguage: string;
  topics: string[];
  summary: string;
  keyPoints: string[];
  transcriptHighlights: TranscriptHighlight[];
}

function cleanLine(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function parseStructuredPlainText(raw: string): ParsedStreamContent {
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let category: 'reaction' | 'electro' | 'not_science' = 'reaction';
  let isChemistry = true;
  let rejectionReason = '';
  let spokenLanguage = 'English';
  let topics: string[] = [];
  const summaryLines: string[] = [];
  const keyPoints: string[] = [];
  const transcriptHighlights: TranscriptHighlight[] = [];

  type Section = 'header' | 'summary' | 'keyPoints' | 'highlights';
  let section: Section = 'header';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith('CATEGORY:')) {
      const val = cleanLine(trimmed.slice('CATEGORY:'.length)).toUpperCase();
      if (val.includes('ELECTRO')) {
        category = 'electro';
        isChemistry = true;
      } else if (val.includes('NOT') || val.includes('NO')) {
        category = 'not_science';
        isChemistry = false;
      } else {
        category = 'reaction';
        isChemistry = true;
      }
      continue;
    }

    if (upper.startsWith('IS_CHEMISTRY:')) {
      const val = cleanLine(trimmed.slice('IS_CHEMISTRY:'.length)).toUpperCase();
      if (val.startsWith('NO') || val === 'FALSE') {
        isChemistry = false;
        category = 'not_science';
      } else if (val.startsWith('YES') || val === 'TRUE') {
        isChemistry = true;
      }
      continue;
    }

    if (upper.startsWith('REJECTION_REASON:')) {
      rejectionReason = cleanLine(trimmed.slice('REJECTION_REASON:'.length));
      continue;
    }

    if (upper.startsWith('LANGUAGE:')) {
      const val = cleanLine(trimmed.slice('LANGUAGE:'.length));
      if (val) spokenLanguage = val;
      continue;
    }

    if (upper.startsWith('TOPICS:')) {
      const val = cleanLine(trimmed.slice('TOPICS:'.length));
      topics = val
        .split(/[,·|]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 4);
      continue;
    }

    if (upper === 'SUMMARY:' || upper === 'SUMMARY') {
      section = 'summary';
      continue;
    }

    if (upper === 'KEY POINTS:' || upper === 'KEY POINTS') {
      section = 'keyPoints';
      continue;
    }

    if (upper === 'HIGHLIGHTS:' || upper === 'HIGHLIGHTS') {
      section = 'highlights';
      continue;
    }

    if (section === 'summary') {
      summaryLines.push(cleanLine(rawLine));
    } else if (section === 'keyPoints') {
      if (!trimmed) continue;
      const cleaned = cleanLine(trimmed.replace(/^[-*•\d.)]+\s*/, ''));
      if (cleaned) keyPoints.push(cleaned);
    } else if (section === 'highlights') {
      if (!trimmed) continue;
      const match = trimmed.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–:]?\s*(.+)$/);
      if (match) {
        const point = cleanLine(match[2]);
        if (point) {
          transcriptHighlights.push({
            timestamp: match[1],
            point,
          });
        }
      } else {
        const point = cleanLine(trimmed.replace(/^[-*•]\s*/, ''));
        if (point) {
          transcriptHighlights.push({
            timestamp: '00:00',
            point,
          });
        }
      }
    } else if (
      trimmed &&
      !upper.startsWith('LANGUAGE') &&
      !upper.startsWith('TOPICS') &&
      !upper.startsWith('IS_CHEMISTRY') &&
      !upper.startsWith('REJECTION_REASON')
    ) {
      summaryLines.push(cleanLine(rawLine));
    }
  }

  return {
    category,
    isChemistry,
    rejectionReason,
    spokenLanguage,
    topics,
    summary: summaryLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    keyPoints,
    transcriptHighlights,
  };
}
