import { matchAnswer } from './answer-matching';

describe('matchAnswer', () => {
  it('matches a single string answer exactly (case-insensitive)', () => {
    expect(matchAnswer('North America', 'north america')).toBe(true);
    expect(matchAnswer('  Paris ', 'paris')).toBe(true);
    expect(matchAnswer('Paris', 'London')).toBe(false);
  });

  it('accepts any alternative when expected is a string array and submitted is a string', () => {
    expect(
      matchAnswer('North America', ['North American', 'North America']),
    ).toBe(true);
    expect(
      matchAnswer('north american', ['North American', 'North America']),
    ).toBe(true);
    expect(matchAnswer('Europe', ['North American', 'North America'])).toBe(
      false,
    );
  });

  it('requires exact set match when both expected and submitted are arrays (MCQ multi)', () => {
    expect(matchAnswer(['B', 'C'], ['B', 'C'])).toBe(true);
    expect(matchAnswer(['C', 'B'], ['B', 'C'])).toBe(true);
    expect(matchAnswer(['B'], ['B', 'C'])).toBe(false);
    expect(matchAnswer('B', ['B', 'C'])).toBe(true);
  });

  it('parses legacy slash-separated string keys', () => {
    expect(matchAnswer('North America', 'North American / North America')).toBe(
      true,
    );
    expect(
      matchAnswer('North American', 'North American / North America'),
    ).toBe(true);
    expect(matchAnswer('Asia', 'North American / North America')).toBe(false);
  });

  it('parses pipe-separated string keys', () => {
    expect(matchAnswer('foo', 'foo|bar')).toBe(true);
    expect(matchAnswer('bar', 'foo|bar')).toBe(true);
  });
});
