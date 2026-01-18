import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'
import paymentsService from './paymentsService'
import workersService from './workersService'
import categoryService from './categoryService'

class AttendanceService {
  // Get all daily records (filtered by current tenant and branch)
  async getDailyRecords() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch daily records.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch daily records.')
        return []
      }

      let query = supabase
        .from('daily_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error

      return (data || []).map(r => this.mapToCamelCase(r))
    } catch (error) {
      console.error('Error fetching daily records:', error.message)
      return []
    }
  }

  // Get daily records by project
  async getDailyRecordsByProject(projectId) {
    try {
      if (!projectId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch daily records by project.')
        return []
      }

      let query = supabase
        .from('daily_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error

      return (data || []).map(r => this.mapToCamelCase(r))
    } catch (error) {
      console.error('Error fetching daily records by project:', error.message)
      return []
    }
  }

  // Get daily records by date and project
  async getDailyRecordsByDateAndProject(projectId, date) {
    try {
      if (!projectId || !date) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch daily records by date and project.')
        return []
      }

      let query = supabase
        .from('daily_records')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('date', date)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(r => this.mapToCamelCase(r))
    } catch (error) {
      console.error('Error fetching daily records by date and project:', error.message)
      return []
    }
  }

  // Create daily attendance records (multiple workers for same date/project)
  // Auto-creates expense payments for each record
  async createAttendanceRecords(attendanceData) {
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
      if (!attendanceData.projectId || !attendanceData.date) {
        return {
          success: false,
          error: 'المشروع والتاريخ مطلوبان',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      if (!attendanceData.workers || !Array.isArray(attendanceData.workers) || attendanceData.workers.length === 0) {
        return {
          success: false,
          error: 'يرجى اختيار عامل واحد على الأقل',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      const dateStr = typeof attendanceData.date === 'string' 
        ? attendanceData.date 
        : attendanceData.date.toISOString().split('T')[0]

      // Check if records already exist for this date/project combination
      const existingRecords = await this.getDailyRecordsByDateAndProject(attendanceData.projectId, dateStr)
      
      if (existingRecords.length > 0) {
        return {
          success: false,
          error: 'يوجد بالفعل سجلات حضور لهذا التاريخ والمشروع. يرجى حذف السجلات السابقة أولاً',
          errorCode: 'DUPLICATE_RECORD'
        }
      }

      // Get Labor category from expense_categories table once (fallback to 'Labor' if not found)
      const projectCategories = await categoryService.getProjectCategories()
      const laborCategory = projectCategories.find(cat => 
        cat.name.toLowerCase() === 'labor' || cat.nameAr?.toLowerCase().includes('عمال')
      ) || { name: 'Labor' } // Fallback to 'Labor' if category not found

      // Prepare records to insert
      const recordsToInsert = []
      const paymentPromises = []

      for (const workerId of attendanceData.workers) {
        // Get worker details to get current rate
        const worker = await workersService.getWorker(workerId)
        if (!worker) {
          console.warn(`Worker ${workerId} not found, skipping`)
          continue
        }

        const dailyRate = attendanceData.workerRates?.[workerId] || worker.defaultDailyRate || 0
        const hoursWorked = attendanceData.workerHours?.[workerId] || 1.0

        // MANDATORY BRANCH INJECTION: Explicitly use branchStore (ignore frontend branchId)
        const branchId = branchStore.getBranchId()
        
        // MANDATORY BRANCH ISOLATION: Skip record if branchId is null (return error at end)
        if (!branchId) {
          throw new Error('No branch ID set. Cannot create attendance record.')
        }
        
        // Create daily record
        const record = {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          worker_id: workerId,
          project_id: attendanceData.projectId,
          date: dateStr,
          daily_rate_at_time: dailyRate,
          hours_worked: parseFloat(hoursWorked),
          notes: attendanceData.notes || null,
          created_by: attendanceData.createdBy || 'user',
          branch_id: branchId // MANDATORY: Explicitly set from branchStore (not from frontend)
        }

        recordsToInsert.push(record)

        // Calculate amount for payment (rate * hours/days worked)
        const paymentAmount = dailyRate * hoursWorked

        // Auto-create expense payment for this attendance record
        if (paymentAmount > 0) {
          const paymentData = {
            isGeneralExpense: false,
            projectId: attendanceData.projectId,
            workScope: attendanceData.workScope || null,
            paymentType: 'expense',
            category: laborCategory.name, // Use dynamic category from database
            amount: paymentAmount,
            dueDate: dateStr,
            paidDate: dateStr, // Mark as paid immediately (labor is typically paid daily)
            status: 'paid',
            paymentMethod: 'cash', // Default for labor
            notes: `أجور عمال - ${worker.name} (${worker.trade}) - ${dateStr}${hoursWorked !== 1.0 ? ` - ${hoursWorked} ساعات` : ''}`,
            createdBy: attendanceData.createdBy || 'user'
          }

          // Store promise, don't await yet (batch insert records first)
          paymentPromises.push(paymentsService.createPayment(paymentData))
        }
      }

      if (recordsToInsert.length === 0) {
        return {
          success: false,
          error: 'لم يتم العثور على عمال صالحين',
          errorCode: 'NO_VALID_WORKERS'
        }
      }

      // Insert all daily records in batch
      const { data: insertedRecords, error: insertError } = await supabase
        .from('daily_records')
        .insert(recordsToInsert)
        .select()

      if (insertError) throw insertError

      // Now create payments for all records
      const paymentResults = await Promise.allSettled(paymentPromises)
      
      // Check for payment creation failures (log but don't fail the whole operation)
      const failedPayments = paymentResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
      if (failedPayments.length > 0) {
        console.error('Some payments failed to create:', failedPayments)
        // Optionally, you could rollback the records here if needed
      }

      return {
        success: true,
        records: (insertedRecords || []).map(r => this.mapToCamelCase(r)),
        paymentsCreated: paymentResults.filter(r => r.status === 'fulfilled' && r.value.success).length,
        paymentsFailed: failedPayments.length
      }
    } catch (error) {
      console.error('Error creating attendance records:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء سجلات الحضور',
        errorCode: 'CREATE_ATTENDANCE_FAILED'
      }
    }
  }

  // Delete daily record (and optionally the associated payment)
  async deleteDailyRecord(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف السجل مطلوب',
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

      // Get the record first to potentially find and delete associated payment
      const record = await this.getDailyRecord(id)
      if (!record) {
        return {
          success: false,
          error: 'السجل غير موجود',
          errorCode: 'RECORD_NOT_FOUND'
        }
      }

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot delete daily record.',
          errorCode: 'NO_BRANCH_ID'
        }
      }

      // Delete the record
      let query = supabase
        .from('daily_records')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { error } = await query

      if (error) throw error

      // Note: We don't auto-delete the payment because:
      // 1. Payments might be reconciled/paid separately
      // 2. It's safer to let users manage payments manually
      // If you want auto-deletion, you could search for payments by notes/amount/date and delete them here

      return { success: true }
    } catch (error) {
      console.error('Error deleting daily record:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف السجل',
        errorCode: 'DELETE_RECORD_FAILED'
      }
    }
  }

  // Get single daily record
  async getDailyRecord(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch daily record.')
        return null
      }

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch daily record.')
        return null
      }

      let query = supabase
        .from('daily_records')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.single()

      if (error) throw error

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching daily record:', error.message)
      return null
    }
  }

  // Get total labor cost for a project
  async getTotalLaborCostByProject(projectId) {
    try {
      if (!projectId) return 0

      const records = await this.getDailyRecordsByProject(projectId)
      
      return records.reduce((sum, record) => {
        const cost = (parseFloat(record.dailyRateAtTime) || 0) * (parseFloat(record.hoursWorked) || 1.0)
        return sum + cost
      }, 0)
    } catch (error) {
      console.error('Error calculating total labor cost:', error.message)
      return 0
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(record) {
    if (!record) return null

    return {
      id: record.id,
      workerId: record.worker_id,
      projectId: record.project_id,
      date: record.date,
      dailyRateAtTime: parseFloat(record.daily_rate_at_time) || 0,
      hoursWorked: parseFloat(record.hours_worked) || 1.0,
      notes: record.notes || null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      createdBy: record.created_by
    }
  }
}

const attendanceService = new AttendanceService()
export default attendanceService
