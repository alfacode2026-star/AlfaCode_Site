/**
 * Cache Utilities
 * Provides functions to clear application caches (localStorage, context state)
 */

/**
 * Clear all application-related cache from localStorage
 * This includes:
 * - Tenant IDs
 * - Branch IDs
 * - Currency cache
 * - Branch selection cache
 */
export const clearApplicationCache = (): void => {
  try {
    // Clear tenant-related cache
    localStorage.removeItem('currentTenantId')
    localStorage.removeItem('selected_branch_tenant_id')
    
    // Clear branch-related cache
    localStorage.removeItem('selected_branch_id')
    localStorage.removeItem('branch_currency_cache')
    
    // Clear any other app-specific cache keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('branch_') ||
        key.startsWith('tenant_') ||
        key.startsWith('currency_') ||
        key === 'selected_branch_id' ||
        key === 'selected_branch_tenant_id' ||
        key === 'currentTenantId' ||
        key === 'branch_currency_cache'
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    console.log('✅ [cacheUtils] Cleared application cache:', keysToRemove.length, 'items')
  } catch (error) {
    console.error('❌ [cacheUtils] Error clearing cache:', error)
  }
}

/**
 * Clear only branch-related cache
 */
export const clearBranchCache = (): void => {
  try {
    localStorage.removeItem('selected_branch_id')
    localStorage.removeItem('selected_branch_tenant_id')
    localStorage.removeItem('branch_currency_cache')
    console.log('✅ [cacheUtils] Cleared branch cache')
  } catch (error) {
    console.error('❌ [cacheUtils] Error clearing branch cache:', error)
  }
}

/**
 * Clear only tenant-related cache
 */
export const clearTenantCache = (): void => {
  try {
    localStorage.removeItem('currentTenantId')
    localStorage.removeItem('selected_branch_tenant_id')
    console.log('✅ [cacheUtils] Cleared tenant cache')
  } catch (error) {
    console.error('❌ [cacheUtils] Error clearing tenant cache:', error)
  }
}
