import { ContentTestType } from '@prisma/client';
import {
  findContentStructureErrors,
  normalizeContentForType,
} from './content-normalize';

describe('normalizeContentForType', () => {
  it('coerces missing flowchart nodes/options to arrays (prevents s.nodes crash)', () => {
    const content = {
      parts: [
        {
          groups: [{ type: 'flowchart_completion' }],
        },
      ],
    };
    const out = normalizeContentForType(ContentTestType.LISTENING, content);
    const group = (out.parts as any[])[0].groups[0];
    expect(Array.isArray(group.nodes)).toBe(true);
    expect(Array.isArray(group.options)).toBe(true);
  });

  it('normalizes legacy completion lines (InlineNode[][]) into structured lines', () => {
    const content = {
      passages: [
        {
          groups: [
            {
              type: 'note_completion',
              lines: [[{ type: 'text', text: 'Q1' }]],
            },
          ],
        },
      ],
    };
    const out = normalizeContentForType(ContentTestType.READING, content);
    const line = (out.passages as any[])[0].groups[0].lines[0];
    expect(line.style).toBe('normal');
    expect(Array.isArray(line.nodes)).toBe(true);
  });

  it('returns safe defaults for non-object content', () => {
    const out = normalizeContentForType(ContentTestType.LISTENING, null);
    expect(Array.isArray(out.parts)).toBe(true);
  });
});

describe('findContentStructureErrors', () => {
  it('flags a flowchart group with non-array nodes', () => {
    const content = {
      parts: [{ groups: [{ type: 'flowchart_completion', nodes: 'bad' }] }],
    };
    const errors = findContentStructureErrors(
      ContentTestType.LISTENING,
      content,
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes valid content', () => {
    const content = {
      passages: [
        {
          groups: [
            { type: 'note_completion', lines: [{ style: 'normal', nodes: [] }] },
          ],
        },
      ],
    };
    expect(
      findContentStructureErrors(ContentTestType.READING, content),
    ).toHaveLength(0);
  });
});
