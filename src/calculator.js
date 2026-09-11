'use strict';

/**
 * Simple calculator utilities used to demonstrate unit testing.
 */

function assertNumbers(...values) {
  for (const value of values) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(`Expected a number but received: ${String(value)}`);
    }
  }
}

function add(a, b) {
  assertNumbers(a, b);
  return a + b;
}

function subtract(a, b) {
  assertNumbers(a, b);
  return a - b;
}

function multiply(a, b) {
  assertNumbers(a, b);
  return a * b;
}

function divide(a, b) {
  assertNumbers(a, b);
  if (b === 0) {
    throw new RangeError('Division by zero is not allowed');
  }
  return a / b;
}

function power(base, exponent) {
  assertNumbers(base, exponent);
  return base ** exponent;
}

function sum(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('sum() expects an array of numbers');
  }
  assertNumbers(...values);
  return values.reduce((total, value) => total + value, 0);
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('average() expects a non-empty array');
  }
  return sum(values) / values.length;
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  power,
  sum,
  average,
};
