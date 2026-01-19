'use client'

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { supabase } from '../services/supabaseClient'
import userManagementService from '../services/userManagementService'

interface RequireSetupProps {
  children: React.ReactNode
}

/**
 * Guard component that checks if system setup is completed.
 * If not completed, redirects to /setup-wizard.
 * If completed and user is on /setup, redirects to /.
 * CRITICAL: Non-super_admin users bypass all setup checks.
 */
export default function RequireSetup({ children }: RequireSetupProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [isSetupCompleted, setIsSetupCompleted] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Check user role first - CRITICAL: Managers/Staff should never see Setup Wizard
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const profile = await userManagementService.getCurrentUserProfile()
        const role = profile?.role || null
        setUserRole(role)
        
        // If user is not super_admin, bypass all setup checks immediately
        if (role !== 'super_admin') {
          setIsChecking(false)
          setIsSetupCompleted(true) // Treat as completed to bypass checks
          return
        }
      } catch (error) {
        // If we can't get profile, continue with normal setup check
        // (might be during initial setup before user exists)
      }
    }
    checkUserRole()
  }, [])

  // Query system_settings table directly with retry logic
  const checkSetupStatus = async (retries = 3, delay = 500): Promise<boolean> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('is_setup_completed')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .single()

        // If table is empty or record doesn't exist, treat as false
        if (error) {
          // PGRST116 = no rows returned, 42P01 = table doesn't exist
          if (error.code === 'PGRST116' || error.code === '42P01') {
            return false
          }
          
          // If it's not the last attempt, retry after delay
          if (attempt < retries) {
            console.warn(`Setup check attempt ${attempt} failed, retrying...`, error)
            await new Promise(resolve => setTimeout(resolve, delay * attempt))
            continue
          }
          
          // Last attempt failed, log error and return false
          console.error('Error checking setup status:', error)
          return false
        }

        // If data is null or undefined, treat as false (empty table)
        if (!data) {
          return false
        }

        // Return the actual value (defaults to false if undefined)
        return data.is_setup_completed === true
      } catch (error: any) {
        // Network or other errors - retry if not last attempt
        if (attempt < retries) {
          console.warn(`Setup check attempt ${attempt} failed with exception, retrying...`, error)
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
          continue
        }
        
        // Last attempt failed
        console.error('Error checking setup status:', error)
        return false
      }
    }
    
    // Should never reach here, but return false as safe default
    return false
  }

  useEffect(() => {
    // CRITICAL: Skip setup check if user is not super_admin
    if (userRole !== null && userRole !== 'super_admin') {
      return // Already handled in role check effect
    }

    // Only run setup check for super_admin users
    if (userRole !== 'super_admin') {
      return // Wait for role check to complete
    }

    const checkSetup = async () => {
      try {
        const completed = await checkSetupStatus()
        setIsSetupCompleted(completed)

        // If setup is not completed and user is not on setup pages, redirect to /setup-wizard
        const isOnSetupPage = location.pathname === '/setup' || location.pathname === '/setup-wizard'
        if (!completed && !isOnSetupPage) {
          navigate('/setup-wizard', { replace: true })
          return
        }

        // If setup is completed and user is on setup pages, redirect to home
        if (completed && isOnSetupPage) {
          navigate('/', { replace: true })
          return
        }
      } catch (error) {
        // On error, treat as not completed and redirect to setup
        const isOnSetupPage = location.pathname === '/setup' || location.pathname === '/setup-wizard'
        if (!isOnSetupPage) {
          navigate('/setup-wizard', { replace: true })
        }
      } finally {
        setIsChecking(false)
      }
    }

    checkSetup()
  }, [location.pathname, navigate, userRole])

  // Show loading spinner while checking
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div>Checking system configuration...</div>
      </div>
    )
  }

  // If setup is not completed, only allow access to setup pages
  const isOnSetupPage = location.pathname === '/setup' || location.pathname === '/setup-wizard'
  if (!isSetupCompleted && !isOnSetupPage) {
    return null // Will redirect in useEffect
  }

  // If setup is completed and user is on setup pages, show nothing (will redirect)
  if (isSetupCompleted && isOnSetupPage) {
    return null // Will redirect in useEffect
  }

  // Allow access to children
  return <>{children}</>
}
