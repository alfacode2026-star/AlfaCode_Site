import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'
import userManagementService from './userManagementService'
import logsService from './logsService'

class ProjectsService {
  // 1. Get all projects (with strict branch and tenant filtering)
  async getProjects() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch projects.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch projects.')
        return []
      }

      let query = supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
      
      query = query.order('created_at', { ascending: false })

      const { data: projectsData, error } = await query

      if (error) {
        console.error('[projectsService] Supabase error (getProjects):', error)
        throw error
      }

      // جلب بيانات العملاء يدوياً (كما كان في كودك السابق)
      const projectsWithCustomers = await Promise.all(
        (projectsData || []).map(async (project) => {
          if (project.client_id) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id, name')
              .eq('id', project.client_id)
              .single()
            
            return { ...project, customers: customerData }
          }
          return { ...project, customers: null }
        })
      )

      return projectsWithCustomers.map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching projects:', error.message)
      return []
    }
  }

  // 2. Get active projects only (with strict branch and tenant filtering)
  async getActiveProjects() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch active projects.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch active projects.')
        return []
      }

      let query = supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
      
      const { data: projectsData, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('[projectsService] Supabase error (getActiveProjects):', error)
        throw error
      }

      const projectsWithCustomers = await Promise.all(
        (projectsData || []).map(async (project) => {
          if (project.client_id) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id, name')
              .eq('id', project.client_id)
              .single()
            
            return { ...project, customers: customerData }
          }
          return { ...project, customers: null }
        })
      )

      return projectsWithCustomers.map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching active projects:', error.message)
      return []
    }
  }

  // 3. Get project by ID (with strict branch and tenant filtering)
  async getProject(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch project.')
        return null
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch project.')
        return null
      }

      let query = supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: projectData, error } = await query.single()

      if (error) throw error

      // Fetch customer data if client_id exists
      let customerData = null
      if (projectData.client_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', projectData.client_id)
          .single()
        customerData = customer
      }

      return this.mapToCamelCase({ ...projectData, customers: customerData })
    } catch (error) {
      console.error('Error fetching project:', error.message)
      return null
    }
  }

  // Alias for getProject
  async getProjectById(id) {
    return this.getProject(id)
  }

  // 4. Add new project (with mandatory branch_id injection)
  async addProject(projectData) {
    try {
      const tenantId = tenantStore.getTenantId()
      // MANDATORY BRANCH INJECTION: Explicitly use branchStore (ignore frontend branchId)
      const branchId = branchStore.getBranchId()
      const tenantValidation = validateTenantId(tenantId)
      
      if (!tenantValidation.valid) {
        console.warn('⚠️ Adding project with potential missing Tenant ID')
      }

      // MANDATORY BRANCH ISOLATION: Return error if branchId is null
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot create project.',
          errorCode: 'NO_BRANCH_ID'
        }
      }

      const projectId = projectData.id || crypto.randomUUID()

      const newProject = {
        id: projectId,
        tenant_id: tenantId,
        name: projectData.name,
        client_id: projectData.clientId || null,
        status: projectData.status || 'active',
        budget: projectData.budget ? parseFloat(projectData.budget) : 0,
        completion_percentage: projectData.completionPercentage || 0,
        work_scopes: projectData.workScopes && Array.isArray(projectData.workScopes) ? projectData.workScopes : null,
        quotation_id: projectData.quotationId || null,
        work_start_date: projectData.workStartDate || null,
        notes: projectData.notes && projectData.notes.trim() ? projectData.notes.trim() : null,
        branch_id: branchId // MANDATORY: Explicitly set from branchStore (not from frontend)
      }

      const { data: insertedProject, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select('*')
        .single()

      if (error) {
        throw error
      }

      let customerData = null
      if (insertedProject.client_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', insertedProject.client_id)
          .single()
        customerData = customer
      }

      return {
        success: true,
        project: this.mapToCamelCase({ ...insertedProject, customers: customerData })
      }
    } catch (error) {
      console.error('Error adding project:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إضافة المشروع',
        errorCode: 'ADD_PROJECT_FAILED'
      }
    }
  }

  // 5. Update project (with strict branch and tenant filtering)
  async updateProject(id, updates) {
    try {
      if (!id) return { success: false, error: 'ID required' }

      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        return { success: false, error: 'No tenant ID set' }
      }

      const updateData = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.clientId !== undefined) updateData.client_id = updates.clientId || null
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.budget !== undefined) updateData.budget = parseFloat(updates.budget) || 0
      if (updates.completionPercentage !== undefined) updateData.completion_percentage = Math.min(100, Math.max(0, parseFloat(updates.completionPercentage) || 0))
      if (updates.workScopes !== undefined) {
        updateData.work_scopes = updates.workScopes && Array.isArray(updates.workScopes) ? updates.workScopes : null
      }
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate || null
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null
      if (updates.notes !== undefined) updateData.notes = updates.notes || null

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      let query = supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: projectData, error } = await query.select('*').single()

      if (error) throw error

      if (!projectData) {
        return { success: false, error: 'Project not found' }
      }

      let customerData = null
      if (projectData.client_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('id', projectData.client_id)
          .single()
        customerData = customer
      }

      return {
        success: true,
        project: this.mapToCamelCase({ ...projectData, customers: customerData })
      }
    } catch (error) {
      console.error('Error updating project:', error.message)
      return { success: false, error: error.message }
    }
  }

  // Delete project (3-Layer Security Protocol)
  async deleteProject(id, password, deletionReason) {
    try {
      if (!id) return { success: false, error: 'ID required' }

      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        return { success: false, error: 'No tenant ID set' }
      }

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

      // Step 1: Get current user and project info
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

      // Step 3: Get project info for audit log and financial checks
      const project = await this.getProject(id)
      if (!project) {
        return {
          success: false,
          error: 'Project not found',
          errorCode: 'PROJECT_NOT_FOUND'
        }
      }

      // Step 4: Financial Guard - Check for active financial records (payments/income/expenses)
      const { count: paymentsCount, error: paymentsError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .eq('project_id', id)

      if (paymentsError) {
        console.error('Error checking payments:', paymentsError)
      }

      if (paymentsCount && paymentsCount > 0) {
        return {
          success: false,
          error: 'Cannot delete: Active financial records exist for this project. Please remove all payments first.',
          errorCode: 'FINANCIAL_RECORDS_EXIST',
          paymentsCount: paymentsCount
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

      // Log deletion using centralized logsService
      const logResult = await logsService.logDeletion({
        tableName: 'projects',
        recordId: id,
        deletionReason: deletionReason.trim(),
        recordRef: project.name || id, // Human-readable reference
        deletedData: project // Store snapshot of deleted record
      })

      if (!logResult.success) {
        console.error('Error logging deletion:', logResult.error)
        return {
          success: false,
          error: 'Deletion aborted: Failed to create audit log. Please contact support.',
          errorCode: 'AUDIT_LOG_FAILED'
        }
      }

      // 🏁 EXECUTION - Only after Layers 1, 2, and 3 pass successfully
      // Step 6: Cascade Delete - Delete the project
      let query = supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { error } = await query

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting project:', error.message)
      return { success: false, error: error.message }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(data) {
    if (!data) return null
    
    return {
      id: data.id,
      name: data.name,
      clientId: data.client_id,
      client: data.customers ? {
        id: data.customers.id,
        name: data.customers.name
      } : null,
      status: data.status,
      budget: parseFloat(data.budget) || 0,
      completionPercentage: parseFloat(data.completion_percentage) || 0,
      workScopes: data.work_scopes || [],
      quotationId: data.quotation_id || null,
      startDate: data.start_date,
      endDate: data.end_date,
      notes: data.notes,
      createdAt: data.created_at,
      createdBy: data.created_by || 'user', 
      updatedAt: data.updated_at
    }
  }
}

export default new ProjectsService()