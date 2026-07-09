/** Format catalog/order amounts for display. */
export function formatPrice(price: number, currency: string): string {
  const code = currency.toUpperCase();
  if (code === 'UZS') {
    return `${new Intl.NumberFormat('en-US').format(price)} so'm`;
  }
  if (code === 'USD') {
    return `$${price}`;
  }
  return `${new Intl.NumberFormat('en-US').format(price)} ${code}`;
}
