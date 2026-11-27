import { Fragment } from 'react';
import { parseInlineMarkdown, parseMarkdownBlocks } from '../../utils/formatAiText';

function renderInlineTokens(tokens, keyPrefix = 'tok') {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (token.type) {
      case 'boldItalic':
        return (
          <strong key={key} className="font-bold italic text-stone-950">
            {token.text}
          </strong>
        );
      case 'bold':
        return (
          <strong key={key} className="font-bold text-stone-950">
            {renderInlineTokens(token.children || [], `${key}-b`)}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic">
            {token.text}
          </em>
        );
      case 'code':
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 rounded bg-stone-100 text-[#046A38] font-mono text-[0.9em]"
          >
            {token.text}
          </code>
        );
      case 'text':
      default:
        return <Fragment key={key}>{token.text}</Fragment>;
    }
  });
}

function renderInline(text, keyPrefix) {
  return renderInlineTokens(parseInlineMarkdown(text), keyPrefix);
}

/**
 * Renders markdown-formatted AI assistant responses cleanly into semantic HTML
 * with bold emphasis, section headings, and nested bullet/numbered lists.
 */
export default function FormattedAIMessage({ text, className = '' }) {
  const blocks = parseMarkdownBlocks(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 break-words ${className}`.trim()}>
      {blocks.map((block, bIdx) => {
        const blockKey = `blk-${bIdx}`;

        if (block.type === 'heading') {
          const sizeClass =
            block.level <= 2
              ? 'text-[13.5px] sm:text-sm font-extrabold text-[#093322]'
              : 'font-bold text-stone-950';
          return (
            <p key={blockKey} className={`${sizeClass} leading-snug`}>
              {renderInline(block.text, blockKey)}
            </p>
          );
        }

        if (block.type === 'hr') {
          return <hr key={blockKey} className="border-t border-[#E8DCC8] my-2" />;
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          const listClass = block.ordered
            ? 'list-decimal pl-5 space-y-1.5 marker:font-semibold marker:text-[#046A38]'
            : 'list-disc pl-4 space-y-1.5 marker:text-[#046A38]';

          return (
            <ListTag key={blockKey} className={listClass}>
              {block.items.map((item, itemIdx) => {
                const itemKey = `${blockKey}-li-${itemIdx}`;
                return (
                  <li key={itemKey} className="leading-relaxed pl-0.5">
                    <span>{renderInline(item.text, itemKey)}</span>
                    {item.subItems.length > 0 && (
                      <ul className="list-[circle] pl-4 mt-1 space-y-1 marker:text-[#1D8252]">
                        {item.subItems.map((sub, subIdx) => (
                          <li key={`${itemKey}-sub-${subIdx}`} className="leading-relaxed pl-0.5">
                            {renderInline(sub.text, `${itemKey}-sub-${subIdx}`)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ListTag>
          );
        }

        return (
          <p key={blockKey} className="leading-relaxed">
            {block.lines.map((lineText, lineIdx) => (
              <Fragment key={`${blockKey}-ln-${lineIdx}`}>
                {lineIdx > 0 && <br />}
                {renderInline(lineText, `${blockKey}-ln-${lineIdx}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
