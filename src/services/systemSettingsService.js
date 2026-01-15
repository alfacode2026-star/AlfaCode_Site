import { supabase } from './supabaseClient'

class SystemSettingsService {
  // Check if system setup is completed
  async isSetupCompleted() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('is_setup_completed')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()

      if (error) {
        // If table doesn't exist or no record found, assume setup is not completed
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return false
        }
        console.error('Error checking setup status:', error)
        return false
      }

      return data?.is_setup_completed === true
    } catch (error) {
      console.error('Error checking setup status:', error)
      return false
    }
  }

  // Mark setup as completed
  async markSetupCompleted() {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          is_setup_completed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error marking setup as completed:', error)
      return {
        success: false,
        error: error.message || 'Failed to mark setup as completed'
      }
    }
  }

  // Get system settings
  async getSystemSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single()

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching system settings:', error)
      return null
    }
  }
}

const systemSettingsService = new SystemSettingsService()
export default systemSettingsService
