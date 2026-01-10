/**
 * SLIM Decoder Tests
 */

import { describe, it, expect } from 'vitest';
import { decode } from '../src/decoder';

describe('decode', () => {
  describe('primitives', () => {
    it('decodes null', () => {
      expect(decode('!null')).toBe(null);
    });

    it('decodes undefined', () => {
      expect(decode('!undef')).toBe(undefined);
    });

    it('decodes !DEEP as null', () => {
      expect(decode('!DEEP')).toBe(null);
    });

    it('decodes boolean true', () => {
      expect(decode('?T')).toBe(true);
    });

    it('decodes boolean false', () => {
      expect(decode('?F')).toBe(false);
    });

    it('decodes integers', () => {
      expect(decode('#42')).toBe(42);
      expect(decode('#0')).toBe(0);
      expect(decode('#-99')).toBe(-99);
    });

    it('decodes floats', () => {
      expect(decode('#3.14')).toBe(3.14);
      expect(decode('#-0.5')).toBe(-0.5);
    });

    it('decodes special numbers', () => {
      expect(decode('#NaN')).toBeNaN();
      expect(decode('#Inf')).toBe(Infinity);
      expect(decode('#-Inf')).toBe(-Infinity);
    });
  });

  describe('strings', () => {
    it('decodes unquoted strings', () => {
      expect(decode('hello')).toBe('hello');
      expect(decode('world')).toBe('world');
    });

    it('decodes empty string', () => {
      expect(decode('""')).toBe('');
    });

    it('decodes quoted strings with commas', () => {
      expect(decode('"hello, world"')).toBe('hello, world');
    });

    it('decodes quoted strings with newlines', () => {
      expect(decode('"line1\\nline2"')).toBe('line1\nline2');
    });

    it('decodes escaped quotes', () => {
      expect(decode('"say ""hi"""')).toBe('say "hi"');
    });

    it('handles unicode', () => {
      expect(decode('Hello 🌍')).toBe('Hello 🌍');
      expect(decode('中文')).toBe('中文');
    });
  });

  describe('arrays', () => {
    it('decodes empty array', () => {
      expect(decode('@[]')).toEqual([]);
    });

    it('decodes numeric array', () => {
      expect(decode('@#[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('decodes simple string array', () => {
      expect(decode('@[a,b,c]')).toEqual(['a', 'b', 'c']);
    });

    it('decodes mixed array', () => {
      expect(decode('@[#1;hello;?T]')).toEqual([1, 'hello', true]);
    });
  });

  describe('matrices', () => {
    it('decodes 2x2 matrix', () => {
      expect(decode('*[1,2;3,4]')).toEqual([[1, 2], [3, 4]]);
    });

    it('decodes 3x3 matrix', () => {
      expect(decode('*[1,2,3;4,5,6;7,8,9]')).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]);
    });

    it('decodes float matrices', () => {
      expect(decode('*[0.5,0.5;0.5,0.5]')).toEqual([
        [0.5, 0.5],
        [0.5, 0.5],
      ]);
    });
  });

  describe('objects', () => {
    it('decodes empty object', () => {
      expect(decode('{}')).toEqual({});
    });

    it('decodes simple object', () => {
      expect(decode('{name:Mario}')).toEqual({ name: 'Mario' });
    });

    it('decodes object with number', () => {
      expect(decode('{age:#30}')).toEqual({ age: 30 });
    });

    it('decodes object with boolean', () => {
      expect(decode('{active:?T}')).toEqual({ active: true });
    });

    it('decodes nested object', () => {
      expect(decode('{user:{name:Mario}}')).toEqual({
        user: { name: 'Mario' },
      });
    });

    it('decodes object with multiple fields', () => {
      expect(decode('{name:Mario,age:#30}')).toEqual({
        name: 'Mario',
        age: 30,
      });
    });
  });

  describe('tables', () => {
    it('decodes simple table', () => {
      const slim = '|2|id#,name$|\n1,Mario\n2,Luigi';
      expect(decode(slim)).toEqual([
        { id: 1, name: 'Mario' },
        { id: 2, name: 'Luigi' },
      ]);
    });

    it('decodes table with booleans', () => {
      const slim = '|2|id#,active?|\n1,T\n2,F';
      expect(decode(slim)).toEqual([
        { id: 1, active: true },
        { id: 2, active: false },
      ]);
    });

    it('decodes table with nullable columns', () => {
      const slim = '|3|id#,score#!|\n1,100\n2,\n3,200';
      const result = decode(slim) as any[];
      expect(result[0]).toEqual({ id: 1, score: 100 });
      expect(result[1]).toEqual({ id: 2, score: null });
      expect(result[2]).toEqual({ id: 3, score: 200 });
    });

    it('decodes table with array columns', () => {
      const slim = '|2|id#,tags@|\n1,a+b\n2,x+y+z';
      expect(decode(slim)).toEqual([
        { id: 1, tags: ['a', 'b'] },
        { id: 2, tags: ['x', 'y', 'z'] },
      ]);
    });

    it('decodes table with numeric arrays', () => {
      const slim = '|2|id#,values@|\n1,1+2+3\n2,4+5';
      expect(decode(slim)).toEqual([
        { id: 1, values: [1, 2, 3] },
        { id: 2, values: [4, 5] },
      ]);
    });

    it('decodes table with nested objects', () => {
      const slim = '|2|id#,meta~|\n1,{role:admin}\n2,{role:user}';
      expect(decode(slim)).toEqual([
        { id: 1, meta: { role: 'admin' } },
        { id: 2, meta: { role: 'user' } },
      ]);
    });

    it('decodes table with quoted strings', () => {
      const slim = '|2|id#,message$|\n1,"Hello, World!"\n2,"Line1\\nLine2"';
      expect(decode(slim)).toEqual([
        { id: 1, message: 'Hello, World!' },
        { id: 2, message: 'Line1\nLine2' },
      ]);
    });
  });

  describe('complex structures', () => {
    it('decodes object containing table', () => {
      const slim = '{users:|2|id#,name$|\n1,Mario\n2,Luigi}';
      const result = decode(slim) as any;
      expect(result.users).toEqual([
        { id: 1, name: 'Mario' },
        { id: 2, name: 'Luigi' },
      ]);
    });
  });
});
