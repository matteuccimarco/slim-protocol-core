/**
 * SLIM Encoder Tests
 */

import { describe, it, expect } from 'vitest';
import { encode } from '../src/encoder';

describe('encode', () => {
  describe('primitives', () => {
    it('encodes null', () => {
      expect(encode(null)).toBe('!null');
    });

    it('encodes undefined', () => {
      expect(encode(undefined)).toBe('!undef');
    });

    it('encodes boolean true', () => {
      expect(encode(true)).toBe('?T');
    });

    it('encodes boolean false', () => {
      expect(encode(false)).toBe('?F');
    });

    it('encodes integers', () => {
      expect(encode(42)).toBe('#42');
      expect(encode(0)).toBe('#0');
      expect(encode(-99)).toBe('#-99');
    });

    it('encodes floats', () => {
      expect(encode(3.14)).toBe('#3.14');
      expect(encode(-0.5)).toBe('#-0.5');
    });

    it('encodes special numbers', () => {
      expect(encode(NaN)).toBe('#NaN');
      expect(encode(Infinity)).toBe('#Inf');
      expect(encode(-Infinity)).toBe('#-Inf');
    });
  });

  describe('strings', () => {
    it('encodes simple strings unquoted', () => {
      expect(encode('hello')).toBe('hello');
      expect(encode('world')).toBe('world');
    });

    it('encodes empty string', () => {
      expect(encode('')).toBe('""');
    });

    it('quotes strings with commas', () => {
      expect(encode('hello, world')).toBe('"hello, world"');
    });

    it('quotes strings with semicolons', () => {
      expect(encode('a;b')).toBe('"a;b"');
    });

    it('quotes strings with newlines', () => {
      expect(encode('line1\nline2')).toBe('"line1\\nline2"');
    });

    it('escapes quotes in strings', () => {
      expect(encode('say "hi"')).toBe('"say ""hi"""');
    });

    it('handles unicode', () => {
      expect(encode('Hello 🌍')).toBe('Hello 🌍');
      expect(encode('中文')).toBe('中文');
    });
  });

  describe('arrays', () => {
    it('encodes empty array', () => {
      expect(encode([])).toBe('@[]');
    });

    it('encodes numeric array', () => {
      expect(encode([1, 2, 3])).toBe('@#[1,2,3]');
    });

    it('encodes simple string array', () => {
      expect(encode(['a', 'b', 'c'])).toBe('@[a,b,c]');
    });

    it('encodes mixed array', () => {
      expect(encode([1, 'hello', true])).toBe('@[#1;hello;?T]');
    });

    it('encodes nested array', () => {
      expect(encode([[1, 2], [3, 4]])).toBe('*[1,2;3,4]');
    });
  });

  describe('matrices', () => {
    it('encodes 2x2 matrix', () => {
      expect(encode([[1, 2], [3, 4]])).toBe('*[1,2;3,4]');
    });

    it('encodes 3x3 matrix', () => {
      expect(encode([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toBe('*[1,2,3;4,5,6;7,8,9]');
    });

    it('handles float matrices', () => {
      expect(encode([[0.5, 0.5], [0.5, 0.5]])).toBe('*[0.5,0.5;0.5,0.5]');
    });
  });

  describe('objects', () => {
    it('encodes empty object', () => {
      expect(encode({})).toBe('{}');
    });

    it('encodes simple object', () => {
      expect(encode({ name: 'Mario' })).toBe('{name:Mario}');
    });

    it('encodes object with number', () => {
      expect(encode({ age: 30 })).toBe('{age:#30}');
    });

    it('encodes object with boolean', () => {
      expect(encode({ active: true })).toBe('{active:?T}');
    });

    it('encodes nested object', () => {
      expect(encode({ user: { name: 'Mario' } })).toBe('{user:{name:Mario}}');
    });

    it('encodes object with multiple fields', () => {
      const result = encode({ name: 'Mario', age: 30 });
      expect(result).toBe('{name:Mario,age:#30}');
    });
  });

  describe('tables', () => {
    it('encodes array of objects as table', () => {
      const data = [
        { id: 1, name: 'Mario', active: true },
        { id: 2, name: 'Luigi', active: false },
      ];
      const result = encode(data);
      expect(result).toContain('|2|');
      expect(result).toContain('id#');
      expect(result).toContain('name$');
      expect(result).toContain('active?');
      expect(result).toContain('1,Mario,T');
      expect(result).toContain('2,Luigi,F');
    });

    it('encodes table with nullable columns', () => {
      const data = [
        { id: 1, score: 100 },
        { id: 2, score: null },
        { id: 3, score: 200 },
      ];
      const result = encode(data);
      expect(result).toContain('score#!');
    });

    it('encodes table with array columns', () => {
      const data = [
        { id: 1, tags: ['a', 'b'] },
        { id: 2, tags: ['x', 'y', 'z'] },
      ];
      const result = encode(data);
      expect(result).toContain('tags@');
      expect(result).toContain('a+b');
      expect(result).toContain('x+y+z');
    });

    it('encodes table with nested object columns', () => {
      const data = [
        { id: 1, meta: { role: 'admin' } },
        { id: 2, meta: { role: 'user' } },
      ];
      const result = encode(data);
      expect(result).toContain('meta~');
      expect(result).toContain('{role:admin}');
      expect(result).toContain('{role:user}');
    });
  });

  describe('edge cases', () => {
    it('handles max depth', () => {
      const deep: any = { a: {} };
      let current = deep.a;
      for (let i = 0; i < 20; i++) {
        current.nested = {};
        current = current.nested;
      }
      const result = encode(deep, { maxDepth: 5 });
      expect(result).toContain('!DEEP');
    });

    it('handles object in object with array of objects', () => {
      const data = {
        users: [
          { id: 1, name: 'Mario' },
          { id: 2, name: 'Luigi' },
        ],
      };
      const result = encode(data);
      expect(result).toContain('{users:');
      expect(result).toContain('|2|');
    });
  });
});
