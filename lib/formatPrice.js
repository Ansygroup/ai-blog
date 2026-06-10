export function formatPrice(price) {
  if (price == null) return '';
  if (typeof price === 'object' && price.value != null) {
    return `${price.currency || '$'}${Number(price.value).toFixed(2)}`;
  }
  const num = Number(price);
  return isNaN(num) ? String(price) : `$${num.toFixed(2)}`;
}

export function priceValue(price) {
  if (price == null) return 0;
  if (typeof price === 'object' && price.value != null) return Number(price.value);
  const n = Number(price);
  return isNaN(n) ? 0 : n;
}
