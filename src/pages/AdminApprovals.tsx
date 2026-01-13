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
      message.error('فشل في تحميل طلبات المصاريف المعلقة')
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
      message.error('فشل في تحميل طلبات العهد المعلقة')
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
        message.success('تمت الموافقة بنجاح - تم خصم المبلغ من الخزينة')
        // Reload all data
        await reloadAll()
      } else {
        message.error(result.error || 'فشل في الموافقة على الطلب')
      }
    } catch (error) {
      console.error('Error approving payment:', error)
      message.error('فشل في الموافقة على الطلب')
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
        message.success('تم رفض الطلب بنجاح')
        // Reload all data
        await reloadAll()
      } else {
        message.error(result.error || 'فشل في رفض الطلب')
      }
    } catch (error) {
      console.error('Error rejecting payment:', error)
      message.error('فشل في رفض الطلب')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const columns = [
    {
      title: 'التاريخ',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: 'المقدم',
      key: 'requester',
      width: 200,
      render: (_: any, record: any) => {
        const name = record.recipientName || record.managerName || '-'
        return <Tag color="blue">{name}</Tag>
      }
    },
    {
      title: 'المبلغ (ريال)',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => {
        const formatted = parseFloat(amount?.toString() || '0').toLocaleString('ar-SA', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        return <strong>{formatted}</strong>
      }
    },
    {
      title: 'الوصف',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: 'الإجراءات',
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
              موافقة
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
              onClick={() => handleReject(record.id)}
              loading={isUpdating}
            >
              رفض
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <div style={{ padding: '24px', direction: 'rtl' }}>
      {/* Main Title Card */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <SafetyOutlined style={{ marginLeft: 8 }} />
          لوحة الاعتمادات
        </Title>
      </Card>

      {/* Section 1: Expense Requests */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BankOutlined />
            <Title level={4} style={{ margin: 0 }}>طلبات المصاريف</Title>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={columns}
          dataSource={expenses.map((e, idx) => ({ ...e, key: e.id || idx }))}
          loading={loadingExpenses}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} طلب`
          }}
          locale={{
            emptyText: 'لا توجد طلبات مصاريف معلقة'
          }}
        />
      </Card>

      {/* Section 2: Advance Requests */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WalletOutlined />
            <Title level={4} style={{ margin: 0 }}>طلبات العهد</Title>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={advances.map((a, idx) => ({ ...a, key: a.id || idx }))}
          loading={loadingAdvances}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} طلب`
          }}
          locale={{
            emptyText: 'لا توجد طلبات عهد معلقة'
          }}
        />
      </Card>
    </div>
  )
}

export default AdminApprovals
