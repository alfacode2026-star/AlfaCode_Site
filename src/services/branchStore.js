// Simple branch store that can be imported by services
// This is a plain JavaScript module, not a React component
// Reads from localStorage using the same key as BranchContext ('selected_branch_id')

const STORAGE_KEY = 'selected_branch_id'

let currentBranchId = null

export const branchStore = {
  getBranchId: () => {
    // Always read from localStorage to get the latest value
    // This ensures services get the current branch even if context hasn't updated yet
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      currentBranchId = stored
    }
    return currentBranchId
  },
  
  setBranchId: (branchId) => {
    currentBranchId = branchId
    // Store in localStorage for persistence (same key as BranchContext uses)
    if (branchId) {
      localStorage.setItem(STORAGE_KEY, branchId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  },
  
  init: () => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      currentBranchId = stored
    }
  }
}

// Initialize on module load
branchStore.init()

export default branchStore
