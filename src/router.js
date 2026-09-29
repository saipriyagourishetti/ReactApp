'use strict';

const { sendJson } = require('./http');

/**
 * A declarative router supporting both exact-match and parameterised paths.
 *
 * Routes are plain data — `{ 'GET /api/me': handler }` — which keeps the whole
 * API surface readable in one glance and makes 405 handling automatic: if the
 * path exists under any other method, the allowed methods are advertised.
 *
 * Path segments starting with `:` are captured as named parameters and
 * attached to `ctx.params`, e.g. `'PATCH /api/users/:id'` sets `ctx.params.id`.
 */

/** Split a `'GET /api/me'` (or `'GET|HEAD /'`) key into methods + path. */
function parseRouteKey(key) {
  const separator = key.indexOf(' ');
  if (separator < 1) {
    throw new TypeError(`Invalid route key: "${key}" (expected "METHOD /path")`);
  }

  const methods = key
    .slice(0, separator)
    .split('|')
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean);
  const path = key.slice(separator + 1).trim();

  if (methods.length === 0 || !path.startsWith('/')) {
    throw new TypeError(`Invalid route key: "${key}" (expected "METHOD /path")`);
  }
  return { methods, path };
}

/**
 * Convert a route path pattern into a RegExp and a list of param names.
 * Only segments of the form `:name` are treated as parameters; everything
 * else is matched literally.
 *
 * @param {string} pattern  e.g. '/api/users/:id'
 * @returns {{ regex: RegExp, paramNames: string[] }}
 */
function compilePattern(pattern) {
  const paramNames = [];
  const regexSource = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${regexSource}$`), paramNames };
}

/** Return true when a route pattern contains at least one `:param` segment. */
function hasParams(pattern) {
  return pattern.split('/').some((s) => s.startsWith(':'));
}

/**
 * Build a router middleware from a route table.
 *
 * @param {Record<string, Function>} table  `'METHOD /path' -> handler(ctx)`
 * @param {object} [options]
 * @param {string} [options.prefix]  Paths under this prefix get JSON 404s
 *   instead of falling through to the static file handler.
 */
function createRouter(table, { prefix = '/api/' } = {}) {
  /** Exact path -> Map<method, handler> */
  const exactRoutes = new Map();
  /** Array of { regex, paramNames, byMethod } for parameterised routes */
  const paramRoutes = [];

  for (const [key, handler] of Object.entries(table)) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Route "${key}" must map to a function`);
    }

    const { methods, path } = parseRouteKey(key);

    if (hasParams(path)) {
      // Parameterised route — store as a compiled pattern.
      let entry = paramRoutes.find((e) => e.regex.source === compilePattern(path).regex.source);
      if (!entry) {
        const { regex, paramNames } = compilePattern(path);
        entry = { regex, paramNames, byMethod: new Map(), pattern: path };
        paramRoutes.push(entry);
      }
      for (const method of methods) {
        if (entry.byMethod.has(method)) {
          throw new Error(`Duplicate route: ${method} ${path}`);
        }
        entry.byMethod.set(method, handler);
      }
    } else {
      // Exact-match route — O(1) lookup.
      if (!exactRoutes.has(path)) exactRoutes.set(path, new Map());
      const byMethod = exactRoutes.get(path);
      for (const method of methods) {
        if (byMethod.has(method)) {
          throw new Error(`Duplicate route: ${method} ${path}`);
        }
        byMethod.set(method, handler);
      }
    }
  }

  function router(ctx, next) {
    // 1. Exact match (O(1)).
    let byMethod = exactRoutes.get(ctx.pathname);
    let params = {};

    // 2. Parameterised match (linear scan; typically few entries).
    if (!byMethod) {
      for (const entry of paramRoutes) {
        const match = ctx.pathname.match(entry.regex);
        if (match) {
          byMethod = entry.byMethod;
          for (let i = 0; i < entry.paramNames.length; i++) {
            params[entry.paramNames[i]] = decodeURIComponent(match[i + 1]);
          }
          break;
        }
      }
    }

    if (byMethod) {
      const handler =
        byMethod.get(ctx.method) ||
        // HEAD falls back to GET; Node suppresses the body automatically.
        (ctx.method === 'HEAD' ? byMethod.get('GET') : undefined);

      if (handler) {
        ctx.params = params;
        return handler(ctx);
      }

      const allow = [...byMethod.keys()].sort().join(', ');
      sendJson(
        ctx.res,
        405,
        { error: `Method not allowed. Use ${[...byMethod.keys()].sort().join(' or ')}.` },
        { Allow: allow }
      );
      return undefined;
    }

    // Unknown API paths must not fall through to the static file handler,
    // otherwise a missing endpoint would return an HTML 404 page.
    if (prefix && ctx.pathname.startsWith(prefix)) {
      sendJson(ctx.res, 404, { error: `Unknown endpoint: ${ctx.pathname}` });
      return undefined;
    }

    return next();
  }

  /** Introspection helper — used by tests and the /api/health route listing. */
  router.list = () => {
    const exact = [...exactRoutes.entries()].flatMap(([path, byMethod]) =>
      [...byMethod.keys()].map((method) => `${method} ${path}`)
    );
    const param = paramRoutes.flatMap((entry) =>
      [...entry.byMethod.keys()].map((method) => `${method} ${entry.pattern}`)
    );
    return [...exact, ...param].sort();
  };

  return router;
}

module.exports = { createRouter, parseRouteKey, compilePattern };
