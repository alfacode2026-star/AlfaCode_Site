'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import companySettingsService from '../services/companySettingsService'
import userManagementService from '../services/userManagementService'
import { supabase } from '../services/supabaseClient'
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
  SettingOutlined,
  FileImageOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'

const { Option } = Select
// const { TabPane } = Tabs
const { Title, Text } = Typography

const SettingsPage = () => {
  const { currentTenantId } = useTenant()
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  const [companyForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [logo, setLogo] = useState(null)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [letterheadFile, setLetterheadFile] = useState<UploadFile | null>(null)
  const [stampFile, setStampFile] = useState<UploadFile | null>(null)
  const [logoFile, setLogoFile] = useState<UploadFile | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [isUserModalVisible, setIsUserModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userForm] = Form.useForm()

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

  useEffect(() => {
    if (activeTab === 'company') {
      loadCompanySettings()
    } else if (activeTab === 'users') {
      checkSuperAdminAndLoadUsers()
    }
  }, [activeTab, currentTenantId])

  const checkSuperAdminAndLoadUsers = async () => {
    try {
      const isAdmin = await userManagementService.isSuperAdmin()
      setIsSuperAdmin(isAdmin)
      if (isAdmin) {
        await loadUsers()
      }
    } catch (error) {
      console.error('Error checking super admin status:', error)
      setIsSuperAdmin(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const usersList = await userManagementService.getUsers()
      setUsers(usersList || [])
    } catch (error) {
      console.error('Error loading users:', error)
      message.error(language === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAddUser = () => {
    setSelectedUser(null)
    userForm.resetFields()
    userForm.setFieldsValue({ role: 'user' })
    setIsUserModalVisible(true)
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    userForm.setFieldsValue({
      email: user.email,
      full_name: user.full_name,
      role: user.role
    })
    setIsUserModalVisible(true)
  }

  const handleSaveUser = async () => {
    try {
      const values = await userForm.validateFields()
      
      if (selectedUser) {
        // Update existing user role
        const result = await userManagementService.updateUserRole(selectedUser.id, values.role)
        if (result.success) {
          message.success(language === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully')
          setIsUserModalVisible(false)
          userForm.resetFields()
          setSelectedUser(null)
          await loadUsers()
        } else {
          message.error(result.error || (language === 'ar' ? 'فشل تحديث المستخدم' : 'Failed to update user'))
        }
      } else {
        // Create new user
        const result = await userManagementService.createUser({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role || 'user',
          branch_id: null // Can be set later
        })
        
        if (result.success) {
          message.success(language === 'ar' ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully')
          setIsUserModalVisible(false)
          userForm.resetFields()
          await loadUsers()
        } else {
          message.error(result.error || (language === 'ar' ? 'فشل إنشاء المستخدم' : 'Failed to create user'))
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error)
      if (error.errorFields) {
        message.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields')
      } else {
        message.error(error.message || (language === 'ar' ? 'فشل حفظ المستخدم' : 'Failed to save user'))
      }
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const result = await userManagementService.deleteUser(userId)
      if (result.success) {
        message.success(language === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully')
        await loadUsers()
      } else {
        message.error(result.error || (language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user'))
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      message.error(language === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user')
    }
  }

  const loadCompanySettings = async () => {
    try {
      const settings = await companySettingsService.getCompanySettings()
      setCompanySettings(settings) // Set even if null for null-safety checks
      if (settings) {
        companyForm.setFieldsValue({
          companyName: settings.companyName || '',
          authorizedManagerName: settings.authorizedManagerName || '',
          authorizedManagerTitle: settings.authorizedManagerTitle || '',
          companyAddress: settings.companyAddress || '',
          companyPhone: settings.companyPhone || '',
        companyEmail: settings.companyEmail || '',
        companyWebsite: settings.companyWebsite || '',
        taxNumber: settings.taxNumber || '',
        commercialRegister: settings.commercialRegister || '',
        vatPercentage: settings.vatPercentage ?? 0,
        vatEnabled: settings.vatEnabled ?? false,
        topMargin: settings.topMarginCm ?? 4.0,
        bottomMargin: settings.bottomMarginCm ?? 3.0
        })
      } else {
        // Set defaults if no settings exist
        companyForm.setFieldsValue({
          topMargin: 4.0,
          bottomMargin: 3.0
        })
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
      // Set defaults on error
      companyForm.setFieldsValue({
        topMargin: 4.0,
        bottomMargin: 3.0
      })
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleLetterheadUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const base64 = await fileToBase64(file as File)
      setLetterheadFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: base64
      } as UploadFile)
      if (onSuccess) onSuccess('ok')
      message.success(language === 'ar' ? 'تم رفع الورقة الرسمية بنجاح' : 'Letterhead uploaded successfully')
    } catch (error) {
      console.error('Error uploading letterhead:', error)
      if (onError) onError(error as Error)
      message.error(language === 'ar' ? 'فشل رفع الورقة الرسمية' : 'Failed to upload letterhead')
    }
  }

  const handleStampUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const base64 = await fileToBase64(file as File)
      setStampFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: base64
      } as UploadFile)
      if (onSuccess) onSuccess('ok')
      message.success(language === 'ar' ? 'تم رفع الختم الرقمي بنجاح' : 'Digital stamp uploaded successfully')
    } catch (error) {
      console.error('Error uploading stamp:', error)
      if (onError) onError(error as Error)
      message.error(language === 'ar' ? 'فشل رفع الختم الرقمي' : 'Failed to upload digital stamp')
    }
  }

  const handleLogoUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const base64 = await fileToBase64(file as File)
      setLogoFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: base64
      } as UploadFile)
      if (onSuccess) onSuccess('ok')
      message.success(language === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      if (onError) onError(error as Error)
      message.error(language === 'ar' ? 'فشل رفع الشعار' : 'Failed to upload logo')
    }
  }

  const handleCompanySettingsSave = async () => {
    try {
      setCompanyLoading(true)
      const values = await companyForm.validateFields()

      const settingsData: any = {
        companyName: values.companyName,
        authorizedManagerName: values.authorizedManagerName,
        authorizedManagerTitle: values.authorizedManagerTitle,
        companyAddress: values.companyAddress,
        companyPhone: values.companyPhone,
        companyEmail: values.companyEmail,
        companyWebsite: values.companyWebsite,
        taxNumber: values.taxNumber,
        commercialRegister: values.commercialRegister,
        vatPercentage: values.vatPercentage || 0,
        vatEnabled: values.vatEnabled ?? false,
        topMarginCm: values.topMargin || 4,
        bottomMarginCm: values.bottomMargin || 3
      }

      if (letterheadFile?.url) {
        settingsData.letterheadUrl = letterheadFile.url
      } else if (companySettings?.letterheadUrl) {
        settingsData.letterheadUrl = companySettings.letterheadUrl
      }

      if (stampFile?.url) {
        settingsData.digitalStampUrl = stampFile.url
      } else if (companySettings?.digitalStampUrl) {
        settingsData.digitalStampUrl = companySettings.digitalStampUrl
      }

      if (logoFile?.url) {
        settingsData.logoUrl = logoFile.url
      } else if (companySettings?.logoUrl) {
        settingsData.logoUrl = companySettings.logoUrl
      }

      const result = await companySettingsService.saveCompanySettings(settingsData)

      if (result.success) {
        message.success(language === 'ar' ? 'تم حفظ إعدادات الشركة بنجاح' : 'Company settings saved successfully!')
        await loadCompanySettings()
        setLetterheadFile(null)
        setStampFile(null)
        setLogoFile(null)
      } else {
        message.error(result.error || (language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings'))
      }
    } catch (error) {
      console.error('Error saving company settings:', error)
      message.error(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings')
    } finally {
      setCompanyLoading(false)
    }
  }

  const handleSave = () => {
    setLoading(true)
    form.validateFields().then(values => {
      setTimeout(() => {
        setLoading(false)
        message.success(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully')
      }, 1000)
    }).catch(error => {
      console.error('Validation failed:', error)
      setLoading(false)
    })
  }

  // Old logo upload handler for general settings tab (legacy)
  const handleGeneralLogoUpload = (info: any) => {
    if (info.file.status === 'done') {
      setLogo(info.file.originFileObj)
      message.success(language === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully')
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
                          onChange={handleGeneralLogoUpload}
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
          },
          {
            key: 'company',
            label: language === 'ar' ? 'إعدادات الشركة' : 'Company Settings',
            icon: <ShopOutlined />,
            children: (
              <>
                <Alert
                  message={language === 'ar' ? 'تعليمات الورقة الرسمية' : 'Full-Page Letterhead Instructions'}
                  description={language === 'ar' 
                    ? 'قم برفع صورة عالية الدقة PNG/JPG لصفحة A4 كاملة تتضمن الرأس والتذييل والعلامة المائية. سيستخدم النظام هذا كطبقة خلفية، وسيتدفق محتوى العرض فوقها.'
                    : 'Upload a high-resolution PNG/JPG image of your entire A4 page including header, footer, and watermark. The system will use this as a background layer, and quotation content will flow over it.'}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Form form={companyForm} layout="vertical">
                  <Card title={language === 'ar' ? 'معلومات الشركة' : 'Company Information'} style={{ marginBottom: 16 }}>
                    <Row gutter={[24, 16]}>
                      <Col span={12}>
                        <Form.Item
                          name="companyName"
                          label={language === 'ar' ? 'اسم الشركة' : 'Company Name'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال اسم الشركة' : 'Please enter company name' }]}
                        >
                          <Input prefix={<ShopOutlined />} placeholder={language === 'ar' ? 'اسم الشركة' : 'Company Name'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="authorizedManagerName"
                          label={language === 'ar' ? 'اسم المدير المصرح' : 'Authorized Manager Name'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال اسم المدير' : 'Please enter manager name' }]}
                        >
                          <Input prefix={<UserOutlined />} placeholder={language === 'ar' ? 'اسم المدير' : 'Manager Name'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="authorizedManagerTitle"
                          label={language === 'ar' ? 'منصب المدير' : 'Manager Title/Position'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال منصب المدير' : 'Please enter manager title' }]}
                        >
                          <Input placeholder={language === 'ar' ? 'مثل: المدير العام' : 'e.g., General Manager'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="companyPhone" label={language === 'ar' ? 'هاتف الشركة' : 'Company Phone'}>
                          <Input placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone Number'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="companyEmail" label={language === 'ar' ? 'بريد الشركة' : 'Company Email'}>
                          <Input placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="companyWebsite" label={language === 'ar' ? 'موقع الشركة' : 'Company Website'}>
                          <Input placeholder={language === 'ar' ? 'رابط الموقع' : 'Website URL'} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="companyAddress" label={language === 'ar' ? 'عنوان الشركة' : 'Company Address'}>
                          <Input.TextArea rows={2} placeholder={language === 'ar' ? 'العنوان الكامل' : 'Full Address'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="taxNumber" label={language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}>
                          <Input placeholder={language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="commercialRegister" label={language === 'ar' ? 'السجل التجاري' : 'Commercial Register'}>
                          <Input placeholder={language === 'ar' ? 'رقم السجل التجاري' : 'Commercial Register Number'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="vatPercentage" 
                          label={language === 'ar' ? 'نسبة ضريبة القيمة المضافة (%)' : 'VAT Percentage (%)'}
                          extra={language === 'ar' ? 'اتركه فارغاً أو 0 لإلغاء ضريبة القيمة المضافة' : 'Leave empty or 0 to disable VAT'}
                        >
                          <InputNumber 
                            min={0} 
                            max={100} 
                            step={0.1}
                            style={{ width: '100%' }} 
                            placeholder={language === 'ar' ? 'مثال: 15' : 'e.g., 15'} 
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="vatEnabled" 
                          label={language === 'ar' ? 'تفعيل ضريبة القيمة المضافة' : 'Enable VAT'}
                          valuePropName="checked"
                        >
                          <Switch 
                            checkedChildren={language === 'ar' ? 'مفعل' : 'Enabled'} 
                            unCheckedChildren={language === 'ar' ? 'معطل' : 'Disabled'} 
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  <Card title={language === 'ar' ? 'العلامة التجارية والوسائط' : 'Branding & Media'} style={{ marginBottom: 16 }}>
                    <Row gutter={[24, 24]}>
                      <Col span={24}>
                        <Divider orientation="left">{language === 'ar' ? 'الورقة الرسمية الكاملة (خلفية A4)' : 'Full-Page Letterhead (A4 Background)'}</Divider>
                        <Form.Item
                          label={language === 'ar' ? 'صورة الورقة الرسمية' : 'Letterhead Image'}
                          extra={language === 'ar' 
                            ? 'قم برفع صورة عالية الدقة PNG/JPG للصفحة الكاملة (210mm x 297mm) تتضمن الرأس والتذييل والعلامة المائية. الموصى به: 2480x3508 بكسل بدقة 300 DPI.'
                            : 'Upload a high-resolution PNG/JPG of the entire A4 page (210mm x 297mm) including header, footer, and watermark. Recommended: 2480x3508 pixels at 300 DPI.'}
                        >
                          <Upload
                            customRequest={handleLetterheadUpload}
                            accept="image/png,image/jpeg,image/jpg"
                            maxCount={1}
                            listType="picture-card"
                            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                          >
                            {(!letterheadFile && !companySettings?.letterheadUrl) && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>{language === 'ar' ? 'رفع الورقة الرسمية' : 'Upload Letterhead'}</div>
                              </div>
                            )}
                          </Upload>
                          {companySettings?.letterheadUrl && !letterheadFile && (
                            <div style={{ marginTop: 16 }}>
                              <Text type="secondary">{language === 'ar' ? 'الورقة الرسمية الحالية:' : 'Current letterhead:'}</Text>
                              <div style={{ marginTop: 8 }}>
                                <img
                                  src={companySettings.letterheadUrl}
                                  alt="Current letterhead"
                                  style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #d9d9d9', borderRadius: 4 }}
                                />
                              </div>
                            </div>
                          )}
                          {letterheadFile?.url && (
                            <div style={{ marginTop: 16 }}>
                              <Text type="success">{language === 'ar' ? 'معاينة الورقة الرسمية الجديدة:' : 'New letterhead preview:'}</Text>
                              <div style={{ marginTop: 8 }}>
                                <img
                                  src={letterheadFile.url}
                                  alt="New letterhead"
                                  style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #52c41a', borderRadius: 4 }}
                                />
                              </div>
                            </div>
                          )}
                        </Form.Item>
                      </Col>

                      <Col span={12}>
                        <Divider orientation="left">{language === 'ar' ? 'الختم الرقمي' : 'Digital Stamp'}</Divider>
                        <Form.Item
                          label={language === 'ar' ? 'الختم الرقمي (PNG شفاف)' : 'Digital Stamp (Transparent PNG)'}
                          extra={language === 'ar' ? 'قم برفع PNG شفاف لختم الشركة/التوقيع. الموصى به: 300x300 بكسل.' : 'Upload a transparent PNG of your company stamp/signature. Recommended: 300x300 pixels.'}
                        >
                          <Upload
                            customRequest={handleStampUpload}
                            accept="image/png"
                            maxCount={1}
                            listType="picture-card"
                            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                          >
                            {(!stampFile && !companySettings?.digitalStampUrl) && (
                              <div>
                                <FileImageOutlined />
                                <div style={{ marginTop: 8 }}>{language === 'ar' ? 'رفع الختم' : 'Upload Stamp'}</div>
                              </div>
                            )}
                          </Upload>
                          {companySettings?.digitalStampUrl && !stampFile && (
                            <div style={{ marginTop: 16 }}>
                              <img
                                src={companySettings.digitalStampUrl}
                                alt="Current stamp"
                                style={{ maxWidth: '150px', maxHeight: '150px', border: '1px solid #d9d9d9', borderRadius: 4 }}
                              />
                            </div>
                          )}
                          {stampFile?.url && (
                            <div style={{ marginTop: 16 }}>
                              <img
                                src={stampFile.url}
                                alt="New stamp"
                                style={{ maxWidth: '150px', maxHeight: '150px', border: '1px solid #52c41a', borderRadius: 4 }}
                              />
                            </div>
                          )}
                        </Form.Item>
                      </Col>

                      <Col span={12}>
                        <Divider orientation="left">{language === 'ar' ? 'شعار الشركة' : 'Company Logo'}</Divider>
                        <Form.Item
                          label={language === 'ar' ? 'شعار الشركة (اختياري)' : 'Company Logo (Optional)'}
                          extra={language === 'ar' ? 'قم برفع شعار الشركة. الموصى به: 300x100 بكسل.' : 'Upload your company logo. Recommended: 300x100 pixels.'}
                        >
                          <Upload
                            customRequest={handleLogoUpload}
                            accept="image/png,image/jpeg,image/jpg"
                            maxCount={1}
                            listType="picture-card"
                            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                          >
                            {(!logoFile && !companySettings?.logoUrl) && (
                              <div>
                                <FileImageOutlined />
                                <div style={{ marginTop: 8 }}>{language === 'ar' ? 'رفع الشعار' : 'Upload Logo'}</div>
                              </div>
                            )}
                          </Upload>
                          {companySettings?.logoUrl && !logoFile && (
                            <div style={{ marginTop: 16 }}>
                              <img
                                src={companySettings.logoUrl}
                                alt="Current logo"
                                style={{ maxWidth: '150px', maxHeight: '100px', border: '1px solid #d9d9d9', borderRadius: 4 }}
                              />
                            </div>
                          )}
                          {logoFile?.url && (
                            <div style={{ marginTop: 16 }}>
                              <img
                                src={logoFile.url}
                                alt="New logo"
                                style={{ maxWidth: '150px', maxHeight: '100px', border: '1px solid #52c41a', borderRadius: 4 }}
                              />
                            </div>
                          )}
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  <Card title={language === 'ar' ? 'هوامش المحتوى' : 'Content Margins'}>
                    <Row gutter={[24, 16]}>
                      <Col span={12}>
                        <Form.Item
                          name="topMargin"
                          label={language === 'ar' ? 'الهامش العلوي (سم)' : 'Top Margin (cm)'}
                          extra={language === 'ar' ? 'المسافة من أعلى الورقة الرسمية إلى بداية المحتوى. الافتراضي: 4سم' : 'Distance from top of letterhead to start of content. Default: 4cm'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال الهامش العلوي' : 'Please enter top margin' }]}
                          initialValue={4}
                        >
                          <InputNumber type="number" min={1} max={10} step={0.5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="bottomMargin"
                          label={language === 'ar' ? 'الهامش السفلي (سم)' : 'Bottom Margin (cm)'}
                          extra={language === 'ar' ? 'المسافة من أسفل الورقة الرسمية إلى نهاية المحتوى. الافتراضي: 3سم' : 'Distance from bottom of letterhead to end of content. Default: 3cm'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال الهامش السفلي' : 'Please enter bottom margin' }]}
                          initialValue={3}
                        >
                          <InputNumber type="number" min={1} max={10} step={0.5} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </Form>
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleCompanySettingsSave}
                    loading={companyLoading}
                    size="large"
                  >
                    {language === 'ar' ? 'حفظ إعدادات الشركة' : 'Save Company Settings'}
                  </Button>
                </div>
              </>
            )
          },
          {
            key: 'users',
            label: language === 'ar' ? 'إدارة المستخدمين' : 'User Management',
            icon: <TeamOutlined />,
            children: (
              <>
                {!isSuperAdmin ? (
                  <Alert
                    message={language === 'ar' ? 'غير مصرح' : 'Unauthorized'}
                    description={language === 'ar' 
                      ? 'فقط مدير النظام (Super Admin) يمكنه إدارة المستخدمين'
                      : 'Only Super Admin can manage users'}
                    type="warning"
                    showIcon
                  />
                ) : (
                  <>
                    <Card 
                      title={language === 'ar' ? 'المستخدمون' : 'Users'}
                      extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
                          {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
                        </Button>
                      }
                    >
                      <Table
                        dataSource={users}
                        loading={usersLoading}
                        rowKey="id"
                        columns={[
                          {
                            title: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
                            dataIndex: 'email',
                            key: 'email'
                          },
                          {
                            title: language === 'ar' ? 'الاسم الكامل' : 'Full Name',
                            dataIndex: 'full_name',
                            key: 'full_name'
                          },
                          {
                            title: language === 'ar' ? 'الدور' : 'Role',
                            dataIndex: 'role',
                            key: 'role',
                            render: (role: string) => (
                              <Tag color={role === 'super_admin' ? 'red' : role === 'admin' ? 'orange' : 'blue'}>
                                {role === 'super_admin' ? (language === 'ar' ? 'مدير النظام' : 'Super Admin') :
                                 role === 'admin' ? (language === 'ar' ? 'مدير' : 'Admin') :
                                 role === 'manager' ? (language === 'ar' ? 'مدير فرع' : 'Manager') :
                                 role === 'accountant' ? (language === 'ar' ? 'محاسب' : 'Accountant') :
                                 role === 'engineer' ? (language === 'ar' ? 'مهندس' : 'Engineer') :
                                 language === 'ar' ? 'مستخدم' : 'User'}
                              </Tag>
                            )
                          },
                          {
                            title: language === 'ar' ? 'الإجراءات' : 'Actions',
                            key: 'actions',
                            render: (_: any, record: any) => (
                              <Space>
                                <Button 
                                  type="link" 
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => handleEditUser(record)}
                                >
                                  {language === 'ar' ? 'تعديل' : 'Edit'}
                                </Button>
                                <Popconfirm
                                  title={language === 'ar' ? 'حذف المستخدم' : 'Delete User'}
                                  description={language === 'ar' 
                                    ? 'هل أنت متأكد من حذف هذا المستخدم؟'
                                    : 'Are you sure you want to delete this user?'}
                                  onConfirm={() => handleDeleteUser(record.id)}
                                  okText={language === 'ar' ? 'نعم' : 'Yes'}
                                  cancelText={language === 'ar' ? 'لا' : 'No'}
                                >
                                  <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                                    {language === 'ar' ? 'حذف' : 'Delete'}
                                  </Button>
                                </Popconfirm>
                              </Space>
                            )
                          }
                        ]}
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>

                    <Modal
                      title={selectedUser 
                        ? (language === 'ar' ? 'تعديل المستخدم' : 'Edit User')
                        : (language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User')}
                      open={isUserModalVisible}
                      onOk={handleSaveUser}
                      onCancel={() => {
                        setIsUserModalVisible(false)
                        userForm.resetFields()
                        setSelectedUser(null)
                      }}
                      okText={language === 'ar' ? 'حفظ' : 'Save'}
                      cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
                    >
                      <Form form={userForm} layout="vertical">
                        <Form.Item
                          name="email"
                          label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                          rules={[
                            { required: true, message: language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter email' },
                            { type: 'email', message: language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email' }
                          ]}
                        >
                          <Input 
                            disabled={!!selectedUser}
                            placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} 
                          />
                        </Form.Item>

                        {!selectedUser && (
                          <Form.Item
                            name="password"
                            label={language === 'ar' ? 'كلمة المرور' : 'Password'}
                            rules={[
                              { required: true, message: language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter password' },
                              { min: 8, message: language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters' }
                            ]}
                          >
                            <Input.Password placeholder={language === 'ar' ? 'كلمة المرور (8 أحرف على الأقل)' : 'Password (min 8 characters)'} />
                          </Form.Item>
                        )}

                        <Form.Item
                          name="full_name"
                          label={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please enter full name' }]}
                        >
                          <Input placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'} />
                        </Form.Item>

                        <Form.Item
                          name="role"
                          label={language === 'ar' ? 'الدور' : 'Role'}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى اختيار الدور' : 'Please select role' }]}
                        >
                          <Select placeholder={language === 'ar' ? 'اختر الدور' : 'Select Role'}>
                            <Option value="super_admin">{language === 'ar' ? 'مدير النظام' : 'Super Admin'}</Option>
                            <Option value="admin">{language === 'ar' ? 'مدير' : 'Admin'}</Option>
                            <Option value="manager">{language === 'ar' ? 'مدير فرع' : 'Manager'}</Option>
                            <Option value="accountant">{language === 'ar' ? 'محاسب' : 'Accountant'}</Option>
                            <Option value="engineer">{language === 'ar' ? 'مهندس' : 'Engineer'}</Option>
                            <Option value="user">{language === 'ar' ? 'مستخدم' : 'User'}</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Modal>
                  </>
                )}
              </>
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