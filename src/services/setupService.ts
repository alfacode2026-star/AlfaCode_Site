import { supabase } from './supabaseClient'
import systemSettingsService from './systemSettingsService'
import tenantStore from './tenantStore'

interface AdminData {
  email: string
  password: string
  full_name: string
}

interface SetupData {
  name?: string // Company name
  industry_type?: string // Industry type
  currency?: string // Currency code
  additionalBranches?: Array<{ name: string }> // Array of additional branch names
  adminData?: AdminData // Super admin credentials
  [key: string]: any // Allow other properties
}

interface SetupResult {
  success: boolean
  error?: string
  errorCode?: string
  tenantId?: string
  mainBranchId?: string
}

class SetupService {
  // Generate UUID for IDs
  generateId(): string {
    return crypto.randomUUID()
  }

  /**
   * Complete system setup - performs all initialization steps in sequence
   * @param data Setup data containing company name, industry type, currency, branches, etc.
   * @returns SetupResult with success status and any errors
   */
  async completeSystemSetup(data: SetupData): Promise<SetupResult> {
    let user: any = null
    
    try {
      // Step 0: Auth - Check if user is already logged in
      const { data: { user: currentUser }, error: currentUserError } = await supabase.auth.getUser()
      
      if (currentUser && !currentUserError) {
        // User is already logged in, use existing session
        user = currentUser
        console.log('Using existing authenticated user:', user.email)
      } else {
        // User is not logged in, create new account
        if (!data.adminData || !data.adminData.email || !data.adminData.password) {
          return {
            success: false,
            error: 'Admin credentials (email and password) are required for setup.',
            errorCode: 'MISSING_ADMIN_CREDENTIALS'
          }
        }

        const { email, password, full_name } = data.adminData

        // Try to sign up first
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: full_name || email.split('@')[0]
            }
          }
        })

        if (signUpError) {
          // If user already exists, immediately try to sign in
          const isUserAlreadyRegistered = 
            signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('already exists') ||
            signUpError.message.toLowerCase().includes('user already registered') ||
            signUpError.code === 'user_already_registered'
          
          if (isUserAlreadyRegistered) {
            console.log('User already registered, attempting to sign in with provided credentials...')
            
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            })

            if (signInError || !signInData.user) {
              return {
                success: false,
                error: `Failed to sign in: ${signInError?.message || 'Invalid credentials'}`,
                errorCode: 'SIGNIN_FAILED'
              }
            }

            user = signInData.user
            console.log('Successfully signed in existing user:', user.email)
          } else {
            return {
              success: false,
              error: `Failed to create user account: ${signUpError.message}`,
              errorCode: 'SIGNUP_FAILED'
            }
          }
        } else if (signUpData.user) {
          // Sign up successful
          user = signUpData.user
          console.log('Successfully created new user account:', user.email)
        } else {
          return {
            success: false,
            error: 'Failed to create user account: No user returned from signup',
            errorCode: 'SIGNUP_FAILED'
          }
        }
      }

      // Step 1: Verify we have a user
      if (!user || !user.id) {
        return {
          success: false,
          error: 'Failed to authenticate user. Please try again.',
          errorCode: 'NO_USER'
        }
      }

      // Step 2: Create Tenant
      const companyName = data.name || data.companyName || 'New Company'
      const industryType = data.industry_type || data.industryType || 'engineering'
      
      // Clean payload - only send required fields, let Supabase generate id, created_at, updated_at
      const tenantPayload = {
        name: companyName,
        industry_type: industryType
      }
      
      console.log('[Setup Service] Creating tenant with payload:', JSON.stringify(tenantPayload, null, 2))
      
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([tenantPayload])
        .select()
        .single()

      if (tenantError) {
        console.error('[Setup Service] Error creating tenant:', tenantError)
        console.error('[Setup Service] Payload that failed:', JSON.stringify(tenantPayload, null, 2))
        return {
          success: false,
          error: `Failed to create tenant: ${tenantError.message}`,
          errorCode: 'CREATE_TENANT_FAILED'
        }
      }

      // Extract tenant_id from the created record
      const tenantId = tenantData?.id
      if (!tenantId) {
        console.error('[Setup Service] Tenant created but no ID returned:', tenantData)
        return {
          success: false,
          error: 'Failed to create tenant: No ID returned from database',
          errorCode: 'CREATE_TENANT_FAILED'
        }
      }
      
      console.log('[Setup Service] Tenant created successfully with ID:', tenantId)

      // Step 3: Create Main Branch
      const currency = data.currency || 'SAR'
      const mainBranchName = data.mainBranchName || 'Main Branch'
      
      // Clean payload - only send required fields, let Supabase generate id, created_at, updated_at
      const mainBranchPayload = {
        tenant_id: tenantId,
        name: mainBranchName,
        currency: currency,
        is_main: true
      }
      
      console.log('[Setup Service] Creating main branch with payload:', JSON.stringify(mainBranchPayload, null, 2))
      
      const { data: mainBranchData, error: mainBranchError } = await supabase
        .from('branches')
        .insert([mainBranchPayload])
        .select()
        .single()

      if (mainBranchError) {
        console.error('[Setup Service] Error creating main branch:', mainBranchError)
        console.error('[Setup Service] Payload that failed:', JSON.stringify(mainBranchPayload, null, 2))
        return {
          success: false,
          error: `Failed to create main branch: ${mainBranchError.message}`,
          errorCode: 'CREATE_MAIN_BRANCH_FAILED'
        }
      }

      // Extract mainBranchId from the created record
      const mainBranchId = mainBranchData?.id
      if (!mainBranchId) {
        console.error('[Setup Service] Main branch created but no ID returned:', mainBranchData)
        return {
          success: false,
          error: 'Failed to create main branch: No ID returned from database',
          errorCode: 'CREATE_MAIN_BRANCH_FAILED'
        }
      }
      
      console.log('[Setup Service] Main branch created successfully with ID:', mainBranchId)

      // Step 4: Create Additional Branches
      // Handle both formats: additionalBranches array or numberOfBranches
      const allBranchIds = [mainBranchId]
      let additionalBranches: Array<{ name: string }> = []
      
      if (data.additionalBranches && Array.isArray(data.additionalBranches)) {
        // Use provided additionalBranches array
        additionalBranches = data.additionalBranches
      } else if (data.numberOfBranches && data.numberOfBranches > 1) {
        // Build additionalBranches array from numberOfBranches
        for (let i = 2; i <= data.numberOfBranches; i++) {
          additionalBranches.push({ name: `Branch ${i}` })
        }
      }
      
      for (const branch of additionalBranches) {
        // Clean payload - only send required fields
        const branchPayload = {
          tenant_id: tenantId,
          name: branch.name,
          currency: currency,
          is_main: false
        }
        
        console.log(`[Setup Service] Creating additional branch "${branch.name}" with payload:`, JSON.stringify(branchPayload, null, 2))
        
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .insert([branchPayload])
          .select()
          .single()

        if (branchError) {
          console.error(`[Setup Service] Error creating branch "${branch.name}":`, branchError)
          console.error(`[Setup Service] Payload that failed:`, JSON.stringify(branchPayload, null, 2))
          // Continue with other branches even if one fails
        } else {
          const branchId = branchData?.id
          if (branchId) {
            allBranchIds.push(branchId)
            console.log(`[Setup Service] Branch "${branch.name}" created successfully with ID:`, branchId)
          }
        }
      }

      // Step 5: Create Treasuries for EVERY branch
      for (const branchId of allBranchIds) {
        // Clean payload - ensure branch_id and tenant_id are included
        const treasuryPayload = {
          tenant_id: tenantId,
          branch_id: branchId,
          name: 'Main Safe',
          type: 'cash',
          currency: currency,
          initial_balance: 0,
          current_balance: 0
        }
        
        console.log(`[Setup Service] Creating treasury for branch ${branchId} with payload:`, JSON.stringify(treasuryPayload, null, 2))
        
        const { error: treasuryError } = await supabase
          .from('treasury_accounts')
          .insert([treasuryPayload])

        if (treasuryError) {
          console.error(`[Setup Service] Error creating treasury for branch ${branchId}:`, treasuryError)
          console.error(`[Setup Service] Payload that failed:`, JSON.stringify(treasuryPayload, null, 2))
          // Continue with other treasuries even if one fails
        } else {
          console.log(`[Setup Service] Treasury created successfully for branch ${branchId}`)
        }
      }

      // Step 6: Update Profile
      const adminFullName = data.adminData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Super Admin'
      
      // Clean payload - ensure all required fields are included
      const profilePayload = {
        id: user.id,
        email: user.email,
        full_name: adminFullName,
        role: 'super_admin',
        tenant_id: tenantId,
        branch_id: mainBranchId
      }
      
      console.log('[Setup Service] Updating profile with payload:', JSON.stringify(profilePayload, null, 2))
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('[Setup Service] Error updating profile:', profileError)
        console.error('[Setup Service] Payload that failed:', JSON.stringify(profilePayload, null, 2))
        // Don't fail setup if profile update fails, but log the error
      } else {
        console.log('[Setup Service] Profile updated successfully')
      }

      // Also update user metadata if available
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: adminFullName,
            role: 'super_admin',
            tenant_id: tenantId,
            branch_id: mainBranchId
          }
        })
      } catch (metadataError) {
        console.warn('Error updating user metadata:', metadataError)
        // Non-critical, continue
      }

      // Step 7: Finalize - Mark Setup Complete
      const setupCompletedAt = new Date().toISOString()
      
      // Clean payload - ensure both is_setup_completed and setup_completed_at are included
      const settingsUpdatePayload = {
        is_setup_completed: true,
        setup_completed_at: setupCompletedAt,
        setup_completed_by: user.id
      }
      
      console.log('[Setup Service] Updating system_settings with payload:', JSON.stringify(settingsUpdatePayload, null, 2))
      
      const { error: settingsError } = await supabase
        .from('system_settings')
        .update(settingsUpdatePayload)
        .eq('id', '00000000-0000-0000-0000-000000000000')

      if (settingsError) {
        // Try to insert if update fails (record might not exist)
        const settingsInsertPayload = {
          id: '00000000-0000-0000-0000-000000000000',
          is_setup_completed: true,
          setup_completed_at: setupCompletedAt,
          setup_completed_by: user.id
        }
        
        console.log('[Setup Service] Update failed, attempting insert with payload:', JSON.stringify(settingsInsertPayload, null, 2))
        
        const { error: insertError } = await supabase
          .from('system_settings')
          .upsert(settingsInsertPayload, {
            onConflict: 'id'
          })

        if (insertError) {
          console.error('[Setup Service] Error marking setup as completed:', insertError)
          console.error('[Setup Service] Payload that failed:', JSON.stringify(settingsInsertPayload, null, 2))
          return {
            success: false,
            error: `Failed to mark setup as completed: ${insertError.message}`,
            errorCode: 'MARK_SETUP_COMPLETE_FAILED'
          }
        } else {
          console.log('[Setup Service] System settings inserted successfully')
        }
      } else {
        console.log('[Setup Service] System settings updated successfully')
      }

      // Set the tenant in the store
      tenantStore.setTenantId(tenantId)

      console.log('[Setup Service] ✅ Setup completed successfully!')
      console.log('[Setup Service] Tenant ID:', tenantId)
      console.log('[Setup Service] Main Branch ID:', mainBranchId)
      console.log('[Setup Service] User ID:', user.id)

      return {
        success: true,
        tenantId,
        mainBranchId
      }
    } catch (error: any) {
      console.error('Error completing system setup:', error)
      return {
        success: false,
        error: error.message || 'Failed to complete system setup',
        errorCode: 'SETUP_FAILED'
      }
    }
  }
}

const setupService = new SetupService()
export default setupService
