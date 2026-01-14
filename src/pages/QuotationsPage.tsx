'use client'

import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'
import quotationsService from '../services/quotationsService'
import customersService from '../services/customersService'
import contractsService from '../services/contractsService'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import { translateWorkType, translateWorkScopes } from '../utils/workTypesTranslation'
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
  DatePicker,
  Row,
  Col,
  Statistic,
  Popconfirm,
  message,
  Descriptions,
  Divider,
  InputNumber,
  AutoComplete,
  Checkbox,
  Collapse
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  FileProtectOutlined,
  MinusCircleOutlined
} from '@ant-design/icons'

const { Option } = Select

const QuotationsPage = () => {
  const { currentTenantId } = useTenant()
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState(null)
  const [form] = Form.useForm()
  const [convertForm] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [customerSearchOptions, setCustomerSearchOptions] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [workScopeCategories, setWorkScopeCategories] = useState([]) // Array of category selections
  const [customWorkScopes, setCustomWorkScopes] = useState([]) // Array of custom work scope strings
  const [categorySelectValue, setCategorySelectValue] = useState(null) // For resetting the category select

  useEffect(() => {
    loadQuotations()
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const customersList = await customersService.getCustomers()
      setCustomers(customersList || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    }
  }

  const loadQuotations = async () => {
    setLoading(true)
    try {
      const data = await quotationsService.getQuotations()
      setQuotations(data.map(q => ({ ...q, key: q.id || q.updatedAt || `quote-${Date.now()}` })))
    } catch (error) {
      console.error('Error loading quotations:', error)
      message.error(t.quotations.failedToLoad)
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalQuotations: quotations.length,
    draftQuotations: quotations.filter(q => q.status === 'draft').length,
    sentQuotations: quotations.filter(q => q.status === 'sent').length,
    acceptedQuotations: quotations.filter(q => q.status === 'approved' || q.status === 'accepted' || q.status === 'converted').length,
    totalAmount: quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0)
  }

  // Comprehensive work scope categories for all work types
  const allWorkScopeCategories = {
    civil_works: {
      label: 'مقاولات عامة',
      items: [
        { label: 'هيكل خرساني (Reinforced Concrete)', value: 'هيكل خرساني' },
        { label: 'هيكل معدني (Steel Structure)', value: 'هيكل معدني' },
        { label: 'أساسات (Foundations)', value: 'أساسات' },
        { label: 'أعمال حفر (Excavation)', value: 'أعمال حفر' },
        { label: 'ردم ودفان (Backfilling)', value: 'ردم ودفان' },
        { label: 'أعمال كونكريت (Concrete Works)', value: 'أعمال كونكريت' },
        { label: 'تسليح (Reinforcement)', value: 'تسليح' },
        { label: 'قوالب (Formwork)', value: 'قوالب' }
      ]
    },
    finishing: {
      label: 'إنهاءات',
      items: [
        { label: 'تشطيب داخلي (Interior Finishing)', value: 'تشطيب داخلي' },
        { label: 'تشطيب خارجي (Exterior Finishing)', value: 'تشطيب خارجي' },
        { label: 'أرضيات (Flooring)', value: 'أرضيات' },
        { label: 'دهان (Painting)', value: 'دهان' },
        { label: 'بلاط وسيراميك (Tiles)', value: 'بلاط وسيراميك' },
        { label: 'جبس بورد (Gypsum Board)', value: 'جبس بورد' },
        { label: 'ديكور (Decorations)', value: 'ديكور' },
        { label: 'أبواب ونوافذ (Doors & Windows)', value: 'أبواب ونوافذ' }
      ]
    },
    mep: {
      label: 'MEP',
      items: [
        { label: 'HVAC (التكييف والتهوية)', value: 'HVAC' },
        { label: 'سباكة (Plumbing)', value: 'سباكة' },
        { label: 'كهرباء (Electrical)', value: 'كهرباء' },
        { label: 'مكافحة حريق (Firefighting)', value: 'مكافحة حريق' },
        { label: 'صرف صحي (Sanitary)', value: 'صرف صحي' },
        { label: 'غاز طبيعي (Natural Gas)', value: 'غاز طبيعي' },
        { label: 'تهوية طبيعية (Natural Ventilation)', value: 'تهوية طبيعية' }
      ]
    },
    low_current: {
      label: 'تيار منخفض',
      items: [
        { label: 'كاميرات مراقبة (CCTV)', value: 'كاميرات مراقبة' },
        { label: 'شبكات (Networks)', value: 'شبكات' },
        { label: 'BMS (Building Management System)', value: 'BMS' },
        { label: 'إنذار حريق (Fire Alarm)', value: 'إنذار حريق' },
        { label: 'كارت دخول (Access Control)', value: 'كارت دخول' },
        { label: 'صوتيات (Audio Systems)', value: 'صوتيات' },
        { label: 'هاتف داخلي (Intercom)', value: 'هاتف داخلي' }
      ]
    },
    infrastructure: {
      label: 'بنية تحتية',
      items: [
        { label: 'طرق (Roads)', value: 'طرق' },
        { label: 'مياه (Water Supply)', value: 'مياه' },
        { label: 'مجاري (Sewerage)', value: 'مجاري' },
        { label: 'إنارة عامة (Public Lighting)', value: 'إنارة عامة' },
        { label: 'أرصفة (Pavements)', value: 'أرصفة' },
        { label: 'جسور (Bridges)', value: 'جسور' },
        { label: 'استراحات (Rest Areas)', value: 'استراحات' }
      ]
    },
    special: {
      label: 'خاص',
      items: [
        { label: 'مصاعد (Elevators)', value: 'مصاعد' },
        { label: 'طاقة شمسية (Solar Energy)', value: 'طاقة شمسية' },
        { label: 'عزل (Insulation)', value: 'عزل' },
        { label: 'عزل مائي (Waterproofing)', value: 'عزل مائي' },
        { label: 'عزل حراري (Thermal Insulation)', value: 'عزل حراري' },
        { label: 'سقف متحرك (Retractable Roof)', value: 'سقف متحرك' },
        { label: 'واجهات (Facades)', value: 'واجهات' }
      ]
    }
  }

  // Available categories to choose from
  const availableCategories = Object.keys(allWorkScopeCategories).map(key => ({
    key,
    label: allWorkScopeCategories[key].label,
    items: allWorkScopeCategories[key].items
  }))

  const statusLabels = {
    draft: { text: t.quotations.draft, color: 'default' },
    sent: { text: t.quotations.sent, color: 'blue' },
    approved: { text: t.quotations.accepted, color: 'green' },
    accepted: { text: t.quotations.accepted, color: 'green' }, // Legacy support
    rejected: { text: t.quotations.rejected, color: 'red' },
    converted: { text: t.quotations.converted, color: 'purple' }
  }

  const columns = useMemo(() => [
    {
      title: t.quotations.quoteNumber,
      dataIndex: 'quoteNumber',
      key: 'quoteNumber',
      render: (quoteNumber) => <span style={{ fontWeight: 500 }}>{quoteNumber}</span>
    },
    {
      title: t.quotations.documentType || 'Document Type',
      dataIndex: 'documentType',
      key: 'documentType',
      render: (type) => {
        const labels = {
          original: t.contracts.originalContract,
          addendum: t.contracts.amendment
        }
        return <Tag color={type === 'original' ? 'blue' : 'orange'}>{labels[type] || type}</Tag>
      }
    },
    {
      title: t.quotations.customerName,
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.customerPhone}</div>
        </div>
      )
    },
    {
      title: t.quotations.projectName,
      dataIndex: 'projectName',
      key: 'projectName',
      render: (projectName) => (
        <span>{projectName || <span style={{ color: '#999' }}>{t.common.notSpecified}</span>}</span>
      )
    },
    {
      title: t.quotations.workScope || 'Work Scope',
      dataIndex: 'workScopes',
      key: 'workScopes',
      render: (workScopes) => {
        if (!workScopes || !Array.isArray(workScopes) || workScopes.length === 0) {
          return <span style={{ color: '#999' }}>{t.common.notSpecified}</span>
        }
        // Display first 3 items, then "and more..." if there are more
        const translatedScopes = translateWorkScopes(workScopes.slice(0, 3), language)
        const displayScopes = translatedScopes.join(', ')
        const moreCount = workScopes.length - 3
        return (
          <span>
            {displayScopes}
            {moreCount > 0 && <span style={{ color: '#1890ff' }}> {t.common.and || 'and'} {moreCount} {t.common.more || 'more'}...</span>}
          </span>
        )
      }
    },
    {
      title: t.quotations.totalAmount,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {amount?.toLocaleString() || 0} {t.common.sar}
        </span>
      )
    },
    {
      title: t.quotations.status,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusLabels[status] || { text: status, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: t.common.actions,
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedQuotation(record)
              setViewModalVisible(true)
            }}
          >
            {t.common.view}
          </Button>
          {record.status !== 'accepted' && record.status !== 'converted' && (
            <>
              <Popconfirm
                title={t.quotations.approveQuotation}
                description={t.quotations.approveQuotationDescription}
                onConfirm={async () => {
                  try {
                    // Use 'converted' status - this will trigger Project and Contract creation in one transaction
                    const result = await quotationsService.updateQuotation(record.id, {
                      status: 'converted'
                    })
                    if (result.success) {
                      if (result.projectCreated && result.contractCreated) {
                        message.success(t.quotations.quotationApprovedAndConverted)
                      } else if (result.projectCreated) {
                        message.success(t.quotations.quotationApprovedAndProjectCreated)
                        if (result.contractError) {
                          message.warning(`${t.quotations.projectCreatedButContractFailed}: ${result.contractError}`)
                        }
                      } else {
                        message.success(t.quotations.quotationApproved)
                      }
                      loadQuotations()
                    } else {
                      message.error(result.error || t.quotations.failedToApprove)
                    }
                  } catch (error) {
                    console.error('Error approving quotation:', error)
                    message.error(t.quotations.errorApprovingQuotation)
                  }
                }}
                okText={t.quotations.yes}
                cancelText={t.quotations.no}
              >
                <Button
                  type="link"
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                >
                  {t.quotations.approve}
                </Button>
              </Popconfirm>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={async () => {
                setSelectedQuotation(record)
                // Try to find the customer by ID or name to set the display value
                let customer = null
                if (record.customerId) {
                  try {
                    customer = await customersService.getCustomer(record.customerId)
                  } catch (error) {
                    console.error('Error loading customer:', error)
                  }
                }
                if (!customer && record.customerName) {
                  // Try to find by name from the loaded customers list
                  customer = customers.find(c => c.name === record.customerName)
                }
                
                setSelectedCustomer(customer)
                // Parse work_scopes if it exists
                const workScopes = record.workScopes || []
                // Group work scopes by category
                const categoryMap = {}
                const customScopes = []
                
                workScopes.forEach(scope => {
                  let found = false
                  for (const [catKey, catData] of Object.entries(allWorkScopeCategories)) {
                    if (catData.items.some(item => item.value === scope)) {
                      if (!categoryMap[catKey]) {
                        categoryMap[catKey] = []
                      }
                      categoryMap[catKey].push(scope)
                      found = true
                      break
                    }
                  }
                  if (!found) {
                    customScopes.push(scope)
                  }
                })
                
                // Convert to array format
                const categoriesArray = Object.keys(categoryMap).map(catKey => ({
                  category: catKey,
                  selectedItems: categoryMap[catKey]
                }))
                
                setWorkScopeCategories(categoriesArray)
                setCustomWorkScopes(customScopes)
                
                form.setFieldsValue({
                  customerSearch: customer?.name || record.customerName || '',
                  customerName: record.customerName,
                  customerPhone: record.customerPhone,
                  customerEmail: record.customerEmail,
                  projectName: record.projectName || '',
                  documentType: record.documentType || 'original',
                  totalAmount: record.totalAmount,
                  status: record.status,
                  validUntil: record.validUntil ? moment(record.validUntil) : null,
                  notes: record.notes
                })
                setIsModalVisible(true)
              }}
            >
              {t.quotations.editQuotation || t.common.edit}
            </Button>
            </>
          )}
          <Popconfirm
            title={t.quotations.deleteQuotationConfirm}
            description={t.quotations.deleteQuotationDescription}
            onConfirm={async () => {
              try {
                const result = await quotationsService.deleteQuotation(record.id)
                if (result.success) {
                  message.success(t.quotations.quotationDeleted)
                  loadQuotations()
                } else {
                  message.error(result.error || t.quotations.failedToDelete)
                }
              } catch (error) {
                console.error('Error deleting quotation:', error)
                message.error(t.quotations.failedToDelete)
              }
            }}
            okText={t.quotations.yes}
            cancelText={t.quotations.no}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t.quotations.delete}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [t, language, statusLabels])

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch =
      quotation.quoteNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
      quotation.customerName?.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCustomerSearch = async (searchText) => {
    if (!searchText || searchText.trim() === '') {
      setCustomerSearchOptions([])
      return
    }

    try {
      // Filter to only show 'client' or 'investor' types
      const searchResults = await customersService.searchCustomers(searchText, 'client_or_investor')
      const options = searchResults.map(customer => ({
        value: customer.name, // Display the name as value, not UUID
        label: `${customer.name} - ${customer.phone}${customer.email ? ` (${customer.email})` : ''}`,
        customer: customer // Store full customer object for selection
      }))
      setCustomerSearchOptions(options)
    } catch (error) {
      console.error('Error searching customers:', error)
      setCustomerSearchOptions([])
    }
  }

  const handleCustomerSelect = (value, option) => {
    const customer = option?.customer || customers.find(c => c.name === value || c.id === value)
    if (customer) {
      setSelectedCustomer(customer)
      // Set form fields - the AutoComplete will display the customer name automatically
      form.setFieldsValue({
        customerSearch: customer.name, // This ensures the AutoComplete shows the name
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || ''
      })
    }
  }

  const handleCustomerChange = async (value) => {
    // When user types, search for existing customer
    if (value && value.trim() !== '') {
      // Try to find exact match first
      const exactMatch = customers.find(c => c.name.toLowerCase() === value.toLowerCase().trim())
      if (exactMatch) {
        setSelectedCustomer(exactMatch)
        form.setFieldsValue({
          customerName: exactMatch.name,
          customerPhone: exactMatch.phone,
          customerEmail: exactMatch.email || ''
        })
      } else {
        // No exact match - user is typing a new customer name
        // Clear selected customer so we can auto-create later
        setSelectedCustomer(null)
        form.setFieldsValue({
          customerName: value,
          customerPhone: '',
          customerEmail: ''
        })
      }
    } else {
      // Empty value - clear everything
      if (!selectedCustomer || selectedCustomer.name !== value) {
        setSelectedCustomer(null)
        form.setFieldsValue({
          customerName: '',
          customerPhone: '',
          customerEmail: ''
        })
      }
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      // Collect all work scopes from categories and custom entries
      const allWorkScopes = []
      workScopeCategories.forEach(cat => {
        if (cat.selectedItems && cat.selectedItems.length > 0) {
          allWorkScopes.push(...cat.selectedItems)
        }
      })
      // Add custom work scopes
      if (customWorkScopes.length > 0) {
        customWorkScopes.forEach(custom => {
          if (custom && custom.trim() !== '') {
            allWorkScopes.push(custom.trim())
          }
        })
      }

      // Ensure we have a valid customer name (not UUID)
      const customerNameValue = values.customerName?.trim()
      if (!customerNameValue) {
        message.error('يرجى إدخال اسم العميل')
        return
      }
      
      // If it looks like a UUID, reject it
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidPattern.test(customerNameValue)) {
        message.error('يرجى إدخال اسم عميل صحيح')
        return
      }

      // Auto-create customer if not exists
      let customerIdToSave = selectedCustomer?.id || null
      if (!customerIdToSave) {
        // Check if customer exists by name
        const existingCustomer = customers.find(c => c.name.toLowerCase() === customerNameValue.toLowerCase())
        if (existingCustomer) {
          customerIdToSave = existingCustomer.id
        } else {
          // Auto-create new customer
          try {
            const newCustomer = await customersService.addCustomer({
              name: customerNameValue,
              phone: values.customerPhone || '',
              email: values.customerEmail || '',
              status: 'active'
            })
            if (newCustomer.success) {
              customerIdToSave = newCustomer.customer.id
              setSelectedCustomer(newCustomer.customer)
              // Reload customers list
              await loadCustomers()
              message.success('تم إنشاء العميل الجديد تلقائياً')
            } else {
              message.warning(`تم حفظ العرض ولكن فشل إنشاء العميل: ${newCustomer.error}`)
            }
          } catch (customerError) {
            console.error('Error auto-creating customer:', customerError)
            message.warning('تم حفظ العرض ولكن فشل إنشاء العميل تلقائياً')
          }
        }
      }

      // For updates, preserve the original customerId if customer hasn't changed
      if (selectedQuotation && !customerIdToSave) {
        customerIdToSave = selectedQuotation.customerId || null
      }

      const quotationData = {
        tenantId: currentTenantId,
        customerId: customerIdToSave,
        customerName: customerNameValue,
        customerPhone: values.customerPhone || '',
        customerEmail: values.customerEmail || '',
        projectName: values.projectName || '',
        documentType: values.documentType || 'original',
        workScopes: allWorkScopes,
        totalAmount: values.totalAmount || 0,
        status: values.status || 'draft',
        validUntil: values.validUntil ? moment(values.validUntil).format('YYYY-MM-DD') : null,
        notes: values.notes || ''
      }

      // Ensure no field contains the string "user" before saving
      const sanitizedData = { ...quotationData }
      Object.keys(sanitizedData).forEach(key => {
        if (sanitizedData[key] === 'user') {
          console.warn(`Removing invalid value "user" from field: ${key}`)
          sanitizedData[key] = null
        }
      })

      let result
      if (selectedQuotation) {
        result = await quotationsService.updateQuotation(selectedQuotation.id, sanitizedData)
      } else {
        result = await quotationsService.createQuotation(sanitizedData)
      }

      if (result.success) {
        if (result.projectCreated) {
          message.success(t.quotations.quotationApprovedAndProjectCreated)
        } else {
          message.success(selectedQuotation ? t.quotations.quotationUpdated : t.quotations.quotationCreated)
        }
        setIsModalVisible(false)
        setSelectedQuotation(null)
        setSelectedCustomer(null)
        setWorkScopeCategories([])
        setCustomWorkScopes([])
        setCategorySelectValue(null)
        form.resetFields()
        loadQuotations()
      } else {
        message.error(result.error || t.quotations.failedToSave)
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error(t.quotations.fillRequiredFields)
      } else {
        message.error(t.quotations.failedToSave)
      }
    }
  }

  const createQuotation = () => {
    setSelectedQuotation(null)
    setSelectedCustomer(null)
    setCustomerSearchOptions([])
    setWorkScopeCategories([])
    setCustomWorkScopes([])
    setCategorySelectValue(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  // Add a new work scope category
  const addWorkScopeCategory = (categoryKey = null) => {
    // Get categories that are not already added
    const availableCatKeys = availableCategories.map(c => c.key)
    const alreadyAddedKeys = workScopeCategories.map(c => c.category)
    const remainingKeys = availableCatKeys.filter(key => !alreadyAddedKeys.includes(key))
    
    if (remainingKeys.length === 0) {
      message.info(t.quotations.allCategoriesAdded || 'All available categories have been added')
      return
    }
    
    // Use provided category or first available
    const categoryToAdd = categoryKey && remainingKeys.includes(categoryKey) 
      ? categoryKey 
      : remainingKeys[0]
    
    setWorkScopeCategories([...workScopeCategories, {
      category: categoryToAdd,
      selectedItems: []
    }])
  }

  // Remove a work scope category
  const removeWorkScopeCategory = (index) => {
    const newCategories = [...workScopeCategories]
    newCategories.splice(index, 1)
    setWorkScopeCategories(newCategories)
  }

  // Update selected items for a specific category
  const updateCategorySelection = (index, selectedItems) => {
    const newCategories = [...workScopeCategories]
    newCategories[index].selectedItems = selectedItems
    setWorkScopeCategories(newCategories)
  }

  // Select all items in a category
  const selectAllInCategory = (index) => {
    const cat = workScopeCategories[index]
    const catData = allWorkScopeCategories[cat.category]
    updateCategorySelection(index, catData.items.map(item => item.value))
  }

  // Deselect all items in a category
  const deselectAllInCategory = (index) => {
    updateCategorySelection(index, [])
  }

  // Add custom work scope
  const addCustomWorkScope = () => {
    setCustomWorkScopes([...customWorkScopes, ''])
  }

  // Update custom work scope
  const updateCustomWorkScope = (index, value) => {
    const newCustom = [...customWorkScopes]
    newCustom[index] = value
    setCustomWorkScopes(newCustom)
  }

  // Remove custom work scope
  const removeCustomWorkScope = (index) => {
    const newCustom = [...customWorkScopes]
    newCustom.splice(index, 1)
    setCustomWorkScopes(newCustom)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>
            {t.quotations.title}
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>{t.quotations.subtitle}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={createQuotation}>
          {t.quotations.newQuotation}
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.quotations.totalQuotations}
              value={stats.totalQuotations}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.quotations.acceptedQuotations}
              value={stats.acceptedQuotations}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.quotations.totalAmountLabel}
              value={stats.totalAmount}
              precision={0}
              prefix={<DollarOutlined />}
              suffix={t.common.sar}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.quotations.draftQuotations}
              value={stats.draftQuotations}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder={t.quotations.searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder={t.quotations.filterByStatus}
          >
            <Option value="all">{t.quotations.all}</Option>
            <Option value="draft">{t.quotations.draft}</Option>
            <Option value="sent">{t.quotations.sent}</Option>
            <Option value="approved">{t.quotations.accepted}</Option>
            <Option value="rejected">{t.quotations.rejected}</Option>
            <Option value="converted">{t.quotations.converted}</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredQuotations}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey={(record) => record.id || record.updatedAt || `quote-${Date.now()}`}
        />
      </Card>

      <Modal
        title={selectedQuotation ? t.quotations.editQuotationTitle : t.quotations.createQuotationTitle}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedQuotation(null)
          setSelectedCustomer(null)
          setCustomerSearchOptions([])
          setWorkScopeCategories([])
          setCustomWorkScopes([])
          setCategorySelectValue(null)
          form.resetFields()
        }}
        okText={t.quotations.save}
        cancelText={t.quotations.cancel}
        width={900}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="customerSearch"
            label={t.quotations.customerNameLabel}
            rules={[{ required: true, message: t.quotations.customerNameRequired }]}
          >
            <AutoComplete
              options={customerSearchOptions}
              onSearch={handleCustomerSearch}
              onSelect={handleCustomerSelect}
              onChange={handleCustomerChange}
              placeholder={t.quotations.customerSearchPlaceholder}
              style={{ width: '100%' }}
              filterOption={false}
              allowClear
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label={t.quotations.customerNameAutoCreate}
                rules={[{ required: true, message: t.quotations.customerNameRequired }]}
              >
                <Input placeholder={t.quotations.customerNameLabel} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerPhone"
                label={t.quotations.customerPhoneLabel}
                rules={[{ required: true, message: t.quotations.customerPhoneRequired }]}
              >
                <Input placeholder={t.quotations.customerPhoneLabel} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="customerEmail" label={t.quotations.customerEmailLabel + ' ' + t.common.optional}>
            <Input placeholder={t.quotations.customerEmailLabel} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="projectName"
                label={t.quotations.projectNameLabel}
                rules={[{ required: true, message: t.quotations.projectNameRequired }]}
              >
                <Input placeholder={t.quotations.projectNameLabel} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="documentType"
                label={t.quotations.documentType}
                rules={[{ required: true, message: t.quotations.documentTypeRequired }]}
                initialValue="original"
              >
                <Select placeholder={t.quotations.selectDocumentType}>
                  <Option value="original">{t.contracts.originalContract}</Option>
                  <Option value="addendum">{t.contracts.amendment}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
            {t.quotations.workScopeDivider}
          </Divider>

          {/* Multi-Category Work Scope Selector */}
          {workScopeCategories.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {workScopeCategories.map((catSelection, index) => {
                const catData = allWorkScopeCategories[catSelection.category]
                return (
                  <Card
                    key={index}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{translateWorkType(catData.label, language)}</span>
                        <Space>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => selectAllInCategory(index)}
                            disabled={catSelection.selectedItems?.length === catData.items.length}
                          >
                            {t.quotations.selectAll}
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => deselectAllInCategory(index)}
                            disabled={!catSelection.selectedItems || catSelection.selectedItems.length === 0}
                          >
                            {t.quotations.deselectAll}
                          </Button>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<MinusCircleOutlined />}
                            onClick={() => removeWorkScopeCategory(index)}
                          />
                        </Space>
                      </div>
                    }
                  >
                    <Checkbox.Group
                      options={catData.items.map(item => ({
                        ...item,
                        label: language === 'en' ? item.label.split('(')[1]?.replace(')', '').trim() || item.label : item.label
                      }))}
                      value={catSelection.selectedItems || []}
                      onChange={(checkedValues) => updateCategorySelection(index, checkedValues)}
                      style={{ width: '100%' }}
                    />
                  </Card>
                )
              })}
            </div>
          )}

          {/* Add Category Button */}
          {workScopeCategories.length < availableCategories.length && (
            <Select
              placeholder={t.quotations.addNewWorkCategory}
              style={{ width: '100%', marginBottom: 16 }}
              value={categorySelectValue}
              onChange={(value) => {
                if (value) {
                  addWorkScopeCategory(value)
                  // Reset select value after adding
                  setCategorySelectValue(null)
                }
              }}
              popupRender={(menu) => (
                <div>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ padding: '8px', color: '#666', fontSize: '12px', textAlign: 'center' }}>
                    {availableCategories.length - workScopeCategories.length} {t.quotations.categoriesAvailable}
                  </div>
                </div>
              )}
            >
              {availableCategories
                .filter(cat => !workScopeCategories.some(added => added.category === cat.key))
                .map(cat => (
                  <Option key={cat.key} value={cat.key}>
                    {translateWorkType(cat.label, language)}
                  </Option>
                ))}
            </Select>
          )}

          {/* Custom Work Scopes */}
          <Divider orientation="left" style={{ marginTop: 24, marginBottom: 16 }}>
            {t.quotations.customWorkDivider}
          </Divider>
          {customWorkScopes.map((custom, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input
                placeholder={t.quotations.enterCustomWorkType}
                value={custom}
                onChange={(e) => updateCustomWorkScope(index, e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => removeCustomWorkScope(index)}
                title={t.quotations.remove}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addCustomWorkScope}
            style={{ width: '100%', marginBottom: 16 }}
          >
            {t.quotations.addCustomWork}
          </Button>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="totalAmount"
                label={t.quotations.totalAmountLabelForm}
                rules={[{ required: true, message: t.quotations.totalAmountRequired }]}
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
              <Form.Item name="status" label={t.quotations.statusLabel} initialValue="draft">
                <Select>
                  <Option value="draft">{t.quotations.draft}</Option>
                  <Option value="sent">{t.quotations.sent}</Option>
                  <Option value="approved">{t.quotations.accepted}</Option>
                  <Option value="rejected">{t.quotations.rejected}</Option>
                  <Option value="converted">{t.quotations.converted}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="validUntil" label={t.quotations.validUntilLabel}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="notes" label={t.quotations.notesLabel}>
            <Input.TextArea rows={3} placeholder={t.quotations.notesPlaceholder} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t.quotations.quotationDetails} ${selectedQuotation?.quoteNumber}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button 
            key="convert" 
            type="primary"
            icon={<FileProtectOutlined />}
            onClick={() => {
              if (selectedQuotation?.status === 'approved' || selectedQuotation?.status === 'accepted') {
                convertForm.setFieldsValue({ contractType: 'original' })
                setConvertModalVisible(true)
              } else {
                message.warning(t.quotations.cannotConvertNonApproved)
              }
            }}
            disabled={selectedQuotation?.status !== 'approved' && selectedQuotation?.status !== 'accepted'}
          >
            {t.quotations.convertToContract}
          </Button>,
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            {t.quotations.close}
          </Button>
        ]}
        width={700}
      >
        {selectedQuotation && (
          <div style={{ marginTop: 24 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t.quotations.quoteNumber}>
                {selectedQuotation.quoteNumber}
              </Descriptions.Item>
              <Descriptions.Item label={t.common.date}>
                {selectedQuotation.createdAt ? moment(selectedQuotation.createdAt).format('DD-MMM-YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t.quotations.documentType}>
                <Tag color={selectedQuotation.documentType === 'original' ? 'blue' : 'orange'}>
                  {selectedQuotation.documentType === 'original' ? t.contracts.originalContract : t.contracts.amendment}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t.quotations.customerName}>
                {selectedQuotation.customerName}
              </Descriptions.Item>
              <Descriptions.Item label={t.quotations.customerPhoneLabel}>
                {selectedQuotation.customerPhone}
              </Descriptions.Item>
              <Descriptions.Item label={t.quotations.projectName}>
                {selectedQuotation.projectName || t.common.notSpecified}
              </Descriptions.Item>
              {selectedQuotation.workScopes && selectedQuotation.workScopes.length > 0 && (
                <Descriptions.Item label={t.quotations.workScope} span={2}>
                  {selectedQuotation.workScopes.map((scope, idx) => (
                    <Tag key={idx} style={{ marginBottom: 4 }}>{translateWorkType(scope, language)}</Tag>
                  ))}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t.quotations.totalAmount}>
                {selectedQuotation.totalAmount.toLocaleString()} {t.common.sar}
              </Descriptions.Item>
              <Descriptions.Item label={t.quotations.status}>
                <Tag color={statusLabels[selectedQuotation.status]?.color}>
                  {statusLabels[selectedQuotation.status]?.text}
                </Tag>
              </Descriptions.Item>
              {selectedQuotation.validUntil && (
                <Descriptions.Item label={t.quotations.validUntil}>
                  {moment(selectedQuotation.validUntil, 'YYYY-MM-DD', true).isValid()
                    ? moment(selectedQuotation.validUntil, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                    : '-'}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedQuotation.notes && (
              <>
                <Divider />
                <p><strong>{t.quotations.notesLabel}:</strong> {selectedQuotation.notes}</p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Convert to Contract Modal */}
      <Modal
        title={`${t.quotations.convertToContractTitle} ${selectedQuotation?.quoteNumber}`}
        open={convertModalVisible}
        onOk={async () => {
          try {
            const values = await convertForm.validateFields()
            const result = await contractsService.convertQuotationToContract(
              selectedQuotation.id,
              values.contractType
            )
            if (result.success) {
              message.success(t.contracts.contractCreated)
              setConvertModalVisible(false)
              setViewModalVisible(false)
              setSelectedQuotation(null)
              convertForm.resetFields()
              loadQuotations()
            } else {
              message.error(result.error || t.quotations.failedToSave)
            }
          } catch (error) {
            console.error('Error converting quotation:', error)
            if (error.errorFields) {
              message.error(t.quotations.selectContractType)
            } else {
              message.error(t.quotations.failedToSave)
            }
          }
        }}
        onCancel={() => {
          setConvertModalVisible(false)
          convertForm.resetFields()
        }}
        okText={t.quotations.convert}
        cancelText={t.quotations.cancel}
        width={500}
      >
        <Form form={convertForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="contractType"
            label={t.quotations.contractTypeLabel}
            rules={[{ required: true, message: t.quotations.selectContractType }]}
            initialValue="original"
          >
            <Select>
              <Option value="original">{t.contracts.originalContract}</Option>
              <Option value="amendment">{t.contracts.amendment}</Option>
            </Select>
          </Form.Item>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{t.contracts.contractDetails}:</p>
            <p style={{ margin: '4px 0 0 0' }}>{t.quotations.customerName}: {selectedQuotation?.customerName}</p>
            {selectedQuotation?.workScopes && selectedQuotation.workScopes.length > 0 && (
              <p style={{ margin: '4px 0 0 0' }}>{t.quotations.workScope}: {translateWorkScopes(selectedQuotation.workScopes.slice(0, 3), language).join(', ')}{selectedQuotation.workScopes.length > 3 ? ` ${t.common.and || 'and'} ${selectedQuotation.workScopes.length - 3} ${t.common.more || 'more'}...` : ''}</p>
            )}
            <p style={{ margin: '4px 0 0 0' }}>{t.quotations.totalAmount}: {selectedQuotation?.totalAmount?.toLocaleString()} {t.common.sar}</p>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default QuotationsPage
