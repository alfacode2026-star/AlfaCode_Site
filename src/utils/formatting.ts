import { useLanguage } from '../contexts/LanguageContext'

/**
 * Unified formatting utility for numbers, dates, and currencies
 * Respects the current language setting and defaults to en-US for English
 */

export const formatCurrency = (amount: number, language: 'en' | 'ar'): string => {
  if (language === 'ar') {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  // English: Use en-US formatting for professional output
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatNumber = (value: number, language: 'en' | 'ar', decimals: number = 2): string => {
  if (language === 'ar') {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }
  
  // English: Use en-US formatting
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

export const formatDate = (date: string | Date, language: 'en' | 'ar'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (language === 'ar') {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj)
  }
  
  // English: Use en-US formatting
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj)
}

export const formatDateTime = (date: string | Date, language: 'en' | 'ar'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (language === 'ar') {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  }
  
  // English: Use en-US formatting
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

/**
 * Hook to use formatting functions with current language
 */
export const useFormatting = () => {
  const { language } = useLanguage()
  
  return {
    formatCurrency: (amount: number) => formatCurrency(amount, language),
    formatNumber: (value: number, decimals?: number) => formatNumber(value, language, decimals),
    formatDate: (date: string | Date) => formatDate(date, language),
    formatDateTime: (date: string | Date) => formatDateTime(date, language)
  }
}
