import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class ProjectsService {
  // 1. Get all projects (DEBUG MODE: Filter DISABLED + LOGS ADDED)
  async getProjects() {
    try {
      console.log('🔄 Starting getProjects fetch...')

      // 👇 الاستعلام بدون فلتر tenant_id
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      // 👇👇 سجلات التشخيص (مهمة جداً) 👇👇
      console.log('🔥 RAW DB DATA (Projects):', projectsData)
      console.log('🔥 DB ERROR:', error)
      // 👆👆👆👆👆👆👆👆👆👆

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

  // 2. Get active projects only (DEBUG MODE: Filter DISABLED)
  async getActiveProjects() {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        // .eq('tenant_id', tenantId) // 🔴 DISABLED
        .eq('status', 'active')
        .order('created_at', { ascending: false })

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

  // 3. Get project by ID (DEBUG MODE: Filter DISABLED)
  async getProject(id) {
    try {
      if (!id) return null

      console.log(`🔄 Fetching single project: ${id}`)

      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        // .eq('tenant_id', tenantId) // 🔴 DISABLED
        .single()

      if (error) throw error

      console.log('🔥 SINGLE PROJECT DATA:', projectData)

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

  // 4. Add new project (Keep Check Here - New data must have owner)
  async addProject(projectData) {
    try {
      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      
      // لن نوقف العملية، فقط تحذير
      if (!tenantValidation.valid) {
        console.warn('⚠️ Adding project with potential missing Tenant ID')
      }

      const projectId = projectData.id || crypto.randomUUID()

      const newProject = {
        id: projectId,
        tenant_id: tenantId, // Assign to current user
        name: projectData.name,
        client_id: projectData.clientId || null,
        status: projectData.status || 'active',
        budget: projectData.budget ? parseFloat(projectData.budget) : 0,
        completion_percentage: projectData.completionPercentage || 0,
        work_scopes: projectData.workScopes && Array.isArray(projectData.workScopes) ? projectData.workScopes : null,
        quotation_id: projectData.quotationId || null,
        work_start_date: projectData.workStartDate || null,
        notes: projectData.notes && projectData.notes.trim() ? projectData.notes.trim() : null
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

  // 5. Update project (DEBUG MODE: Filter DISABLED)
  async updateProject(id, updates) {
    try {
      if (!id) return { success: false, error: 'ID required' }

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

      const { data: projectData, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        // .eq('tenant_id', tenantId) // 🔴 DISABLED
        .select('*')
        .single()

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

  // 6. Delete project (DEBUG MODE: Filter DISABLED)
  async deleteProject(id) {
    try {
      if (!id) return { success: false, error: 'ID required' }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        // .eq('tenant_id', tenantId) // 🔴 DISABLED

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