/**
 * SLIM Encoder
 *
 * Converts JavaScript values to SLIM format.
 */

import type { SlimValue, EncodeOptions } from './types';
import {
  SLIM_NULL,
  SLIM_UNDEFINED,
  SLIM_DEEP,
  SLIM_TRUE,
  SLIM_FALSE,
  SLIM_NAN,
  SLIM_INF,
  SLIM_NEG_INF,
  STRUCTURAL_CHARS,
  KEY_SPECIAL_CHARS,
} from './types';

/**
 * Default encoding options
 */
const DEFAULT_OPTIONS: Required<EncodeOptions> = {
  maxDepth: 15,
  tableThreshold: 1,
  pretty: false,
};

/**
 * Encodes a JavaScript value to SLIM format.
 *
 * @param data - The value to encode
 * @param options - Encoding options
 * @returns SLIM-encoded string
 *
 * @example
 * ```typescript
 * encode({ name: 'Mario', age: 30 });
 * // Returns: {name:Mario,age:#30}
 *
 * encode([{ id: 1, active: true }, { id: 2, active: false }]);
 * // Returns: |2|id#,active?|
 * // 1,T
 * // 2,F
 * ```
 */
export function encode(data: unknown, options: EncodeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return encodeValue(data as SlimValue, 0, opts);
}

/**
 * Internal recursive encoder
 */
function encodeValue(
  data: SlimValue,
  depth: number,
  opts: Required<EncodeOptions>
): string {
  // Depth check
  if (depth > opts.maxDepth) {
    return SLIM_DEEP;
  }

  // Null / undefined
  if (data === null) return SLIM_NULL;
  if (data === undefined) return SLIM_UNDEFINED;

  // Boolean
  if (typeof data === 'boolean') {
    return data ? SLIM_TRUE : SLIM_FALSE;
  }

  // Number
  if (typeof data === 'number') {
    return encodeNumber(data);
  }

  // String
  if (typeof data === 'string') {
    return encodeString(data);
  }

  // Array
  if (Array.isArray(data)) {
    return encodeArray(data, depth, opts);
  }

  // Object
  if (typeof data === 'object') {
    return encodeObject(data as Record<string, SlimValue>, depth, opts);
  }

  // Fallback
  return String(data);
}

/**
 * Encode a number
 */
function encodeNumber(num: number): string {
  if (Number.isNaN(num)) return SLIM_NAN;
  if (!Number.isFinite(num)) return num > 0 ? SLIM_INF : SLIM_NEG_INF;
  return '#' + String(num);
}

/**
 * Encode a string, quoting if necessary
 */
function encodeString(str: string): string {
  if (str === '') return '""';

  // Check if quoting is needed:
  // - Contains structural characters
  // - Has leading/trailing whitespace (would be trimmed by decoder)
  const needsQuoting =
    STRUCTURAL_CHARS.test(str) ||
    str !== str.trim();

  if (needsQuoting) {
    // Escape quotes and newlines inside
    const escaped = str
      .replace(/"/g, '""')
      .replace(/\n/g, '\\n');
    return '"' + escaped + '"';
  }

  return str;
}

/**
 * Encode an array
 */
function encodeArray(
  arr: SlimValue[],
  depth: number,
  opts: Required<EncodeOptions>
): string {
  // Empty array
  if (arr.length === 0) return '@[]';

  // Check if it's a 2D numeric matrix
  if (isMatrix(arr)) {
    return encodeMatrix(arr as number[][]);
  }

  // Check if all numbers
  if (arr.every((v) => typeof v === 'number')) {
    return '@#[' + (arr as number[]).join(',') + ']';
  }

  // Check if all simple strings (no commas/semicolons)
  if (arr.every((v) => typeof v === 'string' && !/[,;[\]]/.test(v))) {
    return '@[' + arr.join(',') + ']';
  }

  // Check if array of objects -> use table format
  if (
    arr.length >= opts.tableThreshold &&
    arr.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v))
  ) {
    return encodeTable(arr as Record<string, SlimValue>[], depth, opts);
  }

  // Generic array with semicolon separators
  const items = arr.map((v) => encodeValue(v, depth + 1, opts));
  return '@[' + items.join(';') + ']';
}

/**
 * Check if array is a 2D numeric matrix
 */
function isMatrix(arr: SlimValue[]): arr is number[][] {
  return arr.every(
    (row) =>
      Array.isArray(row) && row.every((v) => typeof v === 'number')
  );
}

/**
 * Encode a 2D numeric matrix
 */
function encodeMatrix(matrix: number[][]): string {
  const rows = matrix.map((row) => row.join(','));
  return '*[' + rows.join(';') + ']';
}

/**
 * Encode an object
 */
function encodeObject(
  obj: Record<string, SlimValue>,
  depth: number,
  opts: Required<EncodeOptions>
): string {
  const entries = Object.entries(obj);

  if (entries.length === 0) return '{}';

  const parts = entries.map(([key, value]) => {
    // Escape key if needed
    const safeKey = KEY_SPECIAL_CHARS.test(key)
      ? '"' + key.replace(/"/g, '""') + '"'
      : key;

    // Check if value is array of objects -> inline table
    if (
      Array.isArray(value) &&
      value.length >= opts.tableThreshold &&
      value.every((x) => typeof x === 'object' && x !== null && !Array.isArray(x))
    ) {
      return safeKey + ':' + encodeTable(value as Record<string, SlimValue>[], depth + 1, opts);
    }

    return safeKey + ':' + encodeValue(value, depth + 1, opts);
  });

  return '{' + parts.join(',') + '}';
}

/**
 * Encode an array of objects as a SLIM table
 */
function encodeTable(
  rows: Record<string, SlimValue>[],
  depth: number,
  opts: Required<EncodeOptions>
): string {
  // Collect all unique keys
  const keys = [...new Set(rows.flatMap((obj) => Object.keys(obj)))];

  // Determine column types
  const colTypes: Record<string, string> = {};

  for (const key of keys) {
    const values = rows
      .map((r) => r[key])
      .filter((v) => v !== undefined && v !== null);

    if (values.length === 0) {
      colTypes[key] = '!';
    } else if (values.every((v) => typeof v === 'boolean')) {
      colTypes[key] = '?';
    } else if (values.every((v) => typeof v === 'number')) {
      colTypes[key] = '#';
    } else if (values.every((v) => Array.isArray(v))) {
      colTypes[key] = '@';
    } else if (
      values.every((v) => typeof v === 'object' && !Array.isArray(v))
    ) {
      colTypes[key] = '~';
    } else {
      colTypes[key] = '$';
    }

    // Mark nullable if any null/undefined
    if (rows.some((r) => r[key] === undefined || r[key] === null)) {
      colTypes[key] += '!';
    }
  }

  // Build schema
  const schema = keys.map((k) => k + colTypes[k]).join(',');

  // Build data rows
  const dataRows = rows.map((obj) => {
    return keys
      .map((k) => {
        const v = obj[k];
        const type = colTypes[k];

        if (v === undefined || v === null) return '';

        if (type?.startsWith('?')) return v ? 'T' : 'F';
        if (type?.startsWith('#')) return String(v);
        if (type?.startsWith('@')) {
          return encodeInlineArray(v as SlimValue[]);
        }
        if (type?.startsWith('~')) {
          return encodeValue(v, depth + 1, opts);
        }

        // String
        if (typeof v === 'string') {
          if (v === '') return '""';
          if (/[,\n|"]/.test(v)) {
            return '"' + v.replace(/"/g, '""').replace(/\n/g, '\\n') + '"';
          }
        }

        return String(v);
      })
      .join(',');
  });

  return `|${rows.length}|${schema}|\n${dataRows.join('\n')}`;
}

/**
 * Encode an array for use in a table cell (+ separator)
 */
function encodeInlineArray(arr: SlimValue[]): string {
  if (arr.length === 0) return '[]';

  // Numbers
  if (arr.every((x) => typeof x === 'number')) {
    return arr.join('+');
  }

  // Strings (quote if contains +)
  return arr
    .map((x) => {
      const s = String(x);
      if (/[+,]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join('+');
}
