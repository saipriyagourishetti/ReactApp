'use strict';

const { sendJson, badRequest } = require('../http');
const calculator = require('../calculator');

/**
 * GET /api/calc/percentage?value=&percent=
 *
 * Returns { result } where result = (value * percent) / 100.
 * Responds 400 when either query parameter is missing or non-numeric.
 */
function percentage(ctx) {
  const value = parseFloat(ctx.query.get('value'));
  const percent = parseFloat(ctx.query.get('percent'));

  if (Number.isNaN(value) || Number.isNaN(percent)) {
    throw badRequest('Query parameters "value" and "percent" must be numeric.');
  }

  const result = calculator.percentage(value, percent);
  sendJson(ctx.res, 200, { result });
}

/**
 * GET /api/calc/sqrt?value=
 *
 * Returns { result } where result = Math.sqrt(value).
 * Responds 400 when the query parameter is missing, non-numeric, or negative.
 */
function sqrt(ctx) {
  const value = parseFloat(ctx.query.get('value'));

  if (Number.isNaN(value)) {
    throw badRequest('Query parameter "value" must be numeric.');
  }

  try {
    const result = calculator.sqrt(value);
    sendJson(ctx.res, 200, { result });
  } catch (err) {
    if (err instanceof RangeError) {
      throw badRequest(err.message);
    }
    throw err;
  }
}

const routes = {
  'GET /api/calc/percentage': percentage,
  'GET /api/calc/sqrt': sqrt,
};

module.exports = { routes, percentage, sqrt };
