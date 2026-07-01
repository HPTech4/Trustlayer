import { describe, expect, it } from 'vitest';
import { deriveFactors, parseExplanation, scoreLabel, verdictText } from './result-analysis';

describe('result-analysis helpers', () => {
  it('parses raw explanation text into structured flags', () => {
    const parsed = parseExplanation('This is a shell company in an offshore jurisdiction with no prior history.');

    expect(parsed.summary).toContain('This');
    expect(parsed.flags.some((flag) => flag.label === 'Shell / offshore entity')).toBe(true);
    expect(parsed.flags.some((flag) => flag.label === 'No transaction history')).toBe(true);
  });

  it('derives factors from a risk narrative', () => {
    const factors = deriveFactors('A new client with no prior history and no registration.', 42);

    expect(factors).toHaveLength(5);
    expect(factors[0].label).toBe('Entity age');
    expect(factors[3].label).toBe('Relationship history');
    expect(factors.every((factor) => typeof factor.score === 'number')).toBe(true);
  });

  it('maps scores and risk levels into readable labels', () => {
    expect(scoreLabel(85)).toBe('High trust');
    expect(verdictText('high').headline).toContain('Serious');
  });
});
