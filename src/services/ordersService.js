import { supabase } from './supabaseClient'
import inventoryService from './inventoryService'
import customersService from './customersService'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class OrdersService {
  // Get all orders with their items (filtered by current tenant)
  async getOrders() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .order('created_at', { ascending: false })

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

  // Get order by ID (with tenant check)
  async getOrder(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch order.')
        return null
      }

      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId) // Filter by tenant
        .single()

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

      // Generate UUID if not provided (let Supabase handle it or use crypto.randomUUID())
      const orderId = orderData.id || crypto.randomUUID()

      // Try to find existing customer by email or phone
      let customerId = orderData.customerId || null
      if (!customerId && orderData.customerEmail) {
        const existingCustomer = await customersService.getCustomerByEmail(orderData.customerEmail)
        if (existingCustomer) {
          customerId = existingCustomer.id
        }
      }

      // Get tenant ID
      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // Prepare order data
      const newOrder = {
        id: orderId,
        tenant_id: tenantId, // Include tenant_id
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
        created_by: orderData.createdBy || 'user'
      }

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

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure tenant match
        .select()
        .single()

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

  // Delete order with inventory restoration (with tenant check)
  async deleteOrder(id) {
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

      // Get order to restore inventory
      const order = await this.getOrder(id)
      if (!order) {
        return {
          success: false,
          error: 'الطلب غير موجود',
          errorCode: 'ORDER_NOT_FOUND'
        }
      }

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
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure tenant match

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

  // Get orders by status (with tenant filter)
  async getOrdersByStatus(status) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .eq('status', status)
        .order('created_at', { ascending: false })

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

  // Get orders by customer (with tenant filter)
  async getOrdersByCustomer(customerId) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

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

  // Get orders by project (with tenant filter)
  async getOrdersByProject(projectId) {
    try {
      if (!projectId) {
        console.warn('No project ID provided. Cannot fetch orders.')
        return []
      }

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch orders.')
        return []
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

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

      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, status')
        .eq('tenant_id', tenantId) // Filter by tenant
        .eq('status', 'completed')

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
