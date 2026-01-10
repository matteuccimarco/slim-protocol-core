# slim-core v0.1.0 - Release Notes

**Data rilascio**: 2026-01-10
**Stato**: Pronto per pubblicazione npm

---

## Cos'e slim-core

**slim-core** e una libreria TypeScript/JavaScript che implementa il protocollo SLIM (Structured Lightweight Interchange Markup) per la serializzazione dei dati.

### In parole semplici

E come `JSON.stringify()` e `JSON.parse()`, ma produce output piu compatto:

```javascript
// Con JSON
JSON.stringify([{id: 1, name: "Mario"}, {id: 2, name: "Luigi"}])
// Produce: [{"id":1,"name":"Mario"},{"id":2,"name":"Luigi"}]  (54 caratteri)

// Con SLIM
encode([{id: 1, name: "Mario"}, {id: 2, name: "Luigi"}])
// Produce: |2|id#,name$|
//          1,Mario
//          2,Luigi                                            (31 caratteri, -43%)
```

### Perche serve

Quando invii dati a un LLM (ChatGPT, Claude, ecc.), paghi per **token**. Meno caratteri = meno token = meno costi. SLIM riduce i token del **40-50%** mantenendo tutti i dati intatti.

---

## Risultati Test

### Sommario

| Metrica | Valore | Soglia | Stato |
|---------|--------|--------|-------|
| Test totali | 210 | - | - |
| Test passati | 210 | 100% | PASS |
| Coverage Statements | 96.67% | 80% | PASS |
| Coverage Branches | 90.97% | 80% | PASS |
| Coverage Functions | 100% | 80% | PASS |
| Coverage Lines | 96.67% | 80% | PASS |

### Dettaglio per Modulo

| Modulo | Test | Coverage |
|--------|------|----------|
| encoder.ts | 34 | 96.88% |
| decoder.ts | 35 | 98.07% |
| schema.ts | 24 | 90.65% |
| stream.ts | 19 | 100% |
| utils.ts | 23 | 95.69% |
| roundtrip | 42 | - |
| edge-cases | 33 | - |

### Categorie Testate

- **Primitivi**: null, undefined, boolean, number (inclusi NaN, Infinity), string
- **Stringhe speciali**: escape, unicode, emoji, CJK, spazi
- **Array**: vuoti, numerici, stringhe, misti, matrici 2D
- **Oggetti**: semplici, nested, chiavi speciali
- **Tabelle SLIM**: il formato ottimizzato per array di oggetti
- **Schema**: inferenza automatica, validazione, parsing
- **Streaming**: encoder/decoder incrementali, async iterables
- **Edge cases**: profondita massima, caratteri speciali, whitespace

---

## Benchmark

### Token Savings vs JSON

| Tipo di Dati | JSON Tokens | SLIM Tokens | Risparmio |
|--------------|-------------|-------------|-----------|
| Tabella utenti (100 righe) | 2053 | 903 | **56%** |
| Config nested | 71 | 58 | **18%** |
| GPS track (50 punti) | 300 | 273 | **9%** |
| **Media** | - | - | **49.1%** |

### Quando SLIM e piu efficace

| Caso d'uso | Risparmio atteso |
|------------|------------------|
| Array di oggetti (tabelle) | 40-60% |
| Oggetti con chiavi ripetute | 30-50% |
| Dati misti | 15-30% |
| Matrici numeriche | 5-15% |
| Singoli valori | ~0% |

### Performance

| Operazione | JSON | SLIM | Note |
|------------|------|------|------|
| Encode (100 oggetti) | 17us | 61us | SLIM piu lento (overhead tabella) |
| Decode (100 oggetti) | 25us | 132us | SLIM piu lento (parser custom) |
| Size output | 8210B | 3610B | SLIM -56% |

**Trade-off**: Si paga in CPU, si risparmia in token/storage. Per workload LLM il risparmio token e molto piu importante.

---

## API Reference

### Core Functions

```typescript
import { encode, decode } from '@slim-protocol/core';

// Encode: JavaScript -> SLIM string
const slim = encode(data);

// Decode: SLIM string -> JavaScript
const data = decode(slim);
```

### Schema Functions

```typescript
import { inferSchema, parseSchema, validateSchema } from '@slim-protocol/core';

// Inferisci schema da dati
const schema = inferSchema([{id: 1, name: "Mario"}]);
// Returns: "id#,name$"

// Parsa schema in definizioni colonna
const cols = parseSchema("id#,name$,active?");
// Returns: [{name:"id", type:"#", nullable:false}, ...]

// Valida dati contro schema
const result = validateSchema(data, "id#,name$");
// Returns: {valid: true} o {valid: false, errors: [...]}
```

### Streaming Functions

```typescript
import {
  createEncoder,
  createDecoder,
  encodeStream,
  decodeStream,
  encodeChunked,
  collect
} from '@slim-protocol/core';

// Encoder incrementale
const encoder = createEncoder();
encoder.write({id: 1, name: "Mario"});
encoder.write({id: 2, name: "Luigi"});
const slim = encoder.end();

// Encode da async iterable
const slim = await encodeStream(asyncGenerator());

// Decode a async iterable
for await (const obj of decodeStream(slim)) {
  console.log(obj);
}

// Encode in chunks (per dati grandi)
for (const chunk of encodeChunked(bigArray, 1000)) {
  await saveChunk(chunk);
}
```

### Utility Functions

```typescript
import {
  deepEqual,      // Confronto profondo
  clone,          // Clone profondo
  getPath,        // Accesso path (es: "user.name")
  setPath,        // Modifica path
  estimateTokens, // Stima token
  calculateSavings // Calcola risparmio %
} from '@slim-protocol/core';
```

---

## Tipi SLIM

| Tipo | Marker | Esempio SLIM | Valore JS |
|------|--------|--------------|-----------|
| Null | `!` | `!null` | `null` |
| Undefined | `!` | `!undef` | `undefined` |
| Boolean | `?` | `?T`, `?F` | `true`, `false` |
| Number | `#` | `#42`, `#3.14` | `42`, `3.14` |
| String | (nessuno) | `hello` | `"hello"` |
| String quoted | `"` | `"hello, world"` | `"hello, world"` |
| Array numerico | `@#` | `@#[1,2,3]` | `[1,2,3]` |
| Array misto | `@` | `@[#1;hello;?T]` | `[1,"hello",true]` |
| Matrice 2D | `*` | `*[1,2;3,4]` | `[[1,2],[3,4]]` |
| Oggetto | `{}` | `{name:Mario}` | `{name:"Mario"}` |
| Tabella | `\|n\|schema\|` | `\|2\|id#,name$\|...` | `[{id,name},...]` |

---

## Requisiti

- Node.js >= 18.0.0
- TypeScript >= 5.0 (opzionale, per sviluppo)

## Dipendenze

**Zero dipendenze runtime!**

Solo devDependencies per sviluppo/test.

---

## File Inclusi nel Pacchetto npm

```
@slim-protocol/core/
├── dist/
│   ├── index.js      # CommonJS build
│   ├── index.mjs     # ES Module build
│   └── index.d.ts    # TypeScript types
├── README.md
└── LICENSE           # MIT
```

---

## Checklist Pre-Pubblicazione

- [x] Tutti i test passano (210/210)
- [x] Coverage > 80% (96.67%)
- [x] Zero dipendenze runtime
- [x] TypeScript types esportati
- [x] README completo
- [x] LICENSE MIT
- [x] Benchmark documentati
- [x] API documentata
- [ ] Build finale (`npm run build`)
- [ ] Creazione repository GitHub
- [ ] Pubblicazione npm (`npm publish`)

---

## Known Limitations

1. **Spazi iniziali in stringhe standalone**: Gli spazi iniziali vengono preservati solo se la stringa e quotata o dentro un oggetto/array

2. **Tabelle sparse**: Se oggetti in un array hanno chiavi diverse, tutte le chiavi vengono unificate (comportamento voluto per ottimizzazione)

3. **Performance decode**: Il decoder e piu lento di JSON.parse perche e un parser custom

---

## Prossimi Passi

### Fase 1 Completata
- slim-core libreria base

### Fase 2 (Prossima)
- slim-db: Database embedded con storage SLIM nativo

### Fase 3
- pg-slim: Estensione PostgreSQL per tipo SLIM

---

## Changelog

### v0.1.0 (2026-01-10)
- Release iniziale
- Encoder/Decoder completi
- Schema utilities
- Streaming API
- 210 test, 96.67% coverage
