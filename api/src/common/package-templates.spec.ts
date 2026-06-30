import { ExamType } from '@prisma/client';
import { getPackageContentTemplate } from './package-templates';

describe('package-templates', () => {
  it('returns full academic template', () => {
    const t = getPackageContentTemplate(
      'listening+reading+writing+speaking',
      ExamType.ACADEMIC,
    );
    expect(t.suggestedPrice).toBe(49);
    expect(t.included.length).toBeGreaterThan(2);
    expect(t.description).toContain('Academic');
  });

  it('returns speaking-only template', () => {
    const t = getPackageContentTemplate('speaking');
    expect(t.suggestedPrice).toBe(22);
    expect(t.rules).toContain('Live video session');
  });
});
