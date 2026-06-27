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

describe('normalizeContentForType — speaking topics', () => {
  it('migrates legacy flat part1Questions into a single topic', () => {
    const content = {
      parts: [{ part: 1 }, { part: 2 }, { part: 3 }],
      part1Questions: ['Where are you from?', 'Do you work or study?'],
    };
    const out = normalizeContentForType(ContentTestType.SPEAKING, content);
    const topics = (out as any).part1Topics;
    expect(Array.isArray(topics)).toBe(true);
    expect(topics).toHaveLength(1);
    expect(topics[0].title).toBe('General questions');
    expect(topics[0].questions).toHaveLength(2);
  });

  it('migrates legacy flat part3Questions into a single topic', () => {
    const content = {
      parts: [{ part: 1 }, { part: 2 }, { part: 3 }],
      part3Questions: ['Why is this important?'],
    };
    const out = normalizeContentForType(ContentTestType.SPEAKING, content);
    const topics = (out as any).part3Topics;
    expect(topics).toHaveLength(1);
    expect(topics[0].title).toBe('General discussion');
  });

  it('preserves structured part1/part3 topics and drops empty ones', () => {
    const content = {
      parts: [{ part: 1 }, { part: 2 }, { part: 3 }],
      part1Topics: [
        { title: 'Home', questions: ['Do you live in a flat?'] },
        { title: '', questions: ['', '  '] },
      ],
      part3Topics: [{ title: 'Society', questions: ['Has this changed?'] }],
    };
    const out = normalizeContentForType(ContentTestType.SPEAKING, content);
    expect((out as any).part1Topics).toHaveLength(1);
    expect((out as any).part1Topics[0].title).toBe('Home');
    expect((out as any).part3Topics).toHaveLength(1);
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
