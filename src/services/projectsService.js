import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class ProjectsService {
  // Get all projects (filtered by current tenant)
  async getProjects() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch projects.')
        return []
      }

      // First, get all projects (created_by is optional, handle if column doesn't exist)
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Then, fetch customer data for projects that have client_id
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

  // Get active projects only (filtered by current tenant)
  async getActiveProjects() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch projects.')
        return []
      }

      // Get only active projects
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Then, fetch customer data for projects that have client_id
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

  // Get project by ID (with tenant check)
  async getProject(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch project.')
        return null
      }

      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

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

  // Alias for getProject (for consistency)
  async getProjectById(id) {
    return this.getProject(id)
  }

  // Add new project
  async addProject(projectData) {
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

      // Generate UUID if not provided
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

      // Fetch customer data if client_id exists
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

  // Update project (with tenant check)
  async updateProject(id, updates) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المشروع مطلوب',
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
      // Note: created_by and quotation_id are not updated, only set on creation

      const { data: projectData, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (error) throw error

      if (!projectData) {
        return {
          success: false,
          error: 'المشروع غير موجود',
          errorCode: 'PROJECT_NOT_FOUND'
        }
      }

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

      return {
        success: true,
        project: this.mapToCamelCase({ ...projectData, customers: customerData })
      }
    } catch (error) {
      console.error('Error updating project:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث المشروع',
        errorCode: 'UPDATE_PROJECT_FAILED'
      }
    }
  }

  // Delete project (with tenant check)
  async deleteProject(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المشروع مطلوب',
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
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting project:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف المشروع',
        errorCode: 'DELETE_PROJECT_FAILED'
      }
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
      createdBy: data.created_by || 'user', // Default fallback if column doesn't exist
      updatedAt: data.updated_at
    }
  }
}

export default new ProjectsService()
