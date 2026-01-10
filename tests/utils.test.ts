/**
 * SLIM Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  deepEqual,
  estimateTokens,
  calculateSavings,
  prettyPrint,
  clone,
  getPath,
  setPath,
} from '../src/utils';

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it('handles NaN', () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it('compares arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([[1], [2]], [[1], [2]])).toBe(true);
  });

  it('compares objects', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });

  it('handles mixed types', () => {
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });
});

describe('estimateTokens', () => {
  it('estimates token count', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('test')).toBe(1);
    expect(estimateTokens('hello world')).toBe(3);
  });
});

describe('calculateSavings', () => {
  it('calculates percentage savings', () => {
    expect(calculateSavings('slim', 'jsonjson')).toBe(50); // 1 vs 2 tokens
  });

  it('handles empty json', () => {
    expect(calculateSavings('a', '')).toBe(0);
  });
});

describe('prettyPrint', () => {
  it('formats primitives', () => {
    expect(prettyPrint(null)).toBe('null');
    expect(prettyPrint(42)).toBe('42');
    expect(prettyPrint('test')).toBe('"test"');
  });

  it('formats arrays', () => {
    const result = prettyPrint([1, 2]);
    expect(result).toContain('1');
    expect(result).toContain('2');
  });

  it('formats objects', () => {
    const result = prettyPrint({ a: 1 });
    expect(result).toContain('"a"');
    expect(result).toContain('1');
  });
});

describe('clone', () => {
  it('clones primitives', () => {
    expect(clone(42)).toBe(42);
    expect(clone('test')).toBe('test');
    expect(clone(null)).toBe(null);
  });

  it('clones arrays', () => {
    const arr = [1, 2, 3];
    const cloned = clone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  it('clones objects deeply', () => {
    const obj = { a: { b: 1 } };
    const cloned = clone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.a).not.toBe(obj.a);
  });
});

describe('getPath', () => {
  it('gets simple paths', () => {
    expect(getPath({ a: 1 }, 'a')).toBe(1);
  });

  it('gets nested paths', () => {
    expect(getPath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
  });

  it('gets array indices', () => {
    expect(getPath({ arr: [1, 2, 3] }, 'arr.1')).toBe(2);
  });

  it('returns undefined for missing paths', () => {
    expect(getPath({ a: 1 }, 'b')).toBe(undefined);
    expect(getPath({ a: 1 }, 'a.b')).toBe(undefined);
  });

  it('handles non-objects', () => {
    expect(getPath(null, 'a')).toBe(undefined);
    expect(getPath(42, 'a')).toBe(undefined);
  });
});

describe('setPath', () => {
  it('sets simple paths', () => {
    const result = setPath({ a: 1 }, 'a', 2);
    expect(result).toEqual({ a: 2 });
  });

  it('sets nested paths', () => {
    const result = setPath({ a: { b: 1 } }, 'a.b', 2);
    expect(result).toEqual({ a: { b: 2 } });
  });

  it('creates missing paths', () => {
    const result = setPath({}, 'a.b.c', 1);
    expect(result).toEqual({ a: { b: { c: 1 } } });
  });

  it('does not mutate original', () => {
    const original = { a: 1 };
    const result = setPath(original, 'a', 2);
    expect(original.a).toBe(1);
    expect(result).toEqual({ a: 2 });
  });
});
