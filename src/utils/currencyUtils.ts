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
export const getCurrencySymbol = (currencyCode: string | null | undefined, language: 'en' | 'ar' = 'en'): string => {
  if (!currencyCode) return 'SAR'
  // CRITICAL: For SAR, return locale-specific symbol
  if (currencyCode === 'SAR') {
    return language === 'ar' ? 'ر.س' : 'SAR'
  }
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode
}

/**
 * Format currency amount with symbol
 * CRITICAL: Returns symbol based on locale (ر.س for Arabic, SAR for English)
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
  
  // CRITICAL: For SAR, use locale-specific symbol
  let symbol: string
  if (currencyCode === 'SAR') {
    symbol = language === 'ar' ? 'ر.س' : 'SAR'
  } else {
    symbol = getCurrencySymbol(currencyCode)
  }
  
  const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
  
  return `${formatted} ${symbol}`
}

/**
 * Format currency label (e.g., "Total (SAR)" or "المبلغ (ر.س)")
 * Returns label with currency code/symbol based on language
 */
export const formatCurrencyLabel = (
  label: string,
  currencyCode?: string | null,
  language: 'en' | 'ar' = 'en'
): string => {
  if (!currencyCode) return label
  
  // Get currency symbol for display
  const symbol = getCurrencySymbol(currencyCode, language)
  
  // Return label with currency symbol
  return `${label} (${symbol})`
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
 * @param language - Language for symbol display ('en' | 'ar')
 * @returns Formatted string like "500,000 ر.س" (Arabic) or "1,234 SAR" (English)
 */
export const formatCurrency = (
  amount: number | undefined,
  recordCurrency?: string | null,
  branchCurrency?: string | null,
  language: 'en' | 'ar' = 'en'
): string => {
  const numericAmount = amount || 0
  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  
  // Default to SAR if no currency specified
  const currency = recordCurrency || branchCurrency || 'SAR'
  
  // CRITICAL: Return symbol based on locale, not currency code
  // Arabic: Use "ر.س" for SAR, English: Use "SAR"
  if (currency === 'SAR') {
    const symbol = language === 'ar' ? 'ر.س' : 'SAR'
    return `${formatted} ${symbol}`
  }
  
  // For other currencies, use the symbol from mapping
  const symbol = getCurrencySymbol(currency)
  return `${formatted} ${symbol}`
}