/**
 * SLIM Core Type Definitions
 */

/**
 * Any value that can be encoded/decoded by SLIM
 */
export type SlimValue =
  | null
  | undefined
  | boolean
  | number
  | string
  | SlimValue[]
  | SlimObject;

/**
 * A SLIM object (key-value pairs)
 */
export interface SlimObject {
  [key: string]: SlimValue;
}

/**
 * Options for the SLIM encoder
 */
export interface EncodeOptions {
  /**
   * Maximum nesting depth before returning !DEEP
   * @default 15
   */
  maxDepth?: number;

  /**
   * Minimum number of rows to use table format for arrays of objects
   * @default 1
   */
  tableThreshold?: number;

  /**
   * Pretty print with newlines (for debugging)
   * @default false
   */
  pretty?: boolean;
}

/**
 * Options for the SLIM decoder
 */
export interface DecodeOptions {
  /**
   * Throw error on invalid SLIM input
   * @default false
   */
  strict?: boolean;
}

/**
 * Result of schema validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Schema validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  expected?: string;
  actual?: string;
}

/**
 * Column definition in a SLIM table schema
 */
export interface ColumnDef {
  name: string;
  type: ColumnType;
  nullable: boolean;
}

/**
 * SLIM column types
 */
export type ColumnType =
  | '#'   // Number
  | '?'   // Boolean
  | '$'   // String (default)
  | '@'   // Array
  | '~'   // Object
  | '!';  // Nullable (suffix)

/**
 * SLIM special values
 */
export const SLIM_NULL = '!null';
export const SLIM_UNDEFINED = '!undef';
export const SLIM_DEEP = '!DEEP';
export const SLIM_TRUE = '?T';
export const SLIM_FALSE = '?F';
export const SLIM_NAN = '#NaN';
export const SLIM_INF = '#Inf';
export const SLIM_NEG_INF = '#-Inf';

/**
 * Characters that require quoting in strings
 */
export const STRUCTURAL_CHARS = /[,;\n|{}[\]"#?!*@]/;

/**
 * Characters that require quoting in object keys
 */
export const KEY_SPECIAL_CHARS = /[,:{}\[\]]/;
