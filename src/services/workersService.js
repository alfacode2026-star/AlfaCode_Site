import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'

class WorkersService {
  // Get all workers (filtered by current tenant and branch)
  async getWorkers() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch workers.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch workers.')
        return []
      }

      let query = supabase
        .from('workers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(w => this.mapToCamelCase(w))
    } catch (error) {
      console.error('Error fetching workers:', error.message)
      return []
    }
  }

  // Get active workers only
  async getActiveWorkers() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch workers.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch active workers.')
        return []
      }

      let query = supabase
        .from('workers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(w => this.mapToCamelCase(w))
    } catch (error) {
      console.error('Error fetching active workers:', error.message)
      return []
    }
  }

  // Get worker by ID
  async getWorker(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch worker.')
        return null
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch worker.')
        return null
      }

      let query = supabase
        .from('workers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.single()

      if (error) throw error

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching worker:', error.message)
      return null
    }
  }

  // Add new worker
  async addWorker(workerData) {
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

      // Validate required fields
      if (!workerData.name || !workerData.trade) {
        return {
          success: false,
          error: 'الاسم والحرفة مطلوبان',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // MANDATORY BRANCH INJECTION: Explicitly use branchStore (ignore frontend branchId)
      const branchId = branchStore.getBranchId()

      // MANDATORY BRANCH ISOLATION: Return error if branchId is null
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot create worker.',
          errorCode: 'NO_BRANCH_ID'
        }
      }

      const newWorker = {
        id: workerData.id || crypto.randomUUID(),
        tenant_id: tenantId,
        name: workerData.name.trim(),
        trade: workerData.trade.trim(),
        default_daily_rate: parseFloat(workerData.defaultDailyRate) || 0,
        phone: workerData.phone?.trim() || null,
        status: workerData.status || 'active',
        created_by: workerData.createdBy || 'user',
        branch_id: branchId // MANDATORY: Explicitly set from branchStore (not from frontend)
      }

      const { data: insertedWorker, error } = await supabase
        .from('workers')
        .insert([newWorker])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        worker: this.mapToCamelCase(insertedWorker)
      }
    } catch (error) {
      console.error('Error adding worker:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إضافة العامل',
        errorCode: 'ADD_WORKER_FAILED'
      }
    }
  }

  // Update worker
  async updateWorker(id, updates) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العامل مطلوب',
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

      const updateData = {}
      if (updates.name !== undefined) updateData.name = updates.name.trim()
      if (updates.trade !== undefined) updateData.trade = updates.trade.trim()
      if (updates.defaultDailyRate !== undefined) updateData.default_daily_rate = parseFloat(updates.defaultDailyRate) || 0
      if (updates.phone !== undefined) updateData.phone = updates.phone?.trim() || null
      if (updates.status !== undefined) updateData.status = updates.status

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      let query = supabase
        .from('workers')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.select().single()

      if (error) throw error

      if (!data) {
        return {
          success: false,
          error: 'العامل غير موجود',
          errorCode: 'WORKER_NOT_FOUND'
        }
      }

      return {
        success: true,
        worker: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating worker:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث العامل',
        errorCode: 'UPDATE_WORKER_FAILED'
      }
    }
  }

  // Delete worker
  async deleteWorker(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العامل مطلوب',
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

      let query = supabase
        .from('workers')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { error } = await query

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting worker:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف العامل',
        errorCode: 'DELETE_WORKER_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(worker) {
    if (!worker) return null

    return {
      id: worker.id,
      name: worker.name,
      trade: worker.trade,
      defaultDailyRate: parseFloat(worker.default_daily_rate) || 0,
      phone: worker.phone || null,
      status: worker.status,
      createdAt: worker.created_at,
      updatedAt: worker.updated_at,
      createdBy: worker.created_by
    }
  }
}

const workersService = new WorkersService()
export default workersService
