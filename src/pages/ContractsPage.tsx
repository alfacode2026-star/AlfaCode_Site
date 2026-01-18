'use client'

import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'
// @ts-ignore - Service files are JavaScript without type definitions
import contractsService from '../services/contractsService'
// @ts-ignore
import customersService from '../services/customersService'
// @ts-ignore
import quotationsService from '../services/quotationsService'
// @ts-ignore
import paymentsService from '../services/paymentsService'
// @ts-ignore
import projectsService from '../services/projectsService'
// @ts-ignore
import treasuryService from '../services/treasuryService'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import { useSyncStatus } from '../contexts/SyncStatusContext'
import { getTranslations } from '../utils/translations'
import { translateWorkType, translateWorkScopes } from '../utils/workTypesTranslation'
import { getCurrencyFromTreasury, formatCurrencyWithSymbol, formatCurrencyLabel, getCurrencySymbol, formatCurrency } from '../utils/currencyUtils'
import type { Contract, Customer, Quotation, Project, Payment, TreasuryAccount, ContractItem } from '../types'
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
  notification,
  Descriptions,
  Divider,
  InputNumber,
  AutoComplete,
  Tabs,
  Alert,
  Spin,
  Empty
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
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

// Force moment.js to use English locale
moment.locale('en')

const { Option } = Select

// Extended Contract type with additional fields for table display
interface ContractWithKey extends Contract {
  key?: string
  lastUpdated?: number
  start_date?: string
  end_date?: string
  updated_at?: string
}

// Extended Payment type with project information
interface PaymentWithProject extends Payment {
  projectName?: string | null
}

// Customer search option type
interface CustomerSearchOption {
  value: string
  label: string
  customer: Customer
}

// Work type category interface
interface WorkTypeCategory {
  label: string
  value: string
  group: string
}

const ContractsPage = () => {
  const { industryType, currentTenantId } = useTenant()
  const { language } = useLanguage()
  const { branchCurrency, branchId, branchName } = useBranch()
  const { updateStatus } = useSyncStatus()
  const t = getTranslations(language || 'en')
  
  // State with proper types
  const [contracts, setContracts] = useState<ContractWithKey[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchText, setSearchText] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false)
  const [viewModalVisible, setViewModalVisible] = useState<boolean>(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false)
  const [selectedContract, setSelectedContract] = useState<ContractWithKey | null>(null)
  const [selectedContractPayments, setSelectedContractPayments] = useState<PaymentWithProject[]>([])
  const [contractItems, setContractItems] = useState<ContractItem[]>([])
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearchOptions, setCustomerSearchOptions] = useState<CustomerSearchOption[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedPaymentProject, setSelectedPaymentProject] = useState<string | null>(null)
  const [availablePaymentWorkScopes, setAvailablePaymentWorkScopes] = useState<string[]>([])
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([])
  const [datesEditModalVisible, setDatesEditModalVisible] = useState<boolean>(false)
  const [datesEditForm] = Form.useForm()
  const [selectedCurrency, setSelectedCurrency] = useState<string>('SAR') // Track selected currency
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false)
  const [contractToDelete, setContractToDelete] = useState<ContractWithKey | null>(null)
  const [deleteForm] = Form.useForm()

  useEffect(() => {
    loadContracts()
    loadCustomers()
    loadQuotations()
    loadTreasuryAccounts()
    if (industryType === 'engineering') {
      loadProjects()
    }
  }, [industryType, currentTenantId, branchId])

  const loadCustomers = async (): Promise<void> => {
    try {
      const customersList = await customersService.getCustomers()
      setCustomers(customersList || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    }
  }

  const loadQuotations = async (): Promise<void> => {
    try {
      const quotationsList = await quotationsService.getQuotations()
      // Show all quotations with 'Accepted' and 'Sent' status
      // Add null check to prevent errors
      const availableQuotations = (quotationsList && Array.isArray(quotationsList)) 
        ? quotationsList.filter(
            (q: Quotation) => q && (q.status === 'accepted' || q.status === 'sent')
          )
        : []
      
      setQuotations(availableQuotations)
    } catch (error) {
      console.error('Error loading quotations:', error)
      setQuotations([])
    }
  }

  const loadProjects = async (): Promise<void> => {
    try {
      const projectsList = await projectsService.getActiveProjects()
      setProjects(projectsList || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    }
  }

  const loadTreasuryAccounts = async (): Promise<void> => {
    try {
      const accounts = await treasuryService.getAccounts()
      setTreasuryAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading treasury accounts:', error)
      setTreasuryAccounts([])
    }
  }

  const loadContracts = async (): Promise<void> => {
    setLoading(true)
    updateStatus('loading', language === 'ar' ? 'جاري تحميل العقود...' : 'Loading contracts...', branchName || null)
    try {
      const data = await contractsService.getContracts()
      
      // Ensure data is an array and map safely
      if (data && Array.isArray(data)) {
        const mappedContracts = data
          .map((c: Contract) => {
            if (!c || !c.id) {
              return null
            }
            return { ...c, key: c.id } as ContractWithKey
          })
          .filter((c: ContractWithKey | null) => c !== null) as ContractWithKey[]
        setContracts(mappedContracts)
        
        if (mappedContracts.length === 0) {
          updateStatus('empty', language === 'ar' ? 'لا توجد عقود' : 'No contracts found', branchName || null)
        } else {
          updateStatus('success', language === 'ar' ? `تم تحميل ${mappedContracts.length} عقد` : `Loaded ${mappedContracts.length} contracts`, branchName || null)
        }
      } else {
        setContracts([])
        updateStatus('empty', language === 'ar' ? 'لا توجد عقود' : 'No contracts found', branchName || null)
      }
    } catch (error) {
      console.error('Error loading contracts:', error)
      const errorMsg = language === 'ar' ? 'تعذر المزامنة مع قاعدة البيانات' : 'Could not sync with the database'
      updateStatus('error', errorMsg, branchName || null)
      notification.error({
        message: language === 'ar' ? 'خطأ في الاتصال' : 'Connection error',
        description: errorMsg
      })
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  const loadContractPayments = async (contractId: string): Promise<void> => {
    try {
      const payments = await paymentsService.getPaymentsByContract(contractId)
      
      // Fetch project names for payments that have project_id
      const paymentsWithProjects = await Promise.all(
        (payments || []).map(async (payment: Payment) => {
          let projectName: string | null = null
          if (payment.projectId) {
            const project = await projectsService.getProjectById(payment.projectId)
            projectName = project?.name || null
          }
          return { ...payment, projectName } as PaymentWithProject
        })
      )
      
      setSelectedContractPayments(paymentsWithProjects)
    } catch (error) {
      console.error('Error loading payments:', error)
      setSelectedContractPayments([])
    }
  }

  const stats = useMemo(() => {
    // Safety check: ensure contracts is an array
    const safeContracts = Array.isArray(contracts) ? contracts : []
    return {
      totalContracts: safeContracts.length,
      inProgress: safeContracts.filter((c: ContractWithKey) => c?.status === 'in_progress').length,
      onHold: safeContracts.filter((c: ContractWithKey) => c?.status === 'on_hold').length,
      completed: safeContracts.filter((c: ContractWithKey) => c?.status === 'fully_completed').length,
      totalAmount: safeContracts.reduce((sum: number, c: ContractWithKey) => sum + (c?.totalAmount || 0), 0)
    }
  }, [contracts])

  // Work type categories organized into OptGroups - 51 categories total
  const workTypeCategories: WorkTypeCategory[] = [
    // Civil Works - 10 categories
    { label: 'Concrete Structure', value: 'civil_structural_concrete', group: 'civil' },
    { label: 'Steel Structure', value: 'civil_structural_steel', group: 'civil' },
    { label: 'Excavation and Leveling', value: 'civil_excavation', group: 'civil' },
    { label: 'Backfill', value: 'civil_backfill', group: 'civil' },
    { label: 'Foundations', value: 'civil_foundations', group: 'civil' },
    { label: 'Retaining Walls', value: 'civil_retaining_walls', group: 'civil' },
    { label: 'Reinforced Concrete', value: 'civil_reinforced_concrete', group: 'civil' },
    { label: 'Waterproofing', value: 'civil_waterproofing', group: 'civil' },
    { label: 'Thermal Insulation', value: 'civil_thermal_insulation', group: 'civil' },
    { label: 'Stone Works', value: 'civil_stone_works', group: 'civil' },
    
    // Finishing - 9 categories
    { label: 'Paint and Coating', value: 'finishing_paint', group: 'finishing' },
    { label: 'Gypsum Board and Ceilings', value: 'finishing_gypsum_ceiling', group: 'finishing' },
    { label: 'Marble Flooring', value: 'finishing_marble_floor', group: 'finishing' },
    { label: 'Ceramic Flooring', value: 'finishing_ceramic_floor', group: 'finishing' },
    { label: 'Parquet Flooring', value: 'finishing_parquet_floor', group: 'finishing' },
    { label: 'Interior Decoration', value: 'finishing_interior_decor', group: 'finishing' },
    { label: 'Carpentry Works', value: 'finishing_carpentry', group: 'finishing' },
    { label: 'Aluminum Works', value: 'finishing_aluminum_works', group: 'finishing' },
    { label: 'Glass and Glazing', value: 'finishing_glass_glazing', group: 'finishing' },
    
    // MEP (Mechanical, Electrical, Plumbing) - 13 categories
    { label: 'Electrical Distribution', value: 'mep_electrical_distribution', group: 'mep' },
    { label: 'Lighting', value: 'mep_lighting', group: 'mep' },
    { label: 'Power Supply', value: 'mep_power_supply', group: 'mep' },
    { label: 'Transformers', value: 'mep_transformers', group: 'mep' },
    { label: 'Plumbing Works', value: 'mep_plumbing', group: 'mep' },
    { label: 'Water Supply', value: 'mep_water_supply', group: 'mep' },
    { label: 'Sewage Systems', value: 'mep_sewage', group: 'mep' },
    { label: 'Storm Drainage', value: 'mep_storm_drainage', group: 'mep' },
    { label: 'Central AC', value: 'mep_central_ac', group: 'mep' },
    { label: 'Split AC', value: 'mep_split_ac', group: 'mep' },
    { label: 'Ventilation', value: 'mep_ventilation', group: 'mep' },
    { label: 'Fire Fighting', value: 'mep_fire_fighting', group: 'mep' },
    { label: 'Smoke Detection', value: 'mep_smoke_detection', group: 'mep' },
    
    // Low Current - 7 categories
    { label: 'CCTV Cameras', value: 'low_current_cctv', group: 'low_current' },
    { label: 'Data Networks', value: 'low_current_data_network', group: 'low_current' },
    { label: 'Telephone Networks', value: 'low_current_telephone', group: 'low_current' },
    { label: 'BMS (Building Management System)', value: 'low_current_bms', group: 'low_current' },
    { label: 'Audio Systems', value: 'low_current_audio_system', group: 'low_current' },
    { label: 'Alarm Systems', value: 'low_current_alarm_system', group: 'low_current' },
    { label: 'Access Control', value: 'low_current_access_control', group: 'low_current' },
    
    // Infrastructure - 7 categories
    { label: 'Roads and Asphalt', value: 'infrastructure_roads_asphalt', group: 'infrastructure' },
    { label: 'Pavements', value: 'infrastructure_pavements', group: 'infrastructure' },
    { label: 'Main Water Networks', value: 'infrastructure_water_network', group: 'infrastructure' },
    { label: 'Main Sewer Networks', value: 'infrastructure_sewer_network', group: 'infrastructure' },
    { label: 'Bridge Works', value: 'infrastructure_bridges', group: 'infrastructure' },
    { label: 'Tunnels', value: 'infrastructure_tunnels', group: 'infrastructure' },
    { label: 'Street Lighting', value: 'infrastructure_street_lighting', group: 'infrastructure' },
    
    // Special - 5 categories
    { label: 'Elevators', value: 'special_elevators', group: 'special' },
    { label: 'Escalators', value: 'special_escalators', group: 'special' },
    { label: 'Solar Energy', value: 'special_solar_energy', group: 'special' },
    { label: 'Acoustic Insulation', value: 'special_acoustic_insulation', group: 'special' },
    { label: 'Other Special Works', value: 'special_other', group: 'special' }
  ]
  
  // Get work type groups with English labels
  const getWorkTypeGroups = (): Record<string, string> => {
    return {
      civil: 'General Contracting',
      finishing: 'Finishing',
      mep: 'MEP (Electrical, Plumbing, AC)',
      low_current: 'Low Current',
      infrastructure: 'Infrastructure',
      special: 'Special Works'
    }
  }

  // Function to get work type label
  const getWorkTypeLabel = (workType: string | undefined): string => {
    if (!workType) return workType || ''
    const category = workTypeCategories.find((cat: WorkTypeCategory) => cat.value === workType)
    if (category) {
      return category.label
    }
    
    // Fallback for legacy values
    const legacyLabels: Record<string, string> = {
      civil_works: 'General Contracting',
      finishing: 'Finishing',
      mep: 'MEP',
      low_current: 'Low Current',
      infrastructure: 'Infrastructure',
      special: 'Special'
    }
    return legacyLabels[workType] || workType
  }
  
  const workTypeGroups = getWorkTypeGroups()

  const contractTypeLabels: Record<string, string> = {
    original: t.contracts.originalContract,
    amendment: t.contracts.amendment
  }

  const statusLabels: Record<string, { text: string; color: string; icon: React.ReactElement }> = {
    in_progress: { text: t.contracts.statusInProgress, color: 'blue', icon: <ClockCircleOutlined /> },
    on_hold: { text: t.contracts.statusOnHold, color: 'orange', icon: <PauseCircleOutlined /> },
    fully_completed: { text: t.contracts.statusFullyCompleted, color: 'green', icon: <CheckCircleOutlined /> }
  }
  
  // Format currency with dynamic currency symbol (using global utility)
  const formatCurrencyWithSymbol = (amount: number | undefined, currency?: string): string => {
    return formatCurrency(amount || 0, currency, branchCurrency)
  }

  // Memoize columns to prevent closure issues and force re-render when contracts change
  const columns: ColumnsType<ContractWithKey> = useMemo(() => [
    {
      title: t.contracts.contractNumber,
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (contractNumber: string) => <span style={{ fontWeight: 500 }}>{contractNumber ?? '---'}</span>
    },
    {
      title: t.contracts.clientName,
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record: ContractWithKey) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name ?? '---'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record?.customerPhone ?? '---'}</div>
        </div>
      )
    },
    {
      title: t.contracts.projectName,
      dataIndex: 'projectName',
      key: 'projectName',
      render: (projectName: string | null | undefined) => projectName || <span style={{ color: '#999' }}>{t.contracts.notSpecified}</span>
    },
    {
      title: t.contracts.startDate,
      dataIndex: 'startDate',
      key: 'startDate',
      sorter: (a: ContractWithKey, b: ContractWithKey) => {
        const aDate = a.startDate || a.start_date
        const bDate = b.startDate || b.start_date
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return moment(aDate).valueOf() - moment(bDate).valueOf()
      },
      render: (startDate: string | undefined, record: ContractWithKey) => {
        const dateValue = startDate || record.start_date || record.startDate
        if (!dateValue) {
          return <span style={{ color: '#999' }}>-</span>
        }
        try {
          const parsed = moment(dateValue, 'YYYY-MM-DD', true)
          if (!parsed.isValid()) return '-'
          return parsed.format('DD-MMM-YYYY')
        } catch (error) {
          console.error('Error formatting startDate:', error)
          return <span style={{ color: '#999' }}>-</span>
        }
      }
    },
    {
      title: t.contracts.endDate,
      dataIndex: 'endDate',
      key: 'endDate',
      sorter: (a: ContractWithKey, b: ContractWithKey) => {
        const aDate = a.endDate || a.end_date
        const bDate = b.endDate || b.end_date
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return moment(aDate).valueOf() - moment(bDate).valueOf()
      },
      render: (endDate: string | undefined, record: ContractWithKey) => {
        const dateValue = endDate || record.end_date || record.endDate
        if (!dateValue) {
          return <span style={{ color: '#999' }}>-</span>
        }
        try {
          const parsed = moment(dateValue, 'YYYY-MM-DD', true)
          if (!parsed.isValid()) return '-'
          return parsed.format('DD-MMM-YYYY')
        } catch (error) {
          console.error('Error formatting endDate:', error)
          return <span style={{ color: '#999' }}>-</span>
        }
      }
    },
    {
      title: t.contracts.contractType,
      dataIndex: 'contractType',
      key: 'contractType',
      render: (type: string) => (type ? (contractTypeLabels[type] ?? type) : '---')
    },
    {
      title: t.contracts.workScope || t.quotations.workScope || 'Work Scope',
      dataIndex: 'workScopes',
      key: 'workScopes',
      render: (_: any, record: ContractWithKey) => {
        // CRITICAL: Always return a valid React element, never undefined/null
        if (!record) {
          return <span style={{ color: '#999' }}>{t.common.notSpecified}</span>
        }

        try {
          // Step 1: Get workScopes from associated quotation (if exists)
          let workScopes: string[] = []
          
          // Safely check if quotations array exists and has data
          if (record.quotationId && quotations && Array.isArray(quotations) && quotations.length > 0) {
            const associatedQuotation = quotations.find((q: Quotation) => q && q.id === record.quotationId)
            if (associatedQuotation?.workScopes && Array.isArray(associatedQuotation.workScopes) && associatedQuotation.workScopes.length > 0) {
              workScopes = associatedQuotation.workScopes
            }
          }
          
          // Step 2: Fallback to contract's workType (for legacy data without quotations)
          if (workScopes.length === 0 && record.workType) {
            // Convert single workType to array format for display
            const workTypeLabel = translateWorkType(record.workType, language || 'en')
            if (workTypeLabel && workTypeLabel !== record.workType) {
              return <span>{workTypeLabel}</span>
            }
            // If translation didn't change it, still show the original
            return <span>{record.workType}</span>
          }
          
          // Step 3: If we have workScopes array, display them
          if (workScopes.length > 0) {
            // Ensure we have a valid array before processing
            const safeScopes = Array.isArray(workScopes) ? workScopes : []
            if (safeScopes.length === 0) {
              return <span style={{ color: '#999' }}>{t.common.notSpecified}</span>
            }
            
            // Display first 3 items, then "and more..." if there are more
            const translatedScopes = translateWorkScopes(safeScopes.slice(0, 3), language || 'en')
            const displayScopes = (translatedScopes || []).join(', ')
            const moreCount = safeScopes.length - 3
            
            return (
              <span>
                {displayScopes || t.common.notSpecified}
                {moreCount > 0 && <span style={{ color: '#1890ff' }}> {t.common.and || 'and'} {moreCount} {t.common.more || 'more'}...</span>}
              </span>
            )
          }
          
          // Step 4: Final fallback - no data available
          return <span style={{ color: '#999' }}>{t.common.notSpecified}</span>
        } catch (error) {
          console.error('Error rendering work scope:', error, record)
          // Ultimate fallback - always return something valid
          if (record?.workType) {
            const workTypeLabel = translateWorkType(record.workType, language || 'en')
            return <span>{workTypeLabel || record.workType || t.common.notSpecified}</span>
          }
          return <span style={{ color: '#999' }}>{t.common.notSpecified}</span>
        }
      }
    },
    {
      title: t.contracts.totalAmount,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number | undefined, record: ContractWithKey) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {formatCurrencyWithSymbol(amount || 0, (record as any).currency || branchCurrency)}
        </span>
      )
    },
    {
      title: t.contracts.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusLabels[status] || { text: status, color: 'default', icon: null }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    },
    {
      title: t.common.actions,
      key: 'actions',
      render: (_: unknown, record: ContractWithKey) => (
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
            {t.common.view}
          </Button>
          <Button
            type="link"
            icon={<CalendarOutlined />}
            onClick={() => {
              setSelectedContract(record)
              
              // CRITICAL FIX: Load dates properly for HTML date inputs (must be YYYY-MM-DD string format)
              const startDateValue = record.startDate || record.start_date
              const endDateValue = record.endDate || record.end_date
              
              let startDateStr: string | null = null
              let endDateStr: string | null = null
              
              // Parse start date to YYYY-MM-DD string format
              if (startDateValue) {
                if (moment.isMoment(startDateValue)) {
                  startDateStr = startDateValue.isValid() ? startDateValue.format('YYYY-MM-DD') : null
                } else if (typeof startDateValue === 'string') {
                  const parsed = moment(startDateValue, 'YYYY-MM-DD', true)
                  startDateStr = parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
                } else if (startDateValue && typeof startDateValue === 'object' && 'getTime' in startDateValue) {
                  const dateStr = moment(startDateValue).format('YYYY-MM-DD')
                  const parsed = moment(dateStr, 'YYYY-MM-DD', true)
                  startDateStr = parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
                } else {
                  const dateStr = String(startDateValue).split('T')[0]
                  const parsed = moment(dateStr, 'YYYY-MM-DD', true)
                  startDateStr = parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
                }
              }
              
              // Parse end date to YYYY-MM-DD string format
              if (endDateValue) {
                if (moment.isMoment(endDateValue)) {
                  endDateStr = endDateValue.isValid() ? endDateValue.format('YYYY-MM-DD') : null
                } else if (typeof endDateValue === 'string') {
                  const parsed = moment(endDateValue, 'YYYY-MM-DD', true)
                  endDateStr = parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
                } else if (endDateValue && typeof endDateValue === 'object' && 'getTime' in endDateValue) {
                  const dateStr = moment(endDateValue).format('YYYY-MM-DD')
                  const parsed = moment(dateStr, 'YYYY-MM-DD', true)
                  endDateStr = parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
                } else {
                  const dateStr = String(endDateValue).split('T')[0]
                  const parsed = moment(dateStr, 'YYYY-MM-DD', true)
                  endDateStr = parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
                }
              }
              
              // Set form values as strings (HTML date input requires string in YYYY-MM-DD format)
              datesEditForm.setFieldsValue({
                startDate: startDateStr || '',
                endDate: endDateStr || ''
              })
              
              setDatesEditModalVisible(true)
            }}
            >
            {t.contracts.editDates}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={async () => {
              setSelectedContract(record)
              
              let customer: Customer | null = null
              if (record.customerId) {
                customer = customers.find((c: Customer) => c.id === record.customerId) || null
                if (!customer) {
                  try {
                    const fetchedCustomer = await customersService.getCustomer(record.customerId)
                    if (fetchedCustomer) {
                      customer = fetchedCustomer
                      setCustomers((prev: Customer[]) => [...prev.filter((c: Customer) => c.id !== customer!.id), customer!])
                    }
                  } catch (error) {
                    console.error('Error loading customer:', error)
                  }
                }
              }
              
              if (!customer && record.customerName) {
                customer = {
                  id: record.customerId || '',
                  name: record.customerName,
                  phone: record.customerPhone,
                  email: record.customerEmail || '',
                  balance: 0,
                  totalOrders: 0,
                  totalSpent: 0,
                  createdBy: 'system'
                }
              }
              
              setSelectedCustomer(customer)
              
              form.setFieldsValue({
                customerSearch: record.customerName,
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
            {t.common.edit}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setContractToDelete(record)
              deleteForm.resetFields()
              setDeleteModalVisible(true)
            }}
          >
            {t.common.delete}
          </Button>
        </Space>
      )
    }
  ], [customers, quotations, t, language, contracts])

  // Memoize filtered contracts to ensure Table always uses fresh data
  const filteredContracts = useMemo(() => {
    // CRITICAL: Always return an array, never undefined/null
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return []
    }
    
    // Filter contracts safely
    const filtered = contracts.filter((contract: ContractWithKey) => {
      // Skip invalid contracts
      if (!contract || !contract.id) {
        return false
      }
      
      // Search filter
      const matchesSearch =
        contract.contractNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
        contract.customerName?.toLowerCase().includes(searchText.toLowerCase())
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    
    return filtered
  }, [contracts, searchText, statusFilter])

  // Dynamic rowKey function that includes updated timestamp to force re-render
  const getRowKey = (record: ContractWithKey): string => {
    if (!record || !record.id) {
      return `contract-${Date.now()}-${Math.random()}`
    }
    const timestamp = record.updatedAt || record.updated_at || record.lastUpdated || ''
    const dateKey = record.startDate || record.start_date || ''
    return `${record.id}-${timestamp}-${dateKey}`
  }

  const handleCustomerSearch = async (searchText: string): Promise<void> => {
    if (!searchText || searchText.trim() === '') {
      setCustomerSearchOptions([])
      return
    }

    try {
      const searchResults = await customersService.searchCustomers(searchText)
      const options: CustomerSearchOption[] = searchResults.map((customer: Customer) => ({
        value: customer.name,
        label: `${customer.name} - ${customer.phone}${customer.email ? ` (${customer.email})` : ''}`,
        customer: customer
      }))
      setCustomerSearchOptions(options)
    } catch (error) {
      console.error('Error searching customers:', error)
      setCustomerSearchOptions([])
    }
  }

  const handleCustomerSelect = (value: string, option: CustomerSearchOption): void => {
    const customer = option?.customer || customers.find((c: Customer) => c.name === value || c.id === value) || null
    if (customer) {
      setSelectedCustomer(customer)
      form.setFieldsValue({
        customerSearch: customer.name,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || ''
      })
    }
  }

  const handleCustomerChange = (value: string): void => {
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
      const customer = customers.find((c: Customer) => c.name === value || c.id === value) || null
      if (customer && value !== customer.name) {
        form.setFieldsValue({
          customerSearch: customer.name
        })
      }
    }
  }

  const handleSave = async (): Promise<void> => {
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
        message.success(selectedContract ? t.contracts.contractUpdated : t.contracts.contractCreated)
        setIsModalVisible(false)
        setSelectedContract(null)
        setSelectedCustomer(null)
        setContractItems([])
        form.resetFields()
        await Promise.all([loadContracts(), loadQuotations()])
      } else {
        message.error(result.error || t.contracts.failedToSave)
      }
    } catch (error: unknown) {
      console.error('Validation failed:', error)
      if (error && typeof error === 'object' && 'errorFields' in error) {
        message.error(t.contracts.fillRequiredFields)
      } else {
        message.error(t.contracts.failedToSave)
      }
    }
  }

  // Handle updating contract dates only
  const handleUpdateDates = async (): Promise<void> => {
    try {
      const values = await datesEditForm.validateFields()

      // TASK 3: Prevent empty saves - Validate that start date is provided for active contracts
      if (!selectedContract) {
        message.error('No contract selected')
        return
      }

      // Parse dates from HTML date input (values are strings in YYYY-MM-DD format)
      let startMoment: moment.Moment | null = null
      let endMoment: moment.Moment | null = null
      
      if (values.startDate && values.startDate.trim() !== '') {
        startMoment = moment(values.startDate, 'YYYY-MM-DD', true)
        if (!startMoment.isValid()) {
          message.error('Invalid start date format')
          return
        }
        startMoment = startMoment.startOf('day')
      } else {
        // TASK 3: Prevent empty saves - Require start date for active contracts
        if (selectedContract.status === 'in_progress') {
          message.error('Start date is required for active contracts')
          return
        }
      }
      
      if (values.endDate && values.endDate.trim() !== '') {
        endMoment = moment(values.endDate, 'YYYY-MM-DD', true)
        if (!endMoment.isValid()) {
          message.error('Invalid end date format')
          return
        }
        endMoment = endMoment.startOf('day')
      }

      // Validate date range
      if (startMoment && endMoment) {
        if (endMoment.isBefore(startMoment)) {
          message.error('End date must be after start date')
          return
        }
      }

      const newStartDate = startMoment && startMoment.isValid() 
        ? startMoment.format('YYYY-MM-DD') 
        : null
      const newEndDate = endMoment && endMoment.isValid() 
        ? endMoment.format('YYYY-MM-DD') 
        : null

      const apiPayload = {
        startDate: newStartDate,
        endDate: newEndDate
      }

      const result = await contractsService.updateContract(selectedContract.id, apiPayload)

      if (result.success) {
        message.success(t.contracts.datesUpdated)
        
        // CRITICAL FIX: Force Table re-render using deep-copy approach with findIndex
        const updateTimestamp = new Date().toISOString()
        setContracts((prevContracts: ContractWithKey[]) => {
          const updated = [...prevContracts]
          const index = updated.findIndex((c: ContractWithKey) => c.id === selectedContract.id)
          
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              startDate: newStartDate || undefined,
              start_date: newStartDate || undefined,
              endDate: newEndDate || undefined,
              end_date: newEndDate || undefined,
              lastUpdated: Date.now(),
              updatedAt: updateTimestamp,
              updated_at: updateTimestamp,
              key: updated[index].key || updated[index].id
            }
          }
          
          return updated
        })

        setDatesEditModalVisible(false)
        setSelectedContract(null)
        datesEditForm.resetFields()

      } else {
        message.error(result.error || t.contracts.failedToUpdate)
      }
    } catch (error: unknown) {
      console.error('🔴 [handleUpdateDates] Error:', error)
      if (error && typeof error === 'object' && 'errorFields' in error) {
        message.error('Please verify the entered dates')
      } else {
        message.error(t.contracts.failedToUpdate)
      }
    }
  }

  // Handle payment project selection change
  const handlePaymentProjectChange = (projectId: string | null): void => {
    setSelectedPaymentProject(projectId)
    
    if (projectId) {
      const project = projects.find((p: Project) => p.id === projectId)
      if (project && project.workScopes && Array.isArray(project.workScopes) && project.workScopes.length > 0) {
        setAvailablePaymentWorkScopes(project.workScopes)
      } else {
        setAvailablePaymentWorkScopes([])
      }
    } else {
      setAvailablePaymentWorkScopes([])
    }
    
    paymentForm.setFieldsValue({ workScope: undefined })
  }

  const handleAddPayment = async (): Promise<void> => {
    try {
      const values = await paymentForm.validateFields()

      if (!selectedContract) {
        message.error(t.contracts.selectContract)
        return
      }

      if (!values.treasuryAccountId) {
        message.error(t.contracts.selectTreasuryAccountRequired)
        return
      }

      const transactionDate = values.status === 'paid' && values.paidDate
        ? moment(values.paidDate).format('YYYY-MM-DD')
        : (values.dueDate ? moment(values.dueDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'))

      // Get currency from selected treasury account
      const selectedAccount = treasuryAccounts.find(acc => acc.id === values.treasuryAccountId);
      const currency = selectedAccount?.currency || selectedCurrency || 'SAR';

      const paymentData = {
        contractId: selectedContract.id,
        projectId: selectedContract.projectId || null,
        workScope: values.workScope || null,
        paymentType: 'income',
        amount: values.amount,
        dueDate: moment(values.dueDate).format('YYYY-MM-DD'),
        paidDate: values.status === 'paid' ? transactionDate : null,
        status: values.status || 'pending',
        paymentMethod: values.paymentMethod || null,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || '',
        treasuryAccountId: values.treasuryAccountId,
        currency: currency, // Include currency from treasury account
        createdBy: 'user'
      }

      console.log('💾 Saving payment with currency:', currency);

      const result = await paymentsService.createPayment(paymentData)

      if (result.success) {
        if (values.status === 'paid' && values.treasuryAccountId) {
          try {
            await treasuryService.createTransaction({
              accountId: values.treasuryAccountId,
              transactionType: 'inflow',
              amount: values.amount,
              referenceType: 'income',
              referenceId: result.payment.id,
              description: `Contract Payment: ${selectedContract.contractNumber} - ${values.notes || 'Payment from client'}`
            })
          } catch (error) {
            console.error('Error creating treasury transaction:', error)
            message.warning('Payment added successfully, but there was an error updating the treasury')
          }
        }

        message.success(t.contracts.paymentAdded)
        setPaymentModalVisible(false)
        setSelectedPaymentProject(null)
        setAvailablePaymentWorkScopes([])
        setSelectedCurrency('SAR') // Reset to default currency
        paymentForm.resetFields()
        paymentForm.setFieldsValue({ currency: 'SAR' })
        if (selectedContract) {
          await loadContractPayments(selectedContract.id)
        }
        loadTreasuryAccounts()
      } else {
        message.error(result.error || 'Failed to add payment')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      message.error('An error occurred while adding the payment')
    }
  }

  const createContract = (): void => {
    message.warning(
      'You must start with a quotation and convert it to a contract. Please go to the Quotations page and create a new quotation.',
      5
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>
            {t.contracts.title}
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>{t.contracts.subtitle}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={createContract}>
          {t.contracts.newContract}
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.contracts.totalContracts}
              value={stats.totalContracts}
              prefix={<FileProtectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.contracts.inProgress}
              value={stats.inProgress}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.contracts.completed}
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.contracts.totalValue}
              value={stats.totalAmount}
              precision={0}
              prefix={<DollarOutlined />}
              suffix={branchCurrency || 'SAR'}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder={t.contracts.searchByContractNumberPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder={t.contracts.contractStatus}
          >
            <Option value="all">{t.common.all}</Option>
            <Option value="in_progress">{t.contracts.statusInProgress}</Option>
            <Option value="on_hold">{t.contracts.statusOnHold}</Option>
            <Option value="fully_completed">{t.contracts.statusFullyCompleted}</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredContracts}
            loading={false}
            pagination={{ pageSize: 10 }}
            rowKey={getRowKey}
            locale={{
              emptyText: (
                <Empty
                  description={language === 'ar' ? 'لا توجد سجلات لهذا الفرع' : 'No records found for this branch'}
                />
              )
            }}
          />
        </Spin>
      </Card>

      <Modal
        title={selectedContract ? t.contracts.editContract : t.contracts.createContract}
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
        okText={t.common.save}
        cancelText={t.common.cancel}
        width={800}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="quotationId"
            label={t.contracts.acceptedQuotation}
          >
            <Select
              placeholder={t.contracts.selectQuotation}
              allowClear
              showSearch
              onChange={async (quotationId: string | null) => {
                if (quotationId) {
                  const selectedQuotation = quotations.find((q: Quotation) => q.id === quotationId)
                  if (selectedQuotation) {
                    let customer: Customer | null = null
                    if (selectedQuotation.customerId) {
                      customer = customers.find((c: Customer) => c.id === selectedQuotation.customerId) || null
                      if (!customer) {
                        try {
                          const fetchedCustomer = await customersService.getCustomer(selectedQuotation.customerId)
                          if (fetchedCustomer) {
                            customer = fetchedCustomer
                            setCustomers((prev: Customer[]) => [...prev.filter((c: Customer) => c.id !== customer!.id), customer!])
                          }
                        } catch (error) {
                          console.error('Error loading customer:', error)
                        }
                      }
                    }
                    
                    if (!customer && selectedQuotation.customerName) {
                      customer = {
                        id: selectedQuotation.customerId || '',
                        name: selectedQuotation.customerName,
                        phone: selectedQuotation.customerPhone,
                        email: selectedQuotation.customerEmail || '',
                        balance: 0,
                        totalOrders: 0,
                        totalSpent: 0,
                        createdBy: 'system'
                      }
                    }
                    
                    if (customer) {
                      setSelectedCustomer(customer)
                    }
                    
                    form.setFieldsValue({
                      customerSearch: customer?.name || selectedQuotation.customerName,
                      customerName: selectedQuotation.customerName,
                      customerPhone: selectedQuotation.customerPhone || '',
                      customerEmail: selectedQuotation.customerEmail || '',
                      projectName: selectedQuotation.projectName || '',
                      workType: selectedQuotation.workType, // Keep for backward compatibility
                      totalAmount: selectedQuotation.totalAmount
                    })
                  }
                } else {
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
              filterOption={(input: string, option?: { children?: React.ReactNode }) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {quotations.map((q: Quotation) => (
                <Option key={q.id} value={q.id}>
                  {q.quoteNumber} - {q.customerName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="customerSearch"
            label={t.contracts.searchCustomer}
            rules={[{ required: true, message: 'Please search and select a client' }]}
          >
            <AutoComplete
              options={customerSearchOptions}
              onSearch={handleCustomerSearch}
              onSelect={handleCustomerSelect}
              onChange={handleCustomerChange}
              placeholder={t.contracts.searchForClientPlaceholder}
              style={{ width: '100%' }}
              filterOption={false}
              disabled={!!selectedContract && !!selectedContract.quotationId}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label={t.contracts.customerName}
                rules={[{ required: true, message: 'Please enter the name' }]}
              >
                <Input placeholder={t.contracts.clientNamePlaceholder} disabled={!!selectedCustomer} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerPhone"
                label={t.contracts.customerPhone}
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input placeholder={t.contracts.phoneNumberPlaceholder} disabled={!!selectedCustomer} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contractType"
                label={t.contracts.contractType}
                rules={[{ required: true, message: 'Please select contract type' }]}
                initialValue="original"
              >
                <Select placeholder={t.contracts.selectContractType}>
                  <Option value="original">{t.contracts.originalContract}</Option>
                  <Option value="amendment">{t.contracts.amendment}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="workType"
                label={t.contracts.workScope || t.quotations.workScope || 'Work Scope'}
                tooltip={t.contracts.workScopeFromQuotation || 'Work Scope is inherited from the selected quotation'}
              >
                <Select 
                  placeholder={t.contracts.selectWorkType} 
                  disabled={!!form.getFieldValue('quotationId')}
                  showSearch 
                  filterOption={(input: string, option?: { label?: string }) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {Object.keys(workTypeGroups).map((groupKey: string) => (
                    <Select.OptGroup key={groupKey} label={workTypeGroups[groupKey]}>
                      {workTypeCategories
                        .filter((cat: WorkTypeCategory) => cat.group === groupKey)
                        .map((category: WorkTypeCategory) => (
                          <Option key={category.value} value={category.value} label={category.label}>
                            {category.label}
                          </Option>
                        ))}
                    </Select.OptGroup>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.quotationId !== currentValues.quotationId}
              >
                {({ getFieldValue }) => {
                  const quotationId = getFieldValue('quotationId')
                  if (quotationId) {
                    const selectedQuotation = quotations.find((q: Quotation) => q.id === quotationId)
                    if (selectedQuotation && selectedQuotation.workScopes && selectedQuotation.workScopes.length > 0) {
                      const translatedScopes = translateWorkScopes(selectedQuotation.workScopes, language || 'en')
                      return (
                        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                            {t.contracts.workScopeFromQuotation || 'Work Scopes from Quotation'}:
                          </div>
                          <div>
                            {translatedScopes.map((scope, idx) => (
                              <Tag key={idx} style={{ marginBottom: 4 }}>{scope}</Tag>
                            ))}
                          </div>
                        </div>
                      )
                    }
                  }
                  return null
                }}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="totalAmount"
                label={t.contracts.totalAmountLabel}
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder={t.contracts.amountPlaceholder}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t.contracts.statusLabel}
                initialValue="in_progress"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select>
                  <Option value="in_progress">{t.contracts.statusInProgress}</Option>
                  <Option value="on_hold">{t.contracts.statusOnHold}</Option>
                  <Option value="fully_completed">{t.contracts.statusFullyCompleted}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="startDate" 
                label={t.contracts.startDate}
                getValueFromEvent={(e) => e.target.value ? moment(e.target.value) : null}
                getValueProps={(value) => ({
                  value: value ? (moment.isMoment(value) ? value.format('YYYY-MM-DD') : moment(value).format('YYYY-MM-DD')) : ''
                })}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  disabled
                  readOnly
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="endDate" 
                label={t.contracts.endDate}
                getValueFromEvent={(e) => e.target.value ? moment(e.target.value) : null}
                getValueProps={(value) => ({
                  value: value ? (moment.isMoment(value) ? value.format('YYYY-MM-DD') : moment(value).format('YYYY-MM-DD')) : ''
                })}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  disabled
                  readOnly
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="projectName"
            label={t.contracts.projectNameLabel}
            rules={[{ required: true, message: 'Please enter project name' }]}
          >
            <Input placeholder={t.contracts.projectNamePlaceholder} />
          </Form.Item>

          {industryType === 'engineering' && (
            <Form.Item name="projectId" label={`${t.contracts.projectName} ${t.common.optional}`}>
              <Select
                placeholder={t.contracts.selectProjectPlaceholder}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {projects.map((project: Project) => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="notes" label={t.contracts.notesLabel}>
            <Input.TextArea rows={3} placeholder={t.contracts.additionalNotesPlaceholder} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t.contracts.contractDetails} ${selectedContract?.contractNumber}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button
            key="add-payment"
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={() => {
              setSelectedCurrency('SAR') // Reset to default currency
              paymentForm.resetFields()
              paymentForm.setFieldsValue({ currency: 'SAR' })
              setSelectedPaymentProject(null)
              setAvailablePaymentWorkScopes([])
              setPaymentModalVisible(true)
            }}
          >
            {t.contracts.addPayment}
          </Button>,
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            {t.common.close}
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
                label: t.contracts.contractDetails,
                children: (
                  <>
                    <Descriptions column={2} size="small" style={{ marginTop: 16 }}>
                      <Descriptions.Item label={t.contracts.contractNumber}>
                        {selectedContract.contractNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.contractDate}>
                        {selectedContract.createdAt ? moment(selectedContract.createdAt).format('DD-MMM-YYYY') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.clientName}>
                        {selectedContract.customerName}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.customerPhone}>
                        {selectedContract.customerPhone}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.contractType}>
                        {contractTypeLabels[selectedContract.contractType] || selectedContract.contractType}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.projectName}>
                        {selectedContract.projectName || t.contracts.notSpecified}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.workScope || t.quotations.workScope || 'Work Scope'}>
                        {(() => {
                          // Get workScopes from associated quotation
                          let workScopes: string[] = []
                          if (selectedContract.quotationId && quotations.length > 0) {
                            const associatedQuotation = quotations.find((q: Quotation) => q.id === selectedContract.quotationId)
                            if (associatedQuotation && associatedQuotation.workScopes && Array.isArray(associatedQuotation.workScopes)) {
                              workScopes = associatedQuotation.workScopes
                            }
                          }
                          
                          // If no workScopes found, return not specified
                          if (!workScopes || workScopes.length === 0) {
                            return <span style={{ color: '#999' }}>{t.common.notSpecified}</span>
                          }
                          
                          // Display all work scopes as tags (matching QuotationsPage view modal format)
                          const translatedScopes = translateWorkScopes(workScopes, language || 'en')
                          return (
                            <div>
                              {translatedScopes.map((scope, idx) => (
                                <Tag key={idx} style={{ marginBottom: 4 }}>{scope}</Tag>
                              ))}
                            </div>
                          )
                        })()}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.totalAmount}>
                        {formatCurrencyWithSymbol(selectedContract.totalAmount || 0, (selectedContract as any).currency || branchCurrency)}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.status}>
                        <Tag color={statusLabels[selectedContract.status]?.color}>
                          {statusLabels[selectedContract.status]?.text}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.startDate}>
                        {(() => {
                          const dateValue = selectedContract.startDate || selectedContract.start_date
                          if (!dateValue) return '-'
                          const parsed = moment(dateValue, 'YYYY-MM-DD', true)
                          return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
                        })()}
                      </Descriptions.Item>
                      <Descriptions.Item label={t.contracts.endDate}>
                        {(() => {
                          const dateValue = selectedContract.endDate || selectedContract.end_date
                          if (!dateValue) return '-'
                          const parsed = moment(dateValue, 'YYYY-MM-DD', true)
                          return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
                        })()}
                      </Descriptions.Item>
                      {selectedContract.quotationId && (
                        <Descriptions.Item label={t.contracts.quotationSource}>
                          {(() => {
                            const quotation = quotations.find((q: Quotation) => q.id === selectedContract.quotationId)
                            return quotation ? quotation.quoteNumber : (selectedContract.quotationId.length > 20 ? 'Quotation' : selectedContract.quotationId)
                          })()}
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {selectedContract.items && selectedContract.items.length > 0 && (
                      <>
                        <Divider />
                        <h4>{t.contracts.contractItems}</h4>
                        <Table
                          dataSource={selectedContract.items}
                          columns={[
                            { title: t.contracts.description, dataIndex: 'itemDescription', key: 'description' },
                            { title: t.contracts.quantity, dataIndex: 'quantity', key: 'quantity' },
                            {
                              title: t.contracts.unitPrice,
                              dataIndex: 'unitPrice',
                              key: 'unitPrice',
                              render: (price: number) => formatCurrencyWithSymbol(price || 0, (selectedContract as any).currency || branchCurrency)
                            },
                            {
                              title: t.contracts.itemTotal,
                              dataIndex: 'total',
                              key: 'total',
                              render: (total: number) => formatCurrencyWithSymbol(total || 0)
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
                        <p><strong>{t.common.notes}:</strong> {selectedContract.notes}</p>
                      </>
                    )}
                  </>
                )
              },
              {
                key: 'payments',
                label: t.contracts.payments,
                children: (
                  <Table
                    dataSource={selectedContractPayments}
                    columns={[
                      { 
                        title: t.contracts.paymentNumber, 
                        dataIndex: 'paymentNumber', 
                        key: 'paymentNumber',
                        render: (paymentNumber: string, record: PaymentWithProject) => (
                          <div>
                            <div style={{ fontWeight: 500 }}>{paymentNumber}</div>
                            {record.isGeneralExpense && (
                              <Tag color="purple" style={{ marginTop: 4 }}>
                                {t.contracts.generalExpense}
                              </Tag>
                            )}
                          </div>
                        )
                      },
                      ...(industryType === 'engineering' ? [{
                        title: 'Project Name / Category',
                        dataIndex: 'projectName',
                        key: 'projectName',
                        render: (projectName: string | null | undefined, record: PaymentWithProject) => {
                          if (record.isGeneralExpense && record.expenseCategory) {
                            return (
                              <div>
                                <Tag color="purple">{record.expenseCategory}</Tag>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                                  {t.contracts.generalExpense}
                                </div>
                              </div>
                            )
                          }
                          return (
                            <span style={{ fontWeight: 500 }}>{projectName || t.contracts.notSpecified}</span>
                          )
                        },
                      }] : []),
                      {
                        title: t.common.amount,
                        dataIndex: 'amount',
                        key: 'amount',
                        render: (amount: number) => formatCurrencyWithSymbol(amount || 0, (selectedContract as any).currency || branchCurrency)
                      },
                      {
                        title: t.contracts.dueDate,
                        dataIndex: 'dueDate',
                        key: 'dueDate',
                        render: (date: string) => date ? moment(date, 'YYYY-MM-DD', true).isValid() 
                          ? moment(date, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                          : '-' : '-'
                      },
                      {
                        title: t.contracts.paidDate,
                        dataIndex: 'paidDate',
                        key: 'paidDate',
                        render: (date: string | null | undefined) => date ? moment(date, 'YYYY-MM-DD', true).isValid()
                          ? moment(date, 'YYYY-MM-DD', true).format('DD-MMM-YYYY')
                          : '-' : '-'
                      },
                      {
                        title: t.contracts.status,
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => {
                          const statusConfig: Record<string, { text: string; color: string }> = {
                            pending: { text: t.contracts.statusPending, color: 'orange' },
                            paid: { text: t.contracts.statusPaid, color: 'green' },
                            overdue: { text: t.contracts.statusOverdue, color: 'red' },
                            cancelled: { text: t.contracts.statusCancelled, color: 'default' }
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
        title={t.contracts.newPayment}
        open={paymentModalVisible}
        onOk={handleAddPayment}
        onCancel={() => {
          setPaymentModalVisible(false)
          setSelectedPaymentProject(null)
          setAvailablePaymentWorkScopes([])
          setSelectedCurrency('SAR') // Reset to default currency
          paymentForm.resetFields()
          paymentForm.setFieldsValue({ currency: 'SAR' })
        }}
        okText={t.common.add}
        cancelText={t.common.cancel}
        width={600}
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 24 }}>
          {industryType === 'engineering' && (
            <>
              <Form.Item
                name="projectId"
                label={`${t.contracts.projectName} ${t.common.optional}`}
              >
                <Select
                  placeholder={t.contracts.selectProjectPlaceholder}
                  allowClear
                  showSearch
                  onChange={handlePaymentProjectChange}
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {projects.map((project: Project) => (
                    <Option key={project.id} value={project.id}>
                      {project.name} {project.client?.name ? `- ${project.client.name}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              {selectedPaymentProject && availablePaymentWorkScopes.length > 0 && (
                <Form.Item
                  name="workScope"
                  label={`Work Scope ${t.common.optional}`}
                >
                  <Select
                    placeholder={t.contracts.selectWorkScopePlaceholder}
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {availablePaymentWorkScopes.map((scope: string) => (
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
            label={t.contracts.paymentAmount}
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder={t.contracts.amountPlaceholder}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label={t.contracts.dueDate}
                rules={[{ required: true, message: 'Please select due date' }]}
                getValueFromEvent={(e) => e.target.value ? moment(e.target.value) : null}
                getValueProps={(value) => ({
                  value: value ? (moment.isMoment(value) ? value.format('YYYY-MM-DD') : moment(value).format('YYYY-MM-DD')) : ''
                })}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t.contracts.paymentStatus}
                initialValue="pending"
              >
                <Select>
                  <Option value="pending">{t.contracts.statusPending}</Option>
                  <Option value="paid">{t.contracts.statusPaid}</Option>
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
                  label={t.contracts.paidDate}
                  rules={[{ required: true, message: 'Please select payment date' }]}
                  getValueFromEvent={(e) => e.target.value ? moment(e.target.value) : null}
                  getValueProps={(value) => ({
                    value: value ? (moment.isMoment(value) ? value.format('YYYY-MM-DD') : moment(value).format('YYYY-MM-DD')) : ''
                  })}
                >
                  <input
                    type="date"
                    className="ant-input"
                    style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          {treasuryAccounts.length === 0 && (
            <Alert
              type="error"
              description="Warning: No treasury accounts defined. Please create an account in the Treasury page first."
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <Form.Item
            name="treasuryAccountId"
            label={t.contracts.treasuryAccount}
            rules={[{ required: true, message: t.contracts.selectTreasuryAccountRequired }]}
            tooltip="Select the account where the amount will be deposited"
          >
            <Select
              placeholder={t.contracts.selectTreasuryAccount}
              disabled={treasuryAccounts.length === 0}
              notFoundContent={treasuryAccounts.length === 0 ? 'No treasury accounts' : null}
              onChange={(accountId) => {
                // Sync currency when treasury account is selected
                const account = treasuryAccounts.find(acc => acc.id === accountId);
                const currency = account?.currency || 'SAR';
                setSelectedCurrency(currency);
                paymentForm.setFieldsValue({ currency });
                console.log('✅ Currency synced to treasury account:', { accountId, currency });
              }}
            >
              {treasuryAccounts.map((acc: TreasuryAccount) => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                  {acc.currency && acc.currency !== 'SAR' ? ` - ${acc.currency}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Currency Field - Auto-synced and locked when treasury is selected */}
          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true, message: 'Currency is required' }]}
            tooltip="Currency is automatically set based on the selected treasury account"
          >
            <Select
              disabled={true} // Lock currency field - it's synced from treasury
              placeholder={t.contracts.currencyAutoSetPlaceholder}
            >
              <Option value={selectedCurrency}>{selectedCurrency}</Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label={t.contracts.notesLabel}>
            <Input.TextArea rows={3} placeholder={t.contracts.additionalNotesPlaceholder} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t.contracts.updateDatesTitle} ${selectedContract?.contractNumber}`}
        open={datesEditModalVisible}
        onOk={handleUpdateDates}
        onCancel={() => {
          setDatesEditModalVisible(false)
          setSelectedContract(null)
          datesEditForm.resetFields()
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width={500}
      >
        <Form form={datesEditForm} layout="vertical" style={{ marginTop: 24 }}>
          <Alert
            type="info"
            title="Note"
            description={t.contracts.datesUpdateNote}
            style={{ marginBottom: 16 }}
            showIcon
          />
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label={t.contracts.startDate}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value) => {
                      // Require start date for active contracts
                      if (!value && selectedContract?.status === 'in_progress') {
                        return Promise.reject(new Error('Start date is required for active contracts'))
                      }
                      return Promise.resolve()
                    }
                  })
                ]}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  placeholder={t.contracts.selectStartDatePlaceholder}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label={t.contracts.endDate}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value) => {
                      const startDate = getFieldValue('startDate')
                      if (value && startDate) {
                        const start = moment(startDate, 'YYYY-MM-DD', true)
                        const end = moment(value, 'YYYY-MM-DD', true)
                        if (end.isBefore(start)) {
                          return Promise.reject(new Error('End date must be after start date'))
                        }
                      }
                      return Promise.resolve()
                    }
                  })
                ]}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  placeholder={t.contracts.selectEndDatePlaceholder}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Secure Deletion Modal (Banking Protocol) */}
      <Modal
        title={language === 'ar' ? `حذف العقد - ${contractToDelete?.contractNumber}` : `Delete Contract - ${contractToDelete?.contractNumber}`}
        open={deleteModalVisible}
        onOk={async () => {
          try {
            const values = await deleteForm.validateFields()
            
            if (!contractToDelete) {
              message.error('No contract selected for deletion')
              return
            }

            const result = await contractsService.deleteContract(
              contractToDelete.id,
              values.password,
              values.deletionReason
            )

            if (result.success) {
              message.success(t.contracts.contractDeleted)
              setDeleteModalVisible(false)
              setContractToDelete(null)
              deleteForm.resetFields()
              loadContracts()
            } else {
              message.error(result.error || t.contracts.failedToDelete)
            }
          } catch (error) {
            console.error('Error deleting contract:', error)
            if (error.errorFields) {
              message.error('Please fill all required fields')
            } else {
              message.error(t.contracts.failedToDelete)
            }
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false)
          setContractToDelete(null)
          deleteForm.resetFields()
        }}
        okText={language === 'ar' ? 'حذف' : 'Delete'}
        cancelText={t.common.cancel}
        okButtonProps={{ danger: true }}
        width={600}
      >
        <Alert
          type="warning"
          message={language === 'ar' ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه' : 'Warning: This action cannot be undone'}
          description={language === 'ar' ? 'سيتم حذف العقد وجميع بياناته المرتبطة. يرجى إدخال كلمة المرور للتأكيد.' : 'This will permanently delete the contract and all associated data. Please enter your password to confirm.'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={deleteForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="password"
            label={language === 'ar' ? 'كلمة المرور' : 'Password'}
            rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password' }]}
          >
            <Input.Password
              placeholder={language === 'ar' ? 'أدخل كلمة المرور للتأكيد' : 'Enter password to confirm'}
              autoComplete="current-password"
            />
          </Form.Item>
          
          <Form.Item
            name="deletionReason"
            label={language === 'ar' ? 'سبب الحذف' : 'Deletion Reason'}
            rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال سبب الحذف' : 'Please provide a reason for deletion' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={language === 'ar' ? 'اشرح سبب حذف هذا العقد...' : 'Explain why you are deleting this contract...'}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ContractsPage
