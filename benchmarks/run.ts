/**
 * SLIM Benchmarks
 *
 * Compares SLIM performance against JSON.
 *
 * Run with: npx tsx benchmarks/run.ts
 */

import { encode, decode, estimateTokens } from '../src';

// Sample data sets
const userTable = {
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    active: i % 3 !== 0,
    score: Math.floor(Math.random() * 1000),
  })),
};

const nestedConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    name: 'myapp',
    ssl: true,
    pool: { min: 5, max: 20 },
  },
  cache: {
    enabled: true,
    ttl: 3600,
    provider: 'redis',
    servers: ['cache1.example.com', 'cache2.example.com'],
  },
  logging: {
    level: 'info',
    format: 'json',
    destinations: ['stdout', 'file'],
  },
};

const gpsTrack = {
  track: {
    name: 'Morning Run',
    points: Array.from({ length: 50 }, (_, i) => [
      45.4642 + i * 0.001,
      9.19 + i * 0.001,
    ]),
    distance: 5235.5,
    duration: 1800,
  },
};

interface BenchmarkResult {
  name: string;
  encodeTime: number;
  decodeTime: number;
  size: number;
  tokens: number;
}

function now(): number {
  // Use performance.now if available, otherwise Date.now
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}

function benchmark(
  name: string,
  data: unknown,
  iterations: number = 1000
): { slim: BenchmarkResult; json: BenchmarkResult } {
  // JSON benchmark
  const jsonStr = JSON.stringify(data);

  let start = now();
  for (let i = 0; i < iterations; i++) {
    JSON.stringify(data);
  }
  const jsonEncodeTime = now() - start;

  start = now();
  for (let i = 0; i < iterations; i++) {
    JSON.parse(jsonStr);
  }
  const jsonDecodeTime = now() - start;

  // SLIM benchmark
  const slimStr = encode(data);

  start = now();
  for (let i = 0; i < iterations; i++) {
    encode(data);
  }
  const slimEncodeTime = now() - start;

  start = now();
  for (let i = 0; i < iterations; i++) {
    decode(slimStr);
  }
  const slimDecodeTime = now() - start;

  return {
    slim: {
      name: `${name} (SLIM)`,
      encodeTime: slimEncodeTime / iterations,
      decodeTime: slimDecodeTime / iterations,
      size: slimStr.length,
      tokens: estimateTokens(slimStr),
    },
    json: {
      name: `${name} (JSON)`,
      encodeTime: jsonEncodeTime / iterations,
      decodeTime: jsonDecodeTime / iterations,
      size: jsonStr.length,
      tokens: estimateTokens(jsonStr),
    },
  };
}

function formatMs(ms: number): string {
  if (ms < 0.001) return `${(ms * 1000000).toFixed(0)}ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(2)}us`;
  return `${ms.toFixed(2)}ms`;
}

function runBenchmarks(): void {
  console.log('');
  console.log('=================================');
  console.log('     SLIM Benchmarks');
  console.log('=================================');
  console.log('');

  const datasets = [
    { name: 'User Table (100 rows)', data: userTable },
    { name: 'Nested Config', data: nestedConfig },
    { name: 'GPS Track (50 points)', data: gpsTrack },
  ];

  console.log('| Dataset | Format | Encode | Decode | Size | Tokens | Savings |');
  console.log('|---------|--------|--------|--------|------|--------|---------|');

  let totalJsonTokens = 0;
  let totalSlimTokens = 0;
  let totalJsonSize = 0;
  let totalSlimSize = 0;

  for (const { name, data } of datasets) {
    const { slim, json } = benchmark(name, data);

    totalJsonTokens += json.tokens;
    totalSlimTokens += slim.tokens;
    totalJsonSize += json.size;
    totalSlimSize += slim.size;

    const tokenSavings = ((1 - slim.tokens / json.tokens) * 100).toFixed(1);

    console.log(
      `| ${name.padEnd(22)} | JSON | ${formatMs(json.encodeTime).padStart(8)} | ${formatMs(json.decodeTime).padStart(8)} | ${String(json.size).padStart(5)}B | ${String(json.tokens).padStart(6)} | - |`
    );
    console.log(
      `| ${''.padEnd(22)} | SLIM | ${formatMs(slim.encodeTime).padStart(8)} | ${formatMs(slim.decodeTime).padStart(8)} | ${String(slim.size).padStart(5)}B | ${String(slim.tokens).padStart(6)} | ${tokenSavings.padStart(5)}% |`
    );
  }

  console.log('');
  console.log('### Summary');
  console.log('');

  const avgTokenSavings = ((1 - totalSlimTokens / totalJsonTokens) * 100).toFixed(1);
  const avgSizeSavings = ((1 - totalSlimSize / totalJsonSize) * 100).toFixed(1);

  console.log(`- Average token savings: **${avgTokenSavings}%**`);
  console.log(`- Average size savings: **${avgSizeSavings}%**`);
  console.log('');

  // Show example output
  console.log('### Example Output');
  console.log('');
  console.log('**JSON:**');
  console.log('```json');
  console.log(JSON.stringify(userTable.users.slice(0, 2), null, 2));
  console.log('```');
  console.log('');
  console.log('**SLIM:**');
  console.log('```');
  console.log(encode(userTable.users.slice(0, 2)));
  console.log('```');
}

// Run benchmarks
runBenchmarks();
