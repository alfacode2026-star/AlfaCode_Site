import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class CustomersService {
  // Get all customers (filtered by current tenant)
  async getCustomers() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch customers.')
        return []
      }

      let query = supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return (data || []).map(c => this.mapToCamelCase(c))
    } catch (error) {
      console.error('Error fetching customers:', error.message)
      return []
    }
  }

  // Get customer by ID (with tenant check)
  async getCustomer(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch customer.')
        return null
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error
      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching customer:', error.message)
      return null
    }
  }

  // Get customer by email (with tenant check)
  async getCustomerByEmail(email) {
    try {
      if (!email) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch customer.')
        return null
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('tenant_id', tenantId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
      return data ? this.mapToCamelCase(data) : null
    } catch (error) {
      console.error('Error fetching customer by email:', error.message)
      return null
    }
  }

  // Add new customer
  async addCustomer(customerData) {
    try {
      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // Generate UUID if not provided (let Supabase handle it or use crypto.randomUUID())
      const customerId = customerData.id || crypto.randomUUID()

      const newCustomer = {
        id: customerId,
        tenant_id: tenantId, // Include tenant_id
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        company: customerData.company || null,
        address: customerData.address || null,
        city: customerData.city || null,
        country: customerData.country || null,
        type: customerData.type || 'individual',
        status: customerData.status || 'active',
        tax_number: customerData.taxNumber || null,
        balance: parseFloat(customerData.balance) || 0,
        credit_limit: customerData.creditLimit ? parseFloat(customerData.creditLimit) : null,
        total_orders: customerData.totalOrders || 0,
        total_spent: parseFloat(customerData.totalSpent) || 0,
        first_purchase: customerData.firstPurchase || null,
        last_purchase: customerData.lastPurchase || null,
        notes: customerData.notes || null,
        created_by: customerData.createdBy || 'user',
        // لضمان التوافق مع مخزن Supabase وسكيمة الكاش
        created_at: customerData.createdAt || new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single()

      if (error) {
        // Handle duplicate email error
        if (error.code === '23505') {
          return {
            success: false,
            error: 'البريد الإلكتروني مستخدم بالفعل',
            errorCode: 'DUPLICATE_EMAIL'
          }
        }
        throw error
      }

      // Map back to camelCase for consistency
      return {
        success: true,
        customer: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error adding customer:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إضافة العميل',
        errorCode: 'ADD_CUSTOMER_FAILED'
      }
    }
  }

  // Update customer (with tenant check)
  async updateCustomer(id, updates, expectedVersion = null) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العميل مطلوب',
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

      // Map camelCase to snake_case for database
      const updateData = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.email !== undefined) updateData.email = updates.email
      if (updates.phone !== undefined) updateData.phone = updates.phone
      if (updates.company !== undefined) updateData.company = updates.company || null
      if (updates.address !== undefined) updateData.address = updates.address || null
      if (updates.city !== undefined) updateData.city = updates.city || null
      if (updates.country !== undefined) updateData.country = updates.country || null
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.taxNumber !== undefined) updateData.tax_number = updates.taxNumber || null
      if (updates.balance !== undefined) updateData.balance = parseFloat(updates.balance) || 0
      if (updates.creditLimit !== undefined) updateData.credit_limit = updates.creditLimit ? parseFloat(updates.creditLimit) : null
      if (updates.notes !== undefined) updateData.notes = updates.notes || null

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure tenant match
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return {
            success: false,
            error: 'البريد الإلكتروني مستخدم بالفعل',
            errorCode: 'DUPLICATE_EMAIL'
          }
        }
        throw error
      }

      if (!data) {
        return {
          success: false,
          error: 'العميل غير موجود',
          errorCode: 'CUSTOMER_NOT_FOUND'
        }
      }

      return {
        success: true,
        customer: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating customer:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث العميل',
        errorCode: 'UPDATE_CUSTOMER_FAILED'
      }
    }
  }

  // Delete customer (with tenant check)
  async deleteCustomer(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العميل مطلوب',
          errorCode: 'INVALID_ID'
        }
      }

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return {
          success: false,
          error: 'معرف المستأجر مطلوب',
          errorCode: 'NO_TENANT_ID'
        }
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure tenant match

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting customer:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف العميل',
        errorCode: 'DELETE_CUSTOMER_FAILED'
      }
    }
  }

  // Search customers (with tenant filter)
  async searchCustomers(query) {
    try {
      if (!query || query.trim() === '') return this.getCustomers()

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot search customers.')
        return []
      }

      const searchTerm = `%${query.trim()}%`
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId) // Filter by tenant
        .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(50) // Limit results to prevent large responses

      if (error) {
        console.error('Supabase search error:', error)
        throw error
      }
      
      return (data || []).map(c => this.mapToCamelCase(c))
    } catch (error) {
      console.error('Error searching customers:', error.message)
      // Fallback: return all customers and filter client-side
      try {
        const allCustomers = await this.getCustomers()
        const searchLower = query.toLowerCase()
        return allCustomers.filter(c => 
          c.name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.phone?.includes(query)
        )
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError)
        return []
      }
    }
  }

  // Get customer statistics
  async getCustomerStats() {
    try {
      const customers = await this.getCustomers()
      return {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === 'active').length,
        corporateCustomers: customers.filter(c => c.type === 'corporate').length,
        totalBalance: customers.reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0)
      }
    } catch (error) {
      console.error('Error getting customer stats:', error.message)
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        corporateCustomers: 0,
        totalBalance: 0
      }
    }
  }

  // Legacy method for compatibility (loadCustomers)
  async loadCustomers() {
    return this.getCustomers()
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(data) {
    if (!data) return null
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address,
      city: data.city,
      country: data.country,
      type: data.type,
      status: data.status,
      taxNumber: data.tax_number,
      balance: parseFloat(data.balance) || 0,
      creditLimit: data.credit_limit ? parseFloat(data.credit_limit) : null,
      totalOrders: data.total_orders || 0,
      totalSpent: parseFloat(data.total_spent) || 0,
      firstPurchase: data.first_purchase,
      lastPurchase: data.last_purchase,
      notes: data.notes,
      createdAt: data.created_at,
      createdBy: data.created_by,
      updatedAt: data.updated_at
    }
  }
}

export default new CustomersService()
