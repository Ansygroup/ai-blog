export function formatPrice(price) {
  if (price == null) return '';
  if (typeof price === 'object' && price.value != null) {
    if (Number(price.value) === 0) return 'Check price';
    return `${price.currency || '$'}${Number(price.value).toFixed(2)}`;
  }
  const num = Number(price);
  if (isNaN(num)) return String(price);
  if (num === 0) return 'Check price';
  return `$${num.toFixed(2)}`;
}

export function priceValue(price) {
  if (price == null) return 0;
  if (typeof price === 'object' && price.value != null) return Number(price.value);
  const n = Number(price);
  return isNaN(n) ? 0 : n;
}
