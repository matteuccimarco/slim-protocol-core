/**
 * SLIM Utility Functions
 */

import type { SlimValue } from './types';

/**
 * Deep equality check for SLIM values.
 *
 * @param a - First value
 * @param b - Second value
 * @returns True if values are deeply equal
 */
export function deepEqual(a: SlimValue, b: SlimValue): boolean {
  // Handle null/undefined
  if (a === null || a === undefined) {
    return a === b;
  }

  // Handle primitives
  if (typeof a !== 'object') {
    // Special case for NaN
    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
    }
    return a === b;
  }

  // Handle arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  // Handle objects
  if (typeof b !== 'object' || b === null || Array.isArray(b)) {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b as Record<string, SlimValue>);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, SlimValue>)[key],
      (b as Record<string, SlimValue>)[key]
    )
  );
}

/**
 * Counts the approximate number of tokens in a string.
 * Uses a simple heuristic (characters / 4) as a rough estimate.
 *
 * @param str - String to count tokens in
 * @returns Approximate token count
 */
export function estimateTokens(str: string): number {
  // Rough estimate: ~4 characters per token on average
  return Math.ceil(str.length / 4);
}

/**
 * Calculates token savings compared to JSON.
 *
 * @param slimStr - SLIM-encoded string
 * @param jsonStr - JSON-encoded string
 * @returns Percentage savings (0-100)
 */
export function calculateSavings(slimStr: string, jsonStr: string): number {
  const slimTokens = estimateTokens(slimStr);
  const jsonTokens = estimateTokens(jsonStr);

  if (jsonTokens === 0) return 0;

  return Math.round(((jsonTokens - slimTokens) / jsonTokens) * 100);
}

/**
 * Pretty prints a SLIM value for debugging.
 *
 * @param value - SLIM value to format
 * @param indent - Current indentation level
 * @returns Formatted string
 */
export function prettyPrint(value: SlimValue, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => prettyPrint(v, indent + 1));
    return '[\n' + pad + '  ' + items.join(',\n' + pad + '  ') + '\n' + pad + ']';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const pairs = entries.map(
      ([k, v]) => `${JSON.stringify(k)}: ${prettyPrint(v, indent + 1)}`
    );
    return '{\n' + pad + '  ' + pairs.join(',\n' + pad + '  ') + '\n' + pad + '}';
  }

  return String(value);
}

/**
 * Clones a SLIM value deeply.
 *
 * @param value - Value to clone
 * @returns Deep clone of the value
 */
export function clone<T extends SlimValue>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(clone) as T;
  }

  const result: Record<string, SlimValue> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = clone(val);
  }
  return result as T;
}

/**
 * Gets a value at a dot-separated path.
 *
 * @param value - Object to traverse
 * @param path - Dot-separated path (e.g., "user.name")
 * @returns Value at path, or undefined if not found
 */
export function getPath(value: SlimValue, path: string): SlimValue {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const parts = path.split('.');
  let current: SlimValue = value;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (Number.isNaN(index)) return undefined;
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, SlimValue>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Sets a value at a dot-separated path, returning a new object.
 *
 * @param obj - Object to modify
 * @param path - Dot-separated path
 * @param value - Value to set
 * @returns New object with the value set
 */
export function setPath(
  obj: SlimValue,
  path: string,
  value: SlimValue
): SlimValue {
  if (typeof obj !== 'object' || obj === null) {
    obj = {};
  }

  const result = clone(obj);
  const parts = path.split('.');
  let current: Record<string, SlimValue> = result as Record<string, SlimValue>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, SlimValue>;
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;

  return result;
}
