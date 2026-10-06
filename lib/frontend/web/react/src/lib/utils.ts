import { CURRENCY_LOCALE, DISPLAY_CURRENCY } from './currency'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Format angka uang untuk tampilan Rupiah.
 *
 * Currency dari API sengaja diabaikan dan diganti DISPLAY_CURRENCY. Lihat
 * lib/currency.ts untuk kenapa ini hanya mengubah format dan bukan nilai.
 */
export function formatCurrency(value: number, _currency?: string): string {
  const amount = Number.isFinite(value) ? value : 0

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: 'currency',
      currency: DISPLAY_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: DISPLAY_CURRENCY === 'IDR' ? 0 : 2,
    }).format(amount)
  } catch {
    return `Rp${amount.toFixed(0)}`
  }
}

/** Angka ringkas untuk stok, contoh 1200 -> "1,2rb". */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return new Intl.NumberFormat(CURRENCY_LOCALE, { notation: 'compact' }).format(value)
}

export function initials(value: string, max = 2): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }

  return words
    .slice(0, max)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function truncate(value: string, max: number): string {
  if (!value) {
    return ''
  }

  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}