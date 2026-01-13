import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'
import paymentsService from './paymentsService'
import treasuryService from './treasuryService'
import projectsService from './projectsService'

class LaborGroupsService {
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

  // Calculate net days excluding holidays
  // holidays: array of day names like ['Friday', 'Saturday', 'Sunday']
  // IMPORTANT: This function EXCLUSIVELY uses manual startDate and endDate (YYYY-MM-DD format)
  // It does NOT use created_at or system timestamps
  calculateNetDays(startDate, endDate, holidays = []) {
    if (!startDate || !endDate) return 0
    
    // Ensure dates are in YYYY-MM-DD format (manual dates from UI)
    // Dates should already be strings in YYYY-MM-DD format from the UI
    const startDateStr = typeof startDate === 'string' 
      ? startDate.split('T')[0] // Remove time if present
      : String(startDate).split('T')[0] // Convert to string and extract date part
    
    const endDateStr = typeof endDate === 'string'
      ? endDate.split('T')[0] // Remove time if present
      : String(endDate).split('T')[0] // Convert to string and extract date part
    
    // Create Date objects from the manual date strings (YYYY-MM-DD)
    const start = new Date(startDateStr + 'T00:00:00') // Set to start of day
    const end = new Date(endDateStr + 'T00:00:00') // Set to start of day
    
    if (start > end) return 0
    
    let netDays = 0
    const currentDate = new Date(start)
    
    // Map day names to day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayNameMap = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    }
    
    const holidayDays = holidays.map(day => dayNameMap[day]).filter(d => d !== undefined)
    
    // Iterate through each day from start to end (inclusive)
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()
      
      // Only count if it's not a holiday
      if (!holidayDays.includes(dayOfWeek)) {
        netDays++
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return netDays
  }

  // Calculate total amount for a labor group
  // This function explicitly uses manual date fields (netDays calculated from startDate/endDate)
  calculateTotal(netDays, normalCount, skilledCount, normalRate, skilledRate, overtime = 0, deductions = 0) {
    // Ensure netDays is calculated from manual start_date and end_date (not system timestamps)
    const normalTotal = netDays * normalCount * normalRate
    const skilledTotal = netDays * skilledCount * skilledRate
    const baseTotal = normalTotal + skilledTotal
    const finalTotal = baseTotal + overtime - deductions
    
    return {
      normalTotal,
      skilledTotal,
      baseTotal,
      overtime,
      deductions,
      finalTotal
    }
  }

  // Generate calculation breakdown text for display and saving
  generateCalculationBreakdown(normalCount, normalRate, skilledCount, skilledRate, netDays, calculations, overtime, deductions) {
    let breakdown = `العمالة العادية: ${normalCount} × ${normalRate.toFixed(2)} × ${netDays} = ${calculations.normalTotal.toFixed(2)} ريال`
    
    if (skilledCount > 0 && skilledRate > 0) {
      breakdown += `\nالعمالة المهنية/الخلفة: ${skilledCount} × ${skilledRate.toFixed(2)} × ${netDays} = ${calculations.skilledTotal.toFixed(2)} ريال`
    }
    
    breakdown += `\nالمجموع الأساسي: ${calculations.baseTotal.toFixed(2)} ريال`
    
    if (overtime > 0) {
      breakdown += `\nإضافي/مكافأة: +${overtime.toFixed(2)} ريال`
    }
    
    if (deductions > 0) {
      breakdown += `\nخصومات: -${deductions.toFixed(2)} ريال`
    }
    
    breakdown += `\nالمبلغ الإجمالي النهائي: ${calculations.finalTotal.toFixed(2)} ريال`
    
    return breakdown
  }

  // Get all labor groups (filtered by current tenant)
  async getLaborGroups(projectId = null, status = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch labor groups.')
        return []
      }

      let query = supabase
        .from('labor_groups')
        .select('*')
        .eq('tenant_id', tenantId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      let groups = (data || []).map(group => this.mapToCamelCase(group))

      // Filter by projectId if provided (handle both project_id and project_ids array)
      if (projectId) {
        groups = groups.filter(group => {
          const projectIds = group.projectIds || (group.projectId ? [group.projectId] : [])
          return projectIds.includes(projectId)
        })
      }

      return groups
    } catch (error) {
      console.error('Error fetching labor groups:', error.message)
      return []
    }
  }

  // Get paid labor groups by project ID (for project expenses calculation)
  async getPaidLaborGroupsByProject(projectId) {
    try {
      if (!projectId) return []
      
      const allGroups = await this.getLaborGroups(projectId, 'paid')
      
      // Filter groups that have this project in their project_ids array
      return allGroups.filter(group => {
        const projectIds = group.projectIds || (group.projectId ? [group.projectId] : [])
        return projectIds.includes(projectId)
      })
    } catch (error) {
      console.error('Error fetching paid labor groups by project:', error.message)
      return []
    }
  }

  // Get treasury transaction for a labor group (for receipt viewing)
  async getTreasuryTransactionForGroup(groupId) {
    try {
      if (!groupId) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury transaction.')
        return null
      }

      const { data, error } = await supabase
        .from('treasury_transactions')
        .select(`
          *,
          treasury_accounts:account_id (
            id,
            name,
            type
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('reference_type', 'labor_group')
        .eq('reference_id', groupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // If no transaction found, return null (might be paid via advance)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      if (!data) return null

      return {
        id: data.id,
        accountId: data.account_id,
        accountName: data.treasury_accounts?.name || 'غير محدد',
        accountType: data.treasury_accounts?.type || 'unknown',
        amount: parseFloat(data.amount) || 0,
        transactionType: data.transaction_type,
        description: data.description,
        createdAt: data.created_at
      }
    } catch (error) {
      console.error('Error fetching treasury transaction for group:', error.message)
      return null
    }
  }

  // Get labor group by ID
  async getLaborGroup(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch labor group.')
        return null
      }

      const { data, error } = await supabase
        .from('labor_groups')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching labor group:', error.message)
      return null
    }
  }

  // Create new labor group
  async createLaborGroup(groupData) {
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
      // Support both projectId (single) and projectIds (array) for backward compatibility
      const projectIds = groupData.projectIds || (groupData.projectId ? [groupData.projectId] : [])
      if (!groupData.startDate || projectIds.length === 0) {
        return {
          success: false,
          error: 'تاريخ البداية والمشروع مطلوبان',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      if (groupData.normalCount === undefined) {
        return {
          success: false,
          error: 'عدد العمالة العادية مطلوب',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Skilled labor is optional - if not provided, default to 0
      const skilledCount = groupData.skilledCount !== undefined && groupData.skilledCount !== null 
        ? parseInt(groupData.skilledCount) 
        : 0
      const skilledRate = groupData.skilledRate !== undefined && groupData.skilledRate !== null
        ? parseFloat(groupData.skilledRate)
        : 0

      // Get current user ID from session, or use provided createdBy (optional)
      let createdBy = groupData.createdBy
      if (!createdBy || createdBy === 'user') {
        createdBy = await this.getCurrentUserId()
      }

      // Only send project_ids array, do not send project_id
      const newGroup = {
        id: groupData.id || crypto.randomUUID(),
        tenant_id: tenantId,
        project_ids: projectIds.length > 0 ? projectIds : null, // Only send project_ids array
        engineer_id: groupData.engineerId || null,
        engineer_name: groupData.engineerName || null,
        start_date: groupData.startDate,
        end_date: null, // Will be set when closing
        normal_count: parseInt(groupData.normalCount) || 0,
        skilled_count: skilledCount,
        normal_rate: parseFloat(groupData.normalRate) || 0,
        skilled_rate: skilledRate,
        holidays: groupData.holidays || [],
        net_days: null, // Will be calculated when closing
        overtime: 0,
        deductions: 0,
        deduction_reason: null,
        total_amount: 0,
        status: 'active',
        payment_method: null,
        linked_advance_id: null,
        treasury_account_id: null,
        approved_by: null,
        approved_at: null,
        notes: groupData.notes || null
      }

      // Only add created_by if we have a valid UUID (optional)
      if (createdBy && createdBy !== 'user') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(createdBy)) {
          newGroup.created_by = createdBy
        }
        // If invalid UUID format, omit the field - database should handle this gracefully
      }
      // If createdBy is null or 'user', omit the field - database should handle this gracefully

      // CRITICAL: Ensure start_date is saved in YYYY-MM-DD format (manual date from UI)
      // Do NOT use created_at or system timestamp
      // The UI should send dates already formatted as YYYY-MM-DD strings
      if (groupData.startDate) {
        // Force use the exact string provided by UI (already in YYYY-MM-DD format)
        // Remove any time component if present
        const startDateForDB = typeof groupData.startDate === 'string'
          ? groupData.startDate.split('T')[0] // Extract YYYY-MM-DD from string
          : String(groupData.startDate).split('T')[0] // Convert to string and extract date part
        newGroup.start_date = startDateForDB
      }

      const { data: insertedGroup, error } = await supabase
        .from('labor_groups')
        .insert([newGroup])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        group: this.mapToCamelCase(insertedGroup)
      }
    } catch (error) {
      console.error('Error creating labor group:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء مجموعة العمالة',
        errorCode: 'CREATE_GROUP_FAILED'
      }
    }
  }

  // Close labor group (set end date, calculate totals, set status to pending_approval)
  async closeLaborGroup(id, closeData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المجموعة مطلوب',
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

      // Get existing group
      const existingGroup = await this.getLaborGroup(id)
      if (!existingGroup) {
        return {
          success: false,
          error: 'المجموعة غير موجودة',
          errorCode: 'GROUP_NOT_FOUND'
        }
      }

      if (existingGroup.status !== 'active') {
        return {
          success: false,
          error: 'المجموعة ليست نشطة - لا يمكن إغلاقها',
          errorCode: 'GROUP_NOT_ACTIVE'
        }
      }

      if (!closeData.endDate) {
        return {
          success: false,
          error: 'تاريخ النهاية مطلوب',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Validate deductions reason if deductions > 0
      if (closeData.deductions && parseFloat(closeData.deductions) > 0 && !closeData.deductionReason) {
        return {
          success: false,
          error: 'سبب الخصومات مطلوب عند وجود خصومات',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Calculate net days using manually selected start_date and end_date (NOT system timestamps)
      // Ensure we use the manual dates from the form/group data
      if (!existingGroup.startDate) {
        return {
          success: false,
          error: 'تاريخ البداية مطلوب - يجب تحديده يدوياً',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      if (!closeData.endDate) {
        return {
          success: false,
          error: 'تاريخ النهاية مطلوب - يجب تحديده يدوياً',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      const holidays = existingGroup.holidays || closeData.holidays || []
      
      // CRITICAL: Use ONLY manual dates (YYYY-MM-DD format) - NOT created_at or system timestamps
      // Ensure dates are in YYYY-MM-DD format before calculation
      // The UI should send dates already formatted as YYYY-MM-DD strings
      const manualStartDate = typeof existingGroup.startDate === 'string'
        ? existingGroup.startDate.split('T')[0]
        : String(existingGroup.startDate).split('T')[0]
      
      const manualEndDate = typeof closeData.endDate === 'string'
        ? closeData.endDate.split('T')[0]
        : String(closeData.endDate).split('T')[0]
      
      // Calculate net days using EXCLUSIVELY manual dates
      const netDays = this.calculateNetDays(manualStartDate, manualEndDate, holidays)

      // Calculate total (handle optional skilled labor)
      // Explicitly use manual date fields and group data
      const skilledCount = existingGroup.skilledCount || 0
      const skilledRate = existingGroup.skilledRate || 0
      const calculations = this.calculateTotal(
        netDays, // Calculated from manual startDate and endDate
        existingGroup.normalCount,
        skilledCount,
        existingGroup.normalRate,
        skilledRate,
        parseFloat(closeData.overtime) || 0,
        parseFloat(closeData.deductions) || 0
      )

      // Generate calculation breakdown text
      const breakdownText = this.generateCalculationBreakdown(
        existingGroup.normalCount,
        existingGroup.normalRate,
        skilledCount,
        skilledRate,
        netDays,
        calculations,
        closeData.overtime || 0,
        closeData.deductions || 0
      )

      // Update group
      // Append calculation breakdown to notes
      const existingNotes = closeData.notes || existingGroup.notes || ''
      const notesWithBreakdown = existingNotes 
        ? `${existingNotes}\n\n--- تفاصيل الحساب ---\n${breakdownText}`
        : `--- تفاصيل الحساب ---\n${breakdownText}`

      // Ensure end_date is saved in YYYY-MM-DD format (manual date from UI)
      // The UI should send dates already formatted as YYYY-MM-DD strings
      const endDateForDB = typeof closeData.endDate === 'string'
        ? closeData.endDate.split('T')[0] // Extract YYYY-MM-DD from string
        : String(closeData.endDate).split('T')[0] // Convert to string and extract date part

      const updateData = {
        end_date: endDateForDB, // Save manual endDate in YYYY-MM-DD format
        holidays: holidays,
        net_days: netDays, // Calculated from manual startDate and endDate
        overtime: calculations.overtime,
        deductions: calculations.deductions,
        deduction_reason: closeData.deductionReason || null,
        total_amount: calculations.finalTotal, // Calculated using manual dates
        status: 'pending_approval', // Set to pending approval
        notes: notesWithBreakdown,
        updated_at: new Date().toISOString()
      }

      const { data: updatedGroup, error } = await supabase
        .from('labor_groups')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        group: this.mapToCamelCase(updatedGroup),
        calculations: {
          netDays,
          ...calculations,
          breakdownText: breakdownText
        }
      }
    } catch (error) {
      console.error('Error closing labor group:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إغلاق مجموعة العمالة',
        errorCode: 'CLOSE_GROUP_FAILED'
      }
    }
  }

  // Phase 1: Admin approves the group (changes status to 'approved_for_payment')
  async approveLaborGroup(id, approvalData = {}) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المجموعة مطلوب',
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

      // Get existing group
      const existingGroup = await this.getLaborGroup(id)
      if (!existingGroup) {
        return {
          success: false,
          error: 'المجموعة غير موجودة',
          errorCode: 'GROUP_NOT_FOUND'
        }
      }

      if (existingGroup.status !== 'pending_approval') {
        return {
          success: false,
          error: 'المجموعة ليست في حالة انتظار الموافقة',
          errorCode: 'INVALID_STATUS'
        }
      }

      // Get current user ID for approval
      let approvedBy = approvalData.approvedBy
      if (!approvedBy || approvedBy === 'admin') {
        approvedBy = await this.getCurrentUserId()
      }

      // Update group status to 'approved_for_payment' (Phase 1)
      const updateData = {
        status: 'approved_for_payment',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only add approved_by if we have a valid UUID
      if (approvedBy && approvedBy !== 'admin') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(approvedBy)) {
          updateData.approved_by = approvedBy
        }
      }

      const { data: updatedGroup, error } = await supabase
        .from('labor_groups')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        group: this.mapToCamelCase(updatedGroup)
      }
    } catch (error) {
      console.error('Error approving labor group:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في الموافقة على مجموعة العمالة',
        errorCode: 'APPROVE_GROUP_FAILED'
      }
    }
  }

  // Phase 2: Accountant processes payment (only after admin approval)
  async payLaborGroup(id, paymentData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المجموعة مطلوب',
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

      // Get existing group
      const existingGroup = await this.getLaborGroup(id)
      if (!existingGroup) {
        return {
          success: false,
          error: 'المجموعة غير موجودة',
          errorCode: 'GROUP_NOT_FOUND'
        }
      }

      if (existingGroup.status !== 'approved_for_payment') {
        return {
          success: false,
          error: 'المجموعة ليست في حالة موافقة للدفع. يجب الموافقة عليها أولاً',
          errorCode: 'INVALID_STATUS'
        }
      }

      const paymentMethod = paymentData.paymentMethod // 'treasury' or 'advance'
      
      if (!paymentMethod || !['treasury', 'advance'].includes(paymentMethod)) {
        return {
          success: false,
          error: 'طريقة الدفع مطلوبة (خزينة أو عهدة)',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // If treasury payment, validate account
      if (paymentMethod === 'treasury') {
        if (!paymentData.treasuryAccountId) {
          return {
            success: false,
            error: 'حساب الخزينة مطلوب',
            errorCode: 'VALIDATION_ERROR'
          }
        }
      }

      // If advance payment, validate advance exists and has balance
      if (paymentMethod === 'advance') {
        if (!paymentData.linkedAdvanceId) {
          return {
            success: false,
            error: 'العهدة مطلوبة',
            errorCode: 'VALIDATION_ERROR'
          }
        }

        // Get advance details
        const advance = await paymentsService.getPayment(paymentData.linkedAdvanceId)
        if (!advance) {
          return {
            success: false,
            error: 'العهدة غير موجودة',
            errorCode: 'ADVANCE_NOT_FOUND'
          }
        }

        // Check if advance has sufficient balance
        const remainingAmount = advance.remainingAmount !== null && advance.remainingAmount !== undefined
          ? parseFloat(advance.remainingAmount)
          : parseFloat(advance.amount || 0)

        if (remainingAmount < existingGroup.totalAmount) {
          return {
            success: false,
            error: `رصيد العهدة غير كاف. المتاح: ${remainingAmount.toFixed(2)} ريال، المطلوب: ${existingGroup.totalAmount.toFixed(2)} ريال`,
            errorCode: 'INSUFFICIENT_ADVANCE_BALANCE'
          }
        }
      }

      // Update group with payment method (Phase 2)
      const updateData = {
        payment_method: paymentMethod,
        treasury_account_id: paymentMethod === 'treasury' ? paymentData.treasuryAccountId : null,
        linked_advance_id: paymentMethod === 'advance' ? paymentData.linkedAdvanceId : null,
        updated_at: new Date().toISOString()
      }

      const { data: updatedGroup, error } = await supabase
        .from('labor_groups')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      // Execute payment based on method
      if (paymentMethod === 'treasury') {
        // Create treasury outflow
        const treasuryResult = await treasuryService.createTransaction({
          accountId: paymentData.treasuryAccountId,
          amount: existingGroup.totalAmount,
          transactionType: 'outflow',
          referenceType: 'labor_group',
          referenceId: id,
          description: `صرف يومية عمالة - مجموعة رقم ${id}`
        })

        if (!treasuryResult.success) {
          // Rollback group payment method
          await supabase
            .from('labor_groups')
            .update({ payment_method: null, treasury_account_id: null, linked_advance_id: null })
            .eq('id', id)
            .eq('tenant_id', tenantId)

          return {
            success: false,
            error: `فشل في تنفيذ الدفع من الخزينة: ${treasuryResult.error}`,
            errorCode: 'TREASURY_PAYMENT_FAILED'
          }
        }

        // Mark as paid
        await supabase
          .from('labor_groups')
          .update({ status: 'paid' })
          .eq('id', id)
          .eq('tenant_id', tenantId)
      } else if (paymentMethod === 'advance') {
        // Deduct from advance
        // Get project ID (handle both projectId and projectIds array)
        const projectIds = existingGroup.projectIds || (existingGroup.projectId ? [existingGroup.projectId] : [])
        const projectId = projectIds.length > 0 ? projectIds[0] : existingGroup.projectId || null
        
        // Fetch project details to get contract_id
        // CRITICAL: Set contract_id = project.contract_id || null, NEVER use quotation_id
        let contractId = null
        if (projectId) {
          try {
            const tenantId = tenantStore.getTenantId()
            if (tenantId) {
              // Fetch directly from database to get contract_id (not quotation_id)
              const { data: projectData } = await supabase
                .from('projects')
                .select('contract_id')
                .eq('id', projectId)
                .eq('tenant_id', tenantId)
                .single()
              
              if (projectData) {
                // CRITICAL: Use contract_id from project, or null if not available
                // NEVER use quotation_id
                contractId = projectData.contract_id || null
              }
            }
          } catch (error) {
            console.warn('Error fetching project for contract_id:', error.message)
            // Continue with null contractId - this is safe
            contractId = null
          }
        }
        
        // Generate auto payment name: Labor Payment - [Group Name] - [Date]
        const groupName = existingGroup.engineerName || 'مجموعة عمالة'
        const paymentDate = new Date().toISOString().split('T')[0]
        const autoPaymentName = `Labor Payment - ${groupName} - ${paymentDate}`
        
        // Create a settlement payment linked to the advance
        const settlementResult = await paymentsService.createPayment({
          projectId: projectId,
          contractId: contractId, // Use contract_id from project, or null if not available (NEVER quotation_id)
          paymentType: 'expense',
          category: 'Labor',
          amount: existingGroup.totalAmount,
          dueDate: new Date().toISOString().split('T')[0],
          paidDate: new Date().toISOString().split('T')[0],
          status: 'paid',
          paymentMethod: 'cash',
          transactionType: 'settlement',
          settlementType: 'expense', // Expense settlement (spending from advance)
          linkedAdvanceId: paymentData.linkedAdvanceId,
          notes: autoPaymentName, // Auto-generated payment name
          workScope: 'Labor Group Settlement'
        })

        if (!settlementResult.success) {
          // Rollback group payment method
          await supabase
            .from('labor_groups')
            .update({ payment_method: null, treasury_account_id: null, linked_advance_id: null })
            .eq('id', id)
            .eq('tenant_id', tenantId)

          return {
            success: false,
            error: `فشل في خصم من العهدة: ${settlementResult.error}`,
            errorCode: 'ADVANCE_DEDUCTION_FAILED'
          }
        }

        // Mark as paid
        await supabase
          .from('labor_groups')
          .update({ status: 'paid' })
          .eq('id', id)
          .eq('tenant_id', tenantId)
      }

      return {
        success: true,
        group: this.mapToCamelCase(updatedGroup)
      }
    } catch (error) {
      console.error('Error paying labor group:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في دفع مجموعة العمالة',
        errorCode: 'PAY_GROUP_FAILED'
      }
    }
  }

  // Update labor group
  async updateLaborGroup(id, updates) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المجموعة مطلوب',
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
      // Allow updating startDate manually (must be manually selected, not system timestamp)
      // CRITICAL: Ensure start_date is saved in YYYY-MM-DD format (manual date from UI)
      // The UI should send dates already formatted as YYYY-MM-DD strings
      if (updates.startDate !== undefined) {
        const startDateForDB = typeof updates.startDate === 'string'
          ? updates.startDate.split('T')[0] // Extract YYYY-MM-DD from string
          : String(updates.startDate).split('T')[0] // Convert to string and extract date part
        updateData.start_date = startDateForDB
      }
      // Support both projectId (single) and projectIds (array) for backward compatibility
      // Only send project_ids, do not send project_id
      if (updates.projectIds !== undefined) {
        const projectIds = Array.isArray(updates.projectIds) ? updates.projectIds : (updates.projectIds ? [updates.projectIds] : [])
        updateData.project_ids = projectIds.length > 0 ? projectIds : null
        // Do not send project_id - only send project_ids array
      } else if (updates.projectId !== undefined) {
        // Legacy support: if projectId is provided, convert to array
        updateData.project_ids = updates.projectId ? [updates.projectId] : null
        // Do not send project_id - only send project_ids array
      }
      if (updates.normalCount !== undefined) updateData.normal_count = parseInt(updates.normalCount) || 0
      // Skilled labor is optional - handle null/undefined properly
      if (updates.skilledCount !== undefined) {
        updateData.skilled_count = updates.skilledCount !== null && updates.skilledCount !== undefined 
          ? parseInt(updates.skilledCount) || 0 
          : 0
      }
      if (updates.normalRate !== undefined) updateData.normal_rate = parseFloat(updates.normalRate) || 0
      if (updates.skilledRate !== undefined) {
        updateData.skilled_rate = updates.skilledRate !== null && updates.skilledRate !== undefined
          ? parseFloat(updates.skilledRate) || 0
          : 0
      }
      if (updates.holidays !== undefined) updateData.holidays = updates.holidays
      if (updates.notes !== undefined) updateData.notes = updates.notes

      const { data, error } = await supabase
        .from('labor_groups')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      if (!data) {
        return {
          success: false,
          error: 'المجموعة غير موجودة',
          errorCode: 'GROUP_NOT_FOUND'
        }
      }

      return {
        success: true,
        group: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating labor group:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث مجموعة العمالة',
        errorCode: 'UPDATE_GROUP_FAILED'
      }
    }
  }

  // Delete labor group (only if not paid)
  async deleteLaborGroup(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف المجموعة مطلوب',
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

      // Check if group is paid
      const group = await this.getLaborGroup(id)
      if (group && group.status === 'paid') {
        return {
          success: false,
          error: 'لا يمكن حذف مجموعة تم دفعها',
          errorCode: 'CANNOT_DELETE_PAID'
        }
      }

      const { error } = await supabase
        .from('labor_groups')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting labor group:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف مجموعة العمالة',
        errorCode: 'DELETE_GROUP_FAILED'
      }
    }
  }

  // Get engineer advances (for advance payment option)
  // CRITICAL: Only fetch advances that meet ALL 3 criteria:
  // 1) Belong to the same engineer_id (or engineer_name if engineer_id not available)
  // 2) Status is strictly 'approved' or 'paid' (engineer actually has the money)
  // 3) Have remaining balance > 0
  async getEngineerAdvances(engineerName, engineerId = null) {
    try {
      if (!engineerName && !engineerId) return []
      
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      // Build query to fetch advances
      let query = supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('transaction_type', 'advance')
        .in('status', ['approved', 'paid']) // CRITICAL: Only 'approved' or 'paid' status
        .order('due_date', { ascending: false })

      // Filter by engineer_id if available, otherwise by engineer_name (manager_name)
      if (engineerId) {
        // If payments table has engineer_id field, use it
        // Otherwise, fall back to manager_name matching
        query = query.eq('manager_name', engineerName) // For now, use manager_name
        // TODO: If payments table gets engineer_id field, use: query = query.eq('engineer_id', engineerId)
      } else if (engineerName) {
        query = query.eq('manager_name', engineerName)
      } else {
        return [] // No engineer identifier provided
      }

      const { data: advances, error } = await query

      if (error) throw error

      // CRITICAL: Filter by remainingAmount > 0
      // Only return advances that have remaining balance
      const filteredAdvances = (advances || []).filter(adv => {
        const remaining = adv.remaining_amount !== null && adv.remaining_amount !== undefined
          ? parseFloat(adv.remaining_amount)
          : parseFloat(adv.amount || 0)
        return remaining > 0
      })

      // Map to camelCase
      return filteredAdvances.map(p => paymentsService.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching engineer advances:', error.message)
      return []
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(group) {
    if (!group) return null

    // Safely handle project_ids - ensure it's always an array or empty array
    const projectIds = Array.isArray(group.project_ids) 
      ? group.project_ids 
      : (group.project_id ? [group.project_id] : [])

    return {
      id: group.id,
      projectId: group.project_id, // Keep for backward compatibility
      projectIds: projectIds, // Always an array, never null/undefined
      engineerId: group.engineer_id,
      engineerName: group.engineer_name,
      startDate: group.start_date,
      endDate: group.end_date,
      normalCount: parseInt(group.normal_count) || 0,
      skilledCount: parseInt(group.skilled_count) || 0,
      normalRate: parseFloat(group.normal_rate) || 0,
      skilledRate: parseFloat(group.skilled_rate) || 0,
      holidays: group.holidays || [],
      netDays: group.net_days,
      overtime: parseFloat(group.overtime) || 0,
      deductions: parseFloat(group.deductions) || 0,
      deductionReason: group.deduction_reason,
      totalAmount: parseFloat(group.total_amount) || 0,
      status: group.status,
      paymentMethod: group.payment_method,
      linkedAdvanceId: group.linked_advance_id,
      treasuryAccountId: group.treasury_account_id,
      approvedBy: group.approved_by,
      approvedAt: group.approved_at,
      notes: group.notes,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      createdBy: group.created_by
    }
  }
}

const laborGroupsService = new LaborGroupsService()
export default laborGroupsService
