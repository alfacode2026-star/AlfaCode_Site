import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class EmployeesService {
  // Get current user ID from Supabase auth
  async getCurrentUserId() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        return null
      }
      return user.id
    } catch (error) {
      console.warn('Error getting current user:', error.message)
      return null
    }
  }

  // Get all employees (filtered by current tenant)
  async getEmployees() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch employees.')
        return []
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(emp => this.mapToCamelCase(emp))
    } catch (error) {
      console.error('Error fetching employees:', error.message)
      return []
    }
  }

  // Get employee by ID
  async getEmployee(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch employee.')
        return null
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching employee:', error.message)
      return null
    }
  }

  // Add new employee
  async addEmployee(employeeData) {
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
      if (!employeeData.name || !employeeData.employeeId || !employeeData.jobTitle) {
        return {
          success: false,
          error: 'الاسم والرقم الوظيفي والمسمى الوظيفي مطلوبة',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Check if employee ID already exists
      const { data: existingEmployee, error: checkError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeData.employeeId.trim())
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.error('Error checking existing employee:', checkError)
      }

      if (existingEmployee) {
        return {
          success: false,
          error: `الرقم الوظيفي "${employeeData.employeeId.trim()}" موجود بالفعل للموظف "${existingEmployee.name}". يرجى استخدام رقم وظيفي آخر.`,
          errorCode: 'EMPLOYEE_ID_EXISTS'
        }
      }

      // Get current user ID from session, or use provided createdBy (optional)
      let createdBy = employeeData.createdBy
      if (!createdBy || createdBy === 'user') {
        createdBy = await this.getCurrentUserId()
      }

      // Generate UUID if not provided, or check if provided ID exists
      let employeeId = employeeData.id || crypto.randomUUID()
      if (employeeData.id) {
        // Check if the provided ID already exists
        const { data: existingEmployeeById, error: idCheckError } = await supabase
          .from('employees')
          .select('id')
          .eq('id', employeeData.id)
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (idCheckError && idCheckError.code !== 'PGRST116') {
          console.error('Error checking existing employee by ID:', idCheckError)
        }

        if (existingEmployeeById) {
          // Generate a new UUID if the provided one exists
          employeeId = crypto.randomUUID()
          console.warn(`Employee ID ${employeeData.id} already exists, using new ID: ${employeeId}`)
        }
      }

      const newEmployee = {
        id: employeeId,
        tenant_id: tenantId,
        name: employeeData.name.trim(),
        employee_id: employeeData.employeeId.trim(),
        job_title: employeeData.jobTitle.trim(),
        monthly_salary: parseFloat(employeeData.monthlySalary) || 0
      }

      // Only add created_by if we have a valid UUID (optional)
      if (createdBy && createdBy !== 'user') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(createdBy)) {
          newEmployee.created_by = createdBy
        }
        // If invalid UUID format, omit the field - database should handle this gracefully
      }
      // If createdBy is null or 'user', omit the field - database should handle this gracefully

      const { data: insertedEmployee, error } = await supabase
        .from('employees')
        .insert([newEmployee])
        .select()
        .single()

      if (error) {
        // Check if it's a unique constraint violation (409 Conflict)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          return {
            success: false,
            error: `الرقم الوظيفي "${employeeData.employeeId.trim()}" موجود بالفعل. يرجى استخدام رقم وظيفي آخر.`,
            errorCode: 'EMPLOYEE_ID_EXISTS'
          }
        }
        throw error
      }

      return {
        success: true,
        employee: this.mapToCamelCase(insertedEmployee)
      }
    } catch (error) {
      console.error('Error adding employee:', error.message)
      // Check if it's a unique constraint violation (409 Conflict)
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        return {
          success: false,
          error: `الرقم الوظيفي "${employeeData.employeeId.trim()}" موجود بالفعل. يرجى استخدام رقم وظيفي آخر.`,
          errorCode: 'EMPLOYEE_ID_EXISTS'
        }
      }
      return {
        success: false,
        error: error.message || 'فشل في إضافة الموظف',
        errorCode: 'ADD_EMPLOYEE_FAILED'
      }
    }
  }

  // Update employee
  async updateEmployee(id, updates) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الموظف مطلوب',
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
      if (updates.employeeId !== undefined) updateData.employee_id = updates.employeeId.trim()
      if (updates.jobTitle !== undefined) updateData.job_title = updates.jobTitle.trim()
      if (updates.monthlySalary !== undefined) updateData.monthly_salary = parseFloat(updates.monthlySalary) || 0

      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      if (!data) {
        return {
          success: false,
          error: 'الموظف غير موجود',
          errorCode: 'EMPLOYEE_NOT_FOUND'
        }
      }

      return {
        success: true,
        employee: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating employee:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث الموظف',
        errorCode: 'UPDATE_EMPLOYEE_FAILED'
      }
    }
  }

  // Delete employee
  async deleteEmployee(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الموظف مطلوب',
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

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting employee:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف الموظف',
        errorCode: 'DELETE_EMPLOYEE_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(employee) {
    if (!employee) return null

    return {
      id: employee.id,
      name: employee.name,
      employeeId: employee.employee_id,
      jobTitle: employee.job_title,
      monthlySalary: parseFloat(employee.monthly_salary) || 0,
      createdAt: employee.created_at,
      updatedAt: employee.updated_at,
      createdBy: employee.created_by
    }
  }
}

const employeesService = new EmployeesService()
export default employeesService
