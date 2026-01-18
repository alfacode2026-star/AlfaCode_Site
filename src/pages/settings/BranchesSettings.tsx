'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSyncStatus } from '../../contexts/SyncStatusContext'
import { getTranslations } from '../../utils/translations'
import userManagementService from '../../services/userManagementService'
import { supabase } from '../../services/supabaseClient'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Space,
  Tag,
  Popconfirm,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Option } = Select

interface Branch {
  id: string
  name: string
  currency: string
  is_main: boolean
  tenant_id: string
  created_at?: string
  updated_at?: string
}

const BranchesSettings = () => {
  const navigate = useNavigate()
  const { currentTenantId } = useTenant()
  const { language } = useLanguage()
  const { updateStatus } = useSyncStatus()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  // Check if user is super_admin
  useEffect(() => {
    const checkRole = async () => {
      try {
        const isAdmin = await userManagementService.isSuperAdmin()
        setIsSuperAdmin(isAdmin)
        
        if (!isAdmin) {
          message.error(language === 'ar' 
            ? 'غير مصرح لك بالوصول إلى هذه الصفحة. يجب أن تكون مدير النظام.' 
            : 'You are not authorized to access this page. You must be a super admin.')
          navigate('/settings')
          return
        }
        
        if (currentTenantId) {
          await loadBranches()
        }
      } catch (error) {
        console.error('Error checking role:', error)
        message.error(language === 'ar' 
          ? 'حدث خطأ في التحقق من الصلاحيات' 
          : 'Error checking permissions')
        navigate('/settings')
      } finally {
        setCheckingRole(false)
      }
    }
    
    checkRole()
  }, [currentTenantId, navigate, language])

  const loadBranches = async () => {
    if (!currentTenantId) return
    
    setLoading(true)
    updateStatus('loading', language === 'ar' ? 'جاري تحميل قائمة الفروع...' : 'Loading branch list...', 'Global')
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      const branchesData = data || []
      setBranches(branchesData)
      
      if (branchesData.length === 0) {
        updateStatus('empty', language === 'ar' ? 'لا توجد فروع' : 'No branches found', 'Global')
      } else {
        updateStatus('success', language === 'ar' ? `تم تحميل ${branchesData.length} فرع` : `Branches loaded (${branchesData.length})`, 'Global')
      }
    } catch (error: any) {
      console.error('Error loading branches:', error)
      const errorMsg = language === 'ar' ? 'تعذر المزامنة مع قاعدة البيانات' : 'Could not sync with the database'
      updateStatus('error', errorMsg, 'Global')
      message.error(language === 'ar' 
        ? 'فشل في تحميل الفروع' 
        : 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingBranch(null)
    form.resetFields()
    form.setFieldsValue({
      currency: 'SAR',
      is_main: false
    })
    setIsModalVisible(true)
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    form.setFieldsValue({
      name: branch.name,
      currency: branch.currency,
      is_main: branch.is_main
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (branchId: string) => {
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId)

      if (error) throw error

      message.success(language === 'ar' 
        ? 'تم حذف الفرع بنجاح' 
        : 'Branch deleted successfully')
      await loadBranches()
    } catch (error: any) {
      console.error('Error deleting branch:', error)
      message.error(language === 'ar' 
        ? 'فشل في حذف الفرع' 
        : 'Failed to delete branch')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!currentTenantId) {
        message.error(language === 'ar' 
          ? 'يرجى اختيار الشركة أولاً' 
          : 'Please select a company first')
        return
      }

      // If setting this branch as main, unset other main branches
      if (values.is_main && !editingBranch?.is_main) {
        const { error: unsetError } = await supabase
          .from('branches')
          .update({ is_main: false })
          .eq('tenant_id', currentTenantId)
          .eq('is_main', true)

        if (unsetError) {
          console.error('Error unsetting main branch:', unsetError)
          // Continue anyway
        }
      }

      if (editingBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('branches')
          .update({
            name: values.name,
            currency: values.currency,
            is_main: values.is_main,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBranch.id)

        if (error) throw error

        message.success(language === 'ar' 
          ? 'تم تحديث الفرع بنجاح' 
          : 'Branch updated successfully')
      } else {
        // Create new branch
        const { error } = await supabase
          .from('branches')
          .insert([{
            tenant_id: currentTenantId,
            name: values.name,
            currency: values.currency,
            is_main: values.is_main
          }])

        if (error) throw error

        message.success(language === 'ar' 
          ? 'تم إضافة الفرع بنجاح' 
          : 'Branch added successfully')
      }

      setIsModalVisible(false)
      form.resetFields()
      await loadBranches()
    } catch (error: any) {
      console.error('Error saving branch:', error)
      message.error(language === 'ar' 
        ? `فشل في حفظ الفرع: ${error.message}` 
        : `Failed to save branch: ${error.message}`)
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingBranch(null)
  }

  const columns: ColumnsType<Branch> = [
    {
      title: language === 'ar' ? 'الاسم' : 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: language === 'ar' ? 'العملة' : 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency: string) => (
        <Tag color="blue">{currency}</Tag>
      )
    },
    {
      title: language === 'ar' ? 'النوع' : 'Type',
      dataIndex: 'is_main',
      key: 'is_main',
      render: (isMain: boolean) => (
        <Tag color={isMain ? 'gold' : 'default'}>
          {isMain 
            ? (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch')
            : (language === 'ar' ? 'فرع فرعي' : 'Sub Branch')
          }
        </Tag>
      )
    },
    {
      title: language === 'ar' ? 'الإجراءات' : 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {language === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
          {!record.is_main && (
            <Popconfirm
              title={language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا الفرع؟' 
                : 'Are you sure you want to delete this branch?'}
              onConfirm={() => handleDelete(record.id)}
              okText={language === 'ar' ? 'نعم' : 'Yes'}
              cancelText={language === 'ar' ? 'لا' : 'No'}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                {language === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  if (checkingRole) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message={language === 'ar' ? 'جاري التحقق من الصلاحيات...' : 'Checking permissions...'}
          type="info"
        />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ApartmentOutlined />
              {language === 'ar' ? 'إدارة الفروع' : 'Branch Management'}
            </h2>
            <p style={{ margin: '8px 0 0', color: '#666' }}>
              {language === 'ar' 
                ? 'إدارة فروع الشركة - إضافة وتعديل وحذف الفروع' 
                : 'Manage company branches - Add, edit, and delete branches'}
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {language === 'ar' ? 'إضافة فرع' : 'Add Branch'}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={branches}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: language === 'ar' ? 'لا توجد فروع' : 'No branches found'
          }}
        />
      </Card>

      <Modal
        title={editingBranch 
          ? (language === 'ar' ? 'تعديل الفرع' : 'Edit Branch')
          : (language === 'ar' ? 'إضافة فرع جديد' : 'Add New Branch')
        }
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText={language === 'ar' ? 'حفظ' : 'Save'}
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label={language === 'ar' ? 'اسم الفرع' : 'Branch Name'}
            rules={[
              { required: true, message: language === 'ar' ? 'اسم الفرع مطلوب' : 'Branch name is required' }
            ]}
          >
            <Input placeholder={t.settings.branchNamePlaceholder} />
          </Form.Item>

          <Form.Item
            name="currency"
            label={language === 'ar' ? 'العملة' : 'Currency'}
            rules={[
              { required: true, message: language === 'ar' ? 'العملة مطلوبة' : 'Currency is required' }
            ]}
          >
            <Select placeholder={t.settings.selectCurrencyPlaceholder}>
              <Option value="AED">AED</Option>
              <Option value="IQD">IQD</Option>
              <Option value="SAR">SAR</Option>
              <Option value="USD">USD</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="is_main"
            label={language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch'}
            valuePropName="checked"
          >
            <Switch
              checkedChildren={language === 'ar' ? 'نعم' : 'Yes'}
              unCheckedChildren={language === 'ar' ? 'لا' : 'No'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default BranchesSettings
