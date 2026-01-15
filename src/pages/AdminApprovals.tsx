'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Typography,
  Empty
} from 'antd'
import {
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { supabase } from '../services/supabaseClient'
import tenantStore from '../services/tenantStore'
import paymentsService from '../services/paymentsService'
import dayjs from 'dayjs'

const { Title } = Typography

interface QuotationDraft {
  id: string
  ref_number: string | null
  header_data: {
    customerName?: string
    [key: string]: any
  } | null
  boq_total: number
  created_at: string
  status: string
}

interface Payment {
  id: string
  dueDate: string
  recipientName: string | null
  managerName: string | null
  expenseCategory: string | null
  transactionType: string
  amount: number
  notes: string | null
  status: string
}

const AdminApprovals = () => {
  const navigate = useNavigate()
  
  // Quotations state
  const [drafts, setDrafts] = useState<QuotationDraft[]>([])
  const [loadingQuotations, setLoadingQuotations] = useState(true)
  
  // Expenses state
  const [expenses, setExpenses] = useState<Payment[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  
  // Custody/Advances state
  const [advances, setAdvances] = useState<Payment[]>([])
  const [loadingAdvances, setLoadingAdvances] = useState(true)
  
  // Updating state for approve/reject actions
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  // Load all data in parallel
  const loadAllData = async () => {
    await Promise.all([
      loadPendingQuotations(),
      loadPendingExpenses(),
      loadPendingAdvances()
    ])
  }

  // Load pending quotations
  const loadPendingQuotations = async () => {
    setLoadingQuotations(true)
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch pending quotations.')
        setDrafts([])
        setLoadingQuotations(false)
        return
      }

      const { data, error } = await supabase
        .from('quotation_drafts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending quotations:', error)
        message.error('Failed to load pending quotations')
        setDrafts([])
        return
      }

      setDrafts(data || [])
    } catch (error) {
      console.error('Error loading pending quotations:', error)
      message.error('Failed to load pending quotations')
      setDrafts([])
    } finally {
      setLoadingQuotations(false)
    }
  }

  // Load pending expenses (regular transactions with expense category)
  const loadPendingExpenses = async () => {
    setLoadingExpenses(true)
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch pending expenses.')
        setExpenses([])
        setLoadingExpenses(false)
        return
      }

      // Fetch all pending payments
      const pendingPayments = await paymentsService.getPaymentsByStatus('pending')
      
      // Filter expenses: regular transactions with expense category
      const expensesList = pendingPayments.filter(p => 
        p.transactionType === 'regular' && p.expenseCategory !== null
      )

      setExpenses(expensesList)
    } catch (error) {
      console.error('Error loading pending expenses:', error)
      message.error('Failed to load pending expenses')
      setExpenses([])
    } finally {
      setLoadingExpenses(false)
    }
  }

  // Load pending advances/custody (advance transactions)
  const loadPendingAdvances = async () => {
    setLoadingAdvances(true)
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch pending advances.')
        setAdvances([])
        setLoadingAdvances(false)
        return
      }

      // Fetch all pending payments
      const pendingPayments = await paymentsService.getPaymentsByStatus('pending')
      
      // Filter advances: transaction_type === 'advance'
      const advancesList = pendingPayments.filter(p => 
        p.transactionType === 'advance'
      )

      setAdvances(advancesList)
    } catch (error) {
      console.error('Error loading pending advances:', error)
      message.error('Failed to load pending advances')
      setAdvances([])
    } finally {
      setLoadingAdvances(false)
    }
  }

  // Handle approve for expenses/advances
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
        // Reload the appropriate section
        if (payment.transactionType === 'advance') {
          await loadPendingAdvances()
        } else {
          await loadPendingExpenses()
        }
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

  // Handle reject for expenses/advances
  const handleReject = async (id: string, transactionType: string) => {
    setUpdatingIds(prev => new Set(prev).add(id))
    try {
      const result = await paymentsService.updatePaymentStatus(id, 'rejected')
      if (result.success) {
        message.success('Request rejected successfully')
        // Reload the appropriate section
        if (transactionType === 'advance') {
          await loadPendingAdvances()
        } else {
          await loadPendingExpenses()
        }
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

  // Handle review quotation
  const handleReview = (record: QuotationDraft) => {
    navigate(`/quotation-builder?id=${record.id}`)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return dayjs(dateString).format('YYYY-MM-DD')
    } catch (error) {
      return '-'
    }
  }

  // Get customer name from quotation draft
  const getCustomerName = (record: QuotationDraft): string => {
    if (record.header_data?.customerName) {
      return record.header_data.customerName
    }
    return 'Unknown'
  }

  // Quotations table columns
  const quotationColumns = [
    {
      title: 'Ref No',
      dataIndex: 'ref_number',
      key: 'ref_number',
      width: 150,
      render: (text: string | null) => text || '-'
    },
    {
      title: 'Client',
      key: 'client',
      width: 200,
      render: (_: any, record: QuotationDraft) => getCustomerName(record)
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => formatDate(date)
    },
    {
      title: 'Amount',
      dataIndex: 'boq_total',
      key: 'boq_total',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <strong>{formatCurrency(amount)}</strong>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: QuotationDraft) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleReview(record)}
        >
          Review
        </Button>
      )
    }
  ]

  // Expenses table columns
  const expensesColumns = [
    {
      title: 'Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => formatDate(date)
    },
    {
      title: 'Category',
      dataIndex: 'expenseCategory',
      key: 'expenseCategory',
      width: 150,
      render: (category: string | null) => category || '-'
    },
    {
      title: 'Beneficiary',
      key: 'beneficiary',
      width: 180,
      render: (_: any, record: Payment) => {
        const name = record.recipientName || '-'
        return <Tag color="blue">{name}</Tag>
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => {
        const formatted = parseFloat(amount?.toString() || '0').toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        return <strong>{formatted} SAR</strong>
      }
    },
    {
      title: 'Description',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string | null) => text || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Payment) => {
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
              onClick={() => handleReject(record.id, record.transactionType)}
              loading={isUpdating}
            >
              Reject
            </Button>
          </Space>
        )
      }
    }
  ]

  // Advances/Custody table columns
  const advancesColumns = [
    {
      title: 'Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => formatDate(date)
    },
    {
      title: 'Employee',
      key: 'employee',
      width: 180,
      render: (_: any, record: Payment) => {
        const name = record.managerName || record.recipientName || '-'
        return <Tag color="purple">{name}</Tag>
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => {
        const formatted = parseFloat(amount?.toString() || '0').toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        return <strong>{formatted} SAR</strong>
      }
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string | null) => text || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Payment) => {
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
              onClick={() => handleReject(record.id, record.transactionType)}
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
      {/* Header Card */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            Admin Approvals Dashboard
            <span style={{ marginLeft: 12, fontSize: '0.6em', fontWeight: 'normal', color: '#666' }}>
              (لوحة الاعتمادات)
            </span>
          </Title>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={loadAllData}
            loading={loadingQuotations || loadingExpenses || loadingAdvances}
          >
            Refresh All
          </Button>
        </div>
      </Card>

      {/* Section 1: Pending Quotations */}
      <Card
        title={
          <span>
            Pending Quotations <span style={{ fontSize: '0.85em', color: '#666', marginLeft: 8 }}>(عروض الأسعار)</span>
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={quotationColumns}
          dataSource={drafts}
          rowKey="id"
          loading={loadingQuotations}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} pending quotation${total !== 1 ? 's' : ''}`
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No pending quotations found"
              />
            )
          }}
        />
      </Card>

      {/* Section 2: Pending Expenses */}
      <Card
        title={
          <span>
            Pending Expenses <span style={{ fontSize: '0.85em', color: '#666', marginLeft: 8 }}>(المصروفات المباشرة)</span>
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={expensesColumns}
          dataSource={expenses}
          rowKey="id"
          loading={loadingExpenses}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} pending expense${total !== 1 ? 's' : ''}`
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No pending expenses found"
              />
            )
          }}
        />
      </Card>

      {/* Section 3: Pending Custody/Advances */}
      <Card
        title={
          <span>
            Pending Custody/Advances <span style={{ fontSize: '0.85em', color: '#666', marginLeft: 8 }}>(العهد والسلف)</span>
          </span>
        }
      >
        <Table
          columns={advancesColumns}
          dataSource={advances}
          rowKey="id"
          loading={loadingAdvances}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} pending advance${total !== 1 ? 's' : ''}`
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No pending custody or advance requests found"
              />
            )
          }}
        />
      </Card>
    </div>
  )
}

export default AdminApprovals
