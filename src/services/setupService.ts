import { supabase } from './supabaseClient'
import systemSettingsService from './systemSettingsService'
import tenantStore from './tenantStore'

interface AdminData {
  email: string
  password: string
  full_name: string
}

interface BranchConfig {
  name: string
  currency: string
  isMain: boolean
}

interface SetupData {
  name?: string // Company name
  industry_type?: string // Industry type
  currency?: string // Currency code (deprecated - use branches array)
  branches?: BranchConfig[] // Array of branch configurations (name, currency, isMain)
  mainBranchName?: string // Deprecated - use branches array
  additionalBranches?: Array<{ name: string }> // Deprecated - use branches array
  numberOfBranches?: number // Deprecated - use branches array length
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

      // Extract admin full name once for use throughout setup
      const adminFullName = data.adminData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Super Admin'

      // Step 2: Create Tenant
      const companyName = data.name || data.companyName || 'New Company'
      const industryType = data.industry_type || data.industryType || 'engineering'
      
      // CRITICAL DEBUG: Log incoming data
      console.log('🔥 [Setup Service] Received data.name:', data.name)
      console.log('🔥 [Setup Service] Received data.companyName:', data.companyName)
      console.log('🔥 [Setup Service] Resolved companyName:', companyName)
      console.log('🔥 [Setup Service] Received data.branches:', JSON.stringify(data.branches, null, 2))
      
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

      // FIX: Always ensure the tenant name matches the user's input
      if (data.companyName) {
        console.log(`🔥 [Setup Service] Updating tenant name to: ${data.companyName}`)
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ name: data.companyName })
          .eq('id', tenantId)
        
        if (updateError) {
          console.error('❌ [Setup Service] Failed to update tenant name:', updateError)
        } else {
          // Verification: Confirm the update was successful
          const { data: updatedTenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .single()
          
          if (updatedTenant) {
            console.log(`✅ [Setup Service] Tenant name verification: Updated to "${updatedTenant.name}" (expected: "${data.companyName}")`)
          }
        }
      }

      // Step 3: Create Branches (with individual currencies)
      let branchesConfig: BranchConfig[] = []
      let mainBranchId: string | null = null
      
      // Check if new format (branches array) is provided
      if (data.branches && Array.isArray(data.branches) && data.branches.length > 0) {
        // NEW FORMAT: Use branches array with individual currencies
        branchesConfig = data.branches
        
        console.log(`🔥 [Setup Service] Processing ${branchesConfig.length} branches in NEW FORMAT`)
        
        // Validate that exactly one branch is marked as main
        const mainBranches = branchesConfig.filter(b => b.isMain)
        if (mainBranches.length !== 1) {
          return {
            success: false,
            error: 'Exactly one branch must be marked as main branch',
            errorCode: 'INVALID_BRANCH_CONFIG'
          }
        }
        
        // Validate all branches have required fields
        for (const branch of branchesConfig) {
          if (!branch.name || branch.name.trim() === '') {
            return {
              success: false,
              error: `Branch name is required for all branches`,
              errorCode: 'INVALID_BRANCH_CONFIG'
            }
          }
          if (!branch.currency || branch.currency.trim() === '') {
            return {
              success: false,
              error: `Currency is required for branch "${branch.name}". Please select a currency.`,
              errorCode: 'INVALID_BRANCH_CONFIG'
            }
          }
        }
      } else {
        // LEGACY FORMAT: Backward compatibility (deprecated - use branches array)
        console.log('⚠️ [Setup Service] Using LEGACY FORMAT (deprecated). Please use branches array instead.')
        const currency = data.currency || 'SAR'
        const mainBranchName = data.mainBranchName || 'Main Branch'
        
        branchesConfig = [{
          name: mainBranchName,
          currency: currency,
          isMain: true
        }]
        
        // Add additional branches if provided
        if (data.additionalBranches && Array.isArray(data.additionalBranches)) {
          data.additionalBranches.forEach(branch => {
            branchesConfig.push({
              name: branch.name,
              currency: currency,
              isMain: false
            })
          })
        } else if (data.numberOfBranches && data.numberOfBranches > 1) {
          for (let i = 2; i <= data.numberOfBranches; i++) {
            branchesConfig.push({
              name: `Branch ${i}`,
              currency: currency,
              isMain: false
            })
          }
        }
        
        console.log(`⚠️ [Setup Service] Legacy format: ${branchesConfig.length} branches configured, all using currency: ${currency}`)
      }
      
      // Create all branches
      const allBranchIds: Array<{ id: string; currency: string; name: string }> = []
      
      console.log(`🔥 [Setup Service] Starting branch creation loop. Total branches to create: ${branchesConfig.length}`)
      
      for (let i = 0; i < branchesConfig.length; i++) {
        const branchConfig = branchesConfig[i]
        
        console.log(`🔥 [Setup Service] Processing branch ${i + 1}/${branchesConfig.length}:`, {
          name: branchConfig.name,
          currency: branchConfig.currency,
          isMain: branchConfig.isMain
        })
        
        // FAIL LOUD: Validate currency before processing
        if (!branchConfig.currency || branchConfig.currency.trim() === '') {
          console.error(`❌ [Setup Service] CRITICAL: Branch "${branchConfig.name}" has no currency!`)
          return {
            success: false,
            error: `Branch "${branchConfig.name}" must have a currency. Currency cannot be empty.`,
            errorCode: 'MISSING_BRANCH_CURRENCY'
          }
        }
        
        // Clean payload - only send required fields
        const branchPayload = {
          tenant_id: tenantId,
          name: branchConfig.name.trim(),
          currency: branchConfig.currency, // This must be a valid currency code, not empty
          is_main: branchConfig.isMain
        }
        
        console.log(`[Setup Service] Creating branch "${branchConfig.name}" (${branchConfig.currency}) with payload:`, JSON.stringify(branchPayload, null, 2))
        
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .insert([branchPayload])
          .select()
          .single()

        if (branchError) {
          console.error(`❌ [Setup Service] Error creating branch "${branchConfig.name}":`, branchError)
          console.error(`❌ [Setup Service] Payload that failed:`, JSON.stringify(branchPayload, null, 2))
          return {
            success: false,
            error: `Failed to create branch "${branchConfig.name}": ${branchError.message}`,
            errorCode: 'CREATE_BRANCH_FAILED'
          }
        }

        const branchId = branchData?.id
        if (!branchId) {
          console.error(`❌ [Setup Service] Branch "${branchConfig.name}" created but no ID returned:`, branchData)
          return {
            success: false,
            error: `Failed to create branch "${branchConfig.name}": No ID returned from database`,
            errorCode: 'CREATE_BRANCH_FAILED'
          }
        }
        
        allBranchIds.push({ id: branchId, currency: branchConfig.currency, name: branchConfig.name })
        console.log(`✅ [Setup Service] Branch ${i + 1}/${branchesConfig.length} "${branchConfig.name}" (${branchConfig.currency}) created successfully with ID:`, branchId)
        
        // If this is the main branch, store its ID and link the user immediately
        if (branchConfig.isMain) {
          mainBranchId = branchId
          
          // CRITICAL: Immediately link the creating user to the main branch
          console.log('[Setup Service] Linking user to main branch...')
          
          const profilePayload = {
            id: user.id,
            email: user.email,
            full_name: adminFullName,
            role: 'super_admin',
            tenant_id: tenantId,
            branch_id: mainBranchId // CRITICAL: Link user to the main branch immediately
          }
          
          console.log('[Setup Service] Updating profile with branch_id:', JSON.stringify(profilePayload, null, 2))
          
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profilePayload, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error('[Setup Service] CRITICAL: Error linking user to branch:', profileError)
            console.error('[Setup Service] Payload that failed:', JSON.stringify(profilePayload, null, 2))
            // This is critical - fail setup if we can't link the user
            return {
              success: false,
              error: `Failed to link user to branch: ${profileError.message}. The branch was created but the user is not linked.`,
              errorCode: 'LINK_USER_TO_BRANCH_FAILED'
            }
          } else {
            console.log('[Setup Service] ✅ User successfully linked to main branch')
          }

          // Also update user metadata for consistency
          try {
            await supabase.auth.updateUser({
              data: {
                full_name: adminFullName,
                role: 'super_admin',
                tenant_id: tenantId,
                branch_id: mainBranchId
              }
            })
            console.log('[Setup Service] ✅ User metadata updated')
          } catch (metadataError) {
            console.warn('[Setup Service] Warning: Error updating user metadata (non-critical):', metadataError)
            // Non-critical, continue
          }
        }
      }
      
      // Validate that main branch was found
      if (!mainBranchId) {
        console.error('❌ [Setup Service] CRITICAL: No main branch was created!')
        return {
          success: false,
          error: 'No main branch was created. At least one branch must be marked as main.',
          errorCode: 'NO_MAIN_BRANCH'
        }
      }

      console.log(`🔥 [Setup Service] Branch creation complete. Total branches created: ${allBranchIds.length}`)
      console.log(`🔥 [Setup Service] All branch IDs:`, JSON.stringify(allBranchIds.map(b => ({ name: b.name, currency: b.currency })), null, 2))

      // Step 4: Create Treasuries for EVERY branch (with branch-specific currency)
      console.log(`🔥 [Setup Service] Starting treasury creation. Total treasuries to create: ${allBranchIds.length}`)
      
      for (let i = 0; i < allBranchIds.length; i++) {
        const branchInfo = allBranchIds[i]
        
        console.log(`🔥 [Setup Service] Processing treasury ${i + 1}/${allBranchIds.length} for branch "${branchInfo.name}" with currency "${branchInfo.currency}"`)
        
        // FAIL LOUD: Validate currency before creating treasury
        if (!branchInfo.currency || branchInfo.currency.trim() === '') {
          console.error(`❌ [Setup Service] CRITICAL: Branch "${branchInfo.name}" has no currency for treasury!`)
          return {
            success: false,
            error: `Branch "${branchInfo.name}" has no currency. Cannot create treasury without currency.`,
            errorCode: 'MISSING_TREASURY_CURRENCY'
          }
        }
        
        // Use the branch's specific currency for its treasury
        const treasuryPayload = {
          tenant_id: tenantId,
          branch_id: branchInfo.id,
          name: `${branchInfo.name} Safe`, // Use branch name in treasury name
          type: 'cash',
          currency: branchInfo.currency, // CRITICAL: Use branch's currency, not a global one
          initial_balance: 0,
          current_balance: 0
        }
        
        console.log(`[Setup Service] Creating treasury for branch "${branchInfo.name}" (${branchInfo.currency}) with payload:`, JSON.stringify(treasuryPayload, null, 2))
        
        const { error: treasuryError } = await supabase
          .from('treasury_accounts')
          .insert([treasuryPayload])

        if (treasuryError) {
          console.error(`❌ [Setup Service] Error creating treasury for branch "${branchInfo.name}":`, treasuryError)
          console.error(`❌ [Setup Service] Payload that failed:`, JSON.stringify(treasuryPayload, null, 2))
          // Continue with other treasuries even if one fails (non-critical)
        } else {
          console.log(`✅ [Setup Service] Treasury ${i + 1}/${allBranchIds.length} created successfully for branch "${branchInfo.name}" (${branchInfo.currency})`)
        }
      }
      
      console.log(`🔥 [Setup Service] Treasury creation complete. Total treasuries created: ${allBranchIds.length}`)

      // Step 6: CRITICAL - Final User Linking Verification & Retry
      // Harden the user linking to ensure it's definitely set before completing setup
      console.log('🔥 [Setup Service] Step 6: Final user linking verification...')
      
      const profilePayload = {
        id: user.id,
        email: user.email,
        full_name: adminFullName,
        role: 'super_admin',
        tenant_id: tenantId,
        branch_id: mainBranchId // CRITICAL: Link user to the main branch
      }
      
      // Retry logic: Try updating profile up to 2 times if needed
      let profileUpdateSuccess = false
      let retryCount = 0
      const maxRetries = 2
      
      while (!profileUpdateSuccess && retryCount < maxRetries) {
        retryCount++
        console.log(`🔄 [Setup Service] Attempting to link user to branch (attempt ${retryCount}/${maxRetries})...`)
        console.log('🔄 [Setup Service] Profile payload:', JSON.stringify(profilePayload, null, 2))
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profilePayload, {
            onConflict: 'id'
          })
        
        if (profileError) {
          console.error(`❌ [Setup Service] Attempt ${retryCount} failed to link user:`, profileError)
          if (retryCount >= maxRetries) {
            // Final attempt failed - fail the setup
            return {
              success: false,
              error: `Failed to link user to branch after ${maxRetries} attempts: ${profileError.message}. Setup cannot complete without user linking.`,
              errorCode: 'LINK_USER_TO_BRANCH_FAILED'
            }
          }
          // Wait a bit before retrying (network glitch/race condition)
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          profileUpdateSuccess = true
          console.log(`✅ [Setup Service] User profile updated successfully (attempt ${retryCount})`)
        }
      }
      
      // CRITICAL: Verify the profile was actually updated by fetching it back
      console.log('🔍 [Setup Service] Verifying user profile link...')
      const { data: verifiedProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('id, tenant_id, branch_id, role')
        .eq('id', user.id)
        .single()
      
      if (verifyError) {
        console.error('❌ [Setup Service] Failed to verify profile:', verifyError)
        return {
          success: false,
          error: `Failed to verify user profile: ${verifyError.message}`,
          errorCode: 'VERIFY_PROFILE_FAILED'
        }
      }
      
      if (!verifiedProfile) {
        return {
          success: false,
          error: 'Profile verification failed: Profile not found',
          errorCode: 'PROFILE_NOT_FOUND'
        }
      }
      
      // Validate that tenant_id and branch_id are actually set
      if (!verifiedProfile.tenant_id || verifiedProfile.tenant_id !== tenantId) {
        console.error(`❌ [Setup Service] CRITICAL: Profile tenant_id mismatch! Expected: ${tenantId}, Got: ${verifiedProfile.tenant_id}`)
        return {
          success: false,
          error: `User profile tenant_id is incorrect. Expected: ${tenantId}, Got: ${verifiedProfile.tenant_id}`,
          errorCode: 'PROFILE_TENANT_MISMATCH'
        }
      }
      
      if (!verifiedProfile.branch_id || verifiedProfile.branch_id !== mainBranchId) {
        console.error(`❌ [Setup Service] CRITICAL: Profile branch_id mismatch! Expected: ${mainBranchId}, Got: ${verifiedProfile.branch_id}`)
        return {
          success: false,
          error: `User profile branch_id is incorrect. Expected: ${mainBranchId}, Got: ${verifiedProfile.branch_id}`,
          errorCode: 'PROFILE_BRANCH_MISMATCH'
        }
      }
      
      console.log('✅ [Setup Service] Profile verification successful:', {
        tenant_id: verifiedProfile.tenant_id,
        branch_id: verifiedProfile.branch_id,
        role: verifiedProfile.role
      })

      // Also update user metadata for consistency
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: adminFullName,
            role: 'super_admin',
            tenant_id: tenantId,
            branch_id: mainBranchId
          }
        })
        console.log('[Setup Service] ✅ User metadata updated')
      } catch (metadataError) {
        console.warn('[Setup Service] Warning: Error updating user metadata (non-critical):', metadataError)
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

      // Step 8: FINAL HARD LINK & VERIFY (The Ultimate Safety Net)
      // This is the final, definitive link before returning success
      // Do this AFTER all other steps to ensure nothing can override it
      console.log('🔥 [Setup Service] Step 8: FINAL hard link and verification...')
      console.log(`🔥 [Setup] Linking user ${user.id} to Tenant: ${tenantId} and Branch: ${mainBranchId}`)
      
      // Use finalAdminName to avoid variable collision (assign from top-level adminFullName)
      const finalAdminName = adminFullName
      
      // CRITICAL: Use UPSERT to recreate profile if missing (handles TRUNCATE scenario)
      // If profile row was deleted but Auth User exists, upsert will recreate it
      const finalLinkPayload = {
        id: user.id,
        email: user.email,
        full_name: finalAdminName,
        role: 'super_admin',
        tenant_id: tenantId,
        branch_id: mainBranchId
      }
      
      console.log('🔥 [Setup Service] Upserting profile with payload:', JSON.stringify(finalLinkPayload, null, 2))
      
      const { error: finalLinkError } = await supabase
        .from('profiles')
        .upsert(finalLinkPayload, {
          onConflict: 'id'
        })

      if (finalLinkError) {
        console.error('❌ [Setup Service] CRITICAL: Final hard link failed:', finalLinkError)
        throw new Error(`Failed to link user profile: ${finalLinkError.message}`)
      }
      
      console.log('✅ [Setup Service] Final hard link executed successfully')
      
      // CRITICAL VERIFICATION: Fetch profile immediately after update
      const { data: finalVerifiedProfile, error: finalVerifyError } = await supabase
        .from('profiles')
        .select('id, tenant_id, branch_id, role, email, full_name')
        .eq('id', user.id)
        .single()
      
      if (finalVerifyError) {
        console.error('❌ [Setup Service] CRITICAL: Failed to verify final profile link:', finalVerifyError)
        throw new Error(`Failed to verify user profile: ${finalVerifyError.message}`)
      }
      
      if (!finalVerifiedProfile) {
        throw new Error('CRITICAL: User profile not found after linking. Setup cannot complete.')
      }
      
      // FAIL-LOUD: Check that tenant_id and branch_id are NOT NULL
      if (!finalVerifiedProfile.tenant_id || finalVerifiedProfile.tenant_id !== tenantId) {
        console.error(`❌ [Setup Service] CRITICAL: Profile tenant_id is NULL or incorrect! Expected: ${tenantId}, Got: ${finalVerifiedProfile.tenant_id}`)
        throw new Error(`CRITICAL: User profile tenant_id is NULL or incorrect. Expected: ${tenantId}, Got: ${finalVerifiedProfile.tenant_id || 'NULL'}. Setup cannot complete with unlinked user.`)
      }
      
      if (!finalVerifiedProfile.branch_id || finalVerifiedProfile.branch_id !== mainBranchId) {
        console.error(`❌ [Setup Service] CRITICAL: Profile branch_id is NULL or incorrect! Expected: ${mainBranchId}, Got: ${finalVerifiedProfile.branch_id}`)
        throw new Error(`CRITICAL: User profile branch_id is NULL or incorrect. Expected: ${mainBranchId}, Got: ${finalVerifiedProfile.branch_id || 'NULL'}. Setup cannot complete with unlinked user.`)
      }
      
      console.log('✅ [Setup Service] FINAL verification successful - User is properly linked:', {
        user_id: finalVerifiedProfile.id,
        tenant_id: finalVerifiedProfile.tenant_id,
        branch_id: finalVerifiedProfile.branch_id,
        role: finalVerifiedProfile.role,
        email: finalVerifiedProfile.email
      })

      console.log('[Setup Service] ✅ Setup completed successfully!')
      console.log('[Setup Service] Tenant ID:', tenantId)
      console.log('[Setup Service] Main Branch ID:', mainBranchId)
      console.log('[Setup Service] User ID:', user.id)
      console.log('[Setup Service] Final Verified Profile:', {
        tenant_id: finalVerifiedProfile.tenant_id,
        branch_id: finalVerifiedProfile.branch_id,
        role: finalVerifiedProfile.role
      })

      return {
        success: true,
        tenantId,
        mainBranchId,
        user: {
          id: finalVerifiedProfile.id,
          email: finalVerifiedProfile.email || user.email,
          tenant_id: finalVerifiedProfile.tenant_id,
          branch_id: finalVerifiedProfile.branch_id,
          role: finalVerifiedProfile.role || 'super_admin',
          full_name: finalVerifiedProfile.full_name || finalAdminName
        }
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
