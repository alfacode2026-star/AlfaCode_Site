import { supabase } from './supabaseClient'
import inventoryService from './inventoryService'
import customersService from './customersService'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'
import userManagementService from './userManagementService'

class OrdersService {
  // Generate PO number in format PO-YYYY-XXXX
  async generateOrderNumber() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot generate PO number.')
        // Fallback to timestamp-based
        const year = new Date().getFullYear()
        const timestamp = Date.now().toString().slice(-4)
        return `PO-${year}-${timestamp}`
      }

      const year = new Date().getFullYear()
      const prefix = `PO-${year}-`

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return fallback if branchId is null (for PO number generation)
      if (!branchId) {
        // Fallback to timestamp-based when no branch ID
        const timestamp = Date.now().toString().slice(-4)
        return `${prefix}${timestamp}`
      }
      
      // Get all orders for this tenant (and branch) in the current year
      let query = supabase
        .from('orders')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
        .like('id', `${prefix}%`)

      const { data: orders, error } = await query

      if (error) {
        console.error('Error fetching orders for PO number generation:', error)
        // Fallback to timestamp-based
        const timestamp = Date.now().toString().slice(-4)
        return `${prefix}${timestamp}`
      }

      // Extract sequence numbers from existing PO numbers (PO-YYYY-XXXX -> XXXX)
      const sequenceNumbers = (orders || [])
        .map(order => {
          const match = order.id.match(/^PO-\d{4}-(\d{4})$/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(num => num > 0)

      // Get the next sequence number
      const nextSequence = sequenceNumbers.length > 0
        ? Math.max(...sequenceNumbers) + 1
        : 1

      // Format with 4 digits (0001, 0002, etc.)
      const formattedSequence = nextSequence.toString().padStart(4, '0')

      return `${prefix}${formattedSequence}`
    } catch (error) {
      console.error('Error generating PO number:', error)
      // Fallback to timestamp-based
      const year = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-4)
      return `PO-${year}-${timestamp}`
    }
  }

  // Get all orders with their items (filtered by current tenant and branch)
  async getOrders() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch orders.')
        return []
      }

      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: orders, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true })

          if (itemsError) {
            console.error('Error fetching order items:', itemsError)
            return this.mapToCamelCase(order, [])
          }

          return this.mapToCamelCase(order, items || [])
        })
      )

      return ordersWithItems
    } catch (error) {
      console.error('Error fetching orders:', error.message)
      return []
    }
  }

  // Get order by ID (with tenant and branch check)
  async getOrder(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch order.')
        return null
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch order.')
        return null
      }

      let query = supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: order, error } = await query.single()

      if (error) throw error

      // Fetch order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true })

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        return this.mapToCamelCase(order, [])
      }

      return this.mapToCamelCase(order, items || [])
    } catch (error) {
      console.error('Error fetching order:', error.message)
      return null
    }
  }

  // Create new order with items and inventory adjustment
  async createOrder(orderData) {
    try {
      // For settlement POs, skip tax/discounts and use exact amount
      const isSettlementPO = orderData.isSettlementPO === true
      const exactTotal = orderData.exactTotal !== undefined ? parseFloat(orderData.exactTotal) : null

      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => {
        const itemTotal = (item.total || item.unitPrice * item.quantity) || 0
        return sum + itemTotal
      }, 0)

      let discountAmount = 0
      let tax = 0
      let total = subtotal

      if (!isSettlementPO && exactTotal === null) {
        // Apply discount if provided (can be percentage or fixed amount)
        const discount = orderData.discount || 0
        discountAmount = discount > 0 && discount < 1 
          ? subtotal * discount  // Percentage (e.g., 0.1 = 10%)
          : discount  // Fixed amount

        const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount)
        tax = subtotalAfterDiscount * 0.05 // 5% tax
        total = subtotalAfterDiscount + tax
      } else if (isSettlementPO && exactTotal !== null) {
        // For settlement POs, use exact total (no tax, no discount)
        total = exactTotal
        discountAmount = 0
        tax = 0
      }

      // Generate PO number in format PO-YYYY-XXXX if not provided
      let orderId = orderData.id || await this.generateOrderNumber()

      // Get tenant ID (needed for checking existing order)
      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      const branchId = branchStore.getBranchId()
      
      // Check if order ID already exists (prevent duplicate key errors)
      if (orderId) {
        // MANDATORY BRANCH ISOLATION: Return fallback if branchId is null (for duplicate check)
        if (!branchId) {
          // If no branch ID, skip duplicate check and proceed
        } else {
          let checkQuery = supabase
            .from('orders')
            .select('id')
            .eq('id', orderId)
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

          const { data: existingOrder, error: checkError } = await checkQuery.maybeSingle()

          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is fine
            console.error('Error checking existing order:', checkError)
          }

          if (existingOrder) {
            // Generate a new ID if the provided one exists
            orderId = await this.generateOrderNumber()
            console.warn(`Order ID ${orderData.id} already exists, using new ID: ${orderId}`)
          }
        }
      }

      // Try to find existing customer by email or phone
      let customerId = orderData.customerId || null
      if (!customerId && orderData.customerEmail) {
        const existingCustomer = await customersService.getCustomerByEmail(orderData.customerEmail)
        if (existingCustomer) {
          customerId = existingCustomer.id
        }
      }


      // Get currency from treasury account if provided, otherwise default to SAR
      const currency = orderData.currency || 'SAR'

      // Prepare order data
      const newOrder = {
        id: orderId,
        tenant_id: tenantId,
        customer_id: customerId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_email: orderData.customerEmail || null,
        project_id: orderData.projectId || null, // Include project_id for engineering mode
        work_scope: orderData.workScope || null, // Include work_scope for engineering mode
        subtotal: subtotal,
        discount: discountAmount || 0,
        tax: tax,
        total: total,
        status: orderData.status || 'pending',
        payment_method: orderData.paymentMethod || 'cash',
        payment_status: orderData.paymentStatus || 'unpaid',
        shipping_method: orderData.shippingMethod || null,
        shipping_address: orderData.shippingAddress || null,
        tracking_number: orderData.trackingNumber || null,
        notes: orderData.notes || null,
        created_by: orderData.createdBy || 'user',
        currency: currency // Currency from treasury account
      }
      
      // MANDATORY BRANCH INJECTION: Explicitly set from branchStore (ignore frontend)
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot create order.',
          errorCode: 'NO_BRANCH_ID'
        }
      }
      newOrder.branch_id = branchId // MANDATORY: Explicitly set from branchStore (not from frontend)

      // Prepare order items
      const orderItems = orderData.items.map(item => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.productName || 'منتج غير معروف',
        quantity: item.quantity,
        unit_price: item.unitPrice || item.price || 0,
        total: item.total || (item.unitPrice || item.price || 0) * item.quantity
      }))

      // Use Supabase transaction (rpc function would be better, but for now we'll do sequential)
      // Adjust inventory only for items that have a productId (not manual entries)
      for (const item of orderData.items) {
        // Skip inventory adjustment for manual entries (purchase orders)
        if (item.isManualEntry || !item.productId) {
          continue
        }

        const adjustResult = await inventoryService.adjustQuantity(
          item.productId,
          -item.quantity,
          'sale'
        )

        if (!adjustResult.success) {
          // Rollback: restore inventory for items already adjusted
          for (const rollbackItem of orderData.items) {
            if (rollbackItem.productId === item.productId) break
            if (!rollbackItem.isManualEntry && rollbackItem.productId) {
              await inventoryService.adjustQuantity(
                rollbackItem.productId,
                rollbackItem.quantity,
                'restore'
              )
            }
          }
          throw new Error(`فشل في تحديث مخزون المنتج ${item.productId}: ${adjustResult.error}`)
        }
      }

      // Insert order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single()

      if (orderError) {
        // Rollback inventory (only for items with productId)
        for (const item of orderData.items) {
          if (!item.isManualEntry && item.productId) {
            await inventoryService.adjustQuantity(item.productId, item.quantity, 'restore')
          }
        }
        throw orderError
      }

      // Insert order items
      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select()

      if (itemsError) {
        // Rollback: delete order and restore inventory (only for items with productId)
        await supabase.from('orders').delete().eq('id', orderId)
        for (const item of orderData.items) {
          if (!item.isManualEntry && item.productId) {
            await inventoryService.adjustQuantity(item.productId, item.quantity, 'restore')
          }
        }
        throw itemsError
      }

      return {
        success: true,
        order: this.mapToCamelCase(insertedOrder, insertedItems || [])
      }
    } catch (error) {
      console.error('Error creating order:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء الطلب',
        errorCode: error.message.includes('مخزون') ? 'INVENTORY_ERROR' : 'CREATE_ORDER_FAILED'
      }
    }
  }

  // Update order status (with tenant check)
  async updateOrderStatus(id, status) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الطلب مطلوب',
          errorCode: 'INVALID_ID'
        }
      }

      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // Get current order
      const currentOrder = await this.getOrder(id)
      if (!currentOrder) {
        return {
          success: false,
          error: 'الطلب غير موجود',
          errorCode: 'ORDER_NOT_FOUND'
        }
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: `حالة غير صحيحة. الحالات المسموحة: ${validStatuses.join(', ')}`,
          errorCode: 'INVALID_STATUS'
        }
      }

      const updateData = {
        status: status
      }

      // If completed, update payment status
      if (status === 'completed') {
        updateData.payment_status = 'paid'
      }

      // If cancelled, restore inventory (only for items with productId)
      if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
        for (const item of currentOrder.items) {
          // Only restore inventory for items that were tracked (not manual entries)
          if (item.productId && !item.isManualEntry) {
            await inventoryService.adjustQuantity(item.productId, item.quantity, 'restore')
          }
        }
      }

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      let query = supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.select().single()

      if (error) throw error

      // Fetch updated order with items
      const updatedOrder = await this.getOrder(id)

      return {
        success: true,
        order: updatedOrder
      }
    } catch (error) {
      console.error('Error updating order status:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث حالة الطلب',
        errorCode: 'UPDATE_STATUS_FAILED'
      }
    }
  }

  // Delete order (3-Layer Security Protocol)
  async deleteOrder(id, password, deletionReason) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الطلب مطلوب',
          errorCode: 'INVALID_ID'
        }
      }

      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      // 🟢 LAYER 1: AUTHORIZATION - Check user role (Permission Check)
      const profile = await userManagementService.getCurrentUserProfile()
      const userRole = profile?.role || null
      const allowedRoles = ['super_admin', 'admin', 'manager', 'owner']
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        return {
          success: false,
          error: 'Access Denied: You do not have permission to delete records.',
          errorCode: 'UNAUTHORIZED'
        }
      }

      // Step 1: Get current user and order info
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user || !user.email) {
        return {
          success: false,
          error: 'Authentication required',
          errorCode: 'AUTH_REQUIRED'
        }
      }

      // 🟡 LAYER 2: AUTHENTICATION - Verify password (Identity Check)
      if (!password) {
        return {
          success: false,
          error: 'Password is required for deletion',
          errorCode: 'PASSWORD_REQUIRED'
        }
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (authError) {
        return {
          success: false,
          error: 'Security Alert: Incorrect Password.',
          errorCode: 'INVALID_PASSWORD'
        }
      }

      // Step 3: Get order to restore inventory and for audit log
      const order = await this.getOrder(id)
      if (!order) {
        return {
          success: false,
          error: 'الطلب غير موجود',
          errorCode: 'ORDER_NOT_FOUND'
        }
      }

      // 🔴 LAYER 3: DOCUMENTATION - Audit Logging (MANDATORY - Abort if fails)
      if (!deletionReason || deletionReason.trim() === '') {
        return {
          success: false,
          error: 'Deletion reason is required for audit purposes',
          errorCode: 'REASON_REQUIRED'
        }
      }

      const deletionLog = {
        table_name: 'orders',
        record_ref_number: order.orderNumber || `PO-${id}`,
        record_id: id,
        deletion_reason: deletionReason.trim(),
        deleted_by: user.id,
        tenant_id: tenantId,
        branch_id: branchId,
        deleted_data: JSON.stringify(order) // Store snapshot of deleted record
      }

      const { error: logError } = await supabase
        .from('deletion_logs')
        .insert([deletionLog])

      if (logError) {
        console.error('Error logging deletion:', logError)
        return {
          success: false,
          error: 'Deletion aborted: Failed to create audit log. Please contact support.',
          errorCode: 'AUDIT_LOG_FAILED'
        }
      }

      // 🏁 EXECUTION - Only after Layers 1, 2, and 3 pass successfully
      // Restore inventory if order is not cancelled (only for items with productId)
      if (order.status !== 'cancelled') {
        for (const item of order.items) {
          // Only restore inventory for items that were tracked (not manual entries)
          if (item.productId && !item.isManualEntry) {
            await inventoryService.adjustQuantity(item.productId, item.quantity, 'restore')
          }
        }
      }

      // Delete order (cascade will delete order_items)
      let query = supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { error } = await query

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting order:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف الطلب',
        errorCode: 'DELETE_ORDER_FAILED'
      }
    }
  }

  // Get orders by status (with tenant and branch filter)
  async getOrdersByStatus(status) {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch orders.')
        return []
      }

      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          return this.mapToCamelCase(order, items || [])
        })
      )

      return ordersWithItems
    } catch (error) {
      console.error('Error fetching orders by status:', error.message)
      return []
    }
  }

  // Get orders by customer (with tenant and branch filter)
  async getOrdersByCustomer(customerId) {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch orders.')
        return []
      }

      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          return this.mapToCamelCase(order, items || [])
        })
      )

      return ordersWithItems
    } catch (error) {
      console.error('Error fetching orders by customer:', error.message)
      return []
    }
  }

  // Get orders by project (with tenant and branch filter)
  async getOrdersByProject(projectId) {
    try {
      if (!projectId) {
        console.warn('No project ID provided. Cannot fetch orders.')
        return []
      }

      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch orders.')
        return []
      }

      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true })

          return this.mapToCamelCase(order, items || [])
        })
      )

      return ordersWithItems
    } catch (error) {
      console.error('Error fetching orders by project:', error.message)
      return []
    }
  }

  // Get order statistics
  async getOrderStats() {
    try {
      const orders = await this.getOrders()
      const completedOrders = orders.filter(o => o.status === 'completed')
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      const pendingOrders = orders.filter(o => o.status === 'pending').length

      return {
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        pendingOrders: pendingOrders,
        completedOrders: completedOrders.length,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0
      }
    } catch (error) {
      console.error('Error getting order stats:', error.message)
      return {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageOrderValue: 0
      }
    }
  }

  // Get monthly revenue data (with tenant filter)
  async getMonthlyRevenue() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch revenue data.')
        return {}
      }

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return empty object if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch revenue data.')
        return {}
      }

      let query = supabase
        .from('orders')
        .select('total, created_at, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query

      if (error) throw error

      const monthlyData = {}
      ;(data || []).forEach(order => {
        if (order.created_at) {
          const month = order.created_at.substring(0, 7) // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, orders: 0 }
          }
          monthlyData[month].revenue += parseFloat(order.total) || 0
          monthlyData[month].orders += 1
        }
      })

      return monthlyData
    } catch (error) {
      console.error('Error getting monthly revenue:', error.message)
      return {}
    }
  }

  // Legacy method for compatibility (loadOrders)
  async loadOrders() {
    return this.getOrders()
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(order, items) {
    if (!order) return null

    return {
      id: order.id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      projectId: order.project_id || null,
      workScope: order.work_scope || null,
      items: (items || []).map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price) || 0,
        total: parseFloat(item.total) || 0
      })),
      subtotal: parseFloat(order.subtotal) || 0,
      discount: parseFloat(order.discount) || 0,
      tax: parseFloat(order.tax) || 0,
      total: parseFloat(order.total) || 0,
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      shippingMethod: order.shipping_method,
      shippingAddress: order.shipping_address,
      trackingNumber: order.tracking_number,
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      createdBy: order.created_by
    }
  }
}

const ordersService = new OrdersService()
export default ordersService
