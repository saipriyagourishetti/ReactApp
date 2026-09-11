'use strict';

/**
 * An in-memory user store with basic CRUD operations.
 * Deliberately dependency-free so it can run anywhere.
 */
class UserStore {
  constructor(seed = []) {
    this.users = new Map();
    this.nextId = 1;
    seed.forEach((user) => this.create(user));
  }

  create({ name, email, role = 'user' } = {}) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('A user requires a non-empty "name"');
    }
    if (!email || !email.includes('@')) {
      throw new TypeError(`Invalid email address: ${String(email)}`);
    }
    if (this.findByEmail(email)) {
      throw new Error(`A user with email "${email}" already exists`);
    }

    const user = {
      id: this.nextId++,
      name,
      email: email.toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return { ...user };
  }

  findById(id) {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  findByEmail(email) {
    if (typeof email !== 'string') return null;
    const target = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === target) return { ...user };
    }
    return null;
  }

  list({ role } = {}) {
    const all = [...this.users.values()].map((user) => ({ ...user }));
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
    return { ...user };
  }

  remove(id) {
    return this.users.delete(id);
  }

  get size() {
    return this.users.size;
  }
}

module.exports = { UserStore };
