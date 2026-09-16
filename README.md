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
├── public
│   ├── index.html      # marketing landing page
│   ├── signup.html     # signup / account creation page
│   ├── styles.css      # shared stylesheet
│   └── app.js          # client-side signup validation + fetch
├── src
│   ├── server.js       # zero-dependency HTTP server + signup API
│   ├── index.js        # CLI demo entry point
│   ├── calculator.js   # arithmetic helpers
│   └── userStore.js    # in-memory user CRUD store
└── test
    ├── calculator.test.js
    └── userStore.test.js
```

## Usage

Start the web server (landing page + signup page):

```bash
npm start
```

Then open:

- Landing page: http://localhost:3000/
- Signup page: http://localhost:3000/signup.html
- Users API: http://localhost:3000/api/users

Override the port with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

Run the original CLI demo:

```bash
npm run demo
```

Run the test suite:

```bash
npm test
```

## Web pages

### Landing page (`/`)

A responsive single-page marketing layout with a hero section, feature cards, a
"how it works" walkthrough, pricing tiers and a closing call-to-action. Every
call-to-action links to the signup page.

### Signup page (`/signup.html`)

A form with client-side validation for name, email, password strength, password
confirmation and terms acceptance. On success it POSTs to `/api/signup`, which
creates the account in the in-memory [`UserStore`](src/userStore.js:7) and returns
the created record.

## HTTP API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Serves the landing page |
| `GET` | `/signup.html` | Serves the signup page |
| `POST` | `/api/signup` | Creates a user from `{ name, email, role }` — returns `201` with the user, `400` on validation errors, `409` on duplicate email |
| `GET` | `/api/users` | Returns `{ count, users }` for everything currently in the store |

> Users live in memory only — restarting the server clears them.

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
