'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Typography
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  SafetyOutlined,
  BankOutlined,
  WalletOutlined
} from '@ant-design/icons'
import paymentsService from '../services/paymentsService'
import projectsService from '../services/projectsService'
import dayjs from 'dayjs'

const { Title } = Typography

const AdminApprovals = () => {
  const [expenses, setExpenses] = useState<any[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [loadingAdvances, setLoadingAdvances] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // Load both expenses and advances on mount
  useEffect(() => {
    loadPendingExpenses()
    loadPendingAdvances()
  }, [])

  const loadPendingExpenses = async () => {
    setLoadingExpenses(true)
    try {
      // Fetch all pending payments
      const pendingPayments = await paymentsService.getPaymentsByStatus('pending')
      
      // Filter expenses
      const expensesList = pendingPayments.filter(p => 
        p.transactionType === 'regular' && p.expenseCategory !== null
      )

      // Fetch project names for payments that have projectId
      const expensesWithProjects = await Promise.all(
        expensesList.map(async (payment) => {
          let projectName = null
          if (payment.projectId) {
            const project = await projectsService.getProjectById(payment.projectId)
            projectName = project?.name || null
          }
          return { ...payment, projectName }
        })
      )

      setExpenses(expensesWithProjects)
    } catch (error) {
      console.error('Error loading pending expenses:', error)
      message.error('Failed to load pending expense requests')
    } finally {
      setLoadingExpenses(false)
    }
  }

  const loadPendingAdvances = async () => {
    setLoadingAdvances(true)
    try {
      // Fetch all pending payments
      const pendingPayments = await paymentsService.getPaymentsByStatus('pending')
      
      // Filter advances
      const advancesList = pendingPayments.filter(p => 
        p.transactionType === 'advance'
      )

      // Fetch project names for payments that have projectId
      const advancesWithProjects = await Promise.all(
        advancesList.map(async (payment) => {
          let projectName = null
          if (payment.projectId) {
            const project = await projectsService.getProjectById(payment.projectId)
            projectName = project?.name || null
          }
          return { ...payment, projectName }
        })
      )

      setAdvances(advancesWithProjects)
    } catch (error) {
      console.error('Error loading pending advances:', error)
      message.error('Failed to load pending advance requests')
    } finally {
      setLoadingAdvances(false)
    }
  }

  const reloadAll = async () => {
    await Promise.all([
      loadPendingExpenses(),
      loadPendingAdvances()
    ])
  }

  const handleApprove = async (id: string, payment: any) => {
    setUpdatingIds(prev => new Set(prev).add(id))
    try {
      // Determine correct approval status:
      // - Advances: approve to 'approved'
      // - Expenses: approve to 'paid'
      const approvalStatus = payment.transactionType === 'advance' ? 'approved' : 'paid'
      
      const result = await paymentsService.updatePaymentStatus(id, approvalStatus)
      if (result.success) {
        message.success('Approved successfully - Amount deducted from treasury')
        // Reload all data
        await reloadAll()
      } else {
        message.error(result.error || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving payment:', error)
      message.error('Failed to approve request')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleReject = async (id: string) => {
    setUpdatingIds(prev => new Set(prev).add(id))
    try {
      const result = await paymentsService.updatePaymentStatus(id, 'rejected')
      if (result.success) {
        message.success('Request rejected successfully')
        // Reload all data
        await reloadAll()
      } else {
        message.error(result.error || 'Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting payment:', error)
      message.error('Failed to reject request')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Dynamic rowKey function for instant updates
  const getRowKey = (record: any): string => {
    const timestamp = record.updatedAt || record.updated_at || record.lastUpdated || ''
    const dateKey = record.dueDate || record.due_date || ''
    return `${record.id}-${timestamp}-${dateKey}`
  }

  const columns = [
    {
      title: 'Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: 'Requester',
      key: 'requester',
      width: 200,
      render: (_: any, record: any) => {
        const name = record.recipientName || record.managerName || '-'
        return <Tag color="blue">{name}</Tag>
      }
    },
    {
      title: 'Amount (SAR)',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => {
        const formatted = parseFloat(amount?.toString() || '0').toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        return <strong>{formatted}</strong>
      }
    },
    {
      title: 'Description',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const isUpdating = updatingIds.has(record.id)
        return (
          <Space size="small">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => handleApprove(record.id, record)}
              loading={isUpdating}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Approve
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
              onClick={() => handleReject(record.id)}
              loading={isUpdating}
            >
              Reject
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <div style={{ padding: '24px', direction: 'ltr' }}>
      {/* Main Title Card */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <SafetyOutlined style={{ marginRight: 8 }} />
          Approvals Dashboard
        </Title>
      </Card>

      {/* Section 1: Expense Requests */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BankOutlined />
            <Title level={4} style={{ margin: 0 }}>Expense Requests</Title>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={columns}
          dataSource={expenses}
          rowKey={getRowKey}
          loading={loadingExpenses}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} request${total !== 1 ? 's' : ''}`
          }}
          locale={{
            emptyText: 'No pending expense requests'
          }}
        />
      </Card>

      {/* Section 2: Advance Requests */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WalletOutlined />
            <Title level={4} style={{ margin: 0 }}>Advance Requests</Title>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={advances}
          rowKey={getRowKey}
          loading={loadingAdvances}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} request${total !== 1 ? 's' : ''}`
          }}
          locale={{
            emptyText: 'No pending advance requests'
          }}
        />
      </Card>
    </div>
  )
}

export default AdminApprovals
