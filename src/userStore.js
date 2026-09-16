'use strict';

const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a plaintext password with a random salt using scrypt.
 * Returns a self-describing string: "scrypt$<salt-hex>$<hash-hex>".
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Compare a plaintext password against a stored hash in constant time.
 */
function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;

  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;

  let derived;
  try {
    derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  } catch (err) {
    return false;
  }

  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Validate password strength. Returns an error message, or null when valid.
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'A password is required.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

/**
 * An in-memory user store with basic CRUD operations.
 * Deliberately dependency-free so it can run anywhere.
 *
 * Passwords are stored as salted scrypt hashes and are never returned
 * by any public method.
 */
class UserStore {
  constructor(seed = []) {
    this.users = new Map();
    this.nextId = 1;
    seed.forEach((user) => this.create(user));
  }

  /**
   * Strip secret fields before handing a record to a caller.
   */
  static toPublic(user) {
    const { passwordHash, ...safe } = user;
    return { ...safe, hasPassword: Boolean(passwordHash) };
  }

  create({ name, email, role = 'user', password } = {}) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('A user requires a non-empty "name"');
    }
    if (!email || !email.includes('@')) {
      throw new TypeError(`Invalid email address: ${String(email)}`);
    }
    if (this.findByEmail(email)) {
      throw new Error(`A user with email "${email}" already exists`);
    }

    // A password is optional so seed data and legacy callers keep working,
    // but when supplied it must satisfy the strength rules.
    let passwordHash = null;
    if (password !== undefined && password !== null && password !== '') {
      const problem = validatePassword(password);
      if (problem) throw new TypeError(problem);
      passwordHash = hashPassword(password);
    }

    const user = {
      id: this.nextId++,
      name,
      email: email.toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    this.users.set(user.id, user);
    return UserStore.toPublic(user);
  }

  findById(id) {
    const user = this.users.get(id);
    return user ? UserStore.toPublic(user) : null;
  }

  findByEmail(email) {
    if (typeof email !== 'string') return null;
    const target = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === target) return UserStore.toPublic(user);
    }
    return null;
  }

  list({ role } = {}) {
    const all = [...this.users.values()].map((user) => UserStore.toPublic(user));
    return role ? all.filter((user) => user.role === role) : all;
  }

  update(id, changes = {}) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`No user found with id ${id}`);
    }
    const allowed = ['name', 'email', 'role'];
    for (const [key, value] of Object.entries(changes)) {
      if (!allowed.includes(key)) continue;
      user[key] = key === 'email' ? String(value).toLowerCase() : value;
    }
    return UserStore.toPublic(user);
  }

  /**
   * Set or replace a user's password.
   */
  setPassword(id, password) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`No user found with id ${id}`);
    }
    const problem = validatePassword(password);
    if (problem) throw new TypeError(problem);

    user.passwordHash = hashPassword(password);
    return UserStore.toPublic(user);
  }

  /**
   * Verify an email/password pair.
   * Returns the public user record on success, or null on any failure.
   */
  verifyCredentials(email, password) {
    if (typeof email !== 'string' || typeof password !== 'string') return null;

    const target = email.toLowerCase();
    let match = null;
    for (const user of this.users.values()) {
      if (user.email === target) {
        match = user;
        break;
      }
    }

    if (!match || !match.passwordHash) return null;
    if (!verifyPassword(password, match.passwordHash)) return null;

    return UserStore.toPublic(match);
  }

  remove(id) {
    return this.users.delete(id);
  }

  get size() {
    return this.users.size;
  }
}

module.exports = {
  UserStore,
  hashPassword,
  verifyPassword,
  validatePassword,
  MIN_PASSWORD_LENGTH,
};
