/**
 * SLIM Decoder
 *
 * Parses SLIM format strings back to JavaScript values.
 */

import type { SlimValue, DecodeOptions } from './types';

/**
 * Default decoding options
 */
const DEFAULT_OPTIONS: Required<DecodeOptions> = {
  strict: false,
};

/**
 * Decodes a SLIM string to a JavaScript value.
 *
 * @param slim - The SLIM string to decode
 * @param options - Decoding options
 * @returns The decoded JavaScript value
 *
 * @example
 * ```typescript
 * decode('{name:Mario,age:#30}');
 * // Returns: { name: 'Mario', age: 30 }
 *
 * decode('|2|id#,active?|\n1,T\n2,F');
 * // Returns: [{ id: 1, active: true }, { id: 2, active: false }]
 * ```
 */
export function decode(slim: string, options: DecodeOptions = {}): SlimValue {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parser = new SlimParser(slim, opts);
  return parser.parseValue();
}

/**
 * Internal parser class
 */
class SlimParser {
  private pos = 0;
  private readonly str: string;
  constructor(str: string, _opts: Required<DecodeOptions>) {
    this.str = str;
    // _opts reserved for future use (e.g., strict mode, custom type handlers)
  }

  /**
   * Peek at the next n characters without consuming
   */
  private peek(n = 1): string {
    return this.str.substring(this.pos, this.pos + n);
  }

  /**
   * Consume and return the next n characters
   */
  private consume(n = 1): string {
    const s = this.str.substring(this.pos, this.pos + n);
    this.pos += n;
    return s;
  }

  /**
   * Try to match a string, consuming if matched
   */
  private match(s: string): boolean {
    if (this.peek(s.length) === s) {
      this.consume(s.length);
      return true;
    }
    return false;
  }

  /**
   * Skip whitespace
   */
  private skipWs(): void {
    while (this.pos < this.str.length && this.peek() === ' ') {
      this.pos++;
    }
  }

  /**
   * Check if we've reached the end
   */
  private isEnd(): boolean {
    return this.pos >= this.str.length;
  }

  /**
   * Parse any SLIM value
   */
  parseValue(): SlimValue {
    this.skipWs();

    if (this.isEnd()) return undefined;

    const ch = this.peek();

    switch (ch) {
      case '!':
        this.consume();
        return this.parseNull();
      case '?':
        this.consume();
        return this.consume() === 'T';
      case '#':
        this.consume();
        return this.parseNumber();
      case '@':
        this.consume();
        return this.parseArray();
      case '*':
        this.consume();
        return this.parseMatrix();
      case '{':
        return this.parseObject();
      case '|':
        return this.parseTable();
      case '"':
        return this.parseQuotedString();
      default:
        return this.parseUnquoted();
    }
  }

  /**
   * Parse null/undefined/deep
   */
  private parseNull(): SlimValue {
    if (this.match('null')) return null;
    if (this.match('undef')) return undefined;
    if (this.match('DEEP')) return null;
    return null;
  }

  /**
   * Parse a number
   */
  private parseNumber(): number {
    if (this.match('NaN')) return NaN;
    if (this.match('-Inf')) return -Infinity;
    if (this.match('Inf')) return Infinity;

    let num = '';
    while (!this.isEnd() && /[0-9.eE+\-]/.test(this.peek())) {
      num += this.consume();
    }
    return parseFloat(num);
  }

  /**
   * Parse a quoted string
   */
  private parseQuotedString(): string {
    this.consume(); // Opening "
    let val = '';

    while (!this.isEnd()) {
      if (this.peek() === '"') {
        this.consume();
        if (this.peek() === '"') {
          // Escaped quote
          val += this.consume();
        } else {
          // End of string
          break;
        }
      } else if (this.peek(2) === '\\n') {
        this.consume(2);
        val += '\n';
      } else {
        val += this.consume();
      }
    }

    return val;
  }

  /**
   * Parse an unquoted string
   */
  private parseUnquoted(): string {
    let val = '';
    while (!this.isEnd() && !/[,;\n|{}\[\]]/.test(this.peek())) {
      val += this.consume();
    }
    return val;
  }

  /**
   * Parse an array
   */
  private parseArray(): SlimValue[] {
    const isNumeric = this.peek() === '#';
    if (isNumeric) this.consume();

    if (!this.match('[')) return [];
    if (this.peek() === ']') {
      this.consume();
      return [];
    }

    const items: SlimValue[] = [];

    while (!this.isEnd() && this.peek() !== ']') {
      if (isNumeric) {
        // Parse number directly
        let num = '';
        while (!this.isEnd() && /[0-9.eE+\-]/.test(this.peek())) {
          num += this.consume();
        }
        if (num) items.push(parseFloat(num));
      } else {
        items.push(this.parseValue());
      }

      // Skip separator
      if (this.peek() === ',' || this.peek() === ';') {
        this.consume();
      }
    }

    this.match(']');
    return items;
  }

  /**
   * Parse a 2D matrix
   */
  private parseMatrix(): number[][] {
    if (!this.match('[')) return [];

    const rows: number[][] = [];
    let currentRow: number[] = [];

    while (!this.isEnd() && this.peek() !== ']') {
      if (this.peek() === ';') {
        this.consume();
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
      } else if (this.peek() === ',') {
        this.consume();
      } else if (/[0-9.\-]/.test(this.peek())) {
        let num = '';
        while (!this.isEnd() && /[0-9.eE+\-]/.test(this.peek())) {
          num += this.consume();
        }
        currentRow.push(parseFloat(num));
      } else {
        break;
      }
    }

    if (currentRow.length > 0) rows.push(currentRow);
    this.match(']');
    return rows;
  }

  /**
   * Parse an object
   */
  private parseObject(): Record<string, SlimValue> {
    this.match('{');
    const obj: Record<string, SlimValue> = {};

    while (!this.isEnd() && this.peek() !== '}') {
      this.skipWs();

      // Parse key
      let key = this.peek() === '"' ? this.parseQuotedString() : '';
      if (!key) {
        while (!this.isEnd() && !/[:,{}]/.test(this.peek())) {
          key += this.consume();
        }
      }

      this.match(':');
      obj[key] = this.parseValue();

      if (this.peek() === ',') this.consume();
    }

    this.match('}');
    return obj;
  }

  /**
   * Parse a table (array of objects)
   */
  private parseTable(): Record<string, SlimValue>[] {
    this.match('|');

    // Parse row count
    let countStr = '';
    while (this.peek() !== '|') {
      countStr += this.consume();
    }
    this.match('|');

    // Parse schema
    let schemaStr = '';
    while (this.peek() !== '|') {
      schemaStr += this.consume();
    }
    this.match('|');

    // Parse column definitions
    const columns = schemaStr.split(',').map((col) => {
      const match = col.match(/^(.+?)([#?@~$!]*)$/);
      return {
        name: match?.[1] ?? col,
        type: match?.[2] ?? '',
      };
    });

    const rows: Record<string, SlimValue>[] = [];

    // Parse data rows
    while (!this.isEnd()) {
      if (this.peek() === '\n') this.consume();
      if (this.isEnd() || /[},\]]/.test(this.peek())) break;

      const obj: Record<string, SlimValue> = {};

      for (let i = 0; i < columns.length; i++) {
        if (i > 0 && this.peek() === ',') this.consume();

        const col = columns[i]!;
        let val: SlimValue;

        // Empty cell
        if (
          this.peek() === ',' ||
          this.peek() === '\n' ||
          this.isEnd() ||
          this.peek() === '}'
        ) {
          val = col.type.includes('!') ? null : undefined;
        }
        // Quoted string
        else if (this.peek() === '"') {
          val = this.parseQuotedString();
        }
        // Number column
        else if (col.type.startsWith('#')) {
          let num = '';
          while (!this.isEnd() && /[0-9.eE+\-]/.test(this.peek())) {
            num += this.consume();
          }
          val = num ? parseFloat(num) : null;
        }
        // Boolean column
        else if (col.type.startsWith('?')) {
          val = this.consume() === 'T';
        }
        // Array column
        else if (col.type.startsWith('@')) {
          let arrStr = '';
          while (!this.isEnd() && !/[,\n}]/.test(this.peek())) {
            arrStr += this.consume();
          }
          if (arrStr === '[]') {
            val = [];
          } else {
            const elements = arrStr.split('+').filter((x) => x !== '');
            // Try to parse as numbers
            if (elements.every((x) => /^-?\d+\.?\d*$/.test(x))) {
              val = elements.map((x) => parseFloat(x));
            } else {
              val = elements;
            }
          }
        }
        // Object column
        else if (col.type.startsWith('~')) {
          val = this.parseValue();
        }
        // String column (default)
        else {
          if (this.peek() === '"') {
            val = this.parseQuotedString();
          } else {
            let s = '';
            while (!this.isEnd() && !/[,\n}]/.test(this.peek())) {
              s += this.consume();
            }
            val = s;
          }
        }

        // Only add if not undefined/empty
        if (val !== undefined && val !== null && val !== '') {
          obj[col.name] = val;
        } else if (col.type.includes('!') && val === null) {
          obj[col.name] = null;
        }
      }

      rows.push(obj);

      if (this.peek() === '\n') {
        this.consume();
      } else if (!/[},\]]/.test(this.peek()) && !this.isEnd()) {
        break;
      }
    }

    return rows;
  }
}
