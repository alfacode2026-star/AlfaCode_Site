'use client'

import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Select,
  InputNumber,
  Tabs,
  Divider,
  Space,
  Upload,
  message,
  Row,
  Col,
  Typography,
  Alert,
  Modal,
  List,
  Tag,
  Avatar,
  Popconfirm,
  Badge
} from 'antd'
import {
  SaveOutlined,
  UploadOutlined,
  UserOutlined,
  ShopOutlined,
  DollarOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  LockOutlined,
  BellOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  CloudOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SettingOutlined
} from '@ant-design/icons'

const { Option } = Select
// const { TabPane } = Tabs
const { Title, Text } = Typography

const SettingsPage = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [logo, setLogo] = useState(null)

  // بيانات الشركة
  const companyData = {
    name: 'شركة التقنية المتطورة',
    email: 'info@tech-company.com',
    phone: '0112345678',
    address: 'الرياض - حي المروج - شارع الملك فهد',
    taxNumber: '310123456700003',
    commercialRegister: '1012345678',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    language: 'ar'
  }

  // إعدادات النظام
  const systemSettings = {
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    enable2FA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5
  }

  // إعدادات البريد
  const emailSettings = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'noreply@company.com',
    smtpSecure: true,
    fromEmail: 'noreply@company.com',
    fromName: 'نظام ERP'
  }

  // صلاحيات المستخدمين
  const userRoles = [
    {
      key: '1',
      name: 'مدير النظام',
      description: 'صلاحيات كاملة على جميع الوظائف',
      users: 1,
      permissions: ['all']
    },
    {
      key: '2',
      name: 'مدير المبيعات',
      description: 'إدارة المبيعات والعملاء',
      users: 3,
      permissions: ['sales', 'customers', 'reports']
    },
    {
      key: '3',
      name: 'مدير المخزون',
      description: 'إدارة المنتجات والمخزون',
      users: 2,
      permissions: ['inventory', 'products', 'suppliers']
    },
    {
      key: '4',
      name: 'محاسب',
      description: 'إدارة الفواتير والمستحقات',
      users: 2,
      permissions: ['invoices', 'accounts', 'reports']
    },
    {
      key: '5',
      name: 'مندوب مبيعات',
      description: 'إدارة الطلبات والمتابعة',
      users: 5,
      permissions: ['orders', 'customers']
    }
  ]

  // نسخ احتياطية
  const backups = [
    { date: '2024-02-15 02:00', size: '2.4 GB', type: 'تلقائي', status: 'success' },
    { date: '2024-02-14 02:00', size: '2.3 GB', type: 'تلقائي', status: 'success' },
    { date: '2024-02-13 02:00', size: '2.3 GB', type: 'تلقائي', status: 'success' },
    { date: '2024-02-12 14:30', size: '2.5 GB', type: 'يدوي', status: 'success' },
    { date: '2024-02-11 02:00', size: '2.3 GB', type: 'تلقائي', status: 'failed' }
  ]

  const handleSave = () => {
    setLoading(true)
    form.validateFields().then(values => {
      // هنا يمكنك إرسال البيانات إلى الخادم
      console.log('Settings saved:', values)
      setTimeout(() => {
        setLoading(false)
        message.success('تم حفظ الإعدادات بنجاح')
      }, 1000)
    }).catch(error => {
      console.error('Validation failed:', error)
      setLoading(false)
    })
  }

  const handleLogoUpload = (info) => {
    if (info.file.status === 'done') {
      setLogo(info.file.originFileObj)
      message.success('تم رفع الشعار بنجاح')
    }
  }

  const createBackup = () => {
    Modal.confirm({
      title: 'إنشاء نسخة احتياطية',
      content: 'هل تريد إنشاء نسخة احتياطية للنظام الآن؟',
      onOk() {
        message.loading('جاري إنشاء النسخة الاحتياطية...', 2)
          .then(() => message.success('تم إنشاء النسخة الاحتياطية بنجاح'))
      }
    })
  }

  const restoreBackup = (backup) => {
    Modal.confirm({
      title: 'استعادة النسخة الاحتياطية',
      content: `هل تريد استعادة النسخة الاحتياطية بتاريخ ${backup.date}؟`,
      okText: 'استعادة',
      cancelText: 'إلغاء',
      onOk() {
        message.loading('جاري استعادة النسخة الاحتياطية...', 2)
          .then(() => message.success('تم الاستعادة بنجاح'))
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>إعدادات النظام</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>تخصيص إعدادات النظام والشركة</p>
        </div>
        <Button 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
        >
          حفظ التغييرات
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'general',
            label: 'عام',
            icon: <SettingOutlined />,
            children: (
              <>
                <Card title="معلومات الشركة">
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={companyData}
                  >
                    <Row gutter={[24, 16]}>
                      <Col span={12}>
                        <Form.Item
                          name="name"
                          label="اسم الشركة"
                          rules={[{ required: true, message: 'يرجى إدخال اسم الشركة' }]}
                        >
                          <Input 
                            prefix={<ShopOutlined />} 
                            placeholder="أدخل اسم الشركة" 
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="email"
                          label="البريد الإلكتروني"
                          rules={[
                            { required: true, message: 'يرجى إدخال البريد الإلكتروني' },
                            { type: 'email', message: 'يرجى إدخال بريد إلكتروني صحيح' }
                          ]}
                        >
                          <Input 
                            prefix={<MailOutlined />} 
                            placeholder="البريد الإلكتروني" 
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="phone"
                          label="رقم الهاتف"
                          rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
                        >
                          <Input 
                            prefix={<PhoneOutlined />} 
                            placeholder="رقم الهاتف" 
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="taxNumber"
                          label="الرقم الضريبي"
                          rules={[{ required: true, message: 'يرجى إدخال الرقم الضريبي' }]}
                        >
                          <Input placeholder="الرقم الضريبي" />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item
                          name="address"
                          label="العنوان"
                        >
                          <Input.TextArea 
                            rows={2} 
                            placeholder="أدخل عنوان الشركة" 
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>

                <Card title="الشعار والعلامة التجارية" style={{ marginTop: 16 }}>
                  <Row gutter={[24, 24]}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 150,
                          height: 150,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          border: '2px dashed #d9d9d9'
                        }}>
                          {logo ? (
                            <img 
                              src={URL.createObjectURL(logo)} 
                              alt="Logo" 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <ShopOutlined style={{ fontSize: 48, color: '#999' }} />
                          )}
                        </div>
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          onChange={handleLogoUpload}
                        >
                          <Button icon={<UploadOutlined />}>
                            تغيير الشعار
                          </Button>
                        </Upload>
                      </div>
                    </Col>
                    <Col span={16}>
                      <Form layout="vertical">
                        <Form.Item
                          label="اللون الرئيسي"
                          name="primaryColor"
                          initialValue="#1890ff"
                        >
                          <Input type="color" style={{ width: 100, height: 40 }} />
                        </Form.Item>
                        <Form.Item
                          label="اللون الثانوي"
                          name="secondaryColor"
                          initialValue="#52c41a"
                        >
                          <Input type="color" style={{ width: 100, height: 40 }} />
                        </Form.Item>
                        <Form.Item
                          label="العملة"
                          name="currency"
                        >
                          <Select style={{ width: 200 }}>
                            <Option value="SAR">ريال سعودي (SAR)</Option>
                            <Option value="USD">دولار أمريكي (USD)</Option>
                            <Option value="EUR">يورو (EUR)</Option>
                            <Option value="AED">درهم إماراتي (AED)</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item
                          label="المنطقة الزمنية"
                          name="timezone"
                        >
                          <Select style={{ width: 200 }}>
                            <Option value="Asia/Riyadh">الرياض (GMT+3)</Option>
                            <Option value="Asia/Dubai">دبي (GMT+4)</Option>
                            <Option value="Europe/London">لندن (GMT+0)</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Col>
                  </Row>
                </Card>
              </>
            )
          },
          {
            key: 'system',
            label: 'النظام',
            icon: <AppstoreOutlined />,
            children: (
          <Card title="إعدادات النظام">
            <Form
              form={form}
              layout="vertical"
              initialValues={systemSettings}
            >
              <Row gutter={[24, 16]}>
                <Col span={24}>
                  <Form.Item
                    name="maintenanceMode"
                    label="وضع الصيانة"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren="مفعل" 
                      unCheckedChildren="معطل" 
                    />
                  </Form.Item>
                  <Text type="secondary">
                    عند تفعيل وضع الصيانة، لن يتمكن المستخدمون من الوصول للنظام
                  </Text>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="allowRegistration"
                    label="السماح بالتسجيل"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren="مسموح" 
                      unCheckedChildren="ممنوع" 
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="requireEmailVerification"
                    label="طلب التحقق من البريد الإلكتروني"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren="مطلوب" 
                      unCheckedChildren="غير مطلوب" 
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="enable2FA"
                    label="المصادقة الثنائية"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren="مفعلة" 
                      unCheckedChildren="معطلة" 
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sessionTimeout"
                    label="مدة الجلسة (دقيقة)"
                  >
                    <InputNumber 
                      min={5} 
                      max={240} 
                      style={{ width: '100%' }} 
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="maxLoginAttempts"
                    label="أقصى محاولات تسجيل دخول"
                  >
                    <InputNumber 
                      min={1} 
                      max={10} 
                      style={{ width: '100%' }} 
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
            )
          },
          {
            key: 'email',
            label: 'البريد',
            icon: <MailOutlined />,
            children: (
          <Card title="إعدادات البريد الإلكتروني">
            <Alert
              title="معلومات مهمة"
              description="تأكد من صحة إعدادات البريد الإلكتروني لضمان وصول الرسائل للمستخدمين"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form
              form={form}
              layout="vertical"
              initialValues={emailSettings}
            >
              <Row gutter={[24, 16]}>
                <Col span={12}>
                  <Form.Item
                    name="smtpHost"
                    label="خادم SMTP"
                    rules={[{ required: true, message: 'يرجى إدخال خادم SMTP' }]}
                  >
                    <Input placeholder="smtp.gmail.com" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="smtpPort"
                    label="منفذ SMTP"
                    rules={[{ required: true, message: 'يرجى إدخال منفذ SMTP' }]}
                  >
                    <InputNumber 
                      min={1} 
                      max={65535} 
                      style={{ width: '100%' }} 
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="smtpUser"
                    label="اسم المستخدم"
                    rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
                  >
                    <Input placeholder="البريد الإلكتروني" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="smtpPassword"
                    label="كلمة المرور"
                    rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
                  >
                    <Input.Password placeholder="كلمة مرور البريد" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="smtpSecure"
                    label="اتصال آمن (SSL/TLS)"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="fromEmail"
                    label="البريد المرسل"
                    rules={[
                      { required: true, message: 'يرجى إدخال البريد المرسل' },
                      { type: 'email', message: 'يرجى إدخال بريد إلكتروني صحيح' }
                    ]}
                  >
                    <Input placeholder="noreply@company.com" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="fromName"
                    label="اسم المرسل"
                    rules={[{ required: true, message: 'يرجى إدخال اسم المرسل' }]}
                  >
                    <Input placeholder="نظام ERP" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <Divider />
            <Button type="primary" icon={<MailOutlined />}>
              اختبار إرسال بريد
            </Button>
          </Card>
            )
          },
          {
            key: 'permissions',
            label: 'الصلاحيات',
            icon: <TeamOutlined />,
            children: (
          <Card 
            title="مجموعات الصلاحيات"
            extra={
              <Button type="primary" size="small">
                إضافة مجموعة
              </Button>
            }
          >
            <List
              dataSource={userRoles}
              renderItem={(role) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small">تعديل</Button>,
                    <Popconfirm
                      title="حذف المجموعة"
                      description="هل أنت متأكد من حذف هذه المجموعة؟"
                      onConfirm={() => message.success('تم الحذف')}
                    >
                      <Button type="link" danger size="small">حذف</Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: '#1890ff' }}
                        icon={<TeamOutlined />}
                      />
                    }
                    title={
                      <Space>
                        <span>{role.name}</span>
                        <Badge count={role.users} />
                      </Space>
                    }
                    description={role.description}
                  />
                  <div>
                    <Space wrap>
                      {role.permissions.map((perm, idx) => (
                        <Tag key={idx} color="blue">
                          {perm === 'all' ? 'جميع الصلاحيات' : perm}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </Card>
            )
          },
          {
            key: 'backup',
            label: 'النسخ الاحتياطي',
            icon: <DatabaseOutlined />,
            children: (
          <Card 
            title="النسخ الاحتياطية"
            extra={
              <Space>
                <Button 
                  icon={<CloudOutlined />}
                  onClick={createBackup}
                >
                  نسخة احتياطية جديدة
                </Button>
              </Space>
            }
          >
            <List
              dataSource={backups}
              renderItem={(backup) => (
                <List.Item
                  actions={[
                    backup.status === 'success' && (
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => restoreBackup(backup)}
                      >
                        استعادة
                      </Button>
                    ),
                    <Button type="link" size="small">تحميل</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: backup.status === 'success' ? '#52c41a' : '#ff4d4f' 
                        }}
                        icon={<DatabaseOutlined />}
                      />
                    }
                    title={
                      <Space>
                        <span>نسخة بتاريخ {backup.date}</span>
                        <Tag color={backup.status === 'success' ? 'green' : 'red'}>
                          {backup.status === 'success' ? 'ناجح' : 'فشل'}
                        </Tag>
                      </Space>
                    }
                    description={`الحجم: ${backup.size} | النوع: ${backup.type}`}
                  />
                </List.Item>
              )}
            />
          </Card>
            )
          }
        ]}
      />

      {/* قسم متقدم */}
      <Card title="إعدادات متقدمة" type="inner">
        <Alert
          title="تحذير"
          description="التعديل على هذه الإعدادات قد يؤثر على استقرار النظام"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form layout="vertical">
              <Form.Item
                label="تحديث النظام تلقائياً"
                name="autoUpdate"
                initialValue={false}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="تفعيل سجل التدقيق"
                name="auditLog"
                initialValue={true}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="مستوى التسجيل في السجلات"
                name="logLevel"
                initialValue="info"
              >
                <Select style={{ width: 200 }}>
                  <Option value="error">أخطاء فقط</Option>
                  <Option value="warn">تحذيرات وأخطاء</Option>
                  <Option value="info">معلومات (مستحسن)</Option>
                  <Option value="debug">تفصيلي</Option>
                </Select>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default SettingsPage