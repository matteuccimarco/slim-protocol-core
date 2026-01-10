/**
 * SLIM Stream Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createEncoder,
  createDecoder,
  encodeStream,
  decodeStream,
  encodeChunked,
  collect,
} from '../src/stream';
import { decode } from '../src/decoder';
import { deepEqual } from '../src/utils';

describe('createEncoder', () => {
  it('creates encoder with empty buffer', () => {
    const encoder = createEncoder();
    expect(encoder.size()).toBe(0);
  });

  it('adds objects to buffer', () => {
    const encoder = createEncoder();
    encoder.write({ id: 1 });
    encoder.write({ id: 2 });
    expect(encoder.size()).toBe(2);
  });

  it('encodes empty buffer as empty array', () => {
    const encoder = createEncoder();
    expect(encoder.end()).toBe('@[]');
  });

  it('encodes objects as table', () => {
    const encoder = createEncoder();
    encoder.write({ id: 1, name: 'Mario' });
    encoder.write({ id: 2, name: 'Luigi' });
    const result = encoder.end();
    expect(result).toContain('|2|');
    expect(result).toContain('id#');
    expect(result).toContain('name$');
  });
});

describe('createDecoder', () => {
  it('creates decoder with empty buffer', () => {
    const decoder = createDecoder();
    expect(decoder.hasPending()).toBe(false);
  });

  it('accepts chunks', () => {
    const decoder = createDecoder();
    decoder.write('{na');
    decoder.write('me:Mario}');
    expect(decoder.hasPending()).toBe(true);
  });

  it('decodes complete input', () => {
    const decoder = createDecoder();
    decoder.write('{name:Mario}');
    const result = decoder.end();
    expect(result).toEqual({ name: 'Mario' });
  });

  it('handles empty input', () => {
    const decoder = createDecoder();
    expect(decoder.end()).toBe(undefined);
  });
});

describe('encodeStream', () => {
  it('encodes async iterable', async () => {
    async function* generate() {
      yield { id: 1, name: 'Mario' };
      yield { id: 2, name: 'Luigi' };
    }

    const result = await encodeStream(generate());
    expect(result).toContain('|2|');
  });

  it('handles empty iterable', async () => {
    async function* generate() {
      // empty
    }

    const result = await encodeStream(generate());
    expect(result).toBe('@[]');
  });
});

describe('decodeStream', () => {
  it('yields objects from table', async () => {
    const slim = '|2|id#,name$|\n1,Mario\n2,Luigi';
    const objects = await collect(decodeStream(slim));

    expect(objects.length).toBe(2);
    expect(objects[0]).toEqual({ id: 1, name: 'Mario' });
    expect(objects[1]).toEqual({ id: 2, name: 'Luigi' });
  });

  it('yields single object', async () => {
    const slim = '{id:#1,name:Mario}';
    const objects = await collect(decodeStream(slim));

    expect(objects.length).toBe(1);
    expect(objects[0]).toEqual({ id: 1, name: 'Mario' });
  });

  it('handles non-object values gracefully', async () => {
    const slim = '@#[1,2,3]';
    const objects = await collect(decodeStream(slim));
    expect(objects.length).toBe(0);
  });
});

describe('encodeChunked', () => {
  it('splits array into chunks', () => {
    const objects = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
    ];

    const chunks = [...encodeChunked(objects, 2)];
    expect(chunks.length).toBe(3); // 2 + 2 + 1

    const chunk1 = decode(chunks[0]) as any[];
    expect(chunk1.length).toBe(2);

    const chunk2 = decode(chunks[1]) as any[];
    expect(chunk2.length).toBe(2);

    const chunk3 = decode(chunks[2]) as any[];
    expect(chunk3.length).toBe(1);
  });

  it('handles exact divisible size', () => {
    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const chunks = [...encodeChunked(objects, 2)];
    expect(chunks.length).toBe(2);
  });

  it('handles chunk size larger than array', () => {
    const objects = [{ id: 1 }, { id: 2 }];
    const chunks = [...encodeChunked(objects, 10)];
    expect(chunks.length).toBe(1);
  });
});

describe('collect', () => {
  it('collects async iterable into array', async () => {
    async function* generate() {
      yield 1;
      yield 2;
      yield 3;
    }

    const result = await collect(generate());
    expect(result).toEqual([1, 2, 3]);
  });

  it('handles empty iterable', async () => {
    async function* generate() {
      // empty
    }

    const result = await collect(generate());
    expect(result).toEqual([]);
  });
});

describe('roundtrip streaming', () => {
  it('encodeStream -> decodeStream roundtrip', async () => {
    const original = [
      { id: 1, name: 'Mario', active: true },
      { id: 2, name: 'Luigi', active: false },
    ];

    async function* generate() {
      for (const item of original) {
        yield item;
      }
    }

    const slim = await encodeStream(generate());
    const decoded = await collect(decodeStream(slim));

    expect(decoded.length).toBe(original.length);
    expect(deepEqual(decoded, original)).toBe(true);
  });
});
