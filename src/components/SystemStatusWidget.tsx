import React from 'react'
import { Tooltip } from 'antd'
import { useSyncStatus } from '../contexts/SyncStatusContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import { Spin } from 'antd'

const SystemStatusWidget: React.FC = () => {
  const { status, message, branchName, timestamp } = useSyncStatus()
  const { language } = useLanguage()
  const { branchName: currentBranchName } = useBranch()

  // Get display branch name (prefer from sync status, fallback to context)
  const displayBranchName = branchName || currentBranchName || ''

  // Format timestamp for tooltip
  const formatTimestamp = (ts: string | null) => {
    if (!ts) return ''
    try {
      const date = new Date(ts)
      const timeStr = date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
      return timeStr
    } catch {
      return ''
    }
  }

  // Get status display configuration
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          color: '#1890ff',
          icon: <Spin size="small" style={{ marginRight: 6 }} />,
          text: language === 'ar' ? 'جاري المزامنة...' : 'Syncing...',
          bgColor: '#e6f7ff',
          borderColor: '#91d5ff'
        }
      case 'success':
        return {
          color: '#52c41a',
          icon: (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#52c41a',
                marginRight: 6,
                animation: 'pulse 2s infinite'
              }}
            />
          ),
          text: language === 'ar' ? 'متصل' : 'Online',
          bgColor: '#f6ffed',
          borderColor: '#b7eb8f'
        }
      case 'empty':
        return {
          color: '#fa8c16',
          icon: (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#fa8c16',
                marginRight: 6
              }}
            />
          ),
          text: language === 'ar' ? 'لا توجد بيانات' : 'No Data',
          bgColor: '#fff7e6',
          borderColor: '#ffd591'
        }
      case 'error':
        return {
          color: '#ff4d4f',
          icon: (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#ff4d4f',
                marginRight: 6
              }}
            />
          ),
          text: language === 'ar' ? 'انقطع الاتصال' : 'Connection Lost',
          bgColor: '#fff1f0',
          borderColor: '#ffccc7'
        }
      default:
        return {
          color: '#d9d9d9',
          icon: (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#d9d9d9',
                marginRight: 6
              }}
            />
          ),
          text: language === 'ar' ? 'جاهز' : 'Ready',
          bgColor: '#fafafa',
          borderColor: '#d9d9d9'
        }
    }
  }

  const statusConfig = getStatusConfig()

  // Build tooltip content
  const tooltipContent = timestamp
    ? `${message || statusConfig.text}${displayBranchName ? ` (${displayBranchName})` : ''} - ${formatTimestamp(timestamp)}`
    : message || statusConfig.text

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
      <Tooltip title={tooltipContent} placement="right">
        <div
          style={{
            padding: '8px 12px',
            margin: '8px 12px',
            borderRadius: '6px',
            backgroundColor: statusConfig.bgColor,
            border: `1px solid ${statusConfig.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 500,
            color: statusConfig.color,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {statusConfig.icon}
          <span>{statusConfig.text}</span>
        </div>
      </Tooltip>
    </>
  )
}

export default SystemStatusWidget
