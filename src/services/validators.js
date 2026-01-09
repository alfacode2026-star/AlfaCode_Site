/**
 * Data validation utilities
 */

/**
 * Validate product data
 */
export function validateProduct(productData, isUpdate = false) {
  const errors = []

  // Required fields
  if (!isUpdate && !productData.name) {
    errors.push('اسم المنتج مطلوب')
  }
  // SKU is optional - will be auto-generated if empty
  // No need to require it here
  if (productData.purchasePrice === undefined || productData.purchasePrice === null) {
    errors.push('سعر الشراء مطلوب')
  }
  if (productData.sellingPrice === undefined || productData.sellingPrice === null) {
    errors.push('سعر البيع مطلوب')
  }
  if (productData.quantity === undefined || productData.quantity === null) {
    errors.push('الكمية مطلوبة')
  }

  // Type validation
  if (productData.purchasePrice !== undefined && (typeof productData.purchasePrice !== 'number' || productData.purchasePrice < 0)) {
    errors.push('سعر الشراء يجب أن يكون رقماً موجباً')
  }
  if (productData.sellingPrice !== undefined && (typeof productData.sellingPrice !== 'number' || productData.sellingPrice < 0)) {
    errors.push('سعر البيع يجب أن يكون رقماً موجباً')
  }
  if (productData.quantity !== undefined && (typeof productData.quantity !== 'number' || productData.quantity < 0)) {
    errors.push('الكمية يجب أن تكون رقماً موجباً')
  }
  if (productData.minQuantity !== undefined && (typeof productData.minQuantity !== 'number' || productData.minQuantity < 0)) {
    errors.push('الحد الأدنى يجب أن يكون رقماً موجباً')
  }
  if (productData.maxQuantity !== undefined && (typeof productData.maxQuantity !== 'number' || productData.maxQuantity < 0)) {
    errors.push('الحد الأقصى يجب أن يكون رقماً موجباً')
  }

  // Business logic validation
  if (productData.sellingPrice !== undefined && productData.purchasePrice !== undefined) {
    if (productData.sellingPrice < productData.purchasePrice) {
      errors.push('سعر البيع يجب أن يكون أكبر من أو يساوي سعر الشراء')
    }
  }
  if (productData.minQuantity !== undefined && productData.maxQuantity !== undefined) {
    if (productData.minQuantity > productData.maxQuantity) {
      errors.push('الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى')
    }
  }
  if (productData.quantity !== undefined && productData.maxQuantity !== undefined) {
    if (productData.quantity > productData.maxQuantity) {
      errors.push('الكمية الحالية يجب أن تكون أقل من أو تساوي الحد الأقصى')
    }
  }

  // String length validation
  if (productData.name && productData.name.length > 200) {
    errors.push('اسم المنتج طويل جداً (الحد الأقصى 200 حرف)')
  }
  if (productData.sku && productData.sku.length > 50) {
    errors.push('SKU طويل جداً (الحد الأقصى 50 حرف)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate order data
 */
export function validateOrder(orderData, inventoryService) {
  const errors = []

  // Required fields
  if (!orderData.customerId && !orderData.customerName) {
    errors.push('معلومات العميل مطلوبة')
  }
  if (!orderData.customerPhone) {
    errors.push('رقم هاتف العميل مطلوب')
  }
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('يجب إضافة منتج واحد على الأقل')
  }

  // Validate items
  if (orderData.items && Array.isArray(orderData.items)) {
    orderData.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`المنتج رقم ${index + 1}: معرف المنتج مطلوب`)
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`المنتج رقم ${index + 1}: الكمية يجب أن تكون أكبر من صفر`)
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`المنتج رقم ${index + 1}: سعر الوحدة يجب أن يكون أكبر من صفر`)
      }

      // Check inventory availability
      if (item.productId && inventoryService) {
        const product = inventoryService.getProduct(item.productId)
        if (!product) {
          errors.push(`المنتج رقم ${index + 1}: المنتج غير موجود`)
        } else if (product.quantity < item.quantity) {
          errors.push(`المنتج رقم ${index + 1}: الكمية المتاحة (${product.quantity}) أقل من المطلوبة (${item.quantity})`)
        }
      }
    })
  }

  // Validate phone number format (Saudi Arabia)
  if (orderData.customerPhone) {
    const phoneRegex = /^(05|5)[0-9]{8}$/
    if (!phoneRegex.test(orderData.customerPhone.replace(/[\s-]/g, ''))) {
      errors.push('رقم الهاتف غير صحيح (يجب أن يكون 10 أرقام تبدأ بـ 05)')
    }
  }

  // Validate email if provided
  if (orderData.customerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(orderData.customerEmail)) {
      errors.push('البريد الإلكتروني غير صحيح')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate customer data
 */
export function validateCustomer(customerData, isUpdate = false) {
  const errors = []

  // Required fields
  if (!isUpdate && !customerData.name) {
    errors.push('اسم العميل مطلوب')
  }
  if (!isUpdate && !customerData.email) {
    errors.push('البريد الإلكتروني مطلوب')
  }
  if (!isUpdate && !customerData.phone) {
    errors.push('رقم الهاتف مطلوب')
  }

  // Email validation
  if (customerData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerData.email)) {
      errors.push('البريد الإلكتروني غير صحيح')
    }
  }

  // Phone validation
  if (customerData.phone) {
    const phoneRegex = /^(05|5)[0-9]{8}$/
    if (!phoneRegex.test(customerData.phone.replace(/[\s-]/g, ''))) {
      errors.push('رقم الهاتف غير صحيح (يجب أن يكون 10 أرقام تبدأ بـ 05)')
    }
  }

  // String length validation
  if (customerData.name && customerData.name.length > 200) {
    errors.push('اسم العميل طويل جداً (الحد الأقصى 200 حرف)')
  }
  if (customerData.email && customerData.email.length > 100) {
    errors.push('البريد الإلكتروني طويل جداً')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate SKU uniqueness
 * Note: This is a client-side check. The service also validates uniqueness within tenant_id.
 * This function filters products by tenant_id if available.
 */
export function validateSKUUniqueness(sku, productId, products, tenantId = null) {
  if (!sku || !sku.trim()) {
    // SKU is optional, will be auto-generated
    return { isValid: true, errors: [] }
  }

  // Filter by tenant if tenantId is provided
  let filteredProducts = products
  if (tenantId) {
    filteredProducts = products.filter(p => p.tenant_id === tenantId)
  }

  const existingProduct = filteredProducts.find(p => p.sku === sku && p.id !== productId)
  if (existingProduct) {
    return {
      isValid: false,
      errors: ['SKU موجود مسبقاً في هذه الشركة']
    }
  }
  return { isValid: true, errors: [] }
}

/**
 * Validate email uniqueness
 */
export function validateEmailUniqueness(email, customerId, customers) {
  const existingCustomer = customers.find(c => c.email === email && c.id !== customerId)
  if (existingCustomer) {
    return {
      isValid: false,
      errors: ['البريد الإلكتروني موجود مسبقاً']
    }
  }
  return { isValid: true, errors: [] }
}
