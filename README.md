# slim-protocol-core

[![npm version](https://img.shields.io/npm/v/slim-protocol-core.svg)](https://www.npmjs.com/package/slim-protocol-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SLIM** (Structured Lightweight Interchange Markup) - Token-efficient data serialization for AI/LLM applications.

## Why SLIM?

When sending data to LLMs (ChatGPT, Claude, etc.), you pay per **token**. SLIM reduces tokens by **40-50%** compared to JSON while preserving all data.

```javascript
// JSON: 54 characters
JSON.stringify([{id: 1, name: "Mario"}, {id: 2, name: "Luigi"}])
// Output: [{"id":1,"name":"Mario"},{"id":2,"name":"Luigi"}]

// SLIM: 31 characters (-43%)
encode([{id: 1, name: "Mario"}, {id: 2, name: "Luigi"}])
// Output: |2|id#,name$|
//         1,Mario
//         2,Luigi
```

## Installation

```bash
npm install slim-protocol-core
```

## Quick Start

```typescript
import { encode, decode } from 'slim-protocol-core';

// Encode JavaScript data to SLIM
const data = [
  { id: 1, name: 'Mario', active: true },
  { id: 2, name: 'Luigi', active: false }
];

const slim = encode(data);
// Output:
// |2|id#,name$,active?|
// 1,Mario,T
// 2,Luigi,F

// Decode SLIM back to JavaScript
const restored = decode(slim);
// restored deep-equals data
```

## Benchmarks

### Token Savings vs JSON

| Data Type | JSON Tokens | SLIM Tokens | Savings |
|-----------|-------------|-------------|---------|
| User table (100 rows) | 2053 | 903 | **56%** |
| Nested config | 71 | 58 | **18%** |
| GPS track (50 points) | 300 | 273 | **9%** |
| **Average** | - | - | **49%** |

### When to Use SLIM

| Use Case | Expected Savings |
|----------|------------------|
| Arrays of objects (tables) | 40-60% |
| Objects with repeated keys | 30-50% |
| Mixed data | 15-30% |
| Numeric matrices | 5-15% |
| Single values | ~0% |

### Performance

| Operation | JSON | SLIM | Notes |
|-----------|------|------|-------|
| Encode (100 objects) | 17us | 61us | SLIM slower (table overhead) |
| Decode (100 objects) | 25us | 132us | SLIM slower (custom parser) |
| Output size | 8210B | 3610B | **SLIM -56%** |

**Trade-off**: You pay in CPU, you save in tokens/storage. For LLM workloads, token savings far outweigh the CPU cost.

## Video Tutorial

[![SLIM Protocol Tutorial](https://img.youtube.com/vi/GQj-pSUM2iA/maxresdefault.jpg)](https://www.youtube.com/watch?v=GQj-pSUM2iA)

*Click the image to watch the tutorial on YouTube*

## API Reference

### encode(data, options?)

Encodes JavaScript data to SLIM string.

```typescript
function encode(data: unknown, options?: EncodeOptions): string;

interface EncodeOptions {
  maxDepth?: number;        // Default: 15
  tableThreshold?: number;  // Min rows for table format, default: 1
}
```

### decode(slim, options?)

Decodes SLIM string to JavaScript data.

```typescript
function decode(slim: string, options?: DecodeOptions): unknown;

interface DecodeOptions {
  strict?: boolean;  // Throw on invalid input, default: false
}
```

### Schema Utilities

```typescript
import { inferSchema, parseSchema, validateSchema } from 'slim-protocol-core';

// Infer schema from data
const schema = inferSchema([{ id: 1, name: 'Mario' }]);
// Returns: 'id#,name$'

// Parse schema into column definitions
const cols = parseSchema('id#,name$,active?');
// Returns: [{name:'id', type:'#', nullable:false}, ...]

// Validate data against schema
const result = validateSchema(data, 'id#,name$,active?');
// Returns: { valid: true } or { valid: false, errors: [...] }
```

### Streaming API

For large datasets:

```typescript
import {
  createEncoder,
  createDecoder,
  encodeStream,
  decodeStream,
  encodeChunked,
  collect
} from 'slim-protocol-core';

// Incremental encoder
const encoder = createEncoder();
encoder.write({ id: 1, name: 'Mario' });
encoder.write({ id: 2, name: 'Luigi' });
const slim = encoder.end();

// Encode from async iterable
const slim = await encodeStream(asyncGenerator());

// Decode to async iterable
for await (const obj of decodeStream(slim)) {
  console.log(obj);
}

// Encode in chunks (for large data)
for (const chunk of encodeChunked(bigArray, 1000)) {
  await saveChunk(chunk);
}
```

### Utility Functions

```typescript
import {
  deepEqual,        // Deep comparison
  clone,            // Deep clone
  getPath,          // Access by path (e.g., 'user.name')
  setPath,          // Modify by path
  estimateTokens,   // Estimate token count
  calculateSavings  // Calculate savings percentage
} from 'slim-protocol-core';
```

## Supported Data Types

| JavaScript Type | SLIM Marker | Example |
|-----------------|-------------|---------|
| `null` | `!` | `!null` |
| `undefined` | `!` | `!undef` |
| `boolean` | `?` | `?T`, `?F` |
| `number` | `#` | `#42`, `#3.14` |
| `string` | (none) | `hello` |
| `string` (quoted) | `"` | `"hello, world"` |
| `Array` (numbers) | `@#` | `@#[1,2,3]` |
| `Array` (mixed) | `@` | `@[#1;hello;?T]` |
| `Array` (2D numbers) | `*` | `*[1,2;3,4]` |
| `Array` (objects) | `\|n\|schema\|` | `\|2\|id#,name$\|...` |
| `Object` | `{}` | `{name:Mario}` |

## Special Values

| Value | SLIM |
|-------|------|
| `NaN` | `#NaN` |
| `Infinity` | `#Inf` |
| `-Infinity` | `#-Inf` |
| Empty string | `""` |
| Empty array | `@[]` |
| Empty object | `{}` |

## Test Coverage

- **210 tests** passing
- **96.67%** code coverage
- Tested: primitives, unicode, emoji, CJK, edge cases, streaming, schemas

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (optional, for development)

## Zero Dependencies

This package has **zero runtime dependencies**. Only dev dependencies for testing/building.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run benchmarks
npm run benchmark

# Build
npm run build

# Type check
npm run typecheck
```

## Roadmap

This is Phase 1 of the SLIM ecosystem:

1. **slim-core** (this package) - Core serialization library
2. **slim-db** - Embedded database with native SLIM storage
3. **pg-slim** - PostgreSQL extension for SLIM data type

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
