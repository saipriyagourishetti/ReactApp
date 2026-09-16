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
│   ├── login.html      # login page
│   ├── styles.css      # shared stylesheet
│   └── app.js          # client-side signup + login validation and fetch
├── src
│   ├── server.js       # zero-dependency HTTP server + signup/login API
│   ├── index.js        # CLI demo entry point
│   ├── calculator.js   # arithmetic helpers
│   └── userStore.js    # in-memory user store with password hashing
└── test
    ├── calculator.test.js
    ├── userStore.test.js
    └── auth.test.js    # password hashing + credential verification
```

## Usage

Start the web server (landing, signup and login pages):

```bash
npm start
```

Then open:

- Landing page: http://localhost:3000/
- Signup page: http://localhost:3000/signup.html
- Login page: http://localhost:3000/login.html
- Users API: http://localhost:3000/api/users

A demo account is seeded at startup:

| Email | Password |
| --- | --- |
| `ada@example.com` | `analytical1` |

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
creates the account in the in-memory [`UserStore`](src/userStore.js) and returns
the created record.

### Login page (`/login.html`)

An email + password form that POSTs to `/api/login`. Credentials are checked
against the stored salted `scrypt` hash. Failed attempts always return the same
generic message (`Incorrect email or password.`) so the endpoint does not reveal
which emails are registered.

## HTTP API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Serves the landing page |
| `GET` | `/signup.html` | Serves the signup page |
| `GET` | `/login.html` | Serves the login page |
| `POST` | `/api/signup` | Creates a user from `{ name, email, password, role }` — returns `201` with the user, `400` on validation errors, `409` on duplicate email |
| `POST` | `/api/login` | Verifies `{ email, password }` — returns `200` with the user, `400` on missing fields, `401` on bad credentials |
| `GET` | `/api/users` | Returns `{ count, users }` for everything currently in the store |

> Users live in memory only — restarting the server clears them.
> Password hashes are never included in any API response.

## Password handling

Passwords are hashed with Node's built-in [`crypto.scryptSync`](src/userStore.js)
using a random 16-byte salt per user, and stored as `scrypt$<salt>$<hash>`.
Verification uses `crypto.timingSafeEqual` for a constant-time comparison.

Requirements enforced on both the client and the server: at least 8 characters,
including at least one letter and one number.

> This is still a demo — there are no sessions, tokens or cookies. A successful
> login simply returns the user record.

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

An in-memory store with `create`, `findById`, `findByEmail`, `list`, `update`,
`setPassword`, `verifyCredentials`, `remove` and a `size` getter. Emails are
normalised to lowercase and must be unique.

Every method returns a *public* record: the internal `passwordHash` is stripped
and replaced by a boolean `hasPassword` flag. The `password` field is optional,
so seed data and existing callers keep working unchanged.

```js
const { UserStore } = require('./src/userStore');

const store = new UserStore();
store.create({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  password: 'analytical1',
});

store.verifyCredentials('ada@example.com', 'analytical1'); // -> user record
store.verifyCredentials('ada@example.com', 'wrong');       // -> null
```

## License

MIT
