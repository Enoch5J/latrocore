import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FormattedAIMessage from '../components/common/FormattedAIMessage';
import {
  parseInlineMarkdown,
  parseMarkdownBlocks,
  stripMarkdown,
} from '../utils/formatAiText';
import { getAssistantResponse } from '../services/assistantEngine';

describe('FormattedAIMessage & Markdown Formatter', () => {
  it('renders bold headers and bullet lists cleanly without literal ** markers for Balanced Plate response', () => {
    const response = getAssistantResponse(
      'How can I build a balanced meal with rice, dal, and vegetables?',
      'en'
    );
    const html = renderToStaticMarkup(
      React.createElement(FormattedAIMessage, { text: response.text })
    );

    expect(html).not.toContain('**');
    expect(html).not.toContain('•');
    expect(html).toContain('<strong');
    expect(html).toContain('Building a Balanced Plate with Rice, Dal &amp; Vegetables:');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('Half Plate (50%) Non-Starchy Vegetables:');
    expect(html).toContain('Quarter Plate (25%) Protein-Rich Dal:');
    expect(html).toContain('Quarter Plate (25%) Rice:');
    expect(html).toContain('Eating Order Tip:');
  });

  it('handles Tamil/multilingual bold headings, bullets, and inline bold ranges', () => {
    const tamilRes = getAssistantResponse('Can you explain a glucose log in Tamil?', 'en');
    const tamilHtml = renderToStaticMarkup(
      React.createElement(FormattedAIMessage, { text: tamilRes.text })
    );
    expect(tamilHtml).not.toContain('**');
    expect(tamilHtml).toContain('<strong');
    expect(tamilHtml).toContain('குளுக்கோஸ் பதிவு (Glucose Log) விளக்கம்:');
    expect(tamilHtml).toContain('<ul');

    const logRes = getAssistantResponse('What should I record in my glucose log?', 'en');
    const logHtml = renderToStaticMarkup(
      React.createElement(FormattedAIMessage, { text: logRes.text })
    );
    expect(logHtml).not.toContain('**');
    expect(logHtml).toContain('80–130 mg/dL pre-meal');
    expect(logHtml).toContain('below 180 mg/dL post-meal');
  });

  it('nests indented sub-bullets under parent bullet items and renders ordered lists', () => {
    const sample = [
      '### Prescription Guidance',
      '',
      '• **Metformin 500mg** (Biguanide)',
      '  - **Potential Adverse Effects:** Mild stomach upset.',
      '  - **Clinical Warning Sign:** Persistent abdominal pain.',
      '',
      '1. **Storage:** Refrigerate unopened pens at `2°C–8°C`.',
      '2. **Missed Dose:** Never *double* your next dose.',
    ].join('\n');

    const blocks = parseMarkdownBlocks(sample);
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'list', 'list']);
    expect(blocks[1].items[0].subItems).toHaveLength(2);
    expect(blocks[2].ordered).toBe(true);

    const html = renderToStaticMarkup(
      React.createElement(FormattedAIMessage, { text: sample })
    );
    expect(html).not.toContain('**');
    expect(html).not.toContain('###');
    expect(html).toContain('Prescription Guidance');
    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html).toContain('<code');
    expect(html).toContain('<em');
  });

  it('does not turn arithmetic asterisks or snake_case into italics and cleans stray **', () => {
    const tokens = parseInlineMarkdown('Dose 2 * 3 = 6 for patient_id_1 and ** how ** or **dangling');
    expect(tokens.some((t) => t.type === 'italic')).toBe(false);
    expect(tokens.some((t) => t.type === 'bold')).toBe(true);

    const html = renderToStaticMarkup(
      React.createElement(FormattedAIMessage, {
        text: 'Dose 2 * 3 = 6 for patient_id_1 and ** how ** or **dangling',
      })
    );
    expect(html).not.toContain('**');
    expect(html).not.toContain('<em');
    expect(html).toContain('2 * 3 = 6');
    expect(html).toContain('patient_id_1');
    expect(html).toContain('>how<');
  });

  it('strips markdown cleanly for speech synthesis', () => {
    const plain = stripMarkdown(
      '**Building a Balanced Plate:**\n• **Half Plate:** Eat *fresh* `greens`.'
    );
    expect(plain).toBe('Building a Balanced Plate:\nHalf Plate: Eat fresh greens.');
  });
});
