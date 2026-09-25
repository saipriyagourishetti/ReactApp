'use strict';

const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const healthRoutes = require('./health.routes');
const calcRoutes = require('./calc.routes');

/**
 * The complete API surface, assembled from one module per concern.
 *
 * Merging is strict: two modules claiming the same `METHOD /path` is a startup
 * error rather than a silent last-one-wins override.
 */
function mergeRoutes(...tables) {
  const merged = {};

  for (const table of tables) {
    for (const [key, handler] of Object.entries(table)) {
      if (key in merged) {
        throw new Error(`Duplicate route definition: ${key}`);
      }
      merged[key] = handler;
    }
  }
  return merged;
}

const routes = mergeRoutes(authRoutes.routes, userRoutes.routes, healthRoutes.routes, calcRoutes.routes);

module.exports = { routes, mergeRoutes };
