import type { SummaryData, TimestampHighlight } from '../types.ts';

export function parseStreamSummary(rawText: string, videoTitle = 'Biology Video'): SummaryData {
  const lines = rawText.split(/\r?\n/);
  let section: 'overview' | 'keypoints' | 'topics' | 'highlights' = 'overview';
  const overviewLines: string[] = [];
  const keyPoints: string[] = [];
  const topics: string[] = [];
  const highlights: TimestampHighlight[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    if (
      /^(#+|\*\*)\s*(summary|overview)/.test(lower) ||
      lower === 'overview:' ||
      lower === 'summary:'
    ) {
      section = 'overview';
      const afterColon = line.split(':').slice(1).join(':').trim();
      if (afterColon) overviewLines.push(afterColon);
      continue;
    }
    if (/^(#+|\*\*)\s*key\s*points/.test(lower) || lower.startsWith('key points:')) {
      section = 'keypoints';
      continue;
    }
    if (/^(#+|\*\*)\s*topics/.test(lower) || lower.startsWith('topics:')) {
      section = 'topics';
      const afterColon = line.split(':').slice(1).join(':').trim();
      if (afterColon) {
        afterColon
          .split(/[,|]/)
          .map((t) => t.replace(/^[-*•\s]+/, '').trim())
          .filter(Boolean)
          .forEach((t) => topics.push(t));
      }
      continue;
    }
    if (/^(#+|\*\*)\s*(timestamped\s*)?highlights/.test(lower) || lower.startsWith('highlights:')) {
      section = 'highlights';
      continue;
    }

    if (section === 'overview') {
      overviewLines.push(line.replace(/^[-*•]\s*/, ''));
    } else if (section === 'keypoints') {
      keyPoints.push(line.replace(/^[-*•\d.)]+\s*/, '').replace(/\*\*/g, ''));
    } else if (section === 'topics') {
      line
        .replace(/^[-*•]\s*/, '')
        .split(/[,|]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => topics.push(t));
    } else if (section === 'highlights') {
      const cleaned = line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '');
      const match = cleaned.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-–—:]?\s*(.+)$/);
      if (match) {
        const time = match[1];
        const rest = match[2];
        const [titlePart, ...detailParts] = rest.split(/\s+[-–—:]\s+/);
        highlights.push({
          time,
          title: (titlePart || rest).trim(),
          detail: detailParts.join(' — ').trim() || rest.trim(),
        });
      } else {
        highlights.push({
          time: '00:00',
          title: cleaned.slice(0, 64),
          detail: cleaned,
        });
      }
    }
  }

  return {
    overview:
      overviewLines.join(' ').trim() ||
      rawText.slice(0, 600).trim() ||
      `Summary of ${videoTitle}`,
    keyPoints:
      keyPoints.length > 0
        ? keyPoints.slice(0, 8)
        : [`Core biological concepts covered in ${videoTitle}.`],
    topics: topics.length > 0 ? Array.from(new Set(topics)).slice(0, 6) : ['Biology'],
    highlights:
      highlights.length > 0
        ? highlights.slice(0, 8)
        : [{ time: '00:00', title: 'Introduction', detail: `Opening overview of ${videoTitle}.` }],
  };
}
