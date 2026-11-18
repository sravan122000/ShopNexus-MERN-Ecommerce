export function isValidQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0;
}


export function calculateDiscount({ subtotal, discountType, discountValue, maxDiscount = null }) {
  const amount = Number(subtotal);
  const value = Number(discountValue);

  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(value) || value < 0) {
    throw new TypeError('Subtotal and discount must be non-negative numbers');
  }

  if (!['percentage', 'fixed'].includes(discountType)) {
    throw new TypeError('Invalid discount type');
  }

  if (discountType === 'percentage' && value > 100) {
    throw new TypeError('Percentage discount cannot exceed 100');
  }

  let discount = discountType === 'percentage'
    ? amount * value / 100
    : value;

  if (maxDiscount !== null && maxDiscount !== undefined) {
    const cap = Number(maxDiscount);
    if (!Number.isFinite(cap) || cap < 0) {
      throw new TypeError('Maximum discount must be non-negative');
    }
    discount = Math.min(discount, cap);
  }

  return Math.min(amount, Math.max(0, discount));
}

