/**
 * SLIM Streaming API
 *
 * Provides streaming/async utilities for handling large data sets.
 * These are framework-agnostic and work in both Node.js and browsers.
 */

import { encode } from './encoder';
import { decode } from './decoder';
import type { EncodeOptions, DecodeOptions, SlimValue, SlimObject } from './types';

/**
 * Encoder class for building SLIM output incrementally.
 *
 * @example
 * ```typescript
 * const encoder = createEncoder();
 * encoder.write({ id: 1, name: 'Mario' });
 * encoder.write({ id: 2, name: 'Luigi' });
 * const slim = encoder.end();
 * ```
 */
export interface SlimEncoder {
  /** Add an object to be encoded */
  write(obj: SlimObject): void;
  /** Finalize and return the SLIM string */
  end(): string;
  /** Get current buffer size */
  size(): number;
}

/**
 * Creates an incremental encoder for building SLIM tables.
 *
 * @param options - Encoding options
 * @returns Encoder instance
 */
export function createEncoder(options: EncodeOptions = {}): SlimEncoder {
  const buffer: SlimObject[] = [];

  return {
    write(obj: SlimObject): void {
      buffer.push(obj);
    },

    end(): string {
      if (buffer.length === 0) return '@[]';
      return encode(buffer, options);
    },

    size(): number {
      return buffer.length;
    },
  };
}

/**
 * Decoder class for parsing SLIM input incrementally.
 */
export interface SlimDecoder {
  /** Add SLIM string chunk */
  write(chunk: string): void;
  /** Finalize and return parsed value */
  end(): SlimValue;
  /** Check if decoder has pending data */
  hasPending(): boolean;
}

/**
 * Creates an incremental decoder for parsing SLIM.
 *
 * @param options - Decoding options
 * @returns Decoder instance
 */
export function createDecoder(options: DecodeOptions = {}): SlimDecoder {
  let buffer = '';

  return {
    write(chunk: string): void {
      buffer += chunk;
    },

    end(): SlimValue {
      if (!buffer.trim()) return undefined;
      return decode(buffer, options);
    },

    hasPending(): boolean {
      return buffer.trim().length > 0;
    },
  };
}

/**
 * Encodes an async iterable of objects to a single SLIM table.
 *
 * @param objects - Async iterable of objects
 * @param options - Encoding options
 * @returns Promise resolving to SLIM-encoded string
 *
 * @example
 * ```typescript
 * async function* generateUsers() {
 *   for (let i = 0; i < 1000; i++) {
 *     yield { id: i, name: `User ${i}` };
 *   }
 * }
 *
 * const slim = await encodeStream(generateUsers());
 * ```
 */
export async function encodeStream(
  objects: AsyncIterable<SlimObject>,
  options: EncodeOptions = {}
): Promise<string> {
  const buffer: SlimObject[] = [];

  for await (const obj of objects) {
    buffer.push(obj);
  }

  if (buffer.length === 0) return '@[]';
  return encode(buffer, options);
}

/**
 * Decodes a SLIM table and yields objects one at a time.
 *
 * @param slim - SLIM string containing a table or array
 * @param options - Decoding options
 * @yields Individual objects from the table
 *
 * @example
 * ```typescript
 * const slim = '|100|id#,name$|...';
 *
 * for await (const user of decodeStream(slim)) {
 *   console.log(user.name);
 * }
 * ```
 */
export async function* decodeStream(
  slim: string,
  options: DecodeOptions = {}
): AsyncGenerator<SlimObject> {
  const data = decode(slim, options);

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        yield item as SlimObject;
      }
    }
  } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    yield data as SlimObject;
  }
}

/**
 * Encodes an array of objects in chunks for memory efficiency.
 *
 * @param objects - Array of objects to encode
 * @param chunkSize - Maximum objects per chunk
 * @param options - Encoding options
 * @yields SLIM-encoded chunks
 *
 * @example
 * ```typescript
 * const users = [...]; // 10,000 users
 *
 * for (const chunk of encodeChunked(users, 1000)) {
 *   await saveToFile(chunk);
 * }
 * ```
 */
export function* encodeChunked(
  objects: SlimObject[],
  chunkSize: number,
  options: EncodeOptions = {}
): Generator<string> {
  for (let i = 0; i < objects.length; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);
    yield encode(chunk, options);
  }
}

/**
 * Collects an async iterable into an array.
 *
 * @param iterable - Async iterable to collect
 * @returns Promise resolving to array of all items
 */
export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}
