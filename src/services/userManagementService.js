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
        .select('*') // CRITICAL: Select all fields including tenant_id and branch_id
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('Error fetching user profile:', profileError)
        return null
      }

      return profile
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'AbortError' || error instanceof DOMException) {
        console.warn('Fetch aborted (navigation or unmount) - ignoring.')
        return null // Return null but DO NOT throw, to prevent app crash
      }
      console.error('Error getting user profile:', error)
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

  // Get all users for current tenant (Super Admin and Admin can access)
  async getUsers() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return []
      }

      // Check if current user is super admin or admin
      const profile = await this.getCurrentUserProfile()
      const userRole = profile?.role || null
      const isSuperAdminUser = userRole === 'super_admin'
      const isAdminUser = userRole === 'admin'
      
      if (!isSuperAdminUser && !isAdminUser) {
        throw new Error('Only Super Admins and Admins can view users')
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

  // Create new user account (Super Admin and Admin can access)
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

      // Check if current user is super admin or admin
      const profile = await this.getCurrentUserProfile()
      const userRole = profile?.role || null
      const isSuperAdminUser = userRole === 'super_admin'
      const isAdminUser = userRole === 'admin'
      
      if (!isSuperAdminUser && !isAdminUser) {
        return {
          success: false,
          error: 'Only Super Admins and Admins can create users',
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

      // CRITICAL: If branch_id is not provided, fetch the main branch for this tenant
      let finalBranchId = branch_id
      if (!finalBranchId) {
        console.warn('⚠️ No branch_id provided for new user, fetching main branch...')
        try {
          const { data: mainBranch, error: branchError } = await supabase
            .from('branches')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_main', true)
            .single()

          if (!branchError && mainBranch?.id) {
            finalBranchId = mainBranch.id
            console.log('✅ Assigned main branch to new user:', finalBranchId)
          } else {
            console.error('❌ Could not find main branch for tenant:', tenantId)
            // Still create the profile, but log the warning
          }
        } catch (fallbackError) {
          console.error('❌ Error fetching main branch:', fallbackError)
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
          branch_id: finalBranchId // Use the resolved branch_id (main branch if not provided)
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

  // Update user role (Super Admin and Admin can access, but Admin cannot edit super_admin)
  async updateUserRole(userId, newRole) {
    try {
      // Check if current user is super admin or admin
      const profile = await this.getCurrentUserProfile()
      const userRole = profile?.role || null
      const isSuperAdminUser = userRole === 'super_admin'
      const isAdminUser = userRole === 'admin'
      
      if (!isSuperAdminUser && !isAdminUser) {
        return {
          success: false,
          error: 'Only Super Admins and Admins can update user roles',
          errorCode: 'UNAUTHORIZED'
        }
      }

      // Security: Admin cannot edit super_admin users
      if (isAdminUser && !isSuperAdminUser) {
        const targetProfile = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        if (targetProfile.data?.role === 'super_admin') {
          return {
            success: false,
            error: 'Admins cannot modify Super Admin users',
            errorCode: 'FORBIDDEN'
          }
        }
      }

      // Validate role - only allow 3 core roles
      const validRoles = ['super_admin', 'admin', 'manager']
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

  // Delete user (Super Admin only - Admin cannot delete) - Note: This only deletes the profile, not the auth user
  async deleteUser(userId) {
    try {
      // Only super admin can delete users
      const isSuperAdminUser = await this.isSuperAdmin()
      if (!isSuperAdminUser) {
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

      // Security: Prevent deleting super_admin users (only super_admin can delete, but this is an extra safety check)
      const targetProfile = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (targetProfile.data?.role === 'super_admin' && currentProfile?.role !== 'super_admin') {
        return {
          success: false,
          error: 'Cannot delete Super Admin users',
          errorCode: 'FORBIDDEN'
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
