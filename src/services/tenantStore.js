// Simple tenant store that can be imported by services
// This is a plain JavaScript module, not a React component

let currentTenantId = null

export const tenantStore = {
  getTenantId: () => currentTenantId,
  
  setTenantId: (tenantId) => {
    currentTenantId = tenantId
    // Store in localStorage for persistence
    if (tenantId) {
      localStorage.setItem('currentTenantId', tenantId)
    } else {
      localStorage.removeItem('currentTenantId')
    }
  },
  
  init: () => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('currentTenantId')
    if (stored) {
      currentTenantId = stored
    }
  }
}

// Initialize on module load
tenantStore.init()

export default tenantStore
