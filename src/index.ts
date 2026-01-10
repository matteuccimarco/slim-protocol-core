/**
 * SLIM - Structured Lightweight Interchange Markup
 *
 * Token-efficient data serialization for AI/LLM contexts.
 *
 * @packageDocumentation
 */

// Core API
export { encode } from './encoder';
export { decode } from './decoder';

// Schema utilities
export { inferSchema, validateSchema, parseSchema } from './schema';

// Streaming API
export {
  createEncoder,
  createDecoder,
  encodeStream,
  decodeStream,
  encodeChunked,
  collect,
} from './stream';
export type { SlimEncoder, SlimDecoder } from './stream';

// Utilities
export {
  deepEqual,
  estimateTokens,
  calculateSavings,
  prettyPrint,
  clone,
  getPath,
  setPath,
} from './utils';

// Types
export type {
  SlimValue,
  SlimObject,
  EncodeOptions,
  DecodeOptions,
  ValidationResult,
  ValidationError,
  ColumnDef,
  ColumnType,
} from './types';

// Constants
export {
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
