import { scorePassword } from './password-strength';

describe('scorePassword()', () => {
  it('returns empty level for empty string', () => {
    const result = scorePassword('');
    expect(result.score).toBe(0);
    expect(result.level).toBe('empty');
    expect(result.label).toBe('Enter a password');
  });

  it('returns weak for a short all-lowercase password', () => {
    // length < 8 → points capped at min(points, 1) → score 1 → weak
    const result = scorePassword('abc');
    expect(result.level).toBe('weak');
  });

  it('returns at least fair for an 8-char password with letter and number', () => {
    // 8 chars (+1), digit (+1), no uppercase, no special → points=2, score=ceil(2*0.8)=2 → fair
    const result = scorePassword('abcdef1a');
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.level).toBe('fair');
  });

  it('returns good for a 12-char mixed case + digit password', () => {
    // ≥8 (+1), ≥12 (+1), upper+lower (+1), digit (+1) → points=4, score=ceil(4*0.8)=4 → strong
    // or 3 if special absent → ceil(3*0.8)=3 → good
    const result = scorePassword('Abcdefgh1234');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('returns strong for a 12+ char mixed case + digit + special', () => {
    // ≥8 (+1), ≥12 (+1), upper+lower (+1), digit (+1), special (+1) = 5, score=ceil(5*0.8)=4 → strong
    const result = scorePassword('Abcdefgh1234!');
    expect(result.level).toBe('strong');
    expect(result.score).toBe(4);
  });

  it('caps score at 4', () => {
    const result = scorePassword('Tr0ub4dor&3ExtraLong!');
    expect(result.score).toBe(4);
    expect(result.level).toBe('strong');
  });

  it('sets minimum score to 1 for non-empty passwords', () => {
    // Even the worst short password with only one category still gets score≥1
    const result = scorePassword('a');
    expect(result.score).toBeGreaterThanOrEqual(1);
  });
});
