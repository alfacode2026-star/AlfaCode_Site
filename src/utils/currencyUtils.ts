/**
 * Currency Utilities
 * Provides functions for currency formatting, symbol lookup, and treasury-to-currency syncing
 */

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  IQD: 'ع.د',
  EGP: 'ج.م',
  JOD: 'د.أ',
  KWD: 'د.ك',
  BHD: 'د.ب',
  OMR: 'ر.ع.',
  QAR: 'ر.ق',
  TRY: '₺',
  INR: '₹',
  PKR: '₨',
  CNY: '¥',
  JPY: '¥'
}

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode
}

/**
 * Format currency amount with symbol
 */
export const formatCurrencyWithSymbol = (
  amount: number,
  currencyCode?: string,
  language: 'en' | 'ar' = 'en'
): string => {
  // If no currency provided, return formatted number without symbol
  if (!currencyCode) {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  const symbol = getCurrencySymbol(currencyCode)
  const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
  
  return `${formatted} ${symbol}`
}

/**
 * Format currency label (e.g., "Total (SAR)" or "Total (AED)")
 */
export const formatCurrencyLabel = (
  label: string,
  currencyCode?: string
): string => {
  if (!currencyCode) return label
  return `${label} (${currencyCode})`
}

/**
 * Get currency from treasury account
 */
export const getCurrencyFromTreasury = (
  treasuryAccountId: string | null | undefined,
  treasuryAccounts: Array<{ id: string; currency?: string }>
): string | null => {
  if (!treasuryAccountId) return null
  
  const account = treasuryAccounts.find(acc => acc.id === treasuryAccountId)
  return account?.currency || null
}

/**
 * Format currency amount with code (simple format: "amount CURRENCY")
 * Global utility for consistent currency display across the application
 * @param amount - The numeric amount to format
 * @param recordCurrency - Currency from the record (e.g., contract.currency)
 * @param branchCurrency - Default currency from branch context
 * @returns Formatted string like "500,000 IQD" or "1,234 SAR"
 */
export const formatCurrency = (
  amount: number | undefined,
  recordCurrency?: string | null,
  branchCurrency?: string | null
): string => {
  const numericAmount = amount || 0
  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  
  const currency = recordCurrency || branchCurrency || 'IQD'
  return `${formatted} ${currency}`
}