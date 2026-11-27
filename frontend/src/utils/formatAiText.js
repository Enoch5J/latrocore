/**
 * Lightweight, XSS-safe Markdown parser and plain-text stripper for Latro AI messages.
 * Produces structured AST nodes for React rendering without using dangerouslySetInnerHTML.
 */

const INLINE_TOKEN_SOURCE =
  '(\\*\\*\\*([^\\n*]+?)\\*\\*\\*|___([^\\n_]+?)___|__([^\\n]+?)__|\\*\\*([^\\n]+?)\\*\\*|`([^`\\n]+?)`|\\*([^\\s*](?:[^\\n*]*?[^\\s*])?)\\*|(?<![\\w])_([^\\s_](?:[^\\n_]*?[^\\s_])?)_(?![\\w]))';

const HEADING_REGEX = /^\s*(#{1,4})\s+(.+)$/;
const HR_REGEX = /^\s*(?:---|\*\*\*|___)\s*$/;
const BULLET_REGEX = /^( *)(?:•\s*|[-*]\s+)(.+)$/;
const ORDERED_REGEX = /^( *)\d+[.)]\s+(.+)$/;

/**
 * Parse inline markdown spans (**bold**, *italic*, ***both***, `code`) into tokens.
 * @param {string} text
 * @returns {Array<{ type: string, text?: string, children?: Array }>}
 */
export function parseInlineMarkdown(text) {
  const input = String(text ?? '');
  if (!input) return [];

  const tokens = [];
  const regex = new RegExp(INLINE_TOKEN_SOURCE, 'g');
  let lastIndex = 0;

  let match;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      const plain = input.slice(lastIndex, match.index).replace(/\*\*/g, '');
      if (plain) tokens.push({ type: 'text', text: plain });
    }

    if (match[2] !== undefined || match[3] !== undefined) {
      const inner = (match[2] ?? match[3]).trim();
      if (inner) tokens.push({ type: 'boldItalic', text: inner });
    } else if (match[4] !== undefined || match[5] !== undefined) {
      const inner = (match[4] ?? match[5]).trim();
      if (inner) {
        tokens.push({ type: 'bold', children: parseInlineMarkdown(inner) });
      }
    } else if (match[6] !== undefined) {
      tokens.push({ type: 'code', text: match[6] });
    } else if (match[7] !== undefined || match[8] !== undefined) {
      const inner = (match[7] ?? match[8]).trim();
      if (inner) tokens.push({ type: 'italic', text: inner });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    const tail = input.slice(lastIndex).replace(/\*\*/g, '');
    if (tail) tokens.push({ type: 'text', text: tail });
  }

  return tokens;
}

/**
 * Nest indented list items (level > 0) under their preceding top-level list item.
 */
function buildNestedListItems(rawItems) {
  const items = [];
  for (const item of rawItems) {
    if (item.level > 0 && items.length > 0) {
      items[items.length - 1].subItems.push({ text: item.text });
    } else {
      items.push({ text: item.text, subItems: [] });
    }
  }
  return items;
}

/**
 * Parse multiline AI response text into semantic block elements
 * (headings, bulleted/numbered lists, horizontal rules, and paragraphs).
 * @param {string} rawText
 * @returns {Array<object>}
 */
export function parseMarkdownBlocks(rawText) {
  const normalized = String(rawText ?? '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return [];

  const lines = normalized.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    if (HR_REGEX.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    const bulletMatch = line.match(BULLET_REGEX);
    if (bulletMatch) {
      const rawItems = [];
      while (i < lines.length) {
        const m = lines[i].match(BULLET_REGEX);
        if (!m) break;
        rawItems.push({ level: m[1].length >= 2 ? 1 : 0, text: m[2].trim() });
        i += 1;
      }
      blocks.push({
        type: 'list',
        ordered: false,
        items: buildNestedListItems(rawItems),
      });
      continue;
    }

    const orderedMatch = line.match(ORDERED_REGEX);
    if (orderedMatch) {
      const rawItems = [];
      while (i < lines.length) {
        const m = lines[i].match(ORDERED_REGEX);
        if (!m) break;
        rawItems.push({ level: m[1].length >= 2 ? 1 : 0, text: m[2].trim() });
        i += 1;
      }
      blocks.push({
        type: 'list',
        ordered: true,
        items: buildNestedListItems(rawItems),
      });
      continue;
    }

    const paragraphLines = [];
    while (i < lines.length) {
      const current = lines[i];
      if (
        !current.trim() ||
        HEADING_REGEX.test(current) ||
        HR_REGEX.test(current) ||
        BULLET_REGEX.test(current) ||
        ORDERED_REGEX.test(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paragraphLines });
    }
  }

  return blocks;
}

/**
 * Strip markdown syntax so SpeechSynthesis reads natural plain text.
 * @param {string} rawText
 * @returns {string}
 */
export function stripMarkdown(rawText) {
  return String(rawText ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*(?:•\s*|[-*]\s+)/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, (_, inner) => inner.trim())
    .replace(/__(.+?)__/g, (_, inner) => inner.trim())
    .replace(/`([^`\n]+?)`/g, '$1')
    .replace(/\*([^\s*](?:[^\n*]*?[^\s*])?)\*/g, '$1')
    .replace(/(?<![\w])_([^\s_](?:[^\n_]*?[^\s_])?)_(?![\w])/g, '$1')
    .replace(/\*\*/g, '')
    .trim();
}
