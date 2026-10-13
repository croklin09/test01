// Formato de montos. Hermes trae Intl en Android, pero si una moneda no es válida se cae al formato simple.

export function formatMoney(amount: number, currency = '', opts: { compact?: boolean } = {}): string {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : '';
  const digits = opts.compact || Math.abs(amount) >= 1000 ? 0 : 2;
  try {
    return new Intl.NumberFormat('es-AR', {
      style: code ? 'currency' : 'decimal',
      currency: code || undefined,
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
      notation: opts.compact ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    return `$${amount.toFixed(digits)}`;
  }
}

/** Moneda más usada: las estadísticas comparan montos solo dentro de una misma moneda. */
export function mainCurrency(items: { currency: string }[]): string {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.currency, (counts.get(i.currency) ?? 0) + 1);
  let best = '';
  let max = -1;
  for (const [c, n] of counts) if (n > max) [best, max] = [c, n];
  return best;
}
