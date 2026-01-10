'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Tabs,
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

type PaymentType = 'expenses' | 'advances'

const AdminApprovals = () => {
  const [expenses, setExpenses] = useState<any[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PaymentType>('expenses')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadPendingPayments()
  }, [])

  const loadPendingPayments = async () => {
    setLoading(true)
    try {
      // Fetch all pending payments
      const pendingPayments = await paymentsService.getPaymentsByStatus('pending')
      
      // Separate expenses and advances
      const expensesList = pendingPayments.filter(p => 
        p.transactionType === 'regular' && p.expenseCategory !== null
      )
      const advancesList = pendingPayments.filter(p => 
        p.transactionType === 'advance'
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

      setExpenses(expensesWithProjects)
      setAdvances(advancesWithProjects)
    } catch (error) {
      console.error('Error loading pending payments:', error)
      message.error('فشل في تحميل الطلبات المعلقة')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setUpdatingIds(prev => new Set(prev).add(id))
    try {
      const result = await paymentsService.updatePaymentStatus(id, 'approved')
      if (result.success) {
        message.success('تمت الموافقة بنجاح')
        // Reload data
        await loadPendingPayments()
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
        // Reload data
        await loadPendingPayments()
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
      title: 'رقم المرجع',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 150,
      render: (text: string) => text || '-'
    },
    {
      title: 'التاريخ',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: 'اسم المدير / المستلم',
      key: 'recipientOrManager',
      width: 200,
      render: (_: any, record: any) => {
        // For expenses, use recipientName; for advances, use managerName
        const name = record.recipientName || record.managerName || '-'
        return <Tag color="blue">{name}</Tag>
      }
    },
    {
      title: 'المبلغ (ريال)',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
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
      title: 'اسم المشروع',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 200,
      render: (text: string) => text ? <Tag color="green">{text}</Tag> : '-'
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const isUpdating = updatingIds.has(record.id)
        return (
          <Space size="small">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
              onClick={() => handleApprove(record.id)}
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
      <Card>
        <Title level={2} style={{ marginBottom: 24 }}>
          <SafetyOutlined style={{ marginLeft: 8 }} />
          اعتمادات الإدارة
        </Title>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as PaymentType)}
          items={[
            {
              key: 'expenses',
              label: (
                <span>
                  <BankOutlined />
                  طلبات المصاريف
                </span>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={expenses.map((e, idx) => ({ ...e, key: e.id || idx }))}
                  loading={loading}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `إجمالي ${total} طلب`
                  }}
                  locale={{
                    emptyText: 'لا توجد طلبات مصاريف معلقة'
                  }}
                />
              )
            },
            {
              key: 'advances',
              label: (
                <span>
                  <WalletOutlined />
                  طلبات العُهد
                </span>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={advances.map((a, idx) => ({ ...a, key: a.id || idx }))}
                  loading={loading}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `إجمالي ${total} طلب`
                  }}
                  locale={{
                    emptyText: 'لا توجد طلبات عُهد معلقة'
                  }}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default AdminApprovals
