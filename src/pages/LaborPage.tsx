'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import employeesService from '../services/employeesService'
import laborGroupsService from '../services/laborGroupsService'
import projectsService from '../services/projectsService'
import treasuryService from '../services/treasuryService'
import paymentsService from '../services/paymentsService'
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
  InputNumber,
  Typography,
  Divider,
  Empty,
  Spin,
  Tabs,
  Checkbox,
  Alert,
  Descriptions,
  Radio
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BankOutlined,
  WalletOutlined,
  EyeOutlined,
  PrinterOutlined
} from '@ant-design/icons'
import moment from 'moment'
import dayjs from 'dayjs'

const { Option } = Select
const { Title, Text } = Typography
const { TextArea } = Input

const LaborPage = () => {
  const { language } = useLanguage()
  const t = getTranslations(language)
  
  // Tab state
  const [activeTab, setActiveTab] = useState('internal-staff')

  // ========== Internal Staff State ==========
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [isEmployeeModalVisible, setIsEmployeeModalVisible] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeForm] = Form.useForm()

  // ========== External Labor Groups State ==========
  const [laborGroups, setLaborGroups] = useState([])
  const [laborGroupsLoading, setLaborGroupsLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [treasuryAccounts, setTreasuryAccounts] = useState([])
  const [engineerAdvances, setEngineerAdvances] = useState([])
  
  // Modals
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false)
  const [isCloseGroupModalVisible, setIsCloseGroupModalVisible] = useState(false)
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false)
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false)
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false)
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false)
  
  // Forms
  const [groupForm] = Form.useForm()
  const [closeGroupForm] = Form.useForm()
  const [approvalForm] = Form.useForm()
  const [paymentForm] = Form.useForm()
  
  // Selected group
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedGroupForApproval, setSelectedGroupForApproval] = useState(null)
  const [selectedGroupForPayment, setSelectedGroupForPayment] = useState(null)
  const [selectedGroupForReceipt, setSelectedGroupForReceipt] = useState(null)
  const [summaryCalculations, setSummaryCalculations] = useState(null)
  const [receiptData, setReceiptData] = useState<any>(null)
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'treasury' | 'advance' | null>(null)
  const [selectedAdvance, setSelectedAdvance] = useState<any>(null)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'external-labor') {
      loadLaborGroups()
      loadProjects()
      loadTreasuryAccounts()
    }
  }, [activeTab])

  const loadData = async () => {
    if (activeTab === 'internal-staff') {
      await loadEmployees()
    }
  }

  // ========== Internal Staff Functions ==========
  const loadEmployees = async () => {
    setEmployeesLoading(true)
    try {
      const data = await employeesService.getEmployees()
      setEmployees(data || [])
    } catch (error) {
      console.error('Error loading employees:', error)
      message.error(t.labor.failedToLoadEmployees)
    } finally {
      setEmployeesLoading(false)
    }
  }

  const handleAddEmployee = () => {
    setSelectedEmployee(null)
    employeeForm.resetFields()
    setIsEmployeeModalVisible(true)
  }

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee)
    employeeForm.setFieldsValue({
      name: employee.name,
      employeeId: employee.employeeId,
      jobTitle: employee.jobTitle,
      monthlySalary: employee.monthlySalary
    })
    setIsEmployeeModalVisible(true)
  }

  const handleSaveEmployee = async (values: any) => {
    try {
      const employeeData = {
        name: values.name,
        employeeId: values.employeeId,
        jobTitle: values.jobTitle,
        monthlySalary: values.monthlySalary || 0
      }

      let result
      if (selectedEmployee) {
        result = await employeesService.updateEmployee(selectedEmployee.id, employeeData)
      } else {
        result = await employeesService.addEmployee(employeeData)
      }

      if (result.success) {
        message.success(selectedEmployee ? t.labor.employeeUpdated : t.labor.employeeAdded)
        setIsEmployeeModalVisible(false)
        employeeForm.resetFields()
        setSelectedEmployee(null)
        await loadEmployees()
      } else {
        message.error(result.error || t.labor.failedToSaveEmployee)
      }
    } catch (error) {
      console.error('Error saving employee:', error)
      message.error(t.labor.errorSavingEmployee || 'Error occurred while saving employee')
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    try {
      const result = await employeesService.deleteEmployee(id)
      if (result.success) {
        message.success(t.labor.employeeDeleted)
        await loadEmployees()
      } else {
        message.error(result.error || t.labor.failedToDeleteEmployee)
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      message.error(t.labor.errorDeletingEmployee || 'Error occurred while deleting employee')
    }
  }

  // ========== External Labor Groups Functions ==========
  const loadLaborGroups = async () => {
    setLaborGroupsLoading(true)
    try {
      const data = await laborGroupsService.getLaborGroups()
      setLaborGroups(data || [])
    } catch (error) {
      console.error('Error loading labor groups:', error)
      message.error(t.labor.failedToLoadGroups)
    } finally {
      setLaborGroupsLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const data = await projectsService.getActiveProjects()
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      message.error(t.labor.failedToLoadProjects || 'Failed to load projects')
    }
  }

  const loadTreasuryAccounts = async () => {
    try {
      const data = await treasuryService.getAccounts()
      setTreasuryAccounts(data || [])
    } catch (error) {
      console.error('Error loading treasury accounts:', error)
    }
  }

  const loadEngineerAdvances = async (engineerName: string, engineerId: string | null = null) => {
    try {
      const data = await laborGroupsService.getEngineerAdvances(engineerName, engineerId)
      setEngineerAdvances(data || [])
    } catch (error) {
      console.error('Error loading engineer advances:', error)
      setEngineerAdvances([])
    }
  }

  const handleAddGroup = async () => {
    setSelectedGroup(null)
    groupForm.resetFields()
    // Refresh projects to ensure we have latest start dates (in case they were backdated via Contracts)
    await loadProjects()
    // Don't auto-fill start date - let user select manually
    setIsGroupModalVisible(true)
  }

  const handleEditGroup = async (group) => {
    if (group.status !== 'active') {
      message.warning(t.labor.cannotEditInactiveGroup || 'Cannot edit inactive group')
      return
    }
    setSelectedGroup(group)
    // Refresh projects to ensure we have latest start dates (in case they were backdated via Contracts)
    await loadProjects()
    // Handle both single projectId and multiple projectIds
    const projectIds = group.projectIds || (group.projectId ? [group.projectId] : [])
    groupForm.setFieldsValue({
      projectIds: projectIds,
      engineerName: group.engineerName,
      startDate: group.startDate ? dayjs(group.startDate) : null,
      normalCount: group.normalCount,
      skilledCount: group.skilledCount,
      normalRate: group.normalRate,
      skilledRate: group.skilledRate,
      holidays: group.holidays || [],
      notes: group.notes
    })
    setIsGroupModalVisible(true)
  }

  const handleSaveGroup = async (values: any) => {
    try {
      // Validate project start dates
      const selectedProjectIds = values.projectIds || []
      if (selectedProjectIds.length === 0) {
        message.error(t.labor.selectAtLeastOneProject)
        return
      }

      // Get selected projects and find the earliest (oldest) start date
      // Start date cannot be earlier than the earliest project start date
      const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))
      if (selectedProjects.length === 0) {
        message.error(t.labor.selectedProjectsNotFound || 'Selected projects not found')
        return
      }

      // Find the earliest (oldest) project start date
      const projectStartDates = selectedProjects
        .map(p => p.startDate ? dayjs(p.startDate) : null)
        .filter(d => d !== null)
        .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending (earliest first)

      const earliestProjectStartDate = projectStartDates.length > 0 ? projectStartDates[0] : null

      // Validate startDate is not earlier than project start date
      // CRITICAL: startDate must be >= earliest project start date (using dayjs for consistency)
      if (earliestProjectStartDate && values.startDate) {
        const selectedStartDate = dayjs(values.startDate).startOf('day')
        const projectStartDate = earliestProjectStartDate.startOf('day')
        if (selectedStartDate.isBefore(projectStartDate, 'day')) {
          message.error(`${t.labor.cannotStartBeforeProjectDate || 'Cannot start labor group before project contract date'} (${projectStartDate.format('YYYY-MM-DD')})`)
          return
        }
      }

      // CRITICAL: Format dates as YYYY-MM-DD strings using dayjs to avoid timezone shifts
      // Use dayjs to ensure consistent date formatting before sending to service
      const formattedStartDate = values.startDate 
        ? dayjs(values.startDate).format('YYYY-MM-DD')
        : null

      const groupData = {
        projectIds: selectedProjectIds,
        engineerName: values.engineerName || (t.labor.defaultEngineer || 'Engineer'),
        startDate: formattedStartDate, // Already formatted as YYYY-MM-DD string
        normalCount: values.normalCount || 0,
        // Skilled labor is optional - only include if provided
        skilledCount: values.skilledCount !== undefined && values.skilledCount !== null ? values.skilledCount : undefined,
        normalRate: values.normalRate || 0,
        skilledRate: values.skilledRate !== undefined && values.skilledRate !== null ? values.skilledRate : undefined,
        holidays: values.holidays || [],
        notes: values.notes || null
      }

      let result
      if (selectedGroup) {
        result = await laborGroupsService.updateLaborGroup(selectedGroup.id, groupData)
      } else {
        result = await laborGroupsService.createLaborGroup(groupData)
      }

      if (result.success) {
        message.success(selectedGroup ? t.labor.groupUpdated : t.labor.groupCreated)
        setIsGroupModalVisible(false)
        groupForm.resetFields()
        setSelectedGroup(null)
        await loadLaborGroups()
      } else {
        message.error(result.error || t.labor.failedToSaveGroup)
      }
    } catch (error) {
      console.error('Error saving group:', error)
      message.error(t.labor.errorSavingGroup || 'Error occurred while saving group')
    }
  }

  const handleCloseGroup = (group) => {
    if (group.status !== 'active') {
      message.warning(t.labor.groupNotActive || 'Group is not active')
      return
    }
    setSelectedGroup(group)
    closeGroupForm.resetFields()
    // Set endDate to startDate (or today if startDate is in the future)
    // The validation will constrain it to max 7 days from the manual startDate
    const startDate = group.startDate ? dayjs(group.startDate) : dayjs()
    const initialEndDate = startDate.isAfter(dayjs()) ? startDate : dayjs()
    closeGroupForm.setFieldsValue({
      endDate: initialEndDate,
      holidays: group.holidays || [],
      overtime: 0,
      deductions: 0,
      deductionReason: null,
      notes: group.notes
    })
    setIsCloseGroupModalVisible(true)
  }

  const handleCloseGroupSubmit = async (values: any) => {
    try {
      if (!selectedGroup) return

      // CRITICAL: Use EXCLUSIVELY manual dates (YYYY-MM-DD format) - NOT created_at or system timestamps
      // Format dates using dayjs to ensure consistent YYYY-MM-DD format
      const manualStartDate = selectedGroup.startDate
        ? dayjs(selectedGroup.startDate).format('YYYY-MM-DD')
        : null
      
      // Ensure endDate is in YYYY-MM-DD format using dayjs
      const manualEndDate = values.endDate 
        ? dayjs(values.endDate).format('YYYY-MM-DD')
        : null

      if (!manualEndDate) {
        message.error(t.labor.endDateRequired || 'End date is required')
        return
      }

      // CRITICAL: Validate startDate >= earliest project start date (same as create)
      if (manualStartDate && selectedGroup.projectIds && selectedGroup.projectIds.length > 0) {
        const selectedProjects = projects.filter(p => selectedGroup.projectIds.includes(p.id))
        if (selectedProjects.length > 0) {
          const projectStartDates = selectedProjects
            .map(p => p.startDate ? dayjs(p.startDate) : null)
            .filter(d => d !== null)
            .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending (earliest first)
          
          const earliestProjectStartDate = projectStartDates.length > 0 ? projectStartDates[0] : null
          
          if (earliestProjectStartDate) {
            const groupStartDate = dayjs(manualStartDate).startOf('day')
            const projectStartDate = earliestProjectStartDate.startOf('day')
            
            if (groupStartDate.isBefore(projectStartDate, 'day')) {
              message.error(`${t.labor.cannotStartBeforeProjectDate || 'Cannot start labor group before project contract date'} (${manualStartDate}) - (${projectStartDate.format('YYYY-MM-DD')})`)
              return
            }
          }
        }
      }

      // Validate: endDate must not be more than 7 days from today
      const today = dayjs().startOf('day')
      const maxAllowedDate = today.add(7, 'day')
      const selectedEndDate = dayjs(manualEndDate).startOf('day')
      
      if (selectedEndDate.isAfter(maxAllowedDate, 'day')) {
        message.error(t.labor.closeDateCannotExceed7Days || 'Close date cannot exceed 7 days from current date')
        return
      }

      // Calculate duration for summary using manual dates (dayjs)
      const startDate = dayjs(manualStartDate)
      const endDate = dayjs(manualEndDate)
      const duration = endDate.diff(startDate, 'day') + 1 // +1 to include both start and end days

      // Calculate preview of final amounts for summary alert
      // CRITICAL: Use EXCLUSIVELY manual dates for calculation
      const holidays = values.holidays || selectedGroup.holidays || []
      const netDays = laborGroupsService.calculateNetDays(
        manualStartDate, // Manual startDate in YYYY-MM-DD format
        manualEndDate,   // Manual endDate in YYYY-MM-DD format
        holidays
      )
      
      const skilledCount = selectedGroup.skilledCount || 0
      const skilledRate = selectedGroup.skilledRate || 0
      const normalTotal = netDays * selectedGroup.normalCount * selectedGroup.normalRate
      const skilledTotal = netDays * skilledCount * skilledRate
      const baseTotal = normalTotal + skilledTotal
      const overtime = parseFloat(values.overtime) || 0
      const deductions = parseFloat(values.deductions) || 0
      const finalTotal = baseTotal + overtime - deductions

      // Show summary alert before closing
      const summaryMessage = `${t.labor.period || 'Period'}: ${startDate.format('YYYY-MM-DD')} ${t.common.to || 'to'} ${endDate.format('YYYY-MM-DD')} (${duration} ${t.common.days || 'days'})`
      
      // Build calculation preview without nested template literals
      const skilledLine = skilledCount > 0 && skilledRate > 0 
        ? `• ${t.labor.skilledLabor}: ${skilledCount} × ${skilledRate.toFixed(2)} × ${netDays} = ${skilledTotal.toFixed(2)} ${t.common.sar}\n`
        : ''
      const overtimeLine = overtime > 0 
        ? `• ${t.labor.overtime || 'Overtime/Bonus'}: +${overtime.toFixed(2)} ${t.common.sar}\n`
        : ''
      const deductionsLine = deductions > 0 
        ? `• ${t.labor.deductions || 'Deductions'}: -${deductions.toFixed(2)} ${t.common.sar}\n`
        : ''
      
      const calculationPreview = `${t.labor.calculationDetails || 'Calculation Details'}:
• ${t.labor.normalLabor}: ${selectedGroup.normalCount} × ${selectedGroup.normalRate.toFixed(2)} × ${netDays} = ${normalTotal.toFixed(2)} ${t.common.sar}
${skilledLine}• ${t.labor.baseTotal || 'Base Total'}: ${baseTotal.toFixed(2)} ${t.common.sar}
${overtimeLine}${deductionsLine}• ${t.labor.finalTotalAmount || 'Final Total Amount'}: ${finalTotal.toFixed(2)} ${t.common.sar}`

      Modal.confirm({
        title: t.labor.confirmCloseGroup || 'Confirm Close Group',
        content: `${summaryMessage}\n\n${calculationPreview}`,
        okText: t.labor.confirmAndClose || 'Confirm and Close',
        cancelText: t.common.cancel,
        width: 600,
        onOk: async () => {
          // CRITICAL: Ensure endDate is saved in YYYY-MM-DD format (manual date from UI)
          const closeData = {
            endDate: manualEndDate, // Already formatted as YYYY-MM-DD
            holidays: values.holidays || [],
            overtime: values.overtime || 0,
            deductions: values.deductions || 0,
            deductionReason: values.deductionReason || null,
            notes: values.notes || null
          }

          const result = await laborGroupsService.closeLaborGroup(selectedGroup.id, closeData)

          if (result.success) {
            setSummaryCalculations({
              ...result.calculations,
              startDate: manualStartDate, // Manual startDate in YYYY-MM-DD format
              endDate: manualEndDate,      // Manual endDate in YYYY-MM-DD format
              duration: duration
            })
            setIsCloseGroupModalVisible(false)
            setIsSummaryModalVisible(true)
            await loadLaborGroups()
          } else {
            message.error(result.error || (t.labor.failedToCloseGroup || 'Failed to close group'))
          }
        }
      })
    } catch (error) {
      console.error('Error closing group:', error)
      message.error(t.labor.errorClosingGroup || 'Error occurred while closing group')
    }
  }

  // Phase 1: Admin approves the group
  const handleApproveGroup = (group) => {
    if (group.status !== 'pending_approval') {
      message.warning(t.labor.groupNotPendingApproval || 'Group is not pending approval')
      return
    }
    setSelectedGroupForApproval(group)
    setIsApprovalModalVisible(true)
  }

  // Phase 2: Accountant processes payment
  const handlePayGroup = (group) => {
    if (group.status !== 'approved_for_payment') {
      message.warning(t.labor.groupNotApprovedForPayment || 'Group is not approved for payment')
      return
    }
    setSelectedGroupForPayment(group)
    setPaymentMethod(null)
    setSelectedAdvance(null)
    paymentForm.resetFields()
    
    // Load engineer advances if engineer name or ID is available
    // CRITICAL: Pass both engineerName and engineerId to fetch correct advances
    if (group.engineerName || group.engineerId) {
      loadEngineerAdvances(group.engineerName || '', group.engineerId || null)
    } else {
      setEngineerAdvances([])
    }
    
    setIsPaymentModalVisible(true)
  }

  // Phase 1: Admin approval (no payment method needed)
  const handleApprovalSubmit = async () => {
    try {
      if (!selectedGroupForApproval) return

      const result = await laborGroupsService.approveLaborGroup(selectedGroupForApproval.id, {})

      if (result.success) {
        message.success(t.labor.groupApproved)
        setIsApprovalModalVisible(false)
        setSelectedGroupForApproval(null)
        await loadLaborGroups()
      } else {
        message.error(result.error || (t.labor.failedToApproveGroup || 'Failed to approve group'))
      }
    } catch (error) {
      console.error('Error approving group:', error)
      message.error(t.labor.errorApprovingGroup || 'Error occurred while approving group')
    }
  }

  // Phase 2: Accountant payment
  const handlePaymentSubmit = async (values: any) => {
    try {
      if (!selectedGroupForPayment) return
      if (!paymentMethod) {
        message.error(t.labor.selectPaymentMethod)
        return
      }

      const paymentData: any = {
        paymentMethod: paymentMethod
      }

      if (paymentMethod === 'treasury') {
        if (!values.treasuryAccountId) {
          message.error(t.labor.selectTreasuryAccount)
          return
        }
        paymentData.treasuryAccountId = values.treasuryAccountId
      } else if (paymentMethod === 'advance') {
        if (!values.linkedAdvanceId) {
          message.error(t.labor.selectAdvance)
          return
        }
        paymentData.linkedAdvanceId = values.linkedAdvanceId
      }

      const result = await laborGroupsService.payLaborGroup(selectedGroupForPayment.id, paymentData)

      if (result.success) {
        message.success(t.labor.groupPaid)
        setIsPaymentModalVisible(false)
        paymentForm.resetFields()
        setSelectedGroupForPayment(null)
        setPaymentMethod(null)
        setSelectedAdvance(null)
        await loadLaborGroups()
      } else {
        message.error(result.error || (t.labor.failedToPayGroup || 'Failed to pay group'))
      }
    } catch (error) {
      console.error('Error paying group:', error)
      message.error(t.labor.errorPayingGroup || 'Error occurred while paying group')
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      const result = await laborGroupsService.deleteLaborGroup(id)
      if (result.success) {
        message.success(t.labor.groupDeleted)
        await loadLaborGroups()
      } else {
        message.error(result.error || t.labor.failedToDeleteGroup)
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      message.error(t.labor.errorDeletingGroup || 'Error occurred while deleting group')
    }
  }

  const handleViewReceipt = async (group: any) => {
    if (group.status !== 'paid') {
      message.warning(t.labor.groupNotPaid || 'Group is not paid')
      return
    }
    
    setSelectedGroupForReceipt(group)
    setIsReceiptModalVisible(true)
    
    // Load treasury transaction if paid via treasury
    if (group.paymentMethod === 'treasury' && group.treasuryAccountId) {
      try {
        const transaction = await laborGroupsService.getTreasuryTransactionForGroup(group.id)
        setReceiptData(transaction)
      } catch (error) {
        console.error('Error loading receipt data:', error)
        setReceiptData(null)
      }
    } else {
      // Paid via advance - no treasury transaction
      setReceiptData(null)
    }
  }

  const handlePrintGroup = (group: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Handle both projectIds (array) and projectId (single) for backward compatibility
    const projectIds = group.projectIds || (group.projectId ? [group.projectId] : [])
    const projectNames = (projectIds || []).map(id => {
      const project = projects.find(p => p.id === id)
      return project ? project.name : id
    }).join(', ')
    const skilledCount = group.skilledCount || 0
    const skilledRate = group.skilledRate || 0
    const normalTotal = group.netDays * group.normalCount * group.normalRate
    const skilledTotal = group.netDays * skilledCount * skilledRate
    const baseTotal = normalTotal + skilledTotal

    const printContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>${language === 'ar' ? 'تقرير مجموعة العمالة' : 'Labor Group Report'} - ${group.id}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Arial', 'Tahoma', sans-serif;
            direction: ${language === 'ar' ? 'rtl' : 'ltr'};
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #1890ff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1890ff;
            margin: 0;
            font-size: 24px;
          }
          .info-section {
            margin-bottom: 25px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #e8e8e8;
          }
          .info-label {
            font-weight: bold;
            color: #666;
            width: 200px;
          }
          .info-value {
            flex: 1;
            text-align: ${language === 'ar' ? 'right' : 'left'};
          }
          .calculation-section {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .calculation-title {
            font-size: 18px;
            font-weight: bold;
            color: #1890ff;
            margin-bottom: 15px;
            border-bottom: 2px solid #1890ff;
            padding-bottom: 10px;
          }
          .calculation-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .calculation-formula {
            color: #666;
            font-style: italic;
          }
          .calculation-result {
            font-weight: bold;
            color: #333;
          }
          .total-row {
            border-top: 2px solid #1890ff;
            padding-top: 15px;
            margin-top: 15px;
            font-size: 18px;
            font-weight: bold;
            color: #1890ff;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #e8e8e8;
            padding-top: 20px;
          }
          .button-container {
            text-align: center;
            margin: 20px 0;
          }
          button {
            background: #1890ff;
            color: white;
            border: none;
            padding: 10px 30px;
            font-size: 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background: #40a9ff;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${language === 'ar' ? 'تقرير مجموعة العمالة الخارجية' : 'External Labor Group Report'}</h1>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">${projectIds.length > 1 ? (language === 'ar' ? 'المشاريع:' : 'Projects:') : (language === 'ar' ? 'المشروع:' : 'Project:')}</span>
            <span class="info-value">${projectNames || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${language === 'ar' ? 'المهندس:' : 'Engineer:'}</span>
            <span class="info-value">${group.engineerName || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${language === 'ar' ? 'تاريخ البداية:' : 'Start Date:'}</span>
            <span class="info-value">${group.startDate ? moment(group.startDate).format('YYYY-MM-DD') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${language === 'ar' ? 'تاريخ النهاية:' : 'End Date:'}</span>
            <span class="info-value">${group.endDate ? moment(group.endDate).format('YYYY-MM-DD') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${language === 'ar' ? 'الأيام الصافية:' : 'Net Days:'}</span>
            <span class="info-value">${group.netDays !== null && group.netDays !== undefined ? group.netDays : '-'} ${language === 'ar' ? 'يوم' : 'days'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${language === 'ar' ? 'الحالة:' : 'Status:'}</span>
            <span class="info-value">${
              group.status === 'active' ? (language === 'ar' ? 'نشط' : t.labor.active) :
              group.status === 'pending_approval' ? (language === 'ar' ? 'بانتظار الموافقة' : t.labor.pendingApproval) :
              group.status === 'approved_for_payment' ? (language === 'ar' ? 'موافق عليه - جاهز للدفع' : t.labor.approvedForPayment) :
              group.status === 'paid' ? (language === 'ar' ? 'مدفوع' : t.labor.paid) :
              group.status || '-'
            }</span>
          </div>
          ${group.notes ? `
          <div class="info-row">
            <span class="info-label">${language === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
            <span class="info-value">${group.notes}</span>
          </div>
          ` : ''}
        </div>

        <div class="calculation-section">
          <div class="calculation-title">${language === 'ar' ? 'تفاصيل الحساب' : (t.labor.calculationDetails || 'Calculation Details')}</div>
          
          <div class="calculation-row">
            <span class="calculation-formula">${language === 'ar' ? 'العمالة العادية:' : (t.labor.normalLabor + ':')}</span>
            <span class="calculation-result">${group.normalCount} × ${group.normalRate.toFixed(2)} × ${group.netDays || 0} = ${new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(normalTotal)}</span>
          </div>

          ${skilledCount > 0 && skilledRate > 0 ? `
          <div class="calculation-row">
            <span class="calculation-formula">${language === 'ar' ? 'العمالة المهنية/الخلفة:' : (t.labor.skilledLabor + ':')}</span>
            <span class="calculation-result">${skilledCount} × ${skilledRate.toFixed(2)} × ${group.netDays || 0} = ${new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(skilledTotal)}</span>
          </div>
          ` : ''}

          <div class="calculation-row total-row">
            <span>${language === 'ar' ? 'المجموع الأساسي:' : (t.labor.baseTotal || 'Base Total') + ':'}</span>
            <span>${new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(baseTotal)}</span>
          </div>

          ${group.overtime > 0 ? `
          <div class="calculation-row">
            <span class="calculation-formula">${language === 'ar' ? 'إضافي/مكافأة:' : (t.labor.overtime || 'Overtime/Bonus') + ':'}</span>
            <span class="calculation-result">+ ${new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(group.overtime)}</span>
          </div>
          ` : ''}

          ${group.deductions > 0 ? `
          <div class="calculation-row">
            <span class="calculation-formula">${language === 'ar' ? 'خصومات:' : (t.labor.deductions || 'Deductions') + ':'}</span>
            <span class="calculation-result">- ${new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(group.deductions)}</span>
          </div>
          ${group.deductionReason ? `
          <div class="calculation-row">
            <span class="calculation-formula">${language === 'ar' ? 'سبب الخصومات:' : 'Deduction Reason:'}</span>
            <span class="calculation-result">${group.deductionReason}</span>
          </div>
          ` : ''}
          ` : ''}

          <div class="calculation-row total-row" style="margin-top: 20px;">
            <span>${language === 'ar' ? 'المبلغ الإجمالي النهائي:' : (t.labor.finalTotalAmount || 'Final Total Amount') + ':'}</span>
            <span>${new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(group.totalAmount || 0)}</span>
          </div>
          <div class="calculation-row" style="margin-top: 8px; font-size: 12px; color: #999;">
            <span>${language === 'ar' ? '(المجموع الأساسي + الإضافي - الخصومات)' : '(Base Total + Overtime - Deductions)'}</span>
          </div>
        </div>

        <div class="footer">
          <p>${language === 'ar' ? 'تم إنشاء التقرير في:' : 'Report generated on:'} ${moment().format('YYYY-MM-DD HH:mm')}</p>
          <p>${language === 'ar' ? 'معرف المجموعة:' : 'Group ID:'} ${group.id}</p>
        </div>

        <div class="button-container no-print">
          <button onclick="window.print()">${language === 'ar' ? 'طباعة' : t.labor.print}</button>
          <button onclick="window.close()" style="background: #999; margin-right: 10px;">${language === 'ar' ? 'إغلاق' : t.common.close}</button>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  // Employees table columns
  const employeeColumns = useMemo(() => [
    {
      title: t.labor.name,
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
      title: t.labor.employeeId,
      dataIndex: 'employeeId',
      key: 'employeeId'
    },
    {
      title: t.labor.jobTitle,
      dataIndex: 'jobTitle',
      key: 'jobTitle',
      render: (title: string) => <Tag color="blue">{title}</Tag>
    },
    {
      title: t.labor.monthlySalary,
      dataIndex: 'monthlySalary',
      key: 'monthlySalary',
      render: (salary: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
          }).format(salary || 0)}
        </span>
      ),
      align: 'right' as const
    },
    {
      title: t.common.actions,
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditEmployee(record)}
            size="small"
          >
            {t.common.edit}
          </Button>
          <Popconfirm
            title={t.labor.deleteEmployeeConfirm || 'Are you sure you want to delete this employee?'}
            onConfirm={() => handleDeleteEmployee(record.id)}
            okText={t.common.yes}
            cancelText={t.common.no}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              {t.common.delete}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [t, language])

  // Labor groups table columns
  const laborGroupColumns = useMemo(() => [
    {
      title: t.labor.projects,
      dataIndex: 'projectIds',
      key: 'projectIds',
      render: (projectIds: string[] | string, record: any) => {
        // Handle both array (projectIds) and single (projectId) for backward compatibility
        const ids = Array.isArray(projectIds) ? projectIds : (record.projectId ? [record.projectId] : [])
        if (!ids || ids.length === 0) return '-'
        const projectNames = (ids || []).map(id => {
          const project = projects.find(p => p.id === id)
          return project ? project.name : id
        })
        return projectNames.join(', ')
      }
    },
    {
      title: t.labor.engineer,
      dataIndex: 'engineerName',
      key: 'engineerName',
      render: (name: string) => name || '-'
    },
    {
      title: t.labor.startDate,
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: t.labor.endDate,
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: string) => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: t.labor.normalLabor,
      key: 'labor',
      render: (_: any, record: any) => (
        <div>
          <div>{t.labor.normalLabor}: {record.normalCount} × {record.normalRate.toFixed(0)}</div>
          {(record.skilledCount && record.skilledCount > 0) && (
            <div>{t.labor.skilledLabor}: {record.skilledCount} × {record.skilledRate.toFixed(0)}</div>
          )}
        </div>
      )
    },
    {
      title: t.labor.netDays,
      dataIndex: 'netDays',
      key: 'netDays',
      render: (days: number) => days !== null && days !== undefined ? days : '-'
    },
    {
      title: t.labor.totalAmount,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
          }).format(amount || 0)}
        </span>
      ),
      align: 'right' as const
    },
    {
      title: t.common.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          active: { color: 'green', text: t.labor.active },
          pending_approval: { color: 'orange', text: t.labor.pendingApproval },
          approved_for_payment: { color: 'blue', text: t.labor.approvedForPayment },
          paid: { color: 'success', text: t.labor.paid },
          cancelled: { color: 'default', text: t.labor.cancelled }
        }
        const statusConfig = config[status] || { color: 'default', text: status }
        return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
      }
    },
    {
      title: t.common.actions,
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'active' && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCloseGroup(record)}
              size="small"
            >
              {t.labor.closeGroup}
            </Button>
          )}
          {record.status === 'pending_approval' && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApproveGroup(record)}
              size="small"
              style={{ color: '#52c41a' }}
            >
              {t.labor.approveGroup}
            </Button>
          )}
          {record.status === 'approved_for_payment' && (
            <Button
              type="link"
              icon={<DollarOutlined />}
              onClick={() => handlePayGroup(record)}
              size="small"
              style={{ color: '#1890ff' }}
            >
              {t.labor.payGroup}
            </Button>
          )}
          {record.status === 'active' && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditGroup(record)}
              size="small"
            >
              {t.common.edit}
            </Button>
          )}
          {record.status !== 'paid' && (
            <Popconfirm
              title={t.labor.deleteGroupConfirm || 'Are you sure you want to delete this group?'}
              onConfirm={() => handleDeleteGroup(record.id)}
              okText={t.common.yes}
              cancelText={t.common.no}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                {t.common.delete}
              </Button>
            </Popconfirm>
          )}
          {record.status === 'paid' && (
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewReceipt(record)}
              size="small"
              style={{ color: '#1890ff' }}
            >
              {t.labor.viewReceipt}
            </Button>
          )}
          <Button
            type="link"
            icon={<PrinterOutlined />}
            onClick={() => handlePrintGroup(record)}
            size="small"
          >
            {t.labor.print}
          </Button>
        </Space>
      )
    }
  ], [t, language, projects])

  // Holiday options
  const holidayOptions = useMemo(() => [
    { label: language === 'ar' ? 'الأحد' : 'Sunday', value: 'Sunday' },
    { label: language === 'ar' ? 'الإثنين' : 'Monday', value: 'Monday' },
    { label: language === 'ar' ? 'الثلاثاء' : 'Tuesday', value: 'Tuesday' },
    { label: language === 'ar' ? 'الأربعاء' : 'Wednesday', value: 'Wednesday' },
    { label: language === 'ar' ? 'الخميس' : 'Thursday', value: 'Thursday' },
    { label: language === 'ar' ? 'الجمعة' : 'Friday', value: 'Friday' },
    { label: language === 'ar' ? 'السبت' : 'Saturday', value: 'Saturday' }
  ], [language])

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <TeamOutlined />
        {t.labor.title}
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'internal-staff',
            label: (
              <span>
                <UserOutlined />
                {t.labor.internalStaff}
              </span>
            ),
            children: (
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <span>
                      <UserOutlined style={{ marginLeft: 8 }} />
                      {t.labor.employees}
                    </span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddEmployee}
                      size="large"
                    >
                      {t.labor.addEmployee}
                    </Button>
                  </div>
                }
              >
                {employeesLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" tip={t.common.loading} />
                  </div>
                ) : employees.length === 0 ? (
                  <Empty
                    description={t.labor.noEmployees || 'No employees registered'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEmployee}>
                      {t.labor.addEmployee}
                    </Button>
                  </Empty>
                ) : (
                  <Table
                    columns={employeeColumns}
                    dataSource={employees.map(e => ({ ...e, key: e.id || e.updatedAt || `emp-${Date.now()}` }))}
                    rowKey={(record) => record.id || record.updatedAt || `emp-${Date.now()}`}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `${t.labor.totalEmployees || 'Total'}: ${total}`
                    }}
                    scroll={{ x: 'max-content' }}
                    responsive
                  />
                )}
              </Card>
            )
          },
          {
            key: 'external-labor',
            label: (
              <span>
                <TeamOutlined />
                {t.labor.externalLabor}
              </span>
            ),
            children: (
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <span>
                      <TeamOutlined style={{ marginLeft: 8 }} />
                      {t.labor.laborGroups}
                    </span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddGroup}
                      size="large"
                    >
                      {t.labor.addGroup || 'Create New Group'}
                    </Button>
                  </div>
                }
              >
                {laborGroupsLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" tip={t.common.loading} />
                  </div>
                ) : laborGroups.length === 0 ? (
                  <Empty
                    description={t.labor.noLaborGroups || 'No labor groups registered'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGroup}>
                      {t.labor.addGroup || 'Create New Group'}
                    </Button>
                  </Empty>
                ) : (
                  <Table
                    columns={laborGroupColumns}
                    dataSource={useMemo(() => laborGroups.map(g => ({ ...g, key: g.id || g.updatedAt || `group-${Date.now()}` })), [laborGroups])}
                    rowKey={(record) => record.id || record.updatedAt || `group-${Date.now()}`}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `${t.labor.totalGroups || 'Total'}: ${total}`
                    }}
                    scroll={{ x: 'max-content' }}
                    responsive
                  />
                )}
              </Card>
            )
          }
        ]}
      />

      {/* Employee Modal */}
      <Modal
        title={selectedEmployee ? t.labor.editEmployee : t.labor.addEmployee}
        open={isEmployeeModalVisible}
        onOk={() => employeeForm.submit()}
        onCancel={() => {
          setIsEmployeeModalVisible(false)
          employeeForm.resetFields()
          setSelectedEmployee(null)
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width={600}
      >
        <Form
          form={employeeForm}
          layout="vertical"
          onFinish={handleSaveEmployee}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label={t.labor.name}
            rules={[{ required: true, message: t.labor.name + ' ' + t.common.required }]}
          >
            <Input placeholder={t.labor.name} />
          </Form.Item>

          <Form.Item
            name="employeeId"
            label={t.labor.employeeId}
            rules={[{ required: true, message: t.labor.employeeId + ' ' + t.common.required }]}
          >
            <Input placeholder={t.labor.employeeId} />
          </Form.Item>

          <Form.Item
            name="jobTitle"
            label={t.labor.jobTitle}
            rules={[{ required: true, message: t.labor.jobTitle + ' ' + t.common.required }]}
          >
            <Input placeholder={t.labor.jobTitle} />
          </Form.Item>

          <Form.Item
            name="monthlySalary"
            label={t.labor.monthlySalary}
            rules={[{ required: true, message: t.labor.monthlySalary + ' ' + t.common.required }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              placeholder="0"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Group Modal */}
      <Modal
        title={selectedGroup ? t.labor.groupUpdated : t.labor.addGroup}
        open={isGroupModalVisible}
        onOk={() => groupForm.submit()}
        onCancel={() => {
          setIsGroupModalVisible(false)
          groupForm.resetFields()
          setSelectedGroup(null)
        }}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width={700}
      >
        <Form
          form={groupForm}
          layout="vertical"
          onFinish={handleSaveGroup}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="projectIds"
            label={t.labor.projects}
            rules={[
              { required: true, message: t.labor.selectAtLeastOneProject },
              { type: 'array', min: 1, message: t.labor.selectAtLeastOneProject }
            ]}
          >
            <Select
              mode="multiple"
              placeholder={t.labor.projects + ' (' + t.common.optional + ')'}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={(selectedProjectIds: string[]) => {
                // REACTIVE RESET: When project selection changes, validate and reset date if needed
                const currentDate = groupForm.getFieldValue('startDate')
                
                if (!currentDate) {
                  // No date selected, nothing to validate
                  return
                }
                
                // If no projects selected, reset date (DatePicker will be disabled anyway)
                if (!selectedProjectIds || selectedProjectIds.length === 0) {
                  groupForm.setFieldsValue({ startDate: null })
                  return
                }
                
                // Lookup selected projects from the projects array (explicit lookup, no assumptions)
                const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))
                
                if (selectedProjects.length === 0) {
                  // Projects not found in array, reset date for safety
                  groupForm.setFieldsValue({ startDate: null })
                  return
                }
                
                // Find the earliest (oldest) project start date
                const projectStartDates = selectedProjects
                  .map(p => {
                    // Explicit project lookup - ensure project exists and has startDate
                    const project = projects.find(proj => proj.id === p.id)
                    return project && project.startDate ? dayjs(project.startDate) : null
                  })
                  .filter(d => d !== null)
                  .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending (earliest first)
                
                const earliestProjectStartDate = projectStartDates.length > 0 ? projectStartDates[0] : null
                
                if (!earliestProjectStartDate) {
                  // No valid start dates found, reset date
                  groupForm.setFieldsValue({ startDate: null })
                  return
                }
                
                // Validate current date against the earliest project start date
                const currentDateDayjs = dayjs(currentDate).startOf('day')
                const minAllowedDate = earliestProjectStartDate.startOf('day')
                
                // If current date is before the earliest project start date, reset it
                if (currentDateDayjs.isBefore(minAllowedDate, 'day')) {
                  groupForm.setFieldsValue({ startDate: null })
                }
              }}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name} {project.startDate ? `(${t.projects.startDate}: ${moment(project.startDate).format('YYYY-MM-DD')})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="engineerName"
            label={t.labor.engineer}
          >
            <Input placeholder={t.labor.engineer} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.projectIds !== curr.projectIds}>
            {({ getFieldValue }) => {
              const selectedProjectIds = getFieldValue('projectIds') || []
              const hasSelectedProjects = selectedProjectIds.length > 0
              
              // THE LOCK: Explicit project lookup from projects array (no assumptions)
              // Calculate minDate from selected projects with explicit lookup
              const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))
              
              // Extract and validate project start dates with explicit project lookup
              const projectStartDates = selectedProjects
                .map(project => {
                  // Fail-safe: Only use valid projects with startDate
                  // Explicit check: Ensure project exists and has startDate
                  if (!project || !project.startDate) {
                    return null
                  }
                  return dayjs(project.startDate)
                })
                .filter(d => d !== null && d.isValid()) // Filter out nulls and invalid dates
                .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending (earliest first)
              
              // Get the earliest (oldest) project start date
              const minDate = projectStartDates.length > 0 ? projectStartDates[0] : null
              
              return (
                <Form.Item
                  name="startDate"
                  label={t.labor.startDate}
                  rules={[
                    { required: true, message: t.labor.startDate + ' ' + t.common.required },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value) {
                          return Promise.resolve()
                        }
                        const selectedProjectIds = getFieldValue('projectIds') || []
                        if (selectedProjectIds.length === 0) {
                          return Promise.resolve() // Will be caught by projectIds validation
                        }
                        
                        // Get selected projects and find the earliest (oldest) start date
                        // CRITICAL: Use dayjs for all date comparisons to prevent timezone errors
                        const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))
                        const projectStartDates = selectedProjects
                          .map(p => {
                            // Explicit project lookup
                            const project = projects.find(proj => proj.id === p.id)
                            return project && project.startDate ? dayjs(project.startDate) : null
                          })
                          .filter(d => d !== null && d.isValid())
                          .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending (earliest first)
                        
                        const earliestProjectStartDate = projectStartDates.length > 0 ? projectStartDates[0] : null
                        
                        if (earliestProjectStartDate) {
                          const selectedStartDate = dayjs(value).startOf('day')
                          const projectStartDate = earliestProjectStartDate.startOf('day')
                          // CRITICAL: startDate must be >= earliest project start date
                          if (selectedStartDate.isBefore(projectStartDate, 'day')) {
                            return Promise.reject(new Error(`${t.labor.cannotStartBeforeProjectDate || 'Cannot start labor group before project contract date'} (${projectStartDate.format('YYYY-MM-DD')})`))
                          }
                        }
                        return Promise.resolve()
                      }
                    })
                  ]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    // THE LOCK: Completely disable DatePicker if no projects selected
                    disabled={!hasSelectedProjects}
                    disabledDate={(current) => {
                      // THE SHIELD: Fail-safe disabledDate function
                      if (!current) {
                        return false // Allow null/undefined
                      }
                      
                      // Lock check: If no projects selected, disable all dates (DatePicker is already disabled, but this is extra safety)
                      if (!hasSelectedProjects) {
                        return true // Disable all dates when no project selected
                      }
                      
                      // CRITICAL FIX: Recalculate minDate dynamically on each call to ensure we use latest project data
                      // This prevents stale closure values when project start dates are updated
                      const selectedProjectIds = getFieldValue('projectIds') || []
                      const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id))
                      
                      // Extract and validate project start dates with explicit project lookup
                      const projectStartDates = selectedProjects
                        .map(project => {
                          // Fail-safe: Only use valid projects with startDate
                          if (!project || !project.startDate) {
                            return null
                          }
                          const projectDate = dayjs(project.startDate)
                          return projectDate
                        })
                        .filter(d => d !== null && d.isValid()) // Filter out nulls and invalid dates
                        .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending (earliest first)
                      
                      // Get the earliest (oldest) project start date (recalculated dynamically)
                      const dynamicMinDate = projectStartDates.length > 0 ? projectStartDates[0] : null
                      
                      // FIX: If no valid minDate found, allow ALL dates (don't block)
                      // Previously this was blocking all dates, which was too restrictive
                      // If project has no startDate, we shouldn't block date selection
                      if (!dynamicMinDate || !dynamicMinDate.isValid()) {
                        return false // Allow all dates if no valid project start date
                      }
                      
                      // CRITICAL: Use dayjs for all date comparisons to prevent timezone errors
                      const currentDate = dayjs(current).startOf('day')
                      const minAllowedDate = dynamicMinDate.startOf('day')
                      
                      // THE SHIELD: Disable dates before the earliest project start date
                      // startDate must be >= earliest project start date (strict chronological validation)
                      return currentDate.isBefore(minAllowedDate, 'day') // Disable dates before project start date
                    }}
                  />
                </Form.Item>
              )
            }}
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="normalCount"
                label={t.labor.normalCount}
                rules={[{ required: true, message: t.labor.normalCount + ' ' + t.common.required }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="normalRate"
                label={t.labor.normalRate}
                rules={[{ required: true, message: t.labor.normalRate + ' ' + t.common.required }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="skilledCount"
                label={t.labor.skilledCount}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="skilledRate"
                label={t.labor.skilledRate}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="holidays"
            label={t.labor.holidays}
          >
            <Checkbox.Group options={holidayOptions} />
          </Form.Item>

          <Form.Item
            name="notes"
            label={t.common.notes}
          >
            <TextArea rows={3} placeholder={t.common.notes + '...'} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Close Group Modal */}
      <Modal
        title={t.labor.closeGroup}
        open={isCloseGroupModalVisible}
        onOk={() => closeGroupForm.submit()}
        onCancel={() => {
          setIsCloseGroupModalVisible(false)
          closeGroupForm.resetFields()
          setSelectedGroup(null)
        }}
        okText={t.labor.closeGroup}
        cancelText={t.common.cancel}
        width={700}
      >
        {selectedGroup && (
          <Alert
            message={t.labor.calculationDetails || 'Calculation Details'}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form
          form={closeGroupForm}
          layout="vertical"
          onFinish={handleCloseGroupSubmit}
          style={{ marginTop: 24 }}
        >
          {selectedGroup && (
            <Form.Item shouldUpdate={(prevValues, currentValues) => 
              prevValues.endDate !== currentValues.endDate || 
              prevValues.holidays !== currentValues.holidays ||
              prevValues.overtime !== currentValues.overtime ||
              prevValues.deductions !== currentValues.deductions
            }>
              {({ getFieldValue }) => {
                const endDate = getFieldValue('endDate')
                const holidays = getFieldValue('holidays') || selectedGroup.holidays || []
                const overtime = parseFloat(getFieldValue('overtime')) || 0
                const deductions = parseFloat(getFieldValue('deductions')) || 0
                const startDate = selectedGroup?.startDate
                
                if (endDate && startDate) {
                  // Format dates using dayjs to ensure YYYY-MM-DD format
                  const start = dayjs(startDate)
                  const end = dayjs(endDate)
                  const duration = end.diff(start, 'day') + 1
                  
                  // Calculate net days using manual dates (EXCLUSIVELY)
                  // Ensure dates are in YYYY-MM-DD format
                  const formattedStartDate = dayjs(startDate).format('YYYY-MM-DD')
                  const formattedEndDate = dayjs(endDate).format('YYYY-MM-DD')
                  const netDays = laborGroupsService.calculateNetDays(
                    formattedStartDate,
                    formattedEndDate,
                    holidays
                  )
                  
                  // Calculate totals using manual dates
                  const skilledCount = selectedGroup.skilledCount || 0
                  const skilledRate = selectedGroup.skilledRate || 0
                  const normalTotal = netDays * selectedGroup.normalCount * selectedGroup.normalRate
                  const skilledTotal = netDays * skilledCount * skilledRate
                  const baseTotal = normalTotal + skilledTotal
                  const finalTotal = baseTotal + overtime - deductions
                  
                  return (
                    <Alert
                      message={
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>ملخص الفترة:</Text>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            من <Text strong>{dayjs(startDate).format('YYYY-MM-DD')}</Text> إلى <Text strong>{dayjs(endDate).format('YYYY-MM-DD')}</Text>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>المدة الإجمالية: {duration} يوم</Text>
                          </div>
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ marginBottom: 4 }}>
                            <Text strong>الأيام الصافية (باستثناء العطل): {netDays} يوم</Text>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <Text>المجموع الأساسي: </Text>
                            <Text strong style={{ color: '#1890ff' }}>
                              {new Intl.NumberFormat('ar-SA', {
                                style: 'currency',
                                currency: 'SAR',
                                minimumFractionDigits: 2
                              }).format(baseTotal)}
                            </Text>
                          </div>
                          {overtime > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <Text>إضافي/مكافأة: </Text>
                              <Text strong style={{ color: '#52c41a' }}>
                                + {new Intl.NumberFormat('ar-SA', {
                                  style: 'currency',
                                  currency: 'SAR',
                                  minimumFractionDigits: 2
                                }).format(overtime)}
                              </Text>
                            </div>
                          )}
                          {deductions > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <Text>خصومات: </Text>
                              <Text strong style={{ color: '#ff4d4f' }}>
                                - {new Intl.NumberFormat('ar-SA', {
                                  style: 'currency',
                                  currency: 'SAR',
                                  minimumFractionDigits: 2
                                }).format(deductions)}
                              </Text>
                            </div>
                          )}
                          <Divider style={{ margin: '8px 0' }} />
                          <div>
                            <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                              المبلغ الإجمالي النهائي: {new Intl.NumberFormat('ar-SA', {
                                style: 'currency',
                                currency: 'SAR',
                                minimumFractionDigits: 2
                              }).format(finalTotal)}
                            </Text>
                          </div>
                        </div>
                      }
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )
                }
                return null
              }}
            </Form.Item>
          )}
          <Form.Item
            name="endDate"
            label={t.labor.endDate}
            rules={[
              { required: true, message: t.labor.endDate + ' ' + t.common.required },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) {
                    return Promise.resolve()
                  }
                  
                  // Use dayjs for date calculations to ensure consistency
                  const today = dayjs().startOf('day')
                  const maxAllowedDate = today.add(7, 'day') // 7 days from today (current date)
                  const selectedDate = dayjs(value).startOf('day')
                  
                  // Validate: endDate must not be more than 7 days from today
                  if (selectedDate.isAfter(maxAllowedDate, 'day')) {
                    return Promise.reject(new Error(t.labor.closeDateCannotExceed7Days || 'Close date cannot exceed 7 days from current date'))
                  }
                  
                  // Validate: endDate must not be before startDate (if startDate exists)
                  if (selectedGroup?.startDate) {
                    const manualStartDate = dayjs(selectedGroup.startDate).startOf('day')
                    if (selectedDate.isBefore(manualStartDate, 'day')) {
                      return Promise.reject(new Error(`${t.labor.endDateBeforeStartDate || 'End date cannot be before start date'} (${manualStartDate.format('YYYY-MM-DD')})`))
                    }
                  }
                  
                  return Promise.resolve()
                }
              })
            ]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => {
                if (!current) return false
                
                // Use dayjs for date calculations to ensure consistency
                const today = dayjs().startOf('day')
                const maxAllowedDate = today.add(7, 'day') // 7 days from today (current date)
                const currentDate = dayjs(current).startOf('day')
                
                // Disable dates before start date (if startDate exists)
                if (selectedGroup?.startDate) {
                  const manualStartDate = dayjs(selectedGroup.startDate).startOf('day')
                  if (currentDate.isBefore(manualStartDate, 'day')) {
                    return true
                  }
                }
                
                // Disable dates more than 7 days from today (current date)
                if (currentDate.isAfter(maxAllowedDate, 'day')) {
                  return true
                }
                
                return false
              }}
            />
          </Form.Item>

          <Form.Item
            name="holidays"
            label={t.labor.holidays}
          >
            <Checkbox.Group options={holidayOptions} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="overtime"
                label={`${t.labor.overtime || 'Overtime/Bonus'} (${t.common.sar})`}
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
                name="deductions"
                label={`${t.labor.deductions || 'Deductions'} (${t.common.sar})`}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="deductionReason"
            label={t.labor.deductionReason || 'Deduction Reason'}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const deductions = getFieldValue('deductions')
                  if (deductions && parseFloat(deductions) > 0 && !value) {
                    return Promise.reject(new Error(t.labor.deductionReasonRequired || 'Deduction reason is required when deductions exist'))
                  }
                  return Promise.resolve()
                }
              })
            ]}
          >
            <TextArea rows={2} placeholder={t.labor.deductionReason || 'Deduction Reason'} />
          </Form.Item>

          <Form.Item
            name="notes"
            label={t.common.notes}
          >
            <TextArea rows={3} placeholder={t.common.notes + '...'} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Summary Modal */}
      <Modal
        title="ملخص حساب مجموعة العمالة"
        open={isSummaryModalVisible}
        onOk={() => {
          setIsSummaryModalVisible(false)
          setSummaryCalculations(null)
        }}
        onCancel={() => {
          setIsSummaryModalVisible(false)
          setSummaryCalculations(null)
        }}
        okText="موافق"
        width={600}
      >
        {summaryCalculations && selectedGroup && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="تاريخ البداية">
              {dayjs(selectedGroup.startDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="تاريخ النهاية">
              {summaryCalculations.endDate ? dayjs(summaryCalculations.endDate).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="المدة الإجمالية">
              {summaryCalculations.duration ? `${summaryCalculations.duration} يوم` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="الأيام الصافية (باستثناء العطل)">
              {summaryCalculations.netDays} يوم
            </Descriptions.Item>
            <Descriptions.Item label="تفاصيل الحساب">
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>العمالة العادية: </Text>
                  <Text>{selectedGroup.normalCount} × {selectedGroup.normalRate.toFixed(2)} × {summaryCalculations.netDays} = </Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {new Intl.NumberFormat('ar-SA', {
                      style: 'currency',
                      currency: 'SAR',
                      minimumFractionDigits: 2
                    }).format(summaryCalculations.normalTotal)}
                  </Text>
                </div>
                {selectedGroup.skilledCount > 0 && selectedGroup.skilledRate > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>العمالة المهنية/الخلفة: </Text>
                    <Text>{(selectedGroup.skilledCount || 0)} × {(selectedGroup.skilledRate || 0).toFixed(2)} × {summaryCalculations.netDays} = </Text>
                    <Text strong style={{ color: '#1890ff' }}>
                      {new Intl.NumberFormat('ar-SA', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2
                      }).format(summaryCalculations.skilledTotal)}
                    </Text>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ marginBottom: 8 }}>
                  <Text strong>المجموع الأساسي: </Text>
                  <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                    {new Intl.NumberFormat('ar-SA', {
                      style: 'currency',
                      currency: 'SAR',
                      minimumFractionDigits: 2
                    }).format(summaryCalculations.baseTotal)}
                  </Text>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    (العمالة العادية + العمالة المهنية/الخلفة)
                  </div>
                </div>
                {summaryCalculations.overtime > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text>إضافي/مكافأة: </Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      + {new Intl.NumberFormat('ar-SA', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2
                      }).format(summaryCalculations.overtime)}
                    </Text>
                  </div>
                )}
                {summaryCalculations.deductions > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text>خصومات: </Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      - {new Intl.NumberFormat('ar-SA', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2
                      }).format(summaryCalculations.deductions)}
                    </Text>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    المبلغ الإجمالي النهائي: {new Intl.NumberFormat('ar-SA', {
                      style: 'currency',
                      currency: 'SAR',
                      minimumFractionDigits: 2
                    }).format(summaryCalculations.finalTotal)}
                  </Text>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    (المجموع الأساسي + الإضافي - الخصومات)
                  </div>
                </div>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
        <Alert
          message="تم إغلاق المجموعة ووضعها في حالة انتظار الموافقة"
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>

      {/* Phase 1: Admin Approval Modal */}
      <Modal
        title="موافقة على مجموعة العمالة"
        open={isApprovalModalVisible}
        onOk={handleApprovalSubmit}
        onCancel={() => {
          setIsApprovalModalVisible(false)
          setSelectedGroupForApproval(null)
        }}
        okText="موافقة"
        cancelText="إلغاء"
        width={600}
      >
        {selectedGroupForApproval && (
          <div>
            <Alert
              message="سيتم الموافقة على المجموعة ووضعها في حالة جاهزة للدفع. المحاسب سيقوم بالدفع لاحقاً."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={selectedGroupForApproval.projectIds?.length > 1 ? 'المشاريع' : 'المشروع'}>
                {(() => {
                  const projectIds = selectedGroupForApproval.projectIds || (selectedGroupForApproval.projectId ? [selectedGroupForApproval.projectId] : [])
                  const projectNames = (projectIds || []).map(id => {
                    const project = projects.find(p => p.id === id)
                    return project ? project.name : id
                  })
                  return projectNames.length > 0 ? projectNames.join(', ') : '-'
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="المهندس">
                {selectedGroupForApproval.engineerName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="المبلغ الإجمالي">
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  {new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                    minimumFractionDigits: 2
                  }).format(selectedGroupForApproval.totalAmount)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Phase 2: Accountant Payment Modal */}
      <Modal
        title="دفع مجموعة العمالة"
        open={isPaymentModalVisible}
        onOk={() => paymentForm.submit()}
        onCancel={() => {
          setIsPaymentModalVisible(false)
          paymentForm.resetFields()
          setSelectedGroupForPayment(null)
          setPaymentMethod(null)
          setSelectedAdvance(null)
        }}
        okText="دفع"
        cancelText="إلغاء"
        width={700}
      >
        {selectedGroupForPayment && (
          <div style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="المبلغ الإجمالي">
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  {new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: 'SAR',
                    minimumFractionDigits: 2
                  }).format(selectedGroupForPayment.totalAmount)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePaymentSubmit}
        >
          <Form.Item label="طريقة الدفع" required>
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                paymentForm.setFieldsValue({
                  treasuryAccountId: undefined,
                  linkedAdvanceId: undefined
                })
                setSelectedAdvance(null)
              }}
            >
              <Radio value="treasury">
                <BankOutlined /> من الخزينة/البنك
              </Radio>
              <Radio value="advance">
                <WalletOutlined /> خصم من عهدة المهندس
              </Radio>
            </Radio.Group>
          </Form.Item>

          {paymentMethod === 'treasury' && (
            <Form.Item
              name="treasuryAccountId"
              label="حساب الخزينة"
              rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة' }]}
            >
              <Select
                placeholder="اختر حساب الخزينة"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {treasuryAccounts.map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.name} ({account.type === 'bank' ? 'بنك' : 'صندوق'})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {paymentMethod === 'advance' && (
            <>
              {engineerAdvances.length === 0 ? (
                <Alert
                  message="لا توجد عهد مفتوحة ومعتمدة لهذا المهندس"
                  description="لا توجد عهد بموافقة أو مدفوعة برصيد متبقي أكبر من الصفر لهذا المهندس"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              ) : (
                <Form.Item
                  name="linkedAdvanceId"
                  label="العهدة"
                  rules={[{ required: true, message: 'يرجى اختيار العهدة' }]}
                >
                  <Select
                    placeholder="اختر العهدة"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(value) => {
                      const advance = engineerAdvances.find(a => a.id === value)
                      setSelectedAdvance(advance)
                    }}
                  >
                    {engineerAdvances.map(advance => {
                      const remaining = advance.remainingAmount !== null && advance.remainingAmount !== undefined
                        ? parseFloat(advance.remainingAmount)
                        : parseFloat(advance.amount || 0)
                      const managerName = advance.managerName || 'غير محدد'
                      // Format reference number as ADV-XXX
                      let formattedRef = 'ADV-XXX'
                      const refNumber = advance.referenceNumber || advance.paymentNumber
                      if (refNumber) {
                        if (refNumber.startsWith('ADV-')) {
                          formattedRef = refNumber
                        } else {
                          // Extract number from reference or use last 3 chars of ID
                          const match = refNumber.match(/ADV-?(\d+)/i) || refNumber.match(/(\d+)/)
                          if (match && match[1]) {
                            formattedRef = `ADV-${match[1].padStart(3, '0')}`
                          } else {
                            formattedRef = `ADV-${advance.id.slice(-3).toUpperCase()}`
                          }
                        }
                      } else {
                        // Fallback: use last 3 chars of ID
                        formattedRef = `ADV-${advance.id.slice(-3).toUpperCase()}`
                      }
                      return (
                        <Option key={advance.id} value={advance.id}>
                          {managerName} - [Ref: {formattedRef}] - (Available: {remaining.toFixed(2)} ريال)
                        </Option>
                      )
                    })}
                  </Select>
                </Form.Item>
              )}
              {selectedAdvance && selectedGroupForPayment && (
                <Alert
                  message={
                    (() => {
                      const remaining = selectedAdvance.remainingAmount !== null && selectedAdvance.remainingAmount !== undefined
                        ? parseFloat(selectedAdvance.remainingAmount)
                        : parseFloat(selectedAdvance.amount || 0)
                      const required = selectedGroupForPayment.totalAmount
                      if (remaining < required) {
                        return `تحذير: رصيد العهدة غير كاف. المتاح: ${remaining.toFixed(2)} ريال، المطلوب: ${required.toFixed(2)} ريال`
                      }
                      return `رصيد العهدة كاف. المتاح: ${remaining.toFixed(2)} ريال، المطلوب: ${required.toFixed(2)} ريال`
                    })()
                  }
                  type={(() => {
                    const remaining = selectedAdvance.remainingAmount !== null && selectedAdvance.remainingAmount !== undefined
                      ? parseFloat(selectedAdvance.remainingAmount)
                      : parseFloat(selectedAdvance.amount || 0)
                    const required = selectedGroupForPayment.totalAmount
                    return remaining < required ? 'warning' : 'success'
                  })()}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          )}
        </Form>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        title="إيصال الدفع - مجموعة العمالة"
        open={isReceiptModalVisible}
        onCancel={() => {
          setIsReceiptModalVisible(false)
          setSelectedGroupForReceipt(null)
          setReceiptData(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsReceiptModalVisible(false)
            setSelectedGroupForReceipt(null)
            setReceiptData(null)
          }}>
            إغلاق
          </Button>
        ]}
        width={600}
      >
        {selectedGroupForReceipt && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="رقم المجموعة">
              {selectedGroupForReceipt.id}
            </Descriptions.Item>
            <Descriptions.Item label="المهندس">
              {selectedGroupForReceipt.engineerName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="المبلغ المدفوع">
              <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                {new Intl.NumberFormat('ar-SA', {
                  style: 'currency',
                  currency: 'SAR',
                  minimumFractionDigits: 2
                }).format(selectedGroupForReceipt.totalAmount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="طريقة الدفع">
              {selectedGroupForReceipt.paymentMethod === 'treasury' ? (
                <Tag color="blue" icon={<BankOutlined />}>من الخزينة/البنك</Tag>
              ) : selectedGroupForReceipt.paymentMethod === 'advance' ? (
                <Tag color="green" icon={<WalletOutlined />}>خصم من عهدة المهندس</Tag>
              ) : (
                <Tag color="default">غير محدد</Tag>
              )}
            </Descriptions.Item>
            {selectedGroupForReceipt.paymentMethod === 'treasury' && receiptData && (
              <>
                <Descriptions.Item label="حساب الخزينة">
                  <Text strong>{receiptData.accountName}</Text>
                  <Tag color="cyan" style={{ marginRight: 8 }}>
                    {receiptData.accountType === 'bank' ? 'بنك' : receiptData.accountType === 'cash_box' ? 'صندوق' : receiptData.accountType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="تاريخ الدفع">
                  {receiptData.createdAt ? moment(receiptData.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
                {receiptData.description && (
                  <Descriptions.Item label="الوصف">
                    {receiptData.description}
                  </Descriptions.Item>
                )}
              </>
            )}
            {selectedGroupForReceipt.paymentMethod === 'treasury' && !receiptData && (
              <Descriptions.Item label="معلومات الدفع">
                <Alert
                  message="لم يتم العثور على معاملة خزينة لهذه المجموعة"
                  type="warning"
                  showIcon
                />
              </Descriptions.Item>
            )}
            {selectedGroupForReceipt.paymentMethod === 'advance' && (
              <Descriptions.Item label="معلومات الدفع">
                <Alert
                  message="تم الدفع من عهدة المهندس"
                  description="تم خصم المبلغ من عهدة المهندس المحددة"
                  type="info"
                  showIcon
                />
              </Descriptions.Item>
            )}
            {selectedGroupForReceipt.approvedAt && (
              <Descriptions.Item label="تاريخ الموافقة">
                {moment(selectedGroupForReceipt.approvedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default LaborPage
