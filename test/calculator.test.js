'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const calculator = require('../src/calculator');

test('add() sums two numbers', () => {
  assert.equal(calculator.add(2, 3), 5);
  assert.equal(calculator.add(-2, 2), 0);
});

test('subtract() subtracts two numbers', () => {
  assert.equal(calculator.subtract(10, 4), 6);
});

test('multiply() multiplies two numbers', () => {
  assert.equal(calculator.multiply(6, 7), 42);
});

test('divide() divides two numbers', () => {
  assert.equal(calculator.divide(9, 3), 3);
});

test('divide() throws on division by zero', () => {
  assert.throws(() => calculator.divide(1, 0), RangeError);
});

test('power() raises to an exponent', () => {
  assert.equal(calculator.power(2, 10), 1024);
});

test('sum() adds every item of an array', () => {
  assert.equal(calculator.sum([1, 2, 3, 4, 5]), 15);
  assert.equal(calculator.sum([]), 0);
});

test('average() returns the mean value', () => {
  assert.equal(calculator.average([2, 4, 6]), 4);
});

test('average() rejects an empty array', () => {
  assert.throws(() => calculator.average([]), RangeError);
});

test('operations reject non numeric input', () => {
  assert.throws(() => calculator.add('1', 2), TypeError);
  assert.throws(() => calculator.multiply(null, 2), TypeError);
});
