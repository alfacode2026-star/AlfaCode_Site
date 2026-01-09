'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import projectsService from '../services/projectsService'
import customersService from '../services/customersService'
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
  Statistic,
  Popconfirm,
  message,
  Progress,
  InputNumber
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RocketOutlined,
  DollarOutlined,
  UserOutlined,
  EyeOutlined
} from '@ant-design/icons'

const { Option } = Select

const ProjectsPage = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [form] = Form.useForm()

  // Load projects and customers on mount
  useEffect(() => {
    loadProjects()
    loadCustomers()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await projectsService.getProjects()
      
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data.map(p => ({ ...p, key: p.id || `project-${Date.now()}-${Math.random()}` })))
      } else if (Array.isArray(data)) {
        setProjects([])
      } else {
        console.warn('getProjects returned non-array data:', data)
        setProjects([])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      message.error('فشل في تحميل بيانات المشاريع')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const customersList = await customersService.getCustomers()
      setCustomers(customersList || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    }
  }

  // إحصائيات
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    averageCompletion: projects.length > 0 
      ? projects.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / projects.length 
      : 0
  }

  // أعمدة الجدول
  const columns = [
    {
      title: 'اسم المشروع',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/projects/${record.id}`)}
          style={{ padding: 0, height: 'auto', fontWeight: 500 }}
        >
          {name || 'غير معروف'}
        </Button>
      ),
    },
    {
      title: 'العميل',
      dataIndex: 'client',
      key: 'client',
      render: (client) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {client?.name || 'غير محدد'}
          </div>
        </div>
      ),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          active: { color: 'green', text: 'نشط' },
          on_hold: { color: 'orange', text: 'متوقف' },
          completed: { color: 'blue', text: 'مكتمل' },
          cancelled: { color: 'red', text: 'ملغي' },
        }
        const config = statusConfig[status] || { color: 'default', text: 'غير محدد' }
        return (
          <Tag color={config.color}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: 'الميزانية',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {budget ? budget.toLocaleString() : 0} ريال
        </span>
      ),
      sorter: (a, b) => (a?.budget || 0) - (b?.budget || 0),
    },
    {
      title: 'نسبة الإنجاز',
      dataIndex: 'completionPercentage',
      key: 'completionPercentage',
      render: (percentage) => {
        const percent = percentage || 0
        const status = percent === 100 ? 'success' : percent >= 50 ? 'active' : 'exception'
        return (
          <Progress 
            percent={percent} 
            status={status}
            format={(percent) => `${percent}%`}
          />
        )
      },
      sorter: (a, b) => (a?.completionPercentage || 0) - (b?.completionPercentage || 0),
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
            title="عرض التفاصيل"
          >
            التفاصيل
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedProject(record)
              form.setFieldsValue({
                name: record.name,
                clientId: record.clientId,
                status: record.status,
                budget: record.budget,
                completionPercentage: record.completionPercentage,
                notes: record.notes
              })
              setIsModalVisible(true)
            }}
            title="تعديل"
          />
          <Popconfirm
            title="حذف المشروع"
            description="هل أنت متأكد من حذف هذا المشروع؟"
            onConfirm={async () => {
              try {
                const result = await projectsService.deleteProject(record.id)
                if (result.success) {
                  message.success('تم حذف المشروع بنجاح')
                  loadProjects()
                } else {
                  message.error(result.error || 'فشل في حذف المشروع')
                }
              } catch (error) {
                console.error('Error deleting project:', error)
                message.error('حدث خطأ أثناء حذف المشروع')
              }
            }}
            okText="نعم"
            cancelText="لا"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              title="حذف"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // فلترة المشاريع
  const filteredProjects = (Array.isArray(projects) ? projects : []).filter(project => {
    if (!project) return false
    
    const matchesSearch = 
      project.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(searchText.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // إنشاء مشروع جديد
  const createProject = () => {
    setSelectedProject(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  // حفظ المشروع
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      const projectData = {
        name: values.name,
        clientId: values.clientId || null,
        status: values.status || 'active',
        budget: values.budget || 0,
        completionPercentage: values.completionPercentage || 0,
        notes: values.notes && values.notes.trim() ? values.notes.trim() : null
      }

      let result
      if (selectedProject) {
        result = await projectsService.updateProject(selectedProject.id, projectData)
      } else {
        result = await projectsService.addProject(projectData)
      }
      
      if (result.success) {
        message.success(selectedProject ? 'تم تحديث المشروع بنجاح!' : 'تم إضافة المشروع بنجاح!')
        setIsModalVisible(false)
        form.resetFields()
        loadProjects()
      } else {
        message.error(result.error || 'فشل في حفظ المشروع')
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح')
      } else {
        message.error('حدث خطأ أثناء حفظ المشروع')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>إدارة المشاريع</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>عرض وإدارة جميع المشاريع</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={createProject}>
          مشروع جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي المشاريع"
              value={stats.totalProjects}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="المشاريع النشطة"
              value={stats.activeProjects}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي الميزانية"
              value={stats.totalBudget}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="ريال"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="متوسط الإنجاز"
              value={stats.averageCompletion}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* أدوات البحث */}
      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="ابحث باسم المشروع أو العميل..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="حالة المشروع"
          >
            <Option value="all">الكل</Option>
            <Option value="active">نشط</Option>
            <Option value="on_hold">متوقف</Option>
            <Option value="completed">مكتمل</Option>
            <Option value="cancelled">ملغي</Option>
          </Select>
        </div>
      </Card>

      {/* جدول المشاريع */}
      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredProjects}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey="key"
        />
      </Card>

      {/* Modal إنشاء/تعديل مشروع */}
      <Modal
        title={selectedProject ? "تعديل المشروع" : "إضافة مشروع جديد"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedProject(null)
          form.resetFields()
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="اسم المشروع"
            rules={[{ required: true, message: 'يرجى إدخال اسم المشروع' }]}
          >
            <Input placeholder="أدخل اسم المشروع" />
          </Form.Item>

          <Form.Item
            name="clientId"
            label="العميل"
            rules={[{ required: true, message: 'يرجى اختيار العميل' }]}
          >
            <Select
              placeholder="اختر العميل"
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {customers.map(customer => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="الحالة"
                initialValue="active"
              >
                <Select>
                  <Option value="active">نشط</Option>
                  <Option value="on_hold">متوقف</Option>
                  <Option value="completed">مكتمل</Option>
                  <Option value="cancelled">ملغي</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="budget"
                label="الميزانية (ريال)"
                rules={[{ required: true, message: 'يرجى إدخال الميزانية' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="completionPercentage"
            label="نسبة الإنجاز (%)"
            initialValue={0}
          >
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="ملاحظات (اختياري)"
          >
            <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectsPage
