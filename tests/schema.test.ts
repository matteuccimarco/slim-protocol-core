/**
 * SLIM Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { inferSchema, parseSchema, validateSchema } from '../src/schema';

describe('inferSchema', () => {
  it('infers empty schema for empty array', () => {
    expect(inferSchema([])).toBe('');
  });

  it('infers number type', () => {
    const schema = inferSchema([{ id: 1 }, { id: 2 }]);
    expect(schema).toBe('id#');
  });

  it('infers string type', () => {
    const schema = inferSchema([{ name: 'Mario' }]);
    expect(schema).toBe('name$');
  });

  it('infers boolean type', () => {
    const schema = inferSchema([{ active: true }]);
    expect(schema).toBe('active?');
  });

  it('infers array type', () => {
    const schema = inferSchema([{ tags: ['a', 'b'] }]);
    expect(schema).toBe('tags@');
  });

  it('infers object type', () => {
    const schema = inferSchema([{ meta: { key: 'value' } }]);
    expect(schema).toBe('meta~');
  });

  it('infers multiple columns', () => {
    const schema = inferSchema([
      { id: 1, name: 'Mario', active: true },
    ]);
    expect(schema).toContain('id#');
    expect(schema).toContain('name$');
    expect(schema).toContain('active?');
  });

  it('marks nullable columns', () => {
    const schema = inferSchema([
      { id: 1, score: 100 },
      { id: 2, score: null },
    ]);
    expect(schema).toContain('score#!');
  });

  it('handles missing values as nullable', () => {
    const schema = inferSchema([
      { id: 1, optional: 'present' },
      { id: 2 },
    ]);
    expect(schema).toContain('optional$!');
  });
});

describe('parseSchema', () => {
  it('parses empty schema', () => {
    expect(parseSchema('')).toEqual([]);
  });

  it('parses number column', () => {
    const cols = parseSchema('id#');
    expect(cols).toEqual([{ name: 'id', type: '#', nullable: false }]);
  });

  it('parses string column', () => {
    const cols = parseSchema('name$');
    expect(cols).toEqual([{ name: 'name', type: '$', nullable: false }]);
  });

  it('parses boolean column', () => {
    const cols = parseSchema('active?');
    expect(cols).toEqual([{ name: 'active', type: '?', nullable: false }]);
  });

  it('parses nullable column', () => {
    const cols = parseSchema('score#!');
    expect(cols).toEqual([{ name: 'score', type: '#', nullable: true }]);
  });

  it('parses multiple columns', () => {
    const cols = parseSchema('id#,name$,active?');
    expect(cols.length).toBe(3);
    expect(cols[0]).toEqual({ name: 'id', type: '#', nullable: false });
    expect(cols[1]).toEqual({ name: 'name', type: '$', nullable: false });
    expect(cols[2]).toEqual({ name: 'active', type: '?', nullable: false });
  });

  it('defaults to string type', () => {
    const cols = parseSchema('bare');
    expect(cols).toEqual([{ name: 'bare', type: '$', nullable: false }]);
  });
});

describe('validateSchema', () => {
  it('validates valid data', () => {
    const result = validateSchema(
      [{ id: 1, name: 'Mario' }],
      'id#,name$'
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('detects missing required field', () => {
    const result = validateSchema(
      [{ id: 1 }],
      'id#,name$'
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.path.includes('name'))).toBe(true);
  });

  it('allows null for nullable fields', () => {
    const result = validateSchema(
      [{ id: 1, score: null }],
      'id#,score#!'
    );
    expect(result.valid).toBe(true);
  });

  it('detects type mismatch', () => {
    const result = validateSchema(
      [{ id: 'not a number' }],
      'id#'
    );
    expect(result.valid).toBe(false);
    expect(result.errors!.some(e => e.message.includes('Type mismatch'))).toBe(true);
  });

  it('validates single object', () => {
    const result = validateSchema(
      { id: 1, name: 'Mario' },
      'id#,name$'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    const result = validateSchema('string', 'id#');
    expect(result.valid).toBe(false);
  });

  it('validates array column', () => {
    const result = validateSchema(
      [{ tags: ['a', 'b'] }],
      'tags@'
    );
    expect(result.valid).toBe(true);
  });

  it('validates object column', () => {
    const result = validateSchema(
      [{ meta: { key: 'value' } }],
      'meta~'
    );
    expect(result.valid).toBe(true);
  });
});
