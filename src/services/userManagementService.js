import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class UserManagementService {
  // Get current user profile with role
  async getCurrentUserProfile() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return null
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, tenant_id, branch_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('Error fetching user profile:', profileError)
        return null
      }

      return profile
    } catch (error) {
      console.warn('Error getting current user profile:', error)
      return null
    }
  }

  // Check if current user is Super Admin
  async isSuperAdmin() {
    try {
      const profile = await this.getCurrentUserProfile()
      return profile?.role === 'super_admin'
    } catch (error) {
      console.error('Error checking super admin status:', error)
      return false
    }
  }

  // Check if current user is Branch Manager or Super Admin
  async isBranchManagerOrSuperAdmin() {
    try {
      const profile = await this.getCurrentUserProfile()
      return profile?.role === 'super_admin' || profile?.role === 'manager' || profile?.role === 'branch_manager'
    } catch (error) {
      console.error('Error checking branch manager status:', error)
      return false
    }
  }

  // Get all users for current tenant (only Super Admin can access)
  async getUsers() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return []
      }

      // Check if current user is super admin
      const isAdmin = await this.isSuperAdmin()
      if (!isAdmin) {
        throw new Error('Only Super Admins can view users')
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, tenant_id, branch_id, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users:', error.message)
      return []
    }
  }

  // Create new user account (Super Admin only)
  async createUser(userData) {
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

      // Check if current user is super admin
      const isAdmin = await this.isSuperAdmin()
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only Super Admins can create users',
          errorCode: 'UNAUTHORIZED'
        }
      }

      const { email, password, full_name, role, branch_id } = userData

      if (!email || !password || !full_name) {
        return {
          success: false,
          error: 'Email, password, and full name are required',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name
          }
        }
      })

      if (signUpError) {
        return {
          success: false,
          error: `Failed to create user: ${signUpError.message}`,
          errorCode: 'SIGNUP_FAILED'
        }
      }

      if (!signUpData.user) {
        return {
          success: false,
          error: 'Failed to create user: No user returned',
          errorCode: 'SIGNUP_FAILED'
        }
      }

      // Create profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: signUpData.user.id,
          email: email,
          full_name: full_name,
          role: role || 'user',
          tenant_id: tenantId,
          branch_id: branch_id || null
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        // If profile creation fails, we should ideally delete the auth user
        // But Supabase doesn't allow deleting users from client, so we log the error
        console.error('Error creating profile:', profileError)
        return {
          success: false,
          error: `User created but profile failed: ${profileError.message}`,
          errorCode: 'PROFILE_CREATE_FAILED'
        }
      }

      return {
        success: true,
        user: {
          id: signUpData.user.id,
          email: email,
          full_name: full_name,
          role: role || 'user'
        }
      }
    } catch (error) {
      console.error('Error creating user:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to create user',
        errorCode: 'CREATE_USER_FAILED'
      }
    }
  }

  // Update user role (Super Admin only)
  async updateUserRole(userId, newRole) {
    try {
      // Check if current user is super admin
      const isAdmin = await this.isSuperAdmin()
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only Super Admins can update user roles',
          errorCode: 'UNAUTHORIZED'
        }
      }

      // Validate role
      const validRoles = ['super_admin', 'admin', 'manager', 'user', 'accountant', 'engineer']
      if (!validRoles.includes(newRole)) {
        return {
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          errorCode: 'INVALID_ROLE'
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating user role:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to update user role',
        errorCode: 'UPDATE_ROLE_FAILED'
      }
    }
  }

  // Delete user (Super Admin only) - Note: This only deletes the profile, not the auth user
  async deleteUser(userId) {
    try {
      // Check if current user is super admin
      const isAdmin = await this.isSuperAdmin()
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only Super Admins can delete users',
          errorCode: 'UNAUTHORIZED'
        }
      }

      // Prevent deleting own account
      const currentProfile = await this.getCurrentUserProfile()
      if (currentProfile?.id === userId) {
        return {
          success: false,
          error: 'Cannot delete your own account',
          errorCode: 'CANNOT_DELETE_SELF'
        }
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting user:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to delete user',
        errorCode: 'DELETE_USER_FAILED'
      }
    }
  }
}

const userManagementService = new UserManagementService()
export default userManagementService
