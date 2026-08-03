import { ContentTestType } from '@prisma/client';
import {
  findContentStructureErrors,
  normalizeContentForType,
} from './content-normalize';

describe('normalizeContentForType', () => {
  it('coerces missing flowchart steps/options to arrays (prevents player crash)', () => {
    const content = {
      parts: [
        {
          groups: [{ type: 'flowchart_completion' }],
        },
      ],
    };
    const out = normalizeContentForType(ContentTestType.LISTENING, content);
    const group = (out.parts as any[])[0].groups[0];
    expect(Array.isArray(group.steps)).toBe(true);
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

describe('normalizeContentForType — writing task ids', () => {
  it('deduplicates colliding Task 1 / Task 2 ids', () => {
    const content = {
      title: 'Writing',
      tasks: [
        {
          id: 'w-task-dup',
          part: 1,
          taskNumber: 1,
          minWords: 150,
          prompt: 'Task 1',
        },
        {
          id: 'w-task-dup',
          part: 2,
          taskNumber: 2,
          minWords: 250,
          prompt: 'Task 2',
        },
      ],
    };
    const out = normalizeContentForType(ContentTestType.WRITING, content);
    const tasks = (out as { tasks: { id: string; taskNumber: number }[] }).tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe('w-task-dup');
    expect(tasks[1].id).toBe('w-task-2-1');
    expect(tasks[0].id).not.toBe(tasks[1].id);
    expect(tasks.map((t) => t.taskNumber)).toEqual([1, 2]);
  });

  it('fills missing task ids from taskNumber', () => {
    const content = {
      tasks: [
        { taskNumber: 1, prompt: 'A' },
        { taskNumber: 2, prompt: 'B' },
      ],
    };
    const out = normalizeContentForType(ContentTestType.WRITING, content);
    const tasks = (out as { tasks: { id: string }[] }).tasks;
    expect(tasks[0].id).toBe('w-task-1');
    expect(tasks[1].id).toBe('w-task-2');
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
  it('flags a flowchart group with non-array steps or nodes', () => {
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
