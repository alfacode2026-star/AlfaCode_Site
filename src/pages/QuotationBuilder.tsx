'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import moment from 'moment'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import companySettingsService from '../services/companySettingsService'
import quotationDraftsService from '../services/quotationDraftsService'
import quotationTemplatesService from '../services/quotationTemplatesService'
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Row,
  Col,
  Table,
  Space,
  message,
  Divider,
  InputNumber,
  Typography,
  Tabs,
  Modal,
  List,
  Tag
} from 'antd'
import {
  SaveOutlined,
  FilePdfOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  FolderOutlined,
  FileTextOutlined,
  BookOutlined
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import QuotationPDFPreview from '../components/QuotationPDFPreview'
import SmartTextArea from '../components/common/SmartTextArea'
import ApprovalWorkflow from '../components/ApprovalWorkflow'
import { SCOPE_SUGGESTIONS, TERMS_SUGGESTIONS, INTRODUCTION_SUGGESTIONS, FACILITIES_SUGGESTIONS, EXCLUSIONS_SUGGESTIONS } from '../constants/quotationSuggestions'
import { STANDARD_ITEMS_LIBRARY } from '../constants/standardItems'

const { TextArea } = Input
const { Title } = Typography

interface BOQItem {
  sq: number
  activities: string
  amount: number
}

const QuotationBuilder = () => {
  const [searchParams] = useSearchParams()
  const { currentTenantId } = useTenant()
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  const previewRef = useRef<HTMLDivElement>(null)

  // State management
  const [loading, setLoading] = useState(false)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [boqItems, setBoqItems] = useState<BOQItem[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [smartDefaults, setSmartDefaults] = useState<any>({})
  const [scopeOfWorkItems, setScopeOfWorkItems] = useState<string[]>([])
  const [exclusionsItems, setExclusionsItems] = useState<string[]>([])
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false)
  const [scopeOfWorkText, setScopeOfWorkText] = useState<string>('') // For SmartTextArea
  const [termsAndConditionsText, setTermsAndConditionsText] = useState<string>('') // For SmartTextArea
  const [introductionText, setIntroductionText] = useState<string>('') // For SmartTextArea
  const [facilitiesText, setFacilitiesText] = useState<string>('') // For SmartTextArea
  const [exclusionsText, setExclusionsText] = useState<string>('') // For SmartTextArea
  const [templateModalVisible, setTemplateModalVisible] = useState(false) // For template selection modal
  const [isLibraryModalVisible, setIsLibraryModalVisible] = useState(false) // For standard items library modal
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [templateForm] = Form.useForm()
  
  // Approval Workflow State
  const [status, setStatus] = useState<string>('draft')
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true)
  const [includeSignature, setIncludeSignature] = useState<boolean>(true)
  const [managerNotes, setManagerNotes] = useState<string>('')
  const [isManager, setIsManager] = useState<boolean>(false) // TODO: Get from auth context

  // Form values state for preview
  const [formValues, setFormValues] = useState<any>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    projectName: '',
    subject: '',
    refNumber: '',
    quotationDate: moment().format('YYYY-MM-DD'),
    company: '',
    attention: '',
    introductionText: '',
    scopeOfWork: [],
    exclusions: [],
    facilities: [],
    termsAndConditions: '',
    paymentMilestones: [],
    validityPeriod: 30
  })

  useEffect(() => {
    loadInitialData()
  }, [currentTenantId])

  useEffect(() => {
    // Generate ref number after initial data loads
    if (currentTenantId) {
      generateAutoRefNumber()
    }
  }, [currentTenantId])

  // Load draft from URL parameter if present
  useEffect(() => {
    const draftId = searchParams.get('id')
    if (draftId && currentTenantId) {
      handleLoadDraft(draftId)
    }
  }, [searchParams, currentTenantId])

  const generateAutoRefNumber = async () => {
    try {
      const refNumber = await quotationDraftsService.generateRefNumber()
      if (refNumber) {
        form.setFieldsValue({ refNumber })
        setFormValues(prev => ({ ...prev, refNumber }))
      }
    } catch (error) {
      console.error('Error generating reference number:', error)
      // Fallback ref number
      const fallbackRef = `REF-${new Date().getFullYear()}-001`
      form.setFieldsValue({ refNumber: fallbackRef })
      setFormValues(prev => ({ ...prev, refNumber: fallbackRef }))
    }
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCompanySettings(),
        loadSmartDefaults(),
        loadTemplates()
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const templatesList = await quotationTemplatesService.getTemplates('scope')
      console.log('Templates Loaded:', templatesList)
      // Filter templates that have JSON content with scopeOfWork and exclusions
      setTemplates(templatesList || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    }
  }

  const loadCompanySettings = async () => {
    try {
      const settings = await companySettingsService.getCompanySettings()
      setCompanySettings(settings) // Set even if null for null-safety
      if (settings?.companyName) {
        form.setFieldsValue({ company: settings.companyName })
        setFormValues(prev => ({ ...prev, company: settings.companyName }))
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
      setCompanySettings(null) // Ensure it's set to null on error
    }
  }


  const loadSmartDefaults = async () => {
    try {
      const defaults = await quotationTemplatesService.getAllDefaultTemplates()
      setSmartDefaults(defaults)

      // Load defaults into form
      if (defaults.introduction) {
        const introText = defaults.introduction.content || ''
        form.setFieldsValue({ introductionText: introText })
        setIntroductionText(introText)
        setFormValues(prev => ({ ...prev, introductionText: introText }))
      }
      if (defaults.scope) {
        const scopeItems = Array.isArray(defaults.scope.content) 
          ? defaults.scope.content 
          : defaults.scope.content.split('\n').filter((line: string) => line.trim())
        setScopeOfWorkItems(scopeItems)
        setScopeOfWorkText(scopeItems.join('\n'))
        setFormValues(prev => ({ ...prev, scopeOfWork: scopeItems }))
        form.setFieldsValue({ scopeOfWork: scopeItems.join('\n') })
      }
      if (defaults.exclusion) {
        const exclusionItems = Array.isArray(defaults.exclusion.content)
          ? defaults.exclusion.content
          : defaults.exclusion.content.split('\n').filter((line: string) => line.trim())
        const exclusionText = Array.isArray(defaults.exclusion.content)
          ? defaults.exclusion.content.join('\n')
          : defaults.exclusion.content
        setExclusionsItems(exclusionItems)
        setExclusionsText(exclusionText)
        setFormValues(prev => ({ ...prev, exclusions: exclusionItems }))
      }
      if (defaults.facility) {
        const facilityItems = Array.isArray(defaults.facility.content)
          ? defaults.facility.content
          : defaults.facility.content.split('\n').filter((line: string) => line.trim())
        const facilityText = Array.isArray(defaults.facility.content)
          ? defaults.facility.content.join('\n')
          : defaults.facility.content
        setFacilitiesText(facilityText)
        form.setFieldsValue({ facilities: facilityText })
        setFormValues(prev => ({ ...prev, facilities: facilityItems }))
      }
      if (defaults.terms) {
        const termsText = defaults.terms.content || ''
        form.setFieldsValue({ termsAndConditions: termsText })
        setTermsAndConditionsText(termsText)
        setFormValues(prev => ({ ...prev, termsAndConditions: termsText }))
      }
    } catch (error) {
      console.error('Error loading smart defaults:', error)
    }
  }

  // Dynamic list management for Scope of Work and Exclusions
  const addScopeOfWorkItem = () => {
    const newItems = [...scopeOfWorkItems, '']
    setScopeOfWorkItems(newItems)
    setFormValues(prev => ({ ...prev, scopeOfWork: newItems }))
  }

  const removeScopeOfWorkItem = (index: number) => {
    const newItems = scopeOfWorkItems.filter((_, i) => i !== index)
    setScopeOfWorkItems(newItems)
    setFormValues(prev => ({ ...prev, scopeOfWork: newItems }))
  }

  const updateScopeOfWorkItem = (index: number, value: string) => {
    const newItems = [...scopeOfWorkItems]
    newItems[index] = value
    setScopeOfWorkItems(newItems)
    setFormValues(prev => ({ ...prev, scopeOfWork: newItems }))
  }

  const addExclusionsItem = () => {
    const newItems = [...exclusionsItems, '']
    setExclusionsItems(newItems)
    setFormValues(prev => ({ ...prev, exclusions: newItems }))
  }

  const removeExclusionsItem = (index: number) => {
    const newItems = exclusionsItems.filter((_, i) => i !== index)
    setExclusionsItems(newItems)
    setFormValues(prev => ({ ...prev, exclusions: newItems }))
  }

  const updateExclusionsItem = (index: number, value: string) => {
    const newItems = [...exclusionsItems]
    newItems[index] = value
    setExclusionsItems(newItems)
    setFormValues(prev => ({ ...prev, exclusions: newItems }))
  }

  // Load Draft Data - Maps DB fields (snake_case) to Form fields (camelCase)
  const handleLoadDraft = async (draftId: string) => {
    try {
      const record = await quotationDraftsService.getQuotationDraft(draftId)
      if (!record) {
        message.error(language === 'ar' ? 'فشل في تحميل المسودة' : 'Failed to load draft')
        return
      }
      
      // 1. Extract Header Data (if it exists as JSON, or fall back to individual columns)
      const header = record.header_data || {}
      
      // 2. Create the Mapped Object (The "Translator")
      const mappedValues: any = {
        // --- Header Section (Try header_data first, then direct columns) ---
        company: header.company || record.company_name || record.company || '',
        attention: header.attention || record.attention || '',
        projectName: header.project || record.project_name || record.project || '',
        subject: header.subject || record.subject || '',
        refNumber: header.refNo || header.ref_no || record.quote_ref || record.ref_no || record.refNumber || '',
        quotationDate: (header.date || record.quote_date || record.quotation_date) 
          ? moment(header.date || record.quote_date || record.quotation_date) 
          : moment(),

        // --- Customer Details ---
        customerName: record.customer_name || record.customerName || '',
        customerPhone: record.customer_phone || record.customerPhone || '',
        customerEmail: record.customer_email || record.customerEmail || '',

        // --- Long Text Sections (The most important part) ---
        introductionText: record.introduction || record.introduction_text || record.introductionText || '',
        scopeOfWork: record.scope_of_work || record.scopeOfWork || [],
        facilities: record.facilities || [],
        exclusions: record.exclusions || [],
        termsAndConditions: record.terms_and_conditions || record.termsAndConditions || '',

        // --- BOQ Items ---
        // Note: boqItems will be handled separately below

        // --- Financials ---
        validityPeriod: record.validity_period || record.validityPeriod || 30,
        paymentMilestones: record.payment_milestones || record.paymentMilestones || []
      }

      console.log('Loading Draft Data:', mappedValues) // Debug log

      // 3. Handle BOQ Items
      if (record.boq_items && Array.isArray(record.boq_items)) {
        setBoqItems(record.boq_items)
      } else if (record.items && Array.isArray(record.items)) {
        // Convert items format to boqItems format if needed
        const convertedItems = record.items.map((item: any, index: number) => ({
          sq: item.sq || index + 1,
          activities: item.description || item.activities || '',
          amount: item.amount || item.price || 0
        }))
        setBoqItems(convertedItems)
      }

      // 4. Apply to Form
      form.setFieldsValue(mappedValues)

      // 5. Force Update State Variables (for SmartTextAreas)
      // YOU MUST update these states otherwise the text areas will look empty!
      if (mappedValues.introductionText) {
        setIntroductionText(mappedValues.introductionText)
      }
      
      // Handle scopeOfWork - can be array or string
      if (mappedValues.scopeOfWork) {
        if (Array.isArray(mappedValues.scopeOfWork)) {
          const scopeText = mappedValues.scopeOfWork.join('\n')
          setScopeOfWorkText(scopeText)
          setScopeOfWorkItems(mappedValues.scopeOfWork)
        } else if (typeof mappedValues.scopeOfWork === 'string') {
          setScopeOfWorkText(mappedValues.scopeOfWork)
          const scopeItems = mappedValues.scopeOfWork.split('\n').filter((line: string) => line.trim() !== '')
          setScopeOfWorkItems(scopeItems)
        }
      }

      // Handle facilities - can be array or string
      if (mappedValues.facilities) {
        if (Array.isArray(mappedValues.facilities)) {
          const facilitiesTextValue = mappedValues.facilities.join('\n')
          setFacilitiesText(facilitiesTextValue)
        } else if (typeof mappedValues.facilities === 'string') {
          setFacilitiesText(mappedValues.facilities)
        }
      }

      // Handle exclusions - can be array or string
      if (mappedValues.exclusions) {
        if (Array.isArray(mappedValues.exclusions)) {
          const exclusionsTextValue = mappedValues.exclusions.join('\n')
          setExclusionsText(exclusionsTextValue)
          setExclusionsItems(mappedValues.exclusions)
        } else if (typeof mappedValues.exclusions === 'string') {
          setExclusionsText(mappedValues.exclusions)
          const exclusionItems = mappedValues.exclusions.split('\n').filter((line: string) => line.trim() !== '')
          setExclusionsItems(exclusionItems)
        }
      }

      // Handle termsAndConditions
      if (mappedValues.termsAndConditions) {
        setTermsAndConditionsText(mappedValues.termsAndConditions)
      }

      // 6. Update formValues state for preview
      setFormValues(prev => ({
        ...prev,
        ...mappedValues,
        boqItems: record.boq_items || record.items || []
      }))

      // 7. Load Approval Workflow fields
      setStatus(record.status || 'draft')
      setIncludeLetterhead(record.includeLetterhead !== undefined ? record.includeLetterhead : (record.include_letterhead !== undefined ? record.include_letterhead : true))
      setIncludeSignature(record.includeSignature !== undefined ? record.includeSignature : (record.include_signature !== undefined ? record.include_signature : true))
      setManagerNotes(record.managerNotes || record.manager_notes || '')

      // 8. Set current draft ID
      setCurrentDraftId(draftId)

      message.success(language === 'ar' ? 'تم تحميل المسودة بنجاح' : 'Draft loaded successfully')
    } catch (error) {
      console.error('Error loading draft:', error)
      message.error(language === 'ar' ? 'فشل في تحميل المسودة' : 'Failed to load draft')
    }
  }

  // Template Management
  const handleSaveAsTemplate = () => {
    if (scopeOfWorkItems.filter(item => item.trim() !== '').length === 0 && 
        exclusionsItems.filter(item => item.trim() !== '').length === 0) {
      message.warning(language === 'ar' ? 'لا توجد عناصر للحفظ' : 'No items to save as template')
      return
    }
    setTemplateName('')
    setSaveTemplateModalVisible(true)
  }

  const handleSaveTemplate = async () => {
    try {
      if (!templateName.trim()) {
        message.error(language === 'ar' ? 'يرجى إدخال اسم القالب' : 'Please enter template name')
        return
      }

      const templateData = {
        scopeOfWork: scopeOfWorkItems.filter(item => item.trim() !== ''),
        exclusions: exclusionsItems.filter(item => item.trim() !== '')
      }

      const result = await quotationTemplatesService.createTemplate({
        templateName: templateName.trim(),
        templateType: 'scope',
        content: templateData, // Pass as object for JSONB column
        isDefault: false
      })

      if (result.success) {
        message.success(language === 'ar' ? 'تم حفظ القالب بنجاح' : 'Template saved successfully')
        setSaveTemplateModalVisible(false)
        setTemplateName('')
        await loadTemplates()
      } else {
        message.error(result.error || (language === 'ar' ? 'فشل في حفظ القالب' : 'Failed to save template'))
      }
    } catch (error) {
      console.error('Error saving template:', error)
      message.error(language === 'ar' ? 'فشل في حفظ القالب' : 'Failed to save template')
    }
  }

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      let templateData
      try {
        templateData = typeof template.content === 'string' ? JSON.parse(template.content) : template.content
      } catch (e) {
        // If content is not JSON, treat as legacy format (array)
        templateData = {
          scopeOfWork: Array.isArray(template.content) ? template.content : [],
          exclusions: []
        }
      }

      // Confirm replace or append
      Modal.confirm({
        title: language === 'ar' ? 'تحميل القالب' : 'Load Template',
        content: language === 'ar' 
          ? 'هل تريد استبدال العناصر الحالية أم إضافتها؟' 
          : 'Do you want to REPLACE current items or APPEND to them?',
        okText: language === 'ar' ? 'استبدال' : 'Replace',
        cancelText: language === 'ar' ? 'إضافة' : 'Append',
        onOk: () => {
          // Replace
          const scopeItems = templateData.scopeOfWork || []
          const exclusionItems = templateData.exclusions || []
          setScopeOfWorkItems(scopeItems)
          setScopeOfWorkText(scopeItems.join('\n'))
          setExclusionsItems(exclusionItems)
          setExclusionsText(exclusionItems.join('\n'))
          setFormValues(prev => ({
            ...prev,
            scopeOfWork: scopeItems,
            exclusions: exclusionItems
          }))
          form.setFieldsValue({ scopeOfWork: scopeItems.join('\n') })
          message.success(language === 'ar' ? 'تم استبدال العناصر' : 'Items replaced')
        },
        onCancel: () => {
          // Append
          const newScopeItems = [...scopeOfWorkItems, ...(templateData.scopeOfWork || [])]
          const newExclusionItems = [...exclusionsItems, ...(templateData.exclusions || [])]
          setScopeOfWorkItems(newScopeItems)
          setScopeOfWorkText(newScopeItems.join('\n'))
          setExclusionsItems(newExclusionItems)
          setExclusionsText(newExclusionItems.join('\n'))
          setFormValues(prev => ({
            ...prev,
            scopeOfWork: newScopeItems,
            exclusions: newExclusionItems
          }))
          form.setFieldsValue({ scopeOfWork: newScopeItems.join('\n') })
          message.success(language === 'ar' ? 'تم إضافة العناصر' : 'Items appended')
        }
      })
    } catch (error) {
      console.error('Error loading template:', error)
      message.error(language === 'ar' ? 'فشل في تحميل القالب' : 'Failed to load template')
    }
  }

  const handleFormChange = (changedFields: any, allFields: any) => {
    const values = form.getFieldsValue()
    setFormValues(prev => ({ ...prev, ...values }))
    // Sync text states with form values
    if (values.scopeOfWork !== undefined) {
      const scopeText = Array.isArray(values.scopeOfWork) ? values.scopeOfWork.join('\n') : (values.scopeOfWork || '')
      if (scopeText !== scopeOfWorkText) {
        setScopeOfWorkText(scopeText)
      }
    }
    if (values.termsAndConditions !== undefined && values.termsAndConditions !== termsAndConditionsText) {
      setTermsAndConditionsText(values.termsAndConditions || '')
    }
    if (values.introductionText !== undefined && values.introductionText !== introductionText) {
      setIntroductionText(values.introductionText || '')
    }
    if (values.facilities !== undefined) {
      const facilitiesTextValue = Array.isArray(values.facilities) ? values.facilities.join('\n') : (values.facilities || '')
      if (facilitiesTextValue !== facilitiesText) {
        setFacilitiesText(facilitiesTextValue)
      }
    }
    if (values.exclusions !== undefined) {
      const exclusionsTextValue = Array.isArray(values.exclusions) ? values.exclusions.join('\n') : (values.exclusions || '')
      if (exclusionsTextValue !== exclusionsText) {
        setExclusionsText(exclusionsTextValue)
      }
    }
  }

  // BOQ Table Management
  const addBOQRow = () => {
    const newItem: BOQItem = {
      sq: boqItems.length + 1,
      activities: '',
      amount: 0
    }
    setBoqItems([...boqItems, newItem])
  }

  // Import Standard Item from Library
  const handleImportItem = (item: any) => {
    const newItem: BOQItem = {
      sq: boqItems.length + 1,
      activities: item.description,
      amount: item.price || 0
    }
    setBoqItems([...boqItems, newItem])
    message.success(language === 'ar' ? 'تم إضافة العنصر' : 'Item added to table')
  }

  const removeBOQRow = (index: number) => {
    const newItems = boqItems.filter((_, i) => i !== index)
    // Re-number SQ
    const renumbered = newItems.map((item, i) => ({ ...item, sq: i + 1 }))
    setBoqItems(renumbered)
  }

  const updateBOQItem = (index: number, field: keyof BOQItem, value: any) => {
    const newItems = [...boqItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setBoqItems(newItems)
  }

  const calculateBOQTotal = () => {
    return boqItems.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0)
  }

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields()
      
      const draftData = {
        customerId: null, // No longer required - manual entry only
        customerName: values.customerName || '',
        customerPhone: values.customerPhone || '',
        customerEmail: values.customerEmail || '',
        projectId: null, // No longer required - manual entry only
        projectName: values.projectName || '',
        subject: values.subject || '',
        refNumber: values.refNumber || '',
        quotationDate: values.quotationDate ? moment(values.quotationDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        headerData: {
          company: values.company || companySettings?.companyName || '',
          attention: values.attention || values.customerName || '',
          project: values.projectName || '',
          subject: values.subject || '',
          refNo: values.refNumber || '',
          date: values.quotationDate ? moment(values.quotationDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
        },
        boqItems: boqItems,
        introductionText: introductionText || values.introductionText || '',
        scopeOfWork: scopeOfWorkItems.filter(item => item.trim() !== ''),
        exclusions: exclusionsItems.filter(item => item.trim() !== ''),
        facilities: facilitiesText ? facilitiesText.split('\n').filter(line => line.trim() !== '') : (Array.isArray(values.facilities) ? values.facilities : []),
        termsAndConditions: values.termsAndConditions || '',
        paymentMilestones: values.paymentMilestones || [],
        validityPeriod: values.validityPeriod || 30,
        status: status,
        includeLetterhead: includeLetterhead,
        includeSignature: includeSignature,
        managerNotes: managerNotes
      }

      let result
      if (currentDraftId) {
        result = await quotationDraftsService.updateQuotationDraft(currentDraftId, draftData)
      } else {
        result = await quotationDraftsService.createQuotationDraft(draftData)
        if (result.success && result.draft) {
          setCurrentDraftId(result.draft.id)
        }
      }

      if (result.success) {
        message.success(t.quotations.draftSaved)
      } else {
        message.error(result.error || t.quotations.failedToSave)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      message.error('فشل في حفظ المسودة')
    }
  }

  // Generate PDF
  const handleGeneratePDF = async () => {
    try {
      if (!previewRef.current) {
        message.error('Cannot generate PDF - preview not available')
        return
      }

      message.loading('Generating PDF...', 0)

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `quotation_${formValues.refNumber || 'draft'}_${moment().format('YYYYMMDD')}.pdf`
      pdf.save(fileName)
      message.destroy()
      message.success(t.quotations.pdfGenerated)
    } catch (error) {
      console.error('Error generating PDF:', error)
      message.destroy()
      message.error('Failed to generate PDF')
    }
  }

  const boqColumns = [
    {
      title: 'SQ',
      dataIndex: 'sq',
      key: 'sq',
      width: 60,
      render: (sq: number, record: BOQItem, index: number) => (
        <InputNumber
          value={sq}
          min={1}
          onChange={(value) => updateBOQItem(index, 'sq', value || 1)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: t.quotations.activities,
      dataIndex: 'activities',
      key: 'activities',
      render: (activities: string, record: BOQItem, index: number) => (
        <Input
          value={activities}
          onChange={(e) => updateBOQItem(index, 'activities', e.target.value)}
          placeholder="Enter activity description"
        />
      )
    },
    {
      title: t.quotations.amount,
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount: number, record: BOQItem, index: number) => (
        <InputNumber
          value={amount}
          min={0}
          precision={2}
          onChange={(value) => updateBOQItem(index, 'amount', value || 0)}
          style={{ width: '100%' }}
          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: any, record: BOQItem, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeBOQRow(index)}
        />
      )
    }
  ]

  // Approval Workflow Handlers
  const handleApprove = async () => {
    setStatus('approved')
    await handleSaveDraft()
    message.success(language === 'ar' ? 'تمت الموافقة على العرض' : 'Quotation approved')
  }

  const handleReject = async () => {
    setStatus('rejected')
    await handleSaveDraft()
    message.warning(language === 'ar' ? 'تم رفض العرض' : 'Quotation rejected')
  }

  const handleSubmitForApproval = async () => {
    setStatus('pending')
    await handleSaveDraft()
    message.success(language === 'ar' ? 'تم إرسال العرض للموافقة' : 'Quotation submitted for approval')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, height: '100vh', overflow: 'hidden' }}>
      {/* Approval Workflow Component */}
      <ApprovalWorkflow
        status={status}
        refNumber={formValues.refNumber || ''}
        clientName={formValues.customerName || ''}
        totalAmount={calculateBOQTotal()}
        includeLetterhead={includeLetterhead}
        includeSignature={includeSignature}
        managerNotes={managerNotes}
        isManager={isManager}
        onStatusChange={setStatus}
        onLetterheadToggle={setIncludeLetterhead}
        onSignatureToggle={setIncludeSignature}
        onNotesChange={setManagerNotes}
        onApprove={handleApprove}
        onReject={handleReject}
        onSubmit={handleSubmitForApproval}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>{t.quotations.quotationBuilder}</Title>
        <Space>
          <Button icon={<FolderOutlined />} onClick={handleSaveAsTemplate}>
            {language === 'ar' ? 'حفظ كقالب' : 'Save as Template'}
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
            {t.quotations.saveDraft}
          </Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handleGeneratePDF}>
            {t.quotations.generatePDF}
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
        {/* Left Side - Form */}
        <Col span={16} style={{ height: '100%', overflowY: 'auto' }}>
          <Card title={t.quotations.quotationBuilder} style={{ height: '100%' }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormChange}
              initialValues={{
                quotationDate: moment(),
                validityPeriod: 30
              }}
            >
              <Tabs
                items={[
                  {
                    key: 'header',
                    label: t.quotations.header,
                    children: (
                      <div style={{ marginTop: 16 }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="company" label={t.quotations.company}>
                              <Input placeholder={t.quotations.company} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="attention" label={t.quotations.attention}>
                              <Input placeholder={t.quotations.attention} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="projectName" label={t.quotations.project}>
                              <Input placeholder={t.quotations.project} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="subject" label={t.quotations.subject}>
                              <Input placeholder={t.quotations.subject} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="refNumber" label={t.quotations.refNo}>
                              <Input placeholder={t.quotations.refNo} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item 
                              name="quotationDate" 
                              label={t.quotations.date}
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
                        </Row>
                        <Divider />
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="customerName" label={t.quotations.customerName}>
                              <Input placeholder={t.quotations.customerName} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="customerPhone" label={t.quotations.phone}>
                              <Input placeholder={t.quotations.phone} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="customerEmail" label={t.quotations.email}>
                          <Input placeholder={t.quotations.email} />
                        </Form.Item>
                      </div>
                    )
                  },
                  {
                    key: 'boq',
                    label: t.quotations.boq,
                    children: (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Title level={5} style={{ margin: 0 }}>{t.quotations.boq}</Title>
                          <Space>
                            <Button type="dashed" icon={<PlusOutlined />} onClick={addBOQRow}>
                              {t.quotations.addRow}
                            </Button>
                            <Button 
                              type="dashed" 
                              icon={<BookOutlined />} 
                              onClick={() => setIsLibraryModalVisible(true)}
                            >
                              {language === 'ar' ? 'استيراد عنصر قياسي' : 'Import Standard Item'}
                            </Button>
                          </Space>
                        </div>
                        <Table
                          columns={boqColumns}
                          dataSource={boqItems}
                          rowKey={(record, index) => `boq-${index}`}
                          pagination={false}
                          size="small"
                        />
                        <Divider />
                        <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 'bold' }}>
                          {t.quotations.total}: {calculateBOQTotal().toLocaleString()} {t.common.sar}
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'content',
                    label: t.quotations.content,
                    children: (
                      <div style={{ marginTop: 16 }}>
                        <Form.Item 
                          name="introductionText" 
                          label={t.quotations.introduction}
                          getValueFromEvent={(e) => e?.target?.value || e || ''}
                          getValueProps={(value) => ({
                            value: introductionText || value || ''
                          })}
                        >
                          <SmartTextArea
                            rows={4}
                            suggestions={INTRODUCTION_SUGGESTIONS}
                            placeholder="Type introduction or select from suggestions below..."
                            value={introductionText}
                            onChange={(e) => {
                              const text = e?.target?.value || ''
                              setIntroductionText(text)
                              form.setFieldsValue({ introductionText: text })
                              setFormValues(prev => ({ ...prev, introductionText: text }))
                            }}
                          />
                        </Form.Item>
                        <Form.Item 
                          name="scopeOfWork" 
                          label={t.quotations.scopeOfWork}
                          getValueFromEvent={(e) => e?.target?.value || e || ''}
                          getValueProps={(value) => ({
                            value: scopeOfWorkText || (Array.isArray(value) ? value.join('\n') : value || '')
                          })}
                        >
                          <SmartTextArea
                            rows={6}
                            suggestions={SCOPE_SUGGESTIONS}
                            placeholder="Type scope or select from suggestions below..."
                            value={scopeOfWorkText}
                            onChange={(e) => {
                              const text = e?.target?.value || ''
                              setScopeOfWorkText(text)
                              // Convert text to array (split by newlines, filter empty)
                              const items = text.split('\n').filter(line => line.trim() !== '')
                              setScopeOfWorkItems(items)
                              setFormValues(prev => ({ ...prev, scopeOfWork: items }))
                            }}
                          />
                        </Form.Item>
                        <Form.Item 
                          name="exclusions" 
                          label={t.quotations.exclusions}
                          getValueFromEvent={(e) => e?.target?.value || e || ''}
                          getValueProps={(value) => ({
                            value: exclusionsText || (Array.isArray(value) ? value.join('\n') : value || '')
                          })}
                        >
                          <SmartTextArea
                            rows={6}
                            suggestions={EXCLUSIONS_SUGGESTIONS}
                            placeholder="Type exclusions or select from suggestions below..."
                            value={exclusionsText}
                            onChange={(e) => {
                              const text = e?.target?.value || ''
                              setExclusionsText(text)
                              // Convert text to array (split by newlines, filter empty)
                              const items = text.split('\n').filter(line => line.trim() !== '')
                              setExclusionsItems(items)
                              setFormValues(prev => ({ ...prev, exclusions: items }))
                            }}
                          />
                        </Form.Item>
                        <Form.Item 
                          name="facilities" 
                          label={t.quotations.facilities}
                          getValueFromEvent={(e) => e?.target?.value || e || ''}
                          getValueProps={(value) => ({
                            value: facilitiesText || (Array.isArray(value) ? value.join('\n') : value || '')
                          })}
                        >
                          <SmartTextArea
                            rows={4}
                            suggestions={FACILITIES_SUGGESTIONS}
                            placeholder="Type facilities or select from suggestions below..."
                            value={facilitiesText}
                            onChange={(e) => {
                              const text = e?.target?.value || ''
                              setFacilitiesText(text)
                              // Convert text to array (split by newlines, filter empty)
                              const items = text.split('\n').filter(line => line.trim() !== '')
                              setFormValues(prev => ({ ...prev, facilities: items }))
                              form.setFieldsValue({ facilities: items })
                            }}
                          />
                        </Form.Item>
                        <Form.Item 
                          name="termsAndConditions" 
                          label={t.quotations.termsAndConditions}
                          getValueFromEvent={(e) => e?.target?.value || e || ''}
                          getValueProps={(value) => ({
                            value: termsAndConditionsText || value || ''
                          })}
                        >
                          <SmartTextArea
                            rows={6}
                            suggestions={TERMS_SUGGESTIONS}
                            placeholder="Type terms or select from suggestions below..."
                            value={termsAndConditionsText}
                            onChange={(e) => {
                              const text = e?.target?.value || ''
                              setTermsAndConditionsText(text)
                              form.setFieldsValue({ termsAndConditions: text })
                            }}
                          />
                        </Form.Item>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="validityPeriod" label={t.quotations.validityPeriod}>
                              <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    )
                  }
                ]}
              />
            </Form>
            {/* Footer with Load Template Button */}
            <div style={{ 
              marginTop: 24, 
              paddingTop: 16, 
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}>
              <Button 
                type="default" 
                icon={<FileTextOutlined />}
                onClick={() => setTemplateModalVisible(true)}
              >
                {language === 'ar' ? 'تحميل من قالب' : 'Load Template'}
              </Button>
            </div>
          </Card>
        </Col>

        {/* Right Side - PDF Preview */}
        <Col span={8} style={{ height: '100%', overflow: 'hidden' }}>
          <Card
            title={t.quotations.pdfPreview}
            extra={
              <Button icon={<ReloadOutlined />} onClick={loadInitialData}>
                {t.quotations.refresh}
              </Button>
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflow: 'auto', padding: 0 }}
          >
            <div ref={previewRef} style={{ padding: 20, backgroundColor: '#fff' }}>
              <QuotationPDFPreview
                companySettings={companySettings}
                formValues={formValues}
                boqItems={boqItems}
                boqTotal={calculateBOQTotal()}
                includeLetterhead={includeLetterhead}
                includeSignature={includeSignature}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Load Template Modal */}
      <Modal
        title={language === 'ar' ? 'تحميل من قالب' : 'Load Template'}
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTemplateModalVisible(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginTop: 16 }}>
          <Select
            placeholder={language === 'ar' ? 'اختر قالب للتحميل' : 'Select a template to load'}
            style={{ width: '100%', marginBottom: 16 }}
            allowClear
            onChange={async (templateId) => {
              if (templateId) {
                await handleLoadTemplate(templateId)
                setTemplateModalVisible(false)
              }
            }}
            value={undefined}
            options={templates.map(template => ({
              label: template.templateName,
              value: template.id
            }))}
          />
          {templates.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              {language === 'ar' ? 'لا توجد قوالب متاحة' : 'No templates available'}
            </div>
          )}
        </div>
      </Modal>

      {/* Save Template Modal */}
      <Modal
        title={language === 'ar' ? 'حفظ القالب' : 'Save as Template'}
        open={saveTemplateModalVisible}
        onOk={handleSaveTemplate}
        onCancel={() => {
          setSaveTemplateModalVisible(false)
          setTemplateName('')
        }}
        okText={language === 'ar' ? 'حفظ' : 'Save'}
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
      >
        <Form form={templateForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            label={language === 'ar' ? 'اسم القالب' : 'Template Name'}
            required
          >
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل اسم القالب (مثل: أعمال مدنية قياسية)' : 'Enter template name (e.g., Standard Civil Works)'}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Standard Items Library Modal */}
      <Modal
        title={language === 'ar' ? 'مكتبة العناصر القياسية' : 'Standard Items Library'}
        open={isLibraryModalVisible}
        onCancel={() => setIsLibraryModalVisible(false)}
        footer={null}
        width={800}
      >
        <Tabs
          items={STANDARD_ITEMS_LIBRARY.map((category, index) => ({
            key: String(index),
            label: category.category,
            children: (
              <List
                dataSource={category.items}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button 
                        key="add"
                        type="primary" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        onClick={() => handleImportItem(item)}
                      >
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={item.description}
                      description={<Tag color="blue">{item.unit}</Tag>}
                    />
                    <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                      {item.price > 0 ? `${item.price.toLocaleString()} ${t.common?.sar || 'SAR'}` : 'TBD'}
                    </div>
                  </List.Item>
                )}
              />
            ),
          }))}
        />
      </Modal>
    </div>
  )
}

export default QuotationBuilder
