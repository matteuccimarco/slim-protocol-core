/**
 * SLIM Schema Utilities
 *
 * Functions for inferring, parsing, and validating SLIM schemas.
 */

import type {
  SlimValue,
  ColumnDef,
  ValidationResult,
  ValidationError,
} from './types';

/**
 * Infers a SLIM schema from an array of objects.
 *
 * @param data - Array of objects to infer schema from
 * @returns Schema string (e.g., "id#,name$,active?")
 *
 * @example
 * ```typescript
 * inferSchema([{ id: 1, name: 'Mario', active: true }]);
 * // Returns: 'id#,name$,active?'
 * ```
 */
export function inferSchema(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  // Collect all unique keys
  const keys = [...new Set(data.flatMap((obj) => Object.keys(obj)))];

  // Determine types
  const colTypes: Record<string, string> = {};

  for (const key of keys) {
    const values = data
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

    // Mark nullable
    if (data.some((r) => r[key] === undefined || r[key] === null)) {
      colTypes[key] += '!';
    }
  }

  return keys.map((k) => k + colTypes[k]).join(',');
}

/**
 * Parses a schema string into column definitions.
 *
 * @param schema - Schema string (e.g., "id#,name$,active?")
 * @returns Array of column definitions
 *
 * @example
 * ```typescript
 * parseSchema('id#,name$,active?!');
 * // Returns: [
 * //   { name: 'id', type: '#', nullable: false },
 * //   { name: 'name', type: '$', nullable: false },
 * //   { name: 'active', type: '?', nullable: true }
 * // ]
 * ```
 */
export function parseSchema(schema: string): ColumnDef[] {
  if (!schema) return [];

  return schema.split(',').map((col) => {
    // Match: name + type marker + optional nullable marker
    const match = col.match(/^(.+?)([#?@~$])?(!)?$/);

    if (!match) {
      return {
        name: col,
        type: '$' as const,
        nullable: false,
      };
    }

    return {
      name: match[1]!,
      type: (match[2] || '$') as ColumnDef['type'],
      nullable: match[3] === '!',
    };
  });
}

/**
 * Validates data against a schema.
 *
 * @param data - Data to validate (array of objects or single object)
 * @param schema - Schema string to validate against
 * @returns Validation result with any errors
 *
 * @example
 * ```typescript
 * validateSchema(
 *   [{ id: 1, name: 'Mario' }],
 *   'id#,name$,email$'
 * );
 * // Returns: {
 * //   valid: false,
 * //   errors: [{ path: '[0].email', message: 'Missing required field' }]
 * // }
 * ```
 */
export function validateSchema(
  data: SlimValue,
  schema: string
): ValidationResult {
  const columns = parseSchema(schema);
  const errors: ValidationError[] = [];

  // Handle array of objects
  if (Array.isArray(data)) {
    data.forEach((row, index) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        errors.push({
          path: `[${index}]`,
          message: 'Expected object',
          expected: 'object',
          actual: typeof row,
        });
        return;
      }

      validateRow(row as Record<string, SlimValue>, columns, `[${index}]`, errors);
    });
  }
  // Handle single object
  else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    validateRow(data as Record<string, SlimValue>, columns, '', errors);
  } else {
    errors.push({
      path: '',
      message: 'Expected object or array of objects',
      expected: 'object | object[]',
      actual: typeof data,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * Validate a single row against column definitions
 */
function validateRow(
  row: Record<string, SlimValue>,
  columns: ColumnDef[],
  pathPrefix: string,
  errors: ValidationError[]
): void {
  for (const col of columns) {
    const path = pathPrefix ? `${pathPrefix}.${col.name}` : col.name;
    const value = row[col.name];

    // Check required
    if ((value === undefined || value === null) && !col.nullable) {
      errors.push({
        path,
        message: 'Missing required field',
        expected: typeToString(col.type),
      });
      continue;
    }

    // Skip null/undefined for nullable columns
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (!isCorrectType(value, col.type)) {
      errors.push({
        path,
        message: `Type mismatch`,
        expected: typeToString(col.type),
        actual: typeof value,
      });
    }
  }
}

/**
 * Check if a value matches the expected column type
 */
function isCorrectType(value: SlimValue, type: ColumnDef['type']): boolean {
  switch (type) {
    case '#':
      return typeof value === 'number';
    case '?':
      return typeof value === 'boolean';
    case '$':
      return typeof value === 'string';
    case '@':
      return Array.isArray(value);
    case '~':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case '!':
      return true; // Nullable only, no type constraint
    default:
      return true;
  }
}

/**
 * Convert type marker to human-readable string
 */
function typeToString(type: ColumnDef['type']): string {
  switch (type) {
    case '#':
      return 'number';
    case '?':
      return 'boolean';
    case '$':
      return 'string';
    case '@':
      return 'array';
    case '~':
      return 'object';
    case '!':
      return 'any (nullable)';
    default:
      return 'unknown';
  }
}
