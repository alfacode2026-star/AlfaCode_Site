/**
 * Utility functions for tenant ID validation
 */

/**
 * Validates if a tenant ID is a valid UUID format
 * @param {string} tenantId - The tenant ID to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
export function isValidUUID(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    return false
  }
  
  // UUID v4 format: 8-4-4-4-12 hexadecimal characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(tenantId)
}

/**
 * Validates tenant ID and returns error message if invalid
 * @param {string} tenantId - The tenant ID to validate
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
export function validateTenantId(tenantId) {
  if (!tenantId) {
    return {
      valid: false,
      error: 'Select a Company first'
    }
  }
  
  if (!isValidUUID(tenantId)) {
    return {
      valid: false,
      error: 'Invalid Company ID. Please select a valid company.'
    }
  }
  
  return { valid: true }
}
