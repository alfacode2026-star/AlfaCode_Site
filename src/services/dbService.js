// Database service for JSON file operations
class DBService {
  constructor() {
    this.dataPath = '/src/data/'
    this.versionKey = '_version' // For optimistic locking
  }

  // Load data from JSON file
  async loadData(fileName) {
    try {
      const response = await fetch(`${this.dataPath}${fileName}`)
      if (!response.ok) {
        throw new Error(`Failed to load ${fileName}: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      
      // Initialize version if not exists
      if (Array.isArray(data) && data.length > 0 && !data[0][this.versionKey]) {
        data.forEach(item => {
          if (!item[this.versionKey]) {
            item[this.versionKey] = 1
          }
        })
      }
      
      return data
    } catch (error) {
      console.error(`Error loading ${fileName}:`, error)
      // Fallback to localStorage
      const localData = this.loadFromLocalStorage(fileName.replace('.json', ''))
      return localData || []
    }
  }

  // Save data to localStorage (for persistence) with version control
  saveToLocalStorage(key, data, expectedVersion = null) {
    try {
      // Check version for optimistic locking
      if (expectedVersion !== null) {
        const currentData = this.loadFromLocalStorage(key)
        if (currentData && Array.isArray(currentData) && currentData.length > 0) {
          const currentVersion = currentData[0][this.versionKey] || 1
          if (currentVersion !== expectedVersion) {
            throw new Error(`Version mismatch: expected ${expectedVersion}, got ${currentVersion}`)
          }
        }
      }

      // Increment version
      if (Array.isArray(data) && data.length > 0) {
        const maxVersion = Math.max(...data.map(item => item[this.versionKey] || 1))
        data.forEach(item => {
          item[this.versionKey] = (item[this.versionKey] || maxVersion) + 1
        })
      }

      const serialized = JSON.stringify(data)
      
      // Check localStorage quota
      const quota = this.getStorageQuota()
      if (serialized.length > quota.available) {
        throw new Error(`Storage quota exceeded: need ${serialized.length} bytes, available ${quota.available} bytes`)
      }

      localStorage.setItem(key, serialized)
      return { success: true, version: data[0]?.[this.versionKey] || 1 }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred',
        errorCode: error.name === 'QuotaExceededError' ? 'QUOTA_EXCEEDED' : 'SAVE_FAILED'
      }
    }
  }

  // Load from localStorage with error handling
  loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key)
      if (!data) {
        return null
      }
      return JSON.parse(data)
    } catch (error) {
      console.error(`Error loading from localStorage (key: ${key}):`, error)
      // Try to recover by clearing corrupted data
      try {
        localStorage.removeItem(key)
        console.warn(`Cleared corrupted data for key: ${key}`)
      } catch (clearError) {
        console.error('Failed to clear corrupted data:', clearError)
      }
      return null
    }
  }

  // Get current version of data
  getDataVersion(key) {
    const data = this.loadFromLocalStorage(key)
    if (Array.isArray(data) && data.length > 0) {
      return data[0][this.versionKey] || 1
    }
    return 1
  }

  // Generate ID with better uniqueness
  generateId(prefix) {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    const counter = (this._counter = (this._counter || 0) + 1) % 1000
    return `${prefix}-${timestamp}-${random}-${counter}`
  }

  // Get storage quota information
  getStorageQuota() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        // This is async, but we'll return a sync estimate
        return {
          available: 5 * 1024 * 1024, // Conservative estimate: 5MB
          used: this.getStorageSize(),
          total: 10 * 1024 * 1024 // Estimate: 10MB
        }
      }
      return {
        available: 5 * 1024 * 1024,
        used: this.getStorageSize(),
        total: 10 * 1024 * 1024
      }
    } catch (error) {
      console.error('Error getting storage quota:', error)
      return { available: 0, used: 0, total: 0 }
    }
  }

  // Get current storage size
  getStorageSize() {
    let total = 0
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length
        }
      }
    } catch (error) {
      console.error('Error calculating storage size:', error)
    }
    return total
  }

  // Get statistics
  getStats(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        count: 0,
        totalValue: 0
      }
    }

    return {
      count: data.length,
      totalValue: data.reduce((sum, item) => {
        const value = item.total || (item.sellingPrice && item.quantity ? item.sellingPrice * item.quantity : 0) || 0
        return sum + (typeof value === 'number' ? value : 0)
      }, 0)
    }
  }

  // Batch operations
  async batchSave(operations) {
    const results = []
    const errors = []

    for (const op of operations) {
      try {
        const result = this.saveToLocalStorage(op.key, op.data, op.expectedVersion)
        results.push({ key: op.key, ...result })
        if (!result.success) {
          errors.push({ key: op.key, error: result.error })
        }
      } catch (error) {
        errors.push({ key: op.key, error: error.message })
        results.push({ key: op.key, success: false, error: error.message })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    }
  }
}

export default new DBService()