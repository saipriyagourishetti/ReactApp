# githubtest-dummy-project

A small, dependency-free Node.js project created purely for testing repositories, CI pipelines and tooling.

## Requirements

- Node.js 18 or newer (uses the built-in `node:test` runner)

## Project structure

```
.
├── package.json
├── README.md
├── .gitignore
├── src
│   ├── index.js        # demo entry point
│   ├── calculator.js   # arithmetic helpers
│   └── userStore.js    # in-memory user CRUD store
└── test
    ├── calculator.test.js
    └── userStore.test.js
```

## Usage

Run the demo:

```bash
npm start
```

Run the test suite:

```bash
npm test
```

## Modules

### `calculator`

| Function | Description |
| --- | --- |
| `add(a, b)` | Returns `a + b` |
| `subtract(a, b)` | Returns `a - b` |
| `multiply(a, b)` | Returns `a * b` |
| `divide(a, b)` | Returns `a / b`, throws `RangeError` when `b === 0` |
| `power(base, exp)` | Returns `base ** exp` |
| `sum(values)` | Sum of an array of numbers |
| `average(values)` | Mean of a non-empty array |

### `UserStore`

An in-memory store with `create`, `findById`, `findByEmail`, `list`, `update`, `remove` and a `size` getter. Emails are normalised to lowercase and must be unique.

```js
const { UserStore } = require('./src/userStore');

const store = new UserStore();
store.create({ name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' });
console.log(store.list());
```

## License

MIT
