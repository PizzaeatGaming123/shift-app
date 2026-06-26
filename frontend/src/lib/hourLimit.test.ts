import { describe, it, expect } from 'vitest';
import { hourLimitLevel } from './hourLimit';

describe('hourLimitLevel', () => {
  it('limit が null なら none', () => {
    expect(hourLimitLevel(100, null)).toBe('none');
  });
  it('limit が undefined なら none', () => {
    expect(hourLimitLevel(100, undefined)).toBe('none');
  });
  it('limit が 0 以下なら none', () => {
    expect(hourLimitLevel(50, 0)).toBe('none');
  });
  it('80% 未満は normal', () => {
    expect(hourLimitLevel(60, 100)).toBe('normal');
    expect(hourLimitLevel(0, 100)).toBe('normal');
    expect(hourLimitLevel(79, 100)).toBe('normal');
  });
  it('80-95% は soft', () => {
    expect(hourLimitLevel(80, 100)).toBe('soft');
    expect(hourLimitLevel(85, 100)).toBe('soft');
    expect(hourLimitLevel(94, 100)).toBe('soft');
  });
  it('95-100% は medium', () => {
    expect(hourLimitLevel(95, 100)).toBe('medium');
    expect(hourLimitLevel(96, 100)).toBe('medium');
    expect(hourLimitLevel(100, 100)).toBe('medium');
  });
  it('100% 超は hard', () => {
    expect(hourLimitLevel(101, 100)).toBe('hard');
    expect(hourLimitLevel(150, 100)).toBe('hard');
  });
});
