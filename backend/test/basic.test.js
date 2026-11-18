import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscount, isValidQuantity } from '../src/utils/commerce.js';

test('quantity validation accepts positive whole numbers', () => {
  assert.equal(isValidQuantity(1), true);
  assert.equal(isValidQuantity('3'), true);
  assert.equal(isValidQuantity(0), false);
  assert.equal(isValidQuantity(-1), false);
  assert.equal(isValidQuantity(1.5), false);
  assert.equal(isValidQuantity('abc'), false);
});

test('percentage coupon calculates the expected discount', () => {
  assert.equal(calculateDiscount({
    subtotal: 1000, discountType: 'percentage', discountValue: 15
  }), 150);
});

test('fixed coupon is capped at the subtotal', () => {
  assert.equal(calculateDiscount({
    subtotal: 100, discountType: 'fixed', discountValue: 150
  }), 100);
});

test('maximum discount cap is applied', () => {
  assert.equal(calculateDiscount({
    subtotal: 1000, discountType: 'percentage', discountValue: 50, maxDiscount: 200
  }), 200);
});

test('invalid negative discount inputs are rejected', () => {
  assert.throws(() => calculateDiscount({
    subtotal: -1, discountType: 'fixed', discountValue: 10
  }), TypeError);
});
