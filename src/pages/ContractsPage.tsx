'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import contractsService from '../services/contractsService'
import customersService from '../services/customersService'
import quotationsService from '../services/quotationsService'
import paymentsService from '../services/paymentsService'
import projectsService from '../services/projectsService'
import treasuryService from '../services/treasuryService'
import { useTenant } from '../contexts/TenantContext'
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
  Tabs,
  Switch,
  Alert
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileProtectOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  PlusCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons'

const { Option } = Select

const ContractsPage = () => {
  const { industryType } = useTenant()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [selectedContractPayments, setSelectedContractPayments] = useState([])
  const [contractItems, setContractItems] = useState([])
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [customerSearchOptions, setCustomerSearchOptions] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [quotations, setQuotations] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedPaymentProject, setSelectedPaymentProject] = useState(null)
  const [availablePaymentWorkScopes, setAvailablePaymentWorkScopes] = useState([])
  const [isGeneralExpense, setIsGeneralExpense] = useState(false)
  const [treasuryAccounts, setTreasuryAccounts] = useState([])
  const [datesEditModalVisible, setDatesEditModalVisible] = useState(false)
  const [datesEditForm] = Form.useForm()

  useEffect(() => {
    loadContracts()
    loadCustomers()
    loadQuotations()
    loadTreasuryAccounts()
    if (industryType === 'engineering') {
      loadProjects()
    }
  }, [industryType])

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
    try {
      const quotationsList = await quotationsService.getQuotations()
      // Show all quotations with 'Accepted' and 'Sent' status
      const availableQuotations = quotationsList.filter(
        q => q.status === 'accepted' || q.status === 'sent'
      )
      
      setQuotations(availableQuotations)
    } catch (error) {
      console.error('Error loading quotations:', error)
      setQuotations([])
    }
  }

  const loadProjects = async () => {
    try {
      const projectsList = await projectsService.getActiveProjects()
      setProjects(projectsList || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    }
  }

  const loadTreasuryAccounts = async () => {
    try {
      const accounts = await treasuryService.getAccounts()
      setTreasuryAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading treasury accounts:', error)
      setTreasuryAccounts([])
    }
  }

  const loadContracts = async () => {
    setLoading(true)
    try {
      const data = await contractsService.getContracts()
      setContracts(data.map(c => ({ ...c, key: c.id })))
    } catch (error) {
      console.error('Error loading contracts:', error)
      message.error('فشل في تحميل بيانات العقود')
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  const loadContractPayments = async (contractId) => {
    try {
      const payments = await paymentsService.getPaymentsByContract(contractId)
      
      // Fetch project names for payments that have project_id
      const paymentsWithProjects = await Promise.all(
        (payments || []).map(async (payment) => {
          let projectName = null
          if (payment.projectId) {
            const project = await projectsService.getProjectById(payment.projectId)
            projectName = project?.name || null
          }
          return { ...payment, projectName }
        })
      )
      
      setSelectedContractPayments(paymentsWithProjects)
    } catch (error) {
      console.error('Error loading payments:', error)
      setSelectedContractPayments([])
    }
  }

  const stats = {
    totalContracts: contracts.length,
    inProgress: contracts.filter(c => c.status === 'in_progress').length,
    onHold: contracts.filter(c => c.status === 'on_hold').length,
    completed: contracts.filter(c => c.status === 'fully_completed').length,
    totalAmount: contracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0)
  }

  // Function to get work type label - maps all work type values to their labels
  const getWorkTypeLabel = (workType) => {
    if (!workType) return workType
    const category = workTypeCategories.find(cat => cat.value === workType)
    if (category) return category.label
    
    // Fallback for legacy values
    const legacyLabels = {
      civil_works: 'مقاولات عامة',
      finishing: 'إنهاءات',
      mep: 'MEP',
      low_current: 'تيار منخفض',
      infrastructure: 'بنية تحتية',
      special: 'خاص'
    }
    return legacyLabels[workType] || workType
  }

  // Work type categories organized into OptGroups - 51 categories total
  const workTypeCategories = [
    // Civil Works (مقاولات عامة) - 10 categories
    { label: 'هيكل خرساني', value: 'civil_structural_concrete', group: 'civil' },
    { label: 'هيكل معدني', value: 'civil_structural_steel', group: 'civil' },
    { label: 'حفر وتسوية', value: 'civil_excavation', group: 'civil' },
    { label: 'ردم', value: 'civil_backfill', group: 'civil' },
    { label: 'أساسات', value: 'civil_foundations', group: 'civil' },
    { label: 'جدران استنادية', value: 'civil_retaining_walls', group: 'civil' },
    { label: 'خرسانة مسلحة', value: 'civil_reinforced_concrete', group: 'civil' },
    { label: 'عزل مائي', value: 'civil_waterproofing', group: 'civil' },
    { label: 'عزل حراري', value: 'civil_thermal_insulation', group: 'civil' },
    { label: 'أعمال حجر', value: 'civil_stone_works', group: 'civil' },
    
    // Finishing (إنهاءات) - 9 categories
    { label: 'دهانات وطلاء', value: 'finishing_paint', group: 'finishing' },
    { label: 'جبس بورد وأسقف', value: 'finishing_gypsum_ceiling', group: 'finishing' },
    { label: 'أرضيات رخام', value: 'finishing_marble_floor', group: 'finishing' },
    { label: 'أرضيات سيراميك', value: 'finishing_ceramic_floor', group: 'finishing' },
    { label: 'أرضيات باركيه', value: 'finishing_parquet_floor', group: 'finishing' },
    { label: 'ديكور داخلي', value: 'finishing_interior_decor', group: 'finishing' },
    { label: 'أعمال نجارة', value: 'finishing_carpentry', group: 'finishing' },
    { label: 'أعمال ألمنيوم', value: 'finishing_aluminum_works', group: 'finishing' },
    { label: 'زجاج ومقاطع', value: 'finishing_glass_glazing', group: 'finishing' },
    
    // MEP (Mechanical, Electrical, Plumbing) - 13 categories
    { label: 'كهرباء توزيع', value: 'mep_electrical_distribution', group: 'mep' },
    { label: 'إنارة', value: 'mep_lighting', group: 'mep' },
    { label: 'قوى كهربائية', value: 'mep_power_supply', group: 'mep' },
    { label: 'محولات', value: 'mep_transformers', group: 'mep' },
    { label: 'أعمال سباكة', value: 'mep_plumbing', group: 'mep' },
    { label: 'تمديدات مياه', value: 'mep_water_supply', group: 'mep' },
    { label: 'تمديدات صرف صحي', value: 'mep_sewage', group: 'mep' },
    { label: 'تمديدات صرف مياه الأمطار', value: 'mep_storm_drainage', group: 'mep' },
    { label: 'تكييف مركزي', value: 'mep_central_ac', group: 'mep' },
    { label: 'تكييف منفصل', value: 'mep_split_ac', group: 'mep' },
    { label: 'تهوية', value: 'mep_ventilation', group: 'mep' },
    { label: 'أعمال حريق', value: 'mep_fire_fighting', group: 'mep' },
    { label: 'كاشف دخان', value: 'mep_smoke_detection', group: 'mep' },
    
    // Low Current (تيار منخفض) - 7 categories
    { label: 'كاميرات مراقبة', value: 'low_current_cctv', group: 'low_current' },
    { label: 'شبكات بيانات', value: 'low_current_data_network', group: 'low_current' },
    { label: 'شبكات هاتف', value: 'low_current_telephone', group: 'low_current' },
    { label: 'BMS (نظام إدارة المباني)', value: 'low_current_bms', group: 'low_current' },
    { label: 'أنظمة صوت', value: 'low_current_audio_system', group: 'low_current' },
    { label: 'أنظمة إنذار', value: 'low_current_alarm_system', group: 'low_current' },
    { label: 'تحكم الوصول', value: 'low_current_access_control', group: 'low_current' },
    
    // Infrastructure (بنية تحتية) - 7 categories
    { label: 'طرق وإسفلت', value: 'infrastructure_roads_asphalt', group: 'infrastructure' },
    { label: 'أرصفة', value: 'infrastructure_pavements', group: 'infrastructure' },
    { label: 'شبكات مياه رئيسية', value: 'infrastructure_water_network', group: 'infrastructure' },
    { label: 'شبكات صرف صحي رئيسية', value: 'infrastructure_sewer_network', group: 'infrastructure' },
    { label: 'أعمال جسور', value: 'infrastructure_bridges', group: 'infrastructure' },
    { label: 'أنفاق', value: 'infrastructure_tunnels', group: 'infrastructure' },
    { label: 'إنارة طرق', value: 'infrastructure_street_lighting', group: 'infrastructure' },
    
    // Special (خاص) - 5 categories
    { label: 'مصاعد', value: 'special_elevators', group: 'special' },
    { label: 'سلالم متحركة', value: 'special_escalators', group: 'special' },
    { label: 'طاقة شمسية', value: 'special_solar_energy', group: 'special' },
    { label: 'عزل صوتي', value: 'special_acoustic_insulation', group: 'special' },
    { label: 'أعمال خاصة أخرى', value: 'special_other', group: 'special' }
  ]
  
  // Group work types by category for OptGroups
  const workTypeGroups = {
    civil: 'مقاولات عامة',
    finishing: 'إنهاءات',
    mep: 'MEP (كهرباء، سباكة، تكييف)',
    low_current: 'تيار منخفض',
    infrastructure: 'بنية تحتية',
    special: 'أعمال خاصة'
  }

  const contractTypeLabels = {
    original: 'عقد أصلي',
    amendment: 'ملحق/تعديل'
  }

  const statusLabels = {
    in_progress: { text: 'قيد العمل', color: 'blue', icon: <ClockCircleOutlined /> },
    on_hold: { text: 'متوقف', color: 'orange', icon: <PauseCircleOutlined /> },
    fully_completed: { text: 'تم الإنجاز الكامل', color: 'green', icon: <CheckCircleOutlined /> }
  }

  const columns = [
    {
      title: 'رقم العقد',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (contractNumber) => <span style={{ fontWeight: 500 }}>{contractNumber}</span>
    },
    {
      title: 'جهة الإسناد',
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
      title: 'اسم المشروع',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (projectName) => projectName || <span style={{ color: '#999' }}>غير محدد</span>
    },
    {
      title: 'تاريخ البدء',
      dataIndex: 'startDate',
      key: 'startDate',
      sorter: (a, b) => {
        // Fail-safe sorting: handle both camelCase and snake_case, handle null/undefined values
        const aDate = a.startDate || a.start_date
        const bDate = b.startDate || b.start_date
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return moment(aDate).valueOf() - moment(bDate).valueOf()
      },
      render: (startDate, record) => {
        // Standardized date rendering: Use English locale with DD-MMM-YYYY format
        const dateValue = startDate || record.start_date || record.startDate
        if (!dateValue) {
          return <span style={{ color: '#999' }}>-</span>
        }
        try {
          // Use strict parsing for ISO format, then format for display
          const parsed = moment(dateValue, 'YYYY-MM-DD', true)
          return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
        } catch (error) {
          console.error('Error formatting startDate:', error)
          return <span style={{ color: '#999' }}>-</span>
        }
      }
    },
    {
      title: 'تاريخ الانتهاء',
      dataIndex: 'endDate',
      key: 'endDate',
      sorter: (a, b) => {
        // Fail-safe sorting: handle both camelCase and snake_case, handle null/undefined values
        const aDate = a.endDate || a.end_date
        const bDate = b.endDate || b.end_date
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return moment(aDate).valueOf() - moment(bDate).valueOf()
      },
      render: (endDate, record) => {
        // Standardized date rendering: Use English locale with DD-MMM-YYYY format
        const dateValue = endDate || record.end_date || record.endDate
        if (!dateValue) {
          return <span style={{ color: '#999' }}>-</span>
        }
        try {
          // Use strict parsing for ISO format, then format for display
          const parsed = moment(dateValue, 'YYYY-MM-DD', true)
          return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
        } catch (error) {
          console.error('Error formatting endDate:', error)
          return <span style={{ color: '#999' }}>-</span>
        }
      }
    },
    {
      title: 'نوع العقد',
      dataIndex: 'contractType',
      key: 'contractType',
      render: (type) => contractTypeLabels[type] || type
    },
    {
      title: 'نوع العمل',
      dataIndex: 'workType',
      key: 'workType',
      render: (workType) => getWorkTypeLabel(workType)
    },
    {
      title: 'المبلغ الإجمالي',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {amount?.toLocaleString() || 0} ريال
        </span>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusLabels[status] || { text: status, color: 'default', icon: null }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={async () => {
              setSelectedContract(record)
              await loadContractPayments(record.id)
              setViewModalVisible(true)
            }}
          >
            عرض
          </Button>
          <Button
            type="link"
            icon={<CalendarOutlined />}
            onClick={() => {
              setSelectedContract(record)
              
              // CRITICAL FIX: Strict parsing to prevent 2072 year corruption
              // Get date value from either startDate or start_date
              const startDateValue = record.startDate || record.start_date
              const endDateValue = record.endDate || record.end_date
              
              // Convert to moment object if date exists, otherwise null
              // ALWAYS use strict parsing with explicit format to prevent corrupted years (2072 bug)
              let startDateMoment = null
              let endDateMoment = null
              
              if (startDateValue) {
                // Type-safe: Check if already a moment object
                if (moment.isMoment(startDateValue)) {
                  startDateMoment = startDateValue.isValid() ? startDateValue.clone() : null
                } else if (startDateValue instanceof Date) {
                  // Date object - convert to moment with strict format
                  const dateStr = moment(startDateValue).format('YYYY-MM-DD')
                  startDateMoment = moment(dateStr, 'YYYY-MM-DD', true).isValid() 
                    ? moment(dateStr, 'YYYY-MM-DD', true) 
                    : null
                } else if (typeof startDateValue === 'string') {
                  // String - ALWAYS parse with explicit format in strict mode (prevents 2072 bug)
                  const parsed = moment(startDateValue, 'YYYY-MM-DD', true)
                  startDateMoment = parsed.isValid() ? parsed : null
                } else {
                  // Fallback: convert to string first, then strict parse
                  const dateStr = String(startDateValue).split('T')[0]
                  const parsed = moment(dateStr, 'YYYY-MM-DD', true)
                  startDateMoment = parsed.isValid() ? parsed : null
                }
              }
              
              if (endDateValue) {
                // Type-safe: Check if already a moment object
                if (moment.isMoment(endDateValue)) {
                  endDateMoment = endDateValue.isValid() ? endDateValue.clone() : null
                } else if (endDateValue instanceof Date) {
                  // Date object - convert to moment with strict format
                  const dateStr = moment(endDateValue).format('YYYY-MM-DD')
                  endDateMoment = moment(dateStr, 'YYYY-MM-DD', true).isValid() 
                    ? moment(dateStr, 'YYYY-MM-DD', true) 
                    : null
                } else if (typeof endDateValue === 'string') {
                  // String - ALWAYS parse with explicit format in strict mode (prevents 2072 bug)
                  const parsed = moment(endDateValue, 'YYYY-MM-DD', true)
                  endDateMoment = parsed.isValid() ? parsed : null
                } else {
                  // Fallback: convert to string first, then strict parse
                  const dateStr = String(endDateValue).split('T')[0]
                  const parsed = moment(dateStr, 'YYYY-MM-DD', true)
                  endDateMoment = parsed.isValid() ? parsed : null
                }
              }
              
              // Pre-fill form with current dates as moment objects
              // Ant Design DatePicker REQUIRES moment objects, not strings or Date objects
              datesEditForm.setFieldsValue({
                startDate: startDateMoment,
                endDate: endDateMoment
              })
              
              setDatesEditModalVisible(true)
            }}
          >
            تعديل التواريخ
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={async () => {
              setSelectedContract(record)
              
              // Find customer if customerId exists
              let customer = null
              if (record.customerId) {
                customer = customers.find(c => c.id === record.customerId)
                // If not found, try to fetch it
                if (!customer) {
                  try {
                    customer = await customersService.getCustomer(record.customerId)
                    if (customer) {
                      setCustomers(prev => [...prev.filter(c => c.id !== customer.id), customer])
                    }
                  } catch (error) {
                    console.error('Error loading customer:', error)
                  }
                }
              }
              
              // Create a temporary customer object if we have customer name but no customer object
              if (!customer && record.customerName) {
                customer = {
                  id: record.customerId || null,
                  name: record.customerName,
                  phone: record.customerPhone || '',
                  email: record.customerEmail || ''
                }
              }
              
              setSelectedCustomer(customer)
              
              // Set form values - ensure customer name is displayed, not UUID
              form.setFieldsValue({
                customerSearch: record.customerName, // Display name, not UUID
                customerName: record.customerName,
                customerPhone: record.customerPhone,
                customerEmail: record.customerEmail,
                contractType: record.contractType,
                workType: record.workType,
                totalAmount: record.totalAmount,
                status: record.status,
                startDate: record.startDate ? moment(record.startDate, 'YYYY-MM-DD', true).isValid() 
                  ? moment(record.startDate, 'YYYY-MM-DD', true) : null : null,
                endDate: record.endDate ? moment(record.endDate, 'YYYY-MM-DD', true).isValid()
                  ? moment(record.endDate, 'YYYY-MM-DD', true) : null : null,
                projectId: record.projectId,
                projectName: record.projectName || '',
                quotationId: record.quotationId,
                notes: record.notes
              })
              setContractItems(record.items || [])
              setIsModalVisible(true)
            }}
          >
            تعديل
          </Button>
          <Popconfirm
            title="حذف العقد"
            description="هل أنت متأكد من حذف هذا العقد؟"
            onConfirm={async () => {
              try {
                const result = await contractsService.deleteContract(record.id)
                if (result.success) {
                  message.success('تم حذف العقد بنجاح')
                  loadContracts()
                } else {
                  message.error(result.error || 'فشل في حذف العقد')
                }
              } catch (error) {
                console.error('Error deleting contract:', error)
                message.error('حدث خطأ أثناء حذف العقد')
              }
            }}
            okText="نعم"
            cancelText="لا"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              حذف
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.contractNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
      contract.customerName?.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCustomerSearch = async (searchText) => {
    if (!searchText || searchText.trim() === '') {
      setCustomerSearchOptions([])
      return
    }

    try {
      const searchResults = await customersService.searchCustomers(searchText)
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
      // Set form fields - ensure the AutoComplete displays the customer name (not UUID)
      form.setFieldsValue({
        customerSearch: customer.name, // Always set to name to display correctly
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || ''
      })
    }
  }

  const handleCustomerChange = (value) => {
    // If value is cleared, clear the customer
    if (!value || value.trim() === '') {
      if (selectedCustomer) {
        setSelectedCustomer(null)
        form.setFieldsValue({
          customerName: '',
          customerPhone: '',
          customerEmail: ''
        })
      }
    } else {
      // Ensure we're displaying the name, not UUID
      // Find customer by name first, then by ID
      const customer = customers.find(c => c.name === value || c.id === value)
      if (customer && value !== customer.name) {
        // If the value is not the name, update it to show the name
        form.setFieldsValue({
          customerSearch: customer.name
        })
      }
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      const contractData = {
        customerId: selectedCustomer?.id || null,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail || '',
        contractType: values.contractType || 'original',
        workType: values.workType,
        totalAmount: values.totalAmount || 0,
        status: values.status || 'in_progress',
        startDate: values.startDate ? moment(values.startDate).format('YYYY-MM-DD') : null,
        endDate: values.endDate ? moment(values.endDate).format('YYYY-MM-DD') : null,
        projectId: values.projectId || null,
        projectName: values.projectName || null,
        quotationId: values.quotationId || null,
        items: contractItems,
        notes: values.notes || '',
        createdBy: 'user'
      }

      let result
      if (selectedContract) {
        result = await contractsService.updateContract(selectedContract.id, contractData)
      } else {
        result = await contractsService.createContract(contractData)
      }

      if (result.success) {
        message.success(selectedContract ? 'تم تحديث العقد بنجاح!' : 'تم إنشاء العقد بنجاح!')
        setIsModalVisible(false)
        setSelectedContract(null)
        setSelectedCustomer(null)
        setContractItems([])
        form.resetFields()
        // Reload contracts and quotations to update the list and available quotations
        await Promise.all([loadContracts(), loadQuotations()])
      } else {
        message.error(result.error || 'فشل في حفظ العقد')
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح')
      } else {
        message.error('حدث خطأ أثناء حفظ العقد')
      }
    }
  }

  // Handle updating contract dates only
  const handleUpdateDates = async () => {
    try {
      const values = await datesEditForm.validateFields()

      // CRITICAL FIX: Type-safe moment object handling
      // Ant Design DatePicker returns moment objects, but we need to ensure type safety
      let startMoment = null
      let endMoment = null
      
      // Type-safe extraction and validation of startDate
      if (values.startDate) {
        // Check if it's already a moment object (expected from DatePicker)
        if (moment.isMoment(values.startDate)) {
          startMoment = values.startDate.isValid() ? values.startDate.clone() : null
        } else if (values.startDate instanceof Date) {
          // Date object - convert to moment
          startMoment = moment(values.startDate)
          if (!startMoment.isValid()) {
            message.error('تاريخ البدء غير صحيح')
            return
          }
        } else if (typeof values.startDate === 'string') {
          // String - parse with explicit format (strict mode)
          startMoment = moment(values.startDate, 'YYYY-MM-DD', true)
          if (!startMoment.isValid()) {
            message.error('تاريخ البدء غير صحيح')
            return
          }
        } else {
          // Fallback: try generic parsing
          startMoment = moment(values.startDate)
          if (!startMoment.isValid()) {
            message.error('تاريخ البدء غير صحيح')
            return
          }
        }
        
        // Normalize to start of day
        if (startMoment) {
          startMoment = startMoment.startOf('day')
        }
      }
      
      // Type-safe extraction and validation of endDate
      if (values.endDate) {
        // Check if it's already a moment object (expected from DatePicker)
        if (moment.isMoment(values.endDate)) {
          endMoment = values.endDate.isValid() ? values.endDate.clone() : null
        } else if (values.endDate instanceof Date) {
          // Date object - convert to moment
          endMoment = moment(values.endDate)
          if (!endMoment.isValid()) {
            message.error('تاريخ الانتهاء غير صحيح')
            return
          }
        } else if (typeof values.endDate === 'string') {
          // String - parse with explicit format (strict mode)
          endMoment = moment(values.endDate, 'YYYY-MM-DD', true)
          if (!endMoment.isValid()) {
            message.error('تاريخ الانتهاء غير صحيح')
            return
          }
        } else {
          // Fallback: try generic parsing
          endMoment = moment(values.endDate)
          if (!endMoment.isValid()) {
            message.error('تاريخ الانتهاء غير صحيح')
            return
          }
        }
        
        // Normalize to start of day
        if (endMoment) {
          endMoment = endMoment.startOf('day')
        }
      }

      // Validate date range if both dates are provided
      if (startMoment && endMoment) {
        if (endMoment.isBefore(startMoment)) {
          message.error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء')
          return
        }
      }

      if (!selectedContract) {
        message.error('لم يتم اختيار عقد')
        return
      }

      // Format dates as YYYY-MM-DD strings for API
      // Only call .format() on valid moment objects
      const newStartDate = startMoment && startMoment.isValid() 
        ? startMoment.format('YYYY-MM-DD') 
        : null
      const newEndDate = endMoment && endMoment.isValid() 
        ? endMoment.format('YYYY-MM-DD') 
        : null

      // Prepare API payload (service expects camelCase)
      const apiPayload = {
        startDate: newStartDate,
        endDate: newEndDate
      }

      console.log('🔵 [handleUpdateDates] Sending update:', apiPayload)
      console.log('🔵 [handleUpdateDates] Start moment valid:', startMoment?.isValid(), 'End moment valid:', endMoment?.isValid())

      const result = await contractsService.updateContract(selectedContract.id, apiPayload)

      if (result.success) {
        message.success('تم تحديث تواريخ العقد بنجاح!')
        
        // CRITICAL FIX: Force Table re-render using deep-copy approach with findIndex
        // This ensures React detects the change by creating completely new object references
        setContracts(prevContracts => {
          // Create a new array copy
          const updated = [...prevContracts]
          const index = updated.findIndex(c => c.id === selectedContract.id)
          
          if (index !== -1) {
            // Create a completely new object with all properties spread
            updated[index] = {
              ...updated[index],
              // Update both camelCase and snake_case to ensure compatibility
              startDate: newStartDate,   // React/camelCase naming (matches dataIndex)
              start_date: newStartDate,  // Supabase/snake_case naming
              endDate: newEndDate,       // React/camelCase naming (matches dataIndex)
              end_date: newEndDate,      // Supabase/snake_case naming
              // Force React to detect change with timestamp
              lastUpdated: Date.now(),
              // Ensure key is preserved for Table rowKey
              key: updated[index].key || updated[index].id
            }
          }
          
          return updated
        })

        setDatesEditModalVisible(false)
        setSelectedContract(null)
        datesEditForm.resetFields()

      } else {
        message.error(result.error || 'فشل في تحديث تواريخ العقد')
      }
    } catch (error) {
      console.error('🔴 [handleUpdateDates] Error:', error)
      if (error.errorFields) {
        message.error('يرجى التحقق من صحة التواريخ المدخلة')
      } else {
        message.error('حدث خطأ أثناء التحديث')
      }
    }
  }
  // Handle payment project selection change
  const handlePaymentProjectChange = (projectId) => {
    setSelectedPaymentProject(projectId)
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project && project.workScopes && Array.isArray(project.workScopes) && project.workScopes.length > 0) {
        setAvailablePaymentWorkScopes(project.workScopes)
      } else {
        setAvailablePaymentWorkScopes([])
      }
    } else {
      setAvailablePaymentWorkScopes([])
    }
    
    // Reset work scope when project changes
    paymentForm.setFieldsValue({ workScope: undefined })
  }

  const handleAddPayment = async () => {
    try {
      const values = await paymentForm.validateFields()

      // Contract payments are always income (incoming money from client)
      if (!selectedContract) {
        message.error('يرجى اختيار عقد')
        return
      }

      // Validate treasury account
      if (!values.treasuryAccountId) {
        message.error('يرجى اختيار حساب الخزينة')
        return
      }

      // Use paidDate if status is paid, otherwise use dueDate
      const transactionDate = values.status === 'paid' && values.paidDate
        ? moment(values.paidDate).format('YYYY-MM-DD')
        : (values.dueDate ? moment(values.dueDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'))

      // Contract payment data - this is INCOME (incoming money from client)
      const paymentData = {
        contractId: selectedContract.id,
        projectId: selectedContract.projectId || null,
        workScope: values.workScope || null,
        paymentType: 'income', // Contract payments are income
        amount: values.amount,
        dueDate: moment(values.dueDate).format('YYYY-MM-DD'),
        paidDate: values.status === 'paid' ? transactionDate : null,
        status: values.status || 'pending',
        paymentMethod: values.paymentMethod || null,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || '',
        treasuryAccountId: values.treasuryAccountId, // For treasury transaction
        createdBy: 'user'
      }

      const result = await paymentsService.createPayment(paymentData)

      if (result.success) {
        // Create treasury transaction for contract payment (inflow - money coming in)
        if (values.status === 'paid' && values.treasuryAccountId) {
          try {
            const treasuryResult = await treasuryService.createTransaction({
              accountId: values.treasuryAccountId,
              transactionType: 'inflow', // Inflow - money coming in from client
              amount: values.amount,
              referenceType: 'income',
              referenceId: result.payment.id,
              description: `دفعة عقد: ${selectedContract.contractNumber} - ${values.notes || 'دفعة من العميل'}`
            })

            if (!treasuryResult.success) {
              console.error('Error creating treasury transaction:', treasuryResult.error)
              message.warning('تم إضافة الدفعة بنجاح، لكن حدث خطأ في تحديث الخزينة')
            }
          } catch (error) {
            console.error('Error creating treasury transaction:', error)
            message.warning('تم إضافة الدفعة بنجاح، لكن حدث خطأ في تحديث الخزينة')
          }
        }

        message.success('تم إضافة الدفعة بنجاح!')
        setPaymentModalVisible(false)
        setSelectedPaymentProject(null)
        setAvailablePaymentWorkScopes([])
        paymentForm.resetFields()
        if (selectedContract) {
          await loadContractPayments(selectedContract.id)
        }
        loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
      } else {
        message.error(result.error || 'فشل في إضافة الدفعة')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      message.error('حدث خطأ أثناء إضافة الدفعة')
    }
  }

  const createContract = () => {
    // PHASE 1: Restrict direct contract creation - enforce Quotation -> Contract flow
    message.warning('يجب البدء بعمل عرض سعر أولاً وتحويله إلى عقد. يرجى الانتقال إلى صفحة العروض (Quotations) وإنشاء عرض سعر جديد.', 5)
    // Optionally navigate to quotations page
    // navigate('/quotations')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>
            العقود (Contracts)
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>إدارة العقود والمستخلصات</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={createContract}>
          عقد جديد
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي العقود"
              value={stats.totalContracts}
              prefix={<FileProtectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="قيد العمل"
              value={stats.inProgress}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="مكتمل"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي القيمة"
              value={stats.totalAmount}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="ريال"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder="ابحث برقم العقد أو جهة الإسناد..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="حالة العقد"
          >
            <Option value="all">الكل</Option>
            <Option value="in_progress">قيد العمل</Option>
            <Option value="on_hold">متوقف</Option>
            <Option value="fully_completed">تم الإنجاز الكامل</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredContracts}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey="key"
        />
      </Card>

      <Modal
        title={selectedContract ? 'تعديل العقد' : 'إنشاء عقد جديد'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedContract(null)
          setSelectedCustomer(null)
          setContractItems([])
          setCustomerSearchOptions([])
          form.resetFields()
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={800}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="quotationId"
            label="العرض المقبول (اختياري)"
          >
            <Select
              placeholder="اختر العرض المقبول"
              allowClear
              showSearch
              onChange={async (quotationId) => {
                if (quotationId) {
                  const selectedQuotation = quotations.find(q => q.id === quotationId)
                  if (selectedQuotation) {
                    // Find and set the customer
                    let customer = null
                    if (selectedQuotation.customerId) {
                      // Try to find customer by ID from loaded customers list
                      customer = customers.find(c => c.id === selectedQuotation.customerId)
                      // If not found, try to fetch it
                      if (!customer) {
                        try {
                          customer = await customersService.getCustomer(selectedQuotation.customerId)
                          // If found, add to customers list for future use
                          if (customer) {
                            setCustomers(prev => [...prev.filter(c => c.id !== customer.id), customer])
                          }
                        } catch (error) {
                          console.error('Error loading customer:', error)
                        }
                      }
                    }
                    
                    // If still no customer found but we have customer name, create a temporary customer object
                    if (!customer && selectedQuotation.customerName) {
                      customer = {
                        id: selectedQuotation.customerId || null,
                        name: selectedQuotation.customerName,
                        phone: selectedQuotation.customerPhone || '',
                        email: selectedQuotation.customerEmail || ''
                      }
                    }
                    
                    // Set selected customer - this ensures customer_id is set
                    if (customer) {
                      setSelectedCustomer(customer)
                    }
                    
                    // Auto-fill form fields - ensure customer name is displayed, not UUID
                    form.setFieldsValue({
                      customerSearch: customer?.name || selectedQuotation.customerName, // Display name
                      customerName: selectedQuotation.customerName,
                      customerPhone: selectedQuotation.customerPhone || '',
                      customerEmail: selectedQuotation.customerEmail || '',
                      projectName: selectedQuotation.projectName || '',
                      workType: selectedQuotation.workType,
                      totalAmount: selectedQuotation.totalAmount
                    })
                  }
                } else {
                  // Clear auto-filled fields when quotation is cleared
                  form.setFieldsValue({
                    customerSearch: '',
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    projectName: '',
                    workType: undefined,
                    totalAmount: undefined
                  })
                  setSelectedCustomer(null)
                }
              }}
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {quotations.map(q => (
                <Option key={q.id} value={q.id}>
                  {q.quoteNumber} - {q.customerName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="customerSearch"
            label="البحث عن جهة الإسناد"
            rules={[{ required: true, message: 'يرجى البحث واختيار عميل' }]}
          >
            <AutoComplete
              options={customerSearchOptions}
              onSearch={handleCustomerSearch}
              onSelect={handleCustomerSelect}
              onChange={handleCustomerChange}
              placeholder="ابحث عن عميل بالاسم أو الهاتف..."
              style={{ width: '100%' }}
              filterOption={false}
              disabled={!!selectedContract && !!selectedContract.quotationId}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label="اسم جهة الإسناد"
                rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}
              >
                <Input placeholder="اسم العميل" disabled={!!selectedCustomer} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerPhone"
                label="رقم الهاتف"
                rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
              >
                <Input placeholder="رقم الهاتف" disabled={!!selectedCustomer} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contractType"
                label="نوع العقد"
                rules={[{ required: true, message: 'يرجى اختيار نوع العقد' }]}
                initialValue="original"
              >
                <Select placeholder="اختر نوع العقد">
                  <Option value="original">عقد أصلي</Option>
                  <Option value="amendment">ملحق/تعديل</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="workType"
                label="نوع العمل"
                rules={[{ required: true, message: 'يرجى اختيار نوع العمل' }]}
              >
                <Select placeholder="اختر نوع العمل" showSearch filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }>
                  {Object.keys(workTypeGroups).map(groupKey => (
                    <Select.OptGroup key={groupKey} label={workTypeGroups[groupKey]}>
                      {workTypeCategories
                        .filter(cat => cat.group === groupKey)
                        .map(category => (
                          <Option key={category.value} value={category.value} label={category.label}>
                            {category.label}
                          </Option>
                        ))}
                    </Select.OptGroup>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="totalAmount"
                label="المبلغ الإجمالي (ريال)"
                rules={[{ required: true, message: 'يرجى إدخال المبلغ' }]}
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
                initialValue="in_progress"
                rules={[{ required: true, message: 'يرجى اختيار الحالة' }]}
              >
                <Select>
                  <Option value="in_progress">قيد العمل</Option>
                  <Option value="on_hold">متوقف</Option>
                  <Option value="fully_completed">تم الإنجاز الكامل</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="تاريخ البدء">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="تاريخ الانتهاء">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="projectName"
            label="اسم المشروع"
            rules={[{ required: true, message: 'يرجى إدخال اسم المشروع' }]}
          >
            <Input placeholder="اسم المشروع" />
          </Form.Item>

          {industryType === 'engineering' && (
            <Form.Item name="projectId" label="المشروع (اختياري)">
              <Select
                placeholder="اختر المشروع"
                allowClear
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
          )}

          <Form.Item name="notes" label="ملاحظات (اختياري)">
            <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`تفاصيل العقد ${selectedContract?.contractNumber}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button
            key="add-payment"
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={() => {
              paymentForm.resetFields()
              setSelectedPaymentProject(null)
              setAvailablePaymentWorkScopes([])
              setPaymentModalVisible(true)
            }}
          >
            إضافة دفعة
          </Button>,
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            إغلاق
          </Button>
        ]}
        width={900}
      >
        {selectedContract && (
          <Tabs 
            defaultActiveKey="details"
            items={[
              {
                key: 'details',
                label: 'تفاصيل العقد',
                children: (
                  <>
                    <Descriptions column={2} size="small" style={{ marginTop: 16 }}>
                      <Descriptions.Item label="رقم العقد">
                        {selectedContract.contractNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label="التاريخ">
                        {selectedContract.createdAt ? moment(selectedContract.createdAt).format('DD-MMM-YYYY') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="جهة الإسناد">
                        {selectedContract.customerName}
                      </Descriptions.Item>
                      <Descriptions.Item label="الهاتف">
                        {selectedContract.customerPhone}
                      </Descriptions.Item>
                      <Descriptions.Item label="نوع العقد">
                        {contractTypeLabels[selectedContract.contractType]}
                      </Descriptions.Item>
                      <Descriptions.Item label="اسم المشروع">
                        {selectedContract.projectName || 'غير محدد'}
                      </Descriptions.Item>
                      <Descriptions.Item label="نوع العمل">
                        {getWorkTypeLabel(selectedContract.workType)}
                      </Descriptions.Item>
                      <Descriptions.Item label="المبلغ الإجمالي">
                        {selectedContract.totalAmount.toLocaleString()} ريال
                      </Descriptions.Item>
                      <Descriptions.Item label="الحالة">
                        <Tag color={statusLabels[selectedContract.status]?.color}>
                          {statusLabels[selectedContract.status]?.text}
                        </Tag>
                      </Descriptions.Item>
                      {selectedContract.startDate && (
                        <Descriptions.Item label="تاريخ البدء">
                          {moment(selectedContract.startDate, 'YYYY-MM-DD', true).isValid() 
                            ? moment(selectedContract.startDate, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                            : '-'}
                        </Descriptions.Item>
                      )}
                      {selectedContract.endDate && (
                        <Descriptions.Item label="تاريخ الانتهاء">
                          {moment(selectedContract.endDate, 'YYYY-MM-DD', true).isValid()
                            ? moment(selectedContract.endDate, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                            : '-'}
                        </Descriptions.Item>
                      )}
                      {selectedContract.quotationId && (
                        <Descriptions.Item label="العرض المصدر">
                          {(() => {
                            // Find quotation by ID to get quoteNumber
                            const quotation = quotations.find(q => q.id === selectedContract.quotationId)
                            return quotation ? quotation.quoteNumber : (selectedContract.quotationId.length > 20 ? 'عرض سعر' : selectedContract.quotationId)
                          })()}
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {selectedContract.items && selectedContract.items.length > 0 && (
                      <>
                        <Divider />
                        <h4>بنود العقد</h4>
                        <Table
                          dataSource={selectedContract.items}
                          columns={[
                            { title: 'الوصف', dataIndex: 'itemDescription', key: 'description' },
                            { title: 'الكمية', dataIndex: 'quantity', key: 'quantity' },
                            {
                              title: 'سعر الوحدة',
                              dataIndex: 'unitPrice',
                              key: 'unitPrice',
                              render: (price) => `${price.toLocaleString()} ريال`
                            },
                            {
                              title: 'الإجمالي',
                              dataIndex: 'total',
                              key: 'total',
                              render: (total) => `${total.toLocaleString()} ريال`
                            }
                          ]}
                          pagination={false}
                          size="small"
                        />
                      </>
                    )}

                    {selectedContract.notes && (
                      <>
                        <Divider />
                        <p><strong>ملاحظات:</strong> {selectedContract.notes}</p>
                      </>
                    )}
                  </>
                )
              },
              {
                key: 'payments',
                label: 'الدفعات',
                children: (
                  <Table
                    dataSource={selectedContractPayments}
                    columns={[
                      { 
                        title: 'رقم الدفعة', 
                        dataIndex: 'paymentNumber', 
                        key: 'paymentNumber',
                        render: (paymentNumber, record) => (
                          <div>
                            <div style={{ fontWeight: 500 }}>{paymentNumber}</div>
                            {record.isGeneralExpense && (
                              <Tag color="purple" style={{ marginTop: 4 }}>
                                مصروف عام / General
                              </Tag>
                            )}
                          </div>
                        )
                      },
                      ...(industryType === 'engineering' ? [{
                        title: 'اسم المشروع / التصنيف',
                        dataIndex: 'projectName',
                        key: 'projectName',
                        render: (projectName, record) => {
                          if (record.isGeneralExpense && record.expenseCategory) {
                            return (
                              <div>
                                <Tag color="purple">{record.expenseCategory}</Tag>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                                  مصروف عام
                                </div>
                              </div>
                            )
                          }
                          return (
                            <span style={{ fontWeight: 500 }}>{projectName || 'غير محدد'}</span>
                          )
                        },
                      }] : []),
                      {
                        title: 'المبلغ',
                        dataIndex: 'amount',
                        key: 'amount',
                        render: (amount) => `${amount.toLocaleString()} ريال`
                      },
                      {
                        title: 'تاريخ الاستحقاق',
                        dataIndex: 'dueDate',
                        key: 'dueDate',
                        render: (date) => date ? moment(date, 'YYYY-MM-DD', true).isValid() 
                          ? moment(date, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                          : '-' : '-'
                      },
                      {
                        title: 'تاريخ الدفع',
                        dataIndex: 'paidDate',
                        key: 'paidDate',
                        render: (date) => date ? moment(date, 'YYYY-MM-DD', true).isValid()
                          ? moment(date, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                          : '-' : '-'
                      },
                      {
                        title: 'الحالة',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => {
                          const statusConfig = {
                            pending: { text: 'معلق', color: 'orange' },
                            paid: { text: 'مدفوع', color: 'green' },
                            overdue: { text: 'متأخر', color: 'red' },
                            cancelled: { text: 'ملغي', color: 'default' }
                          }
                          const config = statusConfig[status] || { text: status, color: 'default' }
                          return <Tag color={config.color}>{config.text}</Tag>
                        }
                      }
                    ]}
                    pagination={false}
                    rowKey="id"
                  />
                )
              }
            ]}
          />
        )}
      </Modal>

      <Modal
        title="إضافة دفعة جديدة"
        open={paymentModalVisible}
        onOk={handleAddPayment}
        onCancel={() => {
          setPaymentModalVisible(false)
          setSelectedPaymentProject(null)
          setAvailablePaymentWorkScopes([])
          paymentForm.resetFields()
        }}
        okText="إضافة"
        cancelText="إلغاء"
        width={600}
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 24 }}>
          {/* Project and Work Scope - Only show for engineering industry */}
          {industryType === 'engineering' && (
            <>
              <Form.Item
                name="projectId"
                label="المشروع (اختياري)"
              >
                <Select
                  placeholder="اختر المشروع"
                  allowClear
                  showSearch
                  onChange={handlePaymentProjectChange}
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {projects.map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.name} {project.client?.name ? `- ${project.client.name}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              {selectedPaymentProject && availablePaymentWorkScopes.length > 0 && (
                <Form.Item
                  name="workScope"
                  label="نطاق العمل (اختياري)"
                >
                  <Select
                    placeholder="اختر نطاق العمل"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {availablePaymentWorkScopes.map(scope => (
                      <Option key={scope} value={scope}>
                        {scope}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </>
          )}
          
          <Form.Item
            name="amount"
            label="المبلغ (ريال)"
            rules={[{ required: true, message: 'يرجى إدخال المبلغ' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="0"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="تاريخ الاستحقاق"
                rules={[{ required: true, message: 'يرجى اختيار تاريخ الاستحقاق' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="الحالة"
                initialValue="pending"
              >
                <Select>
                  <Option value="pending">قيد الانتظار</Option>
                  <Option value="paid">مدفوع</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) =>
              getFieldValue('status') === 'paid' ? (
                <Form.Item
                  name="paidDate"
                  label="تاريخ الدفع"
                  rules={[{ required: true, message: 'يرجى اختيار تاريخ الدفع' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          {/* Treasury Account Selection */}
          {treasuryAccounts.length === 0 && (
            <Alert
              type="error"
              description="تنبيه: لا يوجد حسابات خزينة معرفة. يرجى إنشاء حساب في صفحة الخزينة أولاً"
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <Form.Item
            name="treasuryAccountId"
            label="حساب الخزينة"
            rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة' }]}
            tooltip="اختر الحساب الذي سيتم إيداع المبلغ فيه"
          >
            <Select
              placeholder="اختر حساب الخزينة"
              disabled={treasuryAccounts.length === 0}
              notFoundContent={treasuryAccounts.length === 0 ? "لا توجد حسابات خزينة" : null}
            >
              {treasuryAccounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات (اختياري)">
            <Input.TextArea rows={3} placeholder="ملاحظات إضافية..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Dates Modal */}
      <Modal
        title={`تعديل تواريخ العقد ${selectedContract?.contractNumber}`}
        open={datesEditModalVisible}
        onOk={handleUpdateDates}
        onCancel={() => {
          setDatesEditModalVisible(false)
          setSelectedContract(null)
          datesEditForm.resetFields()
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={500}
      >
        <Form form={datesEditForm} layout="vertical" style={{ marginTop: 24 }}>
          <Alert
            type="info"
            title="ملاحظة"
            description="تغيير تواريخ العقد قد يؤدي إلى تحديث تلقائي لتواريخ المشروع المرتبط (حسب منطق قاعدة البيانات). يمكن تعديل التواريخ السابقة للسماح بسيناريوهات البيانات المؤرخة."
            style={{ marginBottom: 16 }}
            showIcon
          />
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="تاريخ البدء"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      // Fail-safe: If either date is missing, pass (let required rule handle it)
                      if (!value) {
                        return Promise.resolve()
                      }
                      
                      const endDate = getFieldValue('endDate')
                      if (!endDate) {
                        return Promise.resolve()
                      }
                      
                      // Strict Moment comparison
                      // Note: Antd DatePicker values are Moment objects, so .isAfter works.
                      // We use .startOf('day') to ignore time differences.
                      const startMoment = moment(value).startOf('day')
                      const endMoment = moment(endDate).startOf('day')
                      
                      // Start date must be before end date (not equal, not after)
                      if (startMoment.isAfter(endMoment) || startMoment.isSame(endMoment)) {
                        return Promise.reject(new Error('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء'))
                      }
                      
                      return Promise.resolve()
                    }
                  })
                ]}
                dependencies={['endDate']}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="YYYY-MM-DD"
                  placeholder="اختر تاريخ البدء"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="تاريخ الانتهاء"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      // Fail-safe: If either date is missing, pass (let required rule handle it)
                      if (!value) {
                        return Promise.resolve()
                      }
                      
                      const startDate = getFieldValue('startDate')
                      if (!startDate) {
                        return Promise.resolve()
                      }
                      
                      // Strict Moment comparison
                      // Note: Antd DatePicker values are Moment objects, so .isBefore works.
                      // We use .startOf('day') to ignore time differences.
                      const startMoment = moment(startDate).startOf('day')
                      const endMoment = moment(value).startOf('day')
                      
                      // End date must be after start date (not equal, not before)
                      if (endMoment.isBefore(startMoment) || endMoment.isSame(startMoment)) {
                        return Promise.reject(new Error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء'))
                      }
                      
                      return Promise.resolve()
                    }
                  })
                ]}
                dependencies={['startDate']}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="YYYY-MM-DD"
                  placeholder="اختر تاريخ الانتهاء"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default ContractsPage
