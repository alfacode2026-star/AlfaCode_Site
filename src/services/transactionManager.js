/**
 * Transaction Manager for localStorage operations
 * Provides atomic operations and rollback capability
 */
class TransactionManager {
  constructor() {
    this.transactions = new Map()
    this.locks = new Map()
    this.LOCK_TTL = 5000 // 5 seconds TTL for locks
    this.LOCK_STORAGE_PREFIX = 'lock_'
    
    // Cleanup expired locks on initialization
    this.cleanupExpiredLocks()
  }

  /**
   * Check if a lock is expired
   */
  isLockExpired(lockData) {
    if (!lockData || !lockData.expiresAt) {
      return true // Consider invalid lock data as expired
    }
    return Date.now() > lockData.expiresAt
  }

  /**
   * Clean up expired locks from memory and localStorage
   */
  cleanupExpiredLocks() {
    const now = Date.now()
    
    // Clean memory locks
    for (const [resourceKey, lockData] of this.locks.entries()) {
      if (this.isLockExpired(lockData)) {
        this.locks.delete(resourceKey)
      }
    }
    
    // Clean localStorage locks
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.LOCK_STORAGE_PREFIX)) {
          try {
            const lockData = JSON.parse(localStorage.getItem(key))
            if (this.isLockExpired(lockData)) {
              keysToRemove.push(key)
            }
          } catch (e) {
            // Invalid lock data, remove it
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
      
      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} expired lock(s)`)
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error)
    }
  }

  /**
   * Acquire a lock for a resource with TTL
   */
  async acquireLock(resourceKey, timeout = 3000) {
    const startTime = Date.now()
    const lockStorageKey = `${this.LOCK_STORAGE_PREFIX}${resourceKey}`
    
    // Cleanup expired locks before attempting to acquire
    this.cleanupExpiredLocks()
    
    while (true) {
      // Check memory lock
      const memoryLock = this.locks.get(resourceKey)
      if (memoryLock && !this.isLockExpired(memoryLock)) {
        // Lock is active and not expired, wait
        if (Date.now() - startTime > timeout) {
          // Force release expired locks before throwing error
          this.cleanupExpiredLocks()
          // Check one more time after cleanup
          const stillLocked = this.locks.get(resourceKey)
          if (stillLocked && !this.isLockExpired(stillLocked)) {
            throw new Error(`Lock timeout for resource: ${resourceKey}`)
          }
          // Lock was cleared, continue to acquire
        } else {
          await new Promise(resolve => setTimeout(resolve, 50))
          continue
        }
      }
      
      // Check localStorage lock
      try {
        const storedLock = localStorage.getItem(lockStorageKey)
        if (storedLock) {
          const lockData = JSON.parse(storedLock)
          if (!this.isLockExpired(lockData)) {
            // Lock exists and is valid, wait
            if (Date.now() - startTime > timeout) {
              // Force release expired locks
              this.cleanupExpiredLocks()
              // Check one more time
              const stillStored = localStorage.getItem(lockStorageKey)
              if (stillStored) {
                const stillLockData = JSON.parse(stillStored)
                if (!this.isLockExpired(stillLockData)) {
                  throw new Error(`Lock timeout for resource: ${resourceKey}`)
                }
              }
              // Lock was cleared, continue to acquire
            } else {
              await new Promise(resolve => setTimeout(resolve, 50))
              continue
            }
          } else {
            // Lock expired, remove it
            localStorage.removeItem(lockStorageKey)
          }
        }
      } catch (error) {
        // Invalid lock data, remove it
        localStorage.removeItem(lockStorageKey)
      }
      
      // No valid lock found, acquire it
      const lockData = {
        locked: true,
        expiresAt: Date.now() + this.LOCK_TTL,
        resourceKey: resourceKey,
        timestamp: Date.now()
      }
      
      // Set in memory
      this.locks.set(resourceKey, lockData)
      
      // Set in localStorage (for cross-tab awareness)
      try {
        localStorage.setItem(lockStorageKey, JSON.stringify(lockData))
      } catch (error) {
        console.warn('Failed to store lock in localStorage:', error)
        // Continue with memory lock only
      }
      
      return true
    }
  }

  /**
   * Release a lock
   */
  releaseLock(resourceKey) {
    const lockStorageKey = `${this.LOCK_STORAGE_PREFIX}${resourceKey}`
    
    // Remove from memory
    this.locks.delete(resourceKey)
    
    // Remove from localStorage
    try {
      localStorage.removeItem(lockStorageKey)
    } catch (error) {
      console.warn('Failed to remove lock from localStorage:', error)
    }
  }

  /**
   * Execute a transaction with rollback capability
   */
  async executeTransaction(transactionId, operations) {
    const transaction = {
      id: transactionId,
      operations: [],
      rollback: [],
      startTime: Date.now()
    }

    try {
      // Execute all operations
      for (const operation of operations) {
        const { type, resourceKey, operationFn, rollbackFn } = operation
        
        // Acquire lock
        await this.acquireLock(resourceKey)
        
        try {
          // Execute operation
          const result = await operationFn()
          
          // Store for rollback
          transaction.operations.push({
            type,
            resourceKey,
            result,
            rollbackFn
          })
          
          // Store rollback function
          if (rollbackFn) {
            transaction.rollback.push(() => rollbackFn(result))
          }
        } finally {
          // Release lock
          this.releaseLock(resourceKey)
        }
      }

      // Commit transaction
      this.transactions.set(transactionId, transaction)
      return { success: true, transactionId }
      
    } catch (error) {
      // Rollback all operations
      await this.rollbackTransaction(transaction)
      throw error
    }
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transaction) {
    // Execute rollback operations in reverse order
    for (let i = transaction.rollback.length - 1; i >= 0; i--) {
      try {
        await transaction.rollback[i]()
      } catch (error) {
        console.error('Rollback operation failed:', error)
      }
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId) {
    return this.transactions.get(transactionId)
  }

  /**
   * Clean up old transactions
   */
  cleanup(maxAge = 3600000) { // 1 hour
    const now = Date.now()
    for (const [id, transaction] of this.transactions.entries()) {
      if (now - transaction.startTime > maxAge) {
        this.transactions.delete(id)
      }
    }
  }

  /**
   * Force release all locks (emergency cleanup)
   */
  forceReleaseAllLocks() {
    // Clear memory locks
    this.locks.clear()
    
    // Clear localStorage locks
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.LOCK_STORAGE_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
      
      console.log(`Force released ${keysToRemove.length} lock(s)`)
    } catch (error) {
      console.error('Error force releasing locks:', error)
    }
  }
}

export default new TransactionManager()
