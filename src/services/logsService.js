import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import userManagementService from './userManagementService'

class LogsService {
  // Fetch deletion logs with filters and access control
  async fetchDeletionLogs(filters = {}) {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        return {
          success: false,
          error: 'No tenant ID set',
          logs: []
        }
      }

      // Check user role for access control
      const profile = await userManagementService.getCurrentUserProfile()
      const userRole = profile?.role || null
      const isSuperAdmin = userRole === 'super_admin'
      const isAdminOrManager = ['admin', 'manager'].includes(userRole)

      // Only super_admin, admin, and manager can access audit logs
      if (!isSuperAdmin && !isAdminOrManager) {
        return {
          success: false,
          error: 'Access Denied: Only Super Admins, Admins, and Managers can view audit logs.',
          logs: []
        }
      }

      // Build query - we'll join profiles manually after fetching logs
      let query = supabase
        .from('deletion_logs')
        .select('*')
        .eq('tenant_id', tenantId)

      // Branch filtering: Super Admin sees all, Admin/Manager see only their branch
      if (!isSuperAdmin && branchId) {
        query = query.eq('branch_id', branchId)
      } else if (!isSuperAdmin && !branchId) {
        // Admin/Manager without branch ID should see nothing
        return {
          success: true,
          logs: [],
          warning: 'No branch ID set. Cannot fetch logs.'
        }
      }

      // Apply additional filters if provided
      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      if (filters.deletedBy) {
        query = query.eq('deleted_by', filters.deletedBy)
      }

      // Sort by created_at descending (newest first)
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching deletion logs:', error)
        return {
          success: false,
          error: error.message || 'Failed to fetch deletion logs',
          logs: []
        }
      }

      // Fetch profiles for all unique deleted_by user IDs
      const uniqueUserIds = [...new Set((data || []).map(log => log.deleted_by).filter(Boolean))]
      const profilesMap = new Map()
      
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', uniqueUserIds)
        
        if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap.set(profile.id, profile)
          })
        }
      }

      // Map the data to include profile information
      const logs = (data || []).map(log => {
        const profile = profilesMap.get(log.deleted_by) || null
        return {
          id: log.id,
          tableName: log.table_name,
          recordRefNumber: log.record_ref_number,
          recordId: log.record_id,
          deletionReason: log.deletion_reason,
          deletedBy: log.deleted_by,
          deletedByName: profile?.full_name || 'Unknown User',
          deletedByEmail: profile?.email || 'Unknown Email',
          tenantId: log.tenant_id,
          branchId: log.branch_id,
          deletedData: log.deleted_data ? (typeof log.deleted_data === 'string' ? JSON.parse(log.deleted_data) : log.deleted_data) : null,
          createdAt: log.created_at
        }
      })

      return {
        success: true,
        logs: logs
      }
    } catch (error) {
      console.error('Error in fetchDeletionLogs:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch deletion logs',
        logs: []
      }
    }
  }

  // Get available table names for filtering
  async getTableNames() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const profile = await userManagementService.getCurrentUserProfile()
      const userRole = profile?.role || null
      const isSuperAdmin = userRole === 'super_admin'
      const branchId = branchStore.getBranchId()

      let query = supabase
        .from('deletion_logs')
        .select('table_name')
        .eq('tenant_id', tenantId)

      if (!isSuperAdmin && branchId) {
        query = query.eq('branch_id', branchId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching table names:', error)
        return []
      }

      // Get unique table names
      const tableNames = [...new Set((data || []).map(log => log.table_name))]
      return tableNames.sort()
    } catch (error) {
      console.error('Error in getTableNames:', error)
      return []
    }
  }
}

const logsService = new LogsService()
export default logsService
