import React, { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export type SyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

interface SyncStatusState {
  status: SyncStatus
  message: string
  branchName: string | null
  timestamp: string | null
}

interface SyncStatusContextType {
  status: SyncStatus
  message: string
  branchName: string | null
  timestamp: string | null
  updateStatus: (
    status: SyncStatus,
    message?: string,
    branchName?: string | null
  ) => void
  reset: () => void
}

const SyncStatusContext = createContext<SyncStatusContextType | undefined>(undefined)

export const SyncStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SyncStatusState>({
    status: 'idle',
    message: '',
    branchName: null,
    timestamp: null
  })

  const updateStatus = useCallback((
    newStatus: SyncStatus,
    newMessage: string = '',
    newBranchName: string | null = null
  ) => {
    setState({
      status: newStatus,
      message: newMessage || '',
      branchName: newBranchName || null,
      timestamp: new Date().toISOString()
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      message: '',
      branchName: null,
      timestamp: null
    })
  }, [])

  const value: SyncStatusContextType = {
    ...state,
    updateStatus,
    reset
  }

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>
}

export const useSyncStatus = (): SyncStatusContextType => {
  const context = useContext(SyncStatusContext)
  if (context === undefined) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider')
  }
  return context
}
