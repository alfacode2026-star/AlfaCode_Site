import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class CategoryService {
  // Get all expense categories by type (filtered by current tenant)
  async getCategories(type = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch categories.')
        return []
      }

      let query = supabase
        .from('expense_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })

      if (type) {
        query = query.eq('type', type)
      }

      const { data: categories, error } = await query

      if (error) throw error

      return (categories || []).map(c => this.mapToCamelCase(c))
    } catch (error) {
      console.error('Error fetching categories:', error.message)
      return []
    }
  }

  // Get administrative categories
  async getAdministrativeCategories() {
    return this.getCategories('administrative')
  }

  // Get project categories
  async getProjectCategories() {
    return this.getCategories('project')
  }

  // Get category by ID
  async getCategory(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch category.')
        return null
      }

      const { data: category, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(category)
    } catch (error) {
      console.error('Error fetching category:', error.message)
      return null
    }
  }

  // Add new category
  async addCategory(categoryData) {
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
      if (!categoryData.name || !categoryData.type) {
        return {
          success: false,
          error: 'اسم الفئة والنوع مطلوبان',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Check if category already exists for this tenant and type
      const { data: existing } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', categoryData.name.trim())
        .eq('type', categoryData.type)
        .single()

      if (existing) {
        return {
          success: false,
          error: 'هذه الفئة موجودة بالفعل',
          errorCode: 'CATEGORY_EXISTS'
        }
      }

      const newCategory = {
        tenant_id: tenantId,
        name: categoryData.name.trim(),
        name_ar: categoryData.nameAr?.trim() || categoryData.name.trim(),
        type: categoryData.type,
        is_system: false, // User-created categories are not system categories
        created_by: categoryData.createdBy || 'user'
      }

      const { data: insertedCategory, error } = await supabase
        .from('expense_categories')
        .insert([newCategory])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        category: this.mapToCamelCase(insertedCategory)
      }
    } catch (error) {
      console.error('Error adding category:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إضافة الفئة',
        errorCode: 'ADD_CATEGORY_FAILED'
      }
    }
  }

  // Update category
  async updateCategory(id, categoryData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الفئة مطلوب',
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

      // Get current category to check if it's a system category
      const currentCategory = await this.getCategory(id)
      if (!currentCategory) {
        return {
          success: false,
          error: 'الفئة غير موجودة',
          errorCode: 'CATEGORY_NOT_FOUND'
        }
      }

      // System categories cannot be updated
      if (currentCategory.isSystem) {
        return {
          success: false,
          error: 'لا يمكن تعديل الفئات النظامية',
          errorCode: 'SYSTEM_CATEGORY'
        }
      }

      const updateData = {}
      if (categoryData.name !== undefined) updateData.name = categoryData.name.trim()
      if (categoryData.nameAr !== undefined) updateData.name_ar = categoryData.nameAr.trim()
      if (categoryData.type !== undefined) updateData.type = categoryData.type

      // Check for duplicate name if name is being changed
      if (categoryData.name) {
        const { data: existing } = await supabase
          .from('expense_categories')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('name', categoryData.name.trim())
          .eq('type', categoryData.type || currentCategory.type)
          .neq('id', id)
          .single()

        if (existing) {
          return {
            success: false,
            error: 'هذه الفئة موجودة بالفعل',
            errorCode: 'CATEGORY_EXISTS'
          }
        }
      }

      const { data, error } = await supabase
        .from('expense_categories')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        category: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating category:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث الفئة',
        errorCode: 'UPDATE_CATEGORY_FAILED'
      }
    }
  }

  // Delete category
  async deleteCategory(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الفئة مطلوب',
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

      // Get current category to check if it's a system category
      const currentCategory = await this.getCategory(id)
      if (!currentCategory) {
        return {
          success: false,
          error: 'الفئة غير موجودة',
          errorCode: 'CATEGORY_NOT_FOUND'
        }
      }

      // System categories cannot be deleted
      if (currentCategory.isSystem) {
        return {
          success: false,
          error: 'لا يمكن حذف الفئات النظامية',
          errorCode: 'SYSTEM_CATEGORY'
        }
      }

      // Check if category is in use
      const { data: paymentsUsingCategory } = await supabase
        .from('payments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('expense_category', currentCategory.name)
        .limit(1)

      if (paymentsUsingCategory && paymentsUsingCategory.length > 0) {
        return {
          success: false,
          error: 'لا يمكن حذف الفئة لأنها مستخدمة في مصروفات موجودة',
          errorCode: 'CATEGORY_IN_USE'
        }
      }

      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting category:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف الفئة',
        errorCode: 'DELETE_CATEGORY_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(category) {
    if (!category) return null

    return {
      id: category.id,
      tenantId: category.tenant_id,
      name: category.name,
      nameAr: category.name_ar || category.name,
      type: category.type,
      isSystem: category.is_system || false,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
      createdBy: category.created_by
    }
  }
}

const categoryService = new CategoryService()
export default categoryService
