import {
  migrateFlowchartNodesToSteps,
  normalizeFlowchartSteps,
} from './inline-content';

describe('migrateFlowchartNodesToSteps', () => {
  it('merges text-gap-text into one inline flow-chart step', () => {
    const steps = migrateFlowchartNodesToSteps([
      { kind: 'text', text: 'Chocolate beans are' },
      { kind: 'gap', n: 11 },
      { kind: 'text', text: 'and then bags are shipped.' },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.nodes).toEqual([
      'Chocolate beans are',
      { n: 11 },
      'and then bags are shipped.',
    ]);
  });

  it('keeps text-only steps separate', () => {
    const steps = migrateFlowchartNodesToSteps([
      { kind: 'text', text: 'After being roasted at a high temperature' },
    ]);
    expect(steps[0]?.nodes).toEqual([
      'After being roasted at a high temperature',
    ]);
  });

  it('prefers explicit steps over legacy nodes', () => {
    const steps = normalizeFlowchartSteps({
      steps: [{ style: 'normal', nodes: ['Custom ', { n: 5 }, ' step'] }],
      nodes: [{ kind: 'text', text: 'Legacy' }],
    });
    expect(steps[0]?.nodes).toEqual(['Custom ', { n: 5 }, ' step']);
  });
});
