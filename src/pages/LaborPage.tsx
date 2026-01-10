'use client'

import { useState, useEffect } from 'react'
import workersService from '../services/workersService'
import attendanceService from '../services/attendanceService'
import projectsService from '../services/projectsService'
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Row,
  Col,
  Popconfirm,
  message,
  DatePicker,
  Checkbox,
  InputNumber,
  Typography,
  Divider,
  Empty,
  Spin
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import moment from 'moment'

const { Option } = Select
const { Title } = Typography
const { TextArea } = Input

const LaborPage = () => {
  const [workers, setWorkers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [workersLoading, setWorkersLoading] = useState(false)

  // Workers management state
  const [isWorkerModalVisible, setIsWorkerModalVisible] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [workerForm] = Form.useForm()

  // Attendance state
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false)
  const [attendanceForm] = Form.useForm()
  const [selectedWorkersForAttendance, setSelectedWorkersForAttendance] = useState<string[]>([])
  const [workerRates, setWorkerRates] = useState<Record<string, number>>({})
  const [workerHours, setWorkerHours] = useState<Record<string, number>>({})

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadWorkers(), loadProjects()])
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkers = async () => {
    setWorkersLoading(true)
    try {
      const data = await workersService.getWorkers()
      setWorkers(data || [])
    } catch (error) {
      console.error('Error loading workers:', error)
      message.error('فشل في تحميل بيانات العمال')
    } finally {
      setWorkersLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const data = await projectsService.getActiveProjects()
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      message.error('فشل في تحميل بيانات المشاريع')
    }
  }

  // ========== Workers Management ==========
  const handleAddWorker = () => {
    setSelectedWorker(null)
    workerForm.resetFields()
    setIsWorkerModalVisible(true)
  }

  const handleEditWorker = (worker) => {
    setSelectedWorker(worker)
    workerForm.setFieldsValue({
      name: worker.name,
      trade: worker.trade,
      defaultDailyRate: worker.defaultDailyRate,
      phone: worker.phone,
      status: worker.status
    })
    setIsWorkerModalVisible(true)
  }

  const handleSaveWorker = async (values: any) => {
    try {
      const workerData = {
        name: values.name,
        trade: values.trade,
        defaultDailyRate: values.defaultDailyRate || 0,
        phone: values.phone || null,
        status: values.status || 'active'
      }

      let result
      if (selectedWorker) {
        result = await workersService.updateWorker(selectedWorker.id, workerData)
      } else {
        result = await workersService.addWorker(workerData)
      }

      if (result.success) {
        message.success(selectedWorker ? 'تم تحديث العامل بنجاح' : 'تم إضافة العامل بنجاح')
        setIsWorkerModalVisible(false)
        workerForm.resetFields()
        setSelectedWorker(null)
        await loadWorkers()
      } else {
        message.error(result.error || 'فشل في حفظ العامل')
      }
    } catch (error) {
      console.error('Error saving worker:', error)
      message.error('حدث خطأ أثناء حفظ العامل')
    }
  }

  const handleDeleteWorker = async (id: string) => {
    try {
      const result = await workersService.deleteWorker(id)
      if (result.success) {
        message.success('تم حذف العامل بنجاح')
        await loadWorkers()
      } else {
        message.error(result.error || 'فشل في حذف العامل')
      }
    } catch (error) {
      console.error('Error deleting worker:', error)
      message.error('حدث خطأ أثناء حذف العامل')
    }
  }

  // Workers table columns
  const workerColumns = [
    {
      title: 'الاسم',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </div>
      )
    },
    {
      title: 'الحرفة',
      dataIndex: 'trade',
      key: 'trade',
      render: (trade: string) => <Tag color="blue">{trade}</Tag>
    },
    {
      title: 'السعر اليومي',
      dataIndex: 'defaultDailyRate',
      key: 'defaultDailyRate',
      render: (rate: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
          }).format(rate || 0)}
        </span>
      ),
      align: 'right' as const
    },
    {
      title: 'الهاتف',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          active: { color: 'green', text: 'نشط' },
          inactive: { color: 'default', text: 'غير نشط' }
        }
        const statusConfig = config[status] || { color: 'default', text: 'غير محدد' }
        return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
      }
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditWorker(record)}
            size="small"
          >
            تعديل
          </Button>
          <Popconfirm
            title="هل أنت متأكد من حذف هذا العامل؟"
            onConfirm={() => handleDeleteWorker(record.id)}
            okText="نعم"
            cancelText="لا"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              حذف
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Common trades
  const commonTrades = [
    'بناء (Mason)',
    'كهربائي (Electrician)',
    'سباك (Plumber)',
    'نجار (Carpenter)',
    'حداد (Welder)',
    'دهان (Painter)',
    'سائق (Driver)',
    'عامل عام (General Worker)',
    'أخرى (Other)'
  ]

  // ========== Daily Attendance ==========
  const handleOpenAttendanceModal = () => {
    // Reset form and state
    attendanceForm.resetFields()
    setSelectedWorkersForAttendance([])
    setWorkerRates({})
    setWorkerHours({})
    setIsAttendanceModalVisible(true)
  }

  const handleAttendanceProjectChange = (projectId: string) => {
    // Reset selected workers when project changes
    setSelectedWorkersForAttendance([])
    setWorkerRates({})
    setWorkerHours({})
    attendanceForm.setFieldsValue({ workers: [] })
  }

  const handleWorkerSelectionChange = (checkedValues: string[]) => {
    setSelectedWorkersForAttendance(checkedValues)
    
    // Initialize rates and hours for newly selected workers
    const newRates = { ...workerRates }
    const newHours = { ...workerHours }
    
    checkedValues.forEach(workerId => {
      if (!newRates[workerId]) {
        const worker = workers.find(w => w.id === workerId)
        if (worker) {
          newRates[workerId] = worker.defaultDailyRate || 0
          newHours[workerId] = 1.0
        }
      }
    })
    
    // Remove rates/hours for deselected workers
    Object.keys(newRates).forEach(workerId => {
      if (!checkedValues.includes(workerId)) {
        delete newRates[workerId]
        delete newHours[workerId]
      }
    })
    
    setWorkerRates(newRates)
    setWorkerHours(newHours)
  }

  const handleSaveAttendance = async (values: any) => {
    try {
      if (!values.projectId || !values.date) {
        message.error('يرجى اختيار المشروع والتاريخ')
        return
      }

      if (selectedWorkersForAttendance.length === 0) {
        message.error('يرجى اختيار عامل واحد على الأقل')
        return
      }

      const attendanceData = {
        projectId: values.projectId,
        date: values.date ? moment(values.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        workers: selectedWorkersForAttendance,
        workerRates: workerRates,
        workerHours: workerHours,
        workScope: values.workScope || null,
        notes: values.notes || null,
        createdBy: 'user'
      }

      const result = await attendanceService.createAttendanceRecords(attendanceData)

      if (result.success) {
        message.success(`تم حفظ حضور ${result.records?.length || 0} عامل بنجاح. تم إنشاء ${result.paymentsCreated || 0} مصروف تلقائياً.`)
        setIsAttendanceModalVisible(false)
        attendanceForm.resetFields()
        setSelectedWorkersForAttendance([])
        setWorkerRates({})
        setWorkerHours({})
        
        // Reload workers to refresh data
        await loadWorkers()
      } else {
        message.error(result.error || 'فشل في حفظ سجلات الحضور')
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      message.error('حدث خطأ أثناء حفظ سجلات الحضور')
    }
  }

  // Calculate total cost for selected workers
  const calculateTotalCost = () => {
    return selectedWorkersForAttendance.reduce((sum, workerId) => {
      const rate = workerRates[workerId] || 0
      const hours = workerHours[workerId] || 1.0
      return sum + (rate * hours)
    }, 0)
  }

  // Get active workers for attendance
  const activeWorkers = workers.filter(w => w.status === 'active')

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="جاري التحميل..." />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <TeamOutlined />
        نظام يوميات العمال (Labor Daily Records)
      </Title>

      {/* Section 1: Workers Management */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span>
              <UserOutlined style={{ marginLeft: 8 }} />
              إدارة العمال
            </span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddWorker}
              size="large"
            >
              إضافة عامل
            </Button>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        {workersLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" tip="جاري تحميل العمال..." />
          </div>
        ) : workers.length === 0 ? (
          <Empty
            description="لا توجد عمال مسجلة"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWorker}>
              إضافة عامل جديد
            </Button>
          </Empty>
        ) : (
          <Table
            columns={workerColumns}
            dataSource={workers.map(w => ({ ...w, key: w.id }))}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `إجمالي ${total} عامل`
            }}
            scroll={{ x: 'max-content' }}
            responsive
          />
        )}
      </Card>

      {/* Section 2: Daily Attendance Sheet */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined />
            سجل الحضور اليومي (Daily Attendance Sheet)
          </div>
        }
      >
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleOpenAttendanceModal}
          size="large"
          block
          style={{ marginBottom: 16 }}
        >
          تسجيل حضور جديد
        </Button>

        <div style={{ 
          padding: 16, 
          backgroundColor: '#f0f2f5', 
          borderRadius: 4,
          marginTop: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ClockCircleOutlined />
            <strong>إجمالي العمال النشطين:</strong>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              {activeWorkers.length}
            </span>
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>
            اضغط على زر "تسجيل حضور جديد" لتسجيل حضور العمال لمشروع معين في تاريخ محدد.
            سيتم إنشاء مصروف تلقائياً في جدول الدفعات لكل عامل.
          </div>
        </div>
      </Card>

      {/* Worker Modal */}
      <Modal
        title={selectedWorker ? 'تعديل عامل' : 'إضافة عامل جديد'}
        open={isWorkerModalVisible}
        onOk={() => workerForm.submit()}
        onCancel={() => {
          setIsWorkerModalVisible(false)
          workerForm.resetFields()
          setSelectedWorker(null)
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={600}
      >
        <Form
          form={workerForm}
          layout="vertical"
          onFinish={handleSaveWorker}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="الاسم"
            rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}
          >
            <Input placeholder="اسم العامل" />
          </Form.Item>

          <Form.Item
            name="trade"
            label="الحرفة"
            rules={[{ required: true, message: 'يرجى اختيار الحرفة' }]}
          >
            <Select
              placeholder="اختر الحرفة"
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {commonTrades.map(trade => (
                <Option key={trade} value={trade}>
                  {trade}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="defaultDailyRate"
                label="السعر اليومي (ريال)"
                rules={[{ required: true, message: 'يرجى إدخال السعر اليومي' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="الحالة"
                initialValue="active"
              >
                <Select>
                  <Option value="active">نشط</Option>
                  <Option value="inactive">غير نشط</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="phone"
            label="رقم الهاتف (اختياري)"
          >
            <Input placeholder="05xxxxxxxx" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        title="تسجيل حضور يومي"
        open={isAttendanceModalVisible}
        onOk={() => attendanceForm.submit()}
        onCancel={() => {
          setIsAttendanceModalVisible(false)
          attendanceForm.resetFields()
          setSelectedWorkersForAttendance([])
          setWorkerRates({})
          setWorkerHours({})
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={800}
      >
        <Form
          form={attendanceForm}
          layout="vertical"
          onFinish={handleSaveAttendance}
          style={{ marginTop: 24 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="projectId"
                label="المشروع"
                rules={[{ required: true, message: 'يرجى اختيار المشروع' }]}
              >
                <Select
                  placeholder="اختر المشروع"
                  onChange={handleAttendanceProjectChange}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {projects.map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="date"
                label="التاريخ"
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
                initialValue={moment()}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  disabledDate={(current) => current && current > moment().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="اختر العمال الحاضرين" required>
            {activeWorkers.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', backgroundColor: '#fffbe6', borderRadius: 4 }}>
                لا توجد عمال نشطة. يرجى إضافة عمال أولاً.
              </div>
            ) : (
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid #d9d9d9', 
                borderRadius: 4, 
                padding: 16 
              }}>
                <Checkbox.Group
                  value={selectedWorkersForAttendance}
                  onChange={handleWorkerSelectionChange}
                  style={{ width: '100%' }}
                >
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    {activeWorkers.map(worker => (
                      <div 
                        key={worker.id}
                        style={{ 
                          padding: 12, 
                          border: '1px solid #f0f0f0', 
                          borderRadius: 4,
                          backgroundColor: selectedWorkersForAttendance.includes(worker.id) ? '#e6f7ff' : 'white'
                        }}
                      >
                        <Row gutter={16} align="middle">
                          <Col span={8}>
                            <Checkbox value={worker.id}>
                              <div>
                                <div style={{ fontWeight: 500 }}>{worker.name}</div>
                                <div style={{ fontSize: '12px', color: '#999' }}>{worker.trade}</div>
                              </div>
                            </Checkbox>
                          </Col>
                          <Col span={8}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>السعر اليومي:</div>
                            <InputNumber
                              value={workerRates[worker.id] || worker.defaultDailyRate || 0}
                              onChange={(value) => setWorkerRates({ ...workerRates, [worker.id]: value || 0 })}
                              min={0}
                              style={{ width: '100%' }}
                              size="small"
                              disabled={!selectedWorkersForAttendance.includes(worker.id)}
                              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                          </Col>
                          <Col span={8}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>عدد الساعات:</div>
                            <InputNumber
                              value={workerHours[worker.id] !== undefined ? workerHours[worker.id] : 1.0}
                              onChange={(value) => setWorkerHours({ ...workerHours, [worker.id]: value || 1.0 })}
                              min={0.25}
                              max={24}
                              step={0.25}
                              style={{ width: '100%' }}
                              size="small"
                              disabled={!selectedWorkersForAttendance.includes(worker.id)}
                            />
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </Space>
                </Checkbox.Group>
              </div>
            )}
          </Form.Item>

          {selectedWorkersForAttendance.length > 0 && (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f6ffed', 
              borderRadius: 4, 
              marginBottom: 16,
              border: '1px solid #b7eb8f'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>إجمالي التكلفة:</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                    minimumFractionDigits: 0
                  }).format(calculateTotalCost())}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                سيتم إنشاء مصروف تلقائياً في جدول الدفعات بهذا المبلغ
              </div>
            </div>
          )}

          <Form.Item
            name="workScope"
            label="نطاق العمل (اختياري)"
          >
            <Input placeholder="مثال: أعمال مدنية، أعمال كهربائية..." />
          </Form.Item>

          <Form.Item
            name="notes"
            label="ملاحظات (اختياري)"
          >
            <TextArea rows={3} placeholder="ملاحظات إضافية..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default LaborPage
