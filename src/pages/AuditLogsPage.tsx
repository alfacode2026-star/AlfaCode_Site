'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Typography,
  Empty,
  Modal,
  Tag,
  Select,
  DatePicker,
  Row,
  Col,
  Alert,
  Spin
} from 'antd'
import {
  ReloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import logsService from '../services/logsService'
import userManagementService from '../services/userManagementService'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import moment from 'moment'

const { Title } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface DeletionLog {
  id: string
  tableName: string
  recordRefNumber: string
  recordId: string
  deletionReason: string
  deletedBy: string
  deletedByName: string
  deletedByEmail: string
  tenantId: string
  branchId: string
  deletedData: any
  createdAt: string
}

const AuditLogsPage = () => {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { branchName } = useBranch()
  
  const [logs, setLogs] = useState<DeletionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotModalVisible, setSnapshotModalVisible] = useState(false)
  const [selectedLog, setSelectedLog] = useState<DeletionLog | null>(null)
  const [tableNames, setTableNames] = useState<string[]>([])
  const [filters, setFilters] = useState({
    tableName: undefined as string | undefined,
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined
  })
  const [accessDenied, setAccessDenied] = useState(false)

  // Check access and load data on mount
  useEffect(() => {
    checkAccessAndLoadData()
  }, [])

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      loadLogs()
    }
  }, [filters])

  const checkAccessAndLoadData = async () => {
    try {
      const profile = await userManagementService.getCurrentUserProfile()
      const userRole = profile?.role || null
      const allowedRoles = ['super_admin', 'admin', 'manager']
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        setAccessDenied(true)
        setLoading(false)
        return
      }
      
      setAccessDenied(false)
      await Promise.all([loadLogs(), loadTableNames()])
    } catch (error) {
      console.error('Error checking access:', error)
      setAccessDenied(true)
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await logsService.fetchDeletionLogs(filters)
      
      if (!result.success) {
        if (result.error?.includes('Access Denied')) {
          setAccessDenied(true)
        } else {
          message.error(result.error || 'Failed to load audit logs')
        }
        setLogs([])
      } else {
        setLogs(result.logs || [])
        if (result.warning) {
          message.warning(result.warning)
        }
      }
    } catch (error: any) {
      console.error('Error loading logs:', error)
      message.error(error.message || 'Failed to load audit logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const loadTableNames = async () => {
    try {
      const names = await logsService.getTableNames()
      setTableNames(names)
    } catch (error) {
      console.error('Error loading table names:', error)
    }
  }

  const handleViewSnapshot = (log: DeletionLog) => {
    setSelectedLog(log)
    setSnapshotModalVisible(true)
  }

  const handleTableFilter = (value: string) => {
    setFilters(prev => ({ ...prev, tableName: value || undefined }))
  }

  const handleDateFilter = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        dateFrom: dates[0].format('YYYY-MM-DD'),
        dateTo: dates[1].format('YYYY-MM-DD')
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        dateFrom: undefined,
        dateTo: undefined
      }))
    }
  }

  const clearFilters = () => {
    setFilters({
      tableName: undefined,
      dateFrom: undefined,
      dateTo: undefined
    })
  }

  // Format table name for display
  const formatTableName = (tableName: string) => {
    const nameMap: Record<string, string> = {
      contracts: 'Contracts',
      projects: 'Projects',
      payments: 'Payments',
      orders: 'Purchase Orders',
      products: 'Inventory',
      incomes: 'Incomes'
    }
    return nameMap[tableName] || tableName
  }

  const columns: ColumnsType<DeletionLog> = [
    {
      title: language === 'ar' ? 'الوقت' : 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => {
        return moment(date).format('YYYY-MM-DD HH:mm')
      },
      sorter: (a, b) => moment(a.createdAt).unix() - moment(b.createdAt).unix()
    },
    {
      title: language === 'ar' ? 'المستخدم' : 'User',
      dataIndex: 'deletedByName',
      key: 'deletedByName',
      width: 180,
      render: (name: string, record: DeletionLog) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.deletedByEmail}</div>
        </div>
      )
    },
    {
      title: language === 'ar' ? 'الوحدة' : 'Module',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 150,
      render: (tableName: string) => (
        <Tag color="blue">{formatTableName(tableName)}</Tag>
      )
    },
    {
      title: language === 'ar' ? 'رقم السجل' : 'Record Ref',
      dataIndex: 'recordRefNumber',
      key: 'recordRefNumber',
      width: 150,
      render: (ref: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{ref}</span>
      )
    },
    {
      title: language === 'ar' ? 'السبب' : 'Reason',
      dataIndex: 'deletionReason',
      key: 'deletionReason',
      ellipsis: true,
      render: (reason: string) => (
        <span title={reason}>{reason}</span>
      )
    },
    {
      title: language === 'ar' ? 'إجراء' : 'Action',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: DeletionLog) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewSnapshot(record)}
        >
          {language === 'ar' ? 'عرض' : 'View'}
        </Button>
      )
    }
  ]

  if (accessDenied) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          type="error"
          message={language === 'ar' ? 'الوصول مرفوض' : 'Access Denied'}
          description={
            language === 'ar'
              ? 'أنت غير مخول لعرض سجل الحذف. فقط المشرفون العامون والمديرون يمكنهم الوصول إلى هذه الصفحة.'
              : 'You are not authorized to view deletion logs. Only Super Admins, Admins, and Managers can access this page.'
          }
          showIcon
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SafetyCertificateOutlined />
            {language === 'ar' ? 'سجل العمليات (Audit Logs)' : 'Audit Logs'}
          </Title>
          {language === 'ar' ? (
            <p style={{ color: '#666', marginTop: '8px' }}>
              عرض سجل جميع عمليات الحذف مع معلومات المستخدم والسبب
            </p>
          ) : (
            <p style={{ color: '#666', marginTop: '8px' }}>
              View a log of all deletion operations with user information and reasons
            </p>
          )}
        </div>

        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder={language === 'ar' ? 'تصفية حسب الوحدة' : 'Filter by Module'}
              style={{ width: '100%' }}
              allowClear
              value={filters.tableName}
              onChange={handleTableFilter}
            >
              {tableNames.map(name => (
                <Option key={name} value={name}>
                  {formatTableName(name)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder={[
                language === 'ar' ? 'من تاريخ' : 'From Date',
                language === 'ar' ? 'إلى تاريخ' : 'To Date'
              ]}
              onChange={handleDateFilter}
            />
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Space>
              <Button onClick={clearFilters}>
                {language === 'ar' ? 'مسح' : 'Clear'}
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={loadLogs}
                loading={loading}
              >
                {language === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: <Empty description={language === 'ar' ? 'لا توجد سجلات' : 'No logs found'} />
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => (language === 'ar' ? `إجمالي ${total} سجل` : `Total ${total} logs`)
          }}
        />
      </Card>

      {/* Snapshot Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            {language === 'ar' ? 'عرض البيانات المحذوفة' : 'View Deleted Data Snapshot'}
          </Space>
        }
        open={snapshotModalVisible}
        onCancel={() => setSnapshotModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSnapshotModalVisible(false)}>
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        ]}
        width={800}
      >
        {selectedLog && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Typography.Text strong>
                {language === 'ar' ? 'المعلومات:' : 'Information:'}
              </Typography.Text>
              <div style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                <p style={{ margin: '4px 0' }}>
                  <strong>{language === 'ar' ? 'الوحدة:' : 'Module:'}</strong>{' '}
                  <Tag>{formatTableName(selectedLog.tableName)}</Tag>
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>{language === 'ar' ? 'رقم السجل:' : 'Record Ref:'}</strong>{' '}
                  {selectedLog.recordRefNumber}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>{language === 'ar' ? 'السبب:' : 'Reason:'}</strong>{' '}
                  {selectedLog.deletionReason}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>{language === 'ar' ? 'حذف بواسطة:' : 'Deleted by:'}</strong>{' '}
                  {selectedLog.deletedByName} ({selectedLog.deletedByEmail})
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>{language === 'ar' ? 'التاريخ:' : 'Date:'}</strong>{' '}
                  {moment(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </p>
              </div>
            </div>

            <Typography.Text strong>
              {language === 'ar' ? 'البيانات المحذوفة (JSON):' : 'Deleted Data (JSON):'}
            </Typography.Text>
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '4px',
                maxHeight: '400px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {JSON.stringify(selectedLog.deletedData, null, 2)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AuditLogsPage
