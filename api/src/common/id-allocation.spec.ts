import { nextSequentialCode, parseNumericSuffix } from './id-allocation';

describe('id-allocation', () => {
  describe('parseNumericSuffix', () => {
    it('parses trailing digits after prefix', () => {
      expect(parseNumericSuffix('PRA-REA-P001', 'PRA-REA-P')).toBe(1);
      expect(parseNumericSuffix('PRA-REA-P999', 'PRA-REA-P')).toBe(999);
    });

    it('returns null for non-matching codes', () => {
      expect(parseNumericSuffix('PRA-REA-Q001', 'PRA-REA-P')).toBeNull();
      expect(parseNumericSuffix('PRA-REA-PABC', 'PRA-REA-P')).toBeNull();
    });
  });

  describe('nextSequentialCode', () => {
    it('uses numeric max, not lexicographic order', () => {
      const next = nextSequentialCode(
        ['PRA-REA-P999', 'PRA-REA-P100', 'PRA-REA-P050'],
        'PRA-REA-P',
      );
      expect(next).toBe('PRA-REA-P1000');
    });

    it('starts at 001 when empty', () => {
      expect(nextSequentialCode([], 'PRA-WRI-T1-', 3)).toBe('PRA-WRI-T1-001');
    });
  });
});
