'use client'

import { useState, useEffect, useRef } from 'react'
import moment from 'moment'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import companySettingsService from '../services/companySettingsService'
import quotationDraftsService from '../services/quotationDraftsService'
import quotationTemplatesService from '../services/quotationTemplatesService'
import customersService from '../services/customersService'
import projectsService from '../services/projectsService'
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Row,
  Col,
  Table,
  Space,
  message,
  Divider,
  InputNumber,
  Typography,
  Tabs,
  AutoComplete,
  Modal,
  Popconfirm
} from 'antd'
import {
  SaveOutlined,
  FilePdfOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import QuotationPDFPreview from '../components/QuotationPDFPreview'

const { Option } = Select
const { TextArea } = Input
const { Title } = Typography

interface BOQItem {
  sq: number
  activities: string
  amount: number
}

const QuotationBuilder = () => {
  const { currentTenantId } = useTenant()
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  const previewRef = useRef<HTMLDivElement>(null)

  // State management
  const [loading, setLoading] = useState(false)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [customerSearchOptions, setCustomerSearchOptions] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [boqItems, setBoqItems] = useState<BOQItem[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [smartDefaults, setSmartDefaults] = useState<any>({})

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
        loadCustomers(),
        loadProjects(),
        loadSmartDefaults()
      ])
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
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

  const loadCustomers = async () => {
    try {
      const customersList = await customersService.getCustomers()
      setCustomers(customersList || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadProjects = async () => {
    try {
      const projectsList = await projectsService.getProjects()
      setProjects(projectsList || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadSmartDefaults = async () => {
    try {
      const defaults = await quotationTemplatesService.getAllDefaultTemplates()
      setSmartDefaults(defaults)

      // Load defaults into form
      if (defaults.introduction) {
        form.setFieldsValue({ introductionText: defaults.introduction.content })
        setFormValues(prev => ({ ...prev, introductionText: defaults.introduction.content }))
      }
      if (defaults.scope) {
        const scopeItems = Array.isArray(defaults.scope.content) 
          ? defaults.scope.content 
          : defaults.scope.content.split('\n').filter((line: string) => line.trim())
        form.setFieldsValue({ scopeOfWork: scopeItems })
        setFormValues(prev => ({ ...prev, scopeOfWork: scopeItems }))
      }
      if (defaults.exclusion) {
        const exclusionItems = Array.isArray(defaults.exclusion.content)
          ? defaults.exclusion.content
          : defaults.exclusion.content.split('\n').filter((line: string) => line.trim())
        form.setFieldsValue({ exclusions: exclusionItems })
        setFormValues(prev => ({ ...prev, exclusions: exclusionItems }))
      }
      if (defaults.facility) {
        const facilityItems = Array.isArray(defaults.facility.content)
          ? defaults.facility.content
          : defaults.facility.content.split('\n').filter((line: string) => line.trim())
        form.setFieldsValue({ facilities: facilityItems })
        setFormValues(prev => ({ ...prev, facilities: facilityItems }))
      }
      if (defaults.terms) {
        form.setFieldsValue({ termsAndConditions: defaults.terms.content })
        setFormValues(prev => ({ ...prev, termsAndConditions: defaults.terms.content }))
      }
    } catch (error) {
      console.error('Error loading smart defaults:', error)
    }
  }

  const handleCustomerSearch = async (searchText: string) => {
    if (!searchText || searchText.trim() === '') {
      setCustomerSearchOptions([])
      return
    }

    try {
      const searchResults = await customersService.searchCustomers(searchText, 'client_or_investor')
      const options = searchResults.map(customer => ({
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

  const handleCustomerSelect = (value: string, option: any) => {
    const customer = option?.customer || customers.find(c => c.id === value || c.name === value)
    if (customer) {
      setSelectedCustomer(customer)
      form.setFieldsValue({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
        attention: customer.name
      })
      setFormValues(prev => ({
        ...prev,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
        attention: customer.name
      }))
    }
  }

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      form.setFieldsValue({ projectName: project.name })
      setFormValues(prev => ({ ...prev, projectName: project.name }))
    }
  }

  const handleFormChange = (changedFields: any, allFields: any) => {
    const values = form.getFieldsValue()
    setFormValues(prev => ({ ...prev, ...values }))
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
        customerId: values.customerId || selectedCustomer?.id || null,
        customerName: values.customerName || '',
        customerPhone: values.customerPhone || '',
        customerEmail: values.customerEmail || '',
        projectId: selectedProject?.id || null,
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
        introductionText: values.introductionText || '',
        scopeOfWork: Array.isArray(values.scopeOfWork) ? values.scopeOfWork : [],
        exclusions: Array.isArray(values.exclusions) ? values.exclusions : [],
        facilities: Array.isArray(values.facilities) ? values.facilities : [],
        termsAndConditions: values.termsAndConditions || '',
        paymentMilestones: values.paymentMilestones || [],
        validityPeriod: values.validityPeriod || 30,
        status: 'draft'
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>{t.quotations.quotationBuilder}</Title>
        <Space>
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
        <Col span={12} style={{ height: '100%', overflowY: 'auto' }}>
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
                              <Select
                                placeholder={t.quotations.project}
                                showSearch
                                allowClear
                                onChange={(value) => {
                                  if (value) {
                                    handleProjectSelect(value)
                                  } else {
                                    setSelectedProject(null)
                                    form.setFieldsValue({ projectName: '' })
                                    setFormValues(prev => ({ ...prev, projectName: '' }))
                                  }
                                }}
                                filterOption={(input, option) =>
                                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={projects.map(p => ({
                                  value: p.id,
                                  label: p.name || ''
                                }))}
                                notFoundContent={projects.length === 0 ? (language === 'ar' ? 'لا توجد مشاريع' : 'No projects found') : (language === 'ar' ? 'لا توجد نتائج' : 'No results')}
                                options={projects.map(p => ({ value: p.id, label: p.name }))}
                              />
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
                              <Input 
                                placeholder={t.quotations.refNo}
                                suffix={
                                  <Button 
                                    type="link" 
                                    size="small"
                                    onClick={generateAutoRefNumber}
                                    style={{ padding: 0 }}
                                  >
                                    {language === 'ar' ? 'توليد تلقائي' : 'Auto Generate'}
                                  </Button>
                                }
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="quotationDate" label={t.quotations.date}>
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Divider />
                        <Form.Item 
                          name="customerId" 
                          label={t.quotations.customer}
                          rules={[{ required: true, message: language === 'ar' ? 'يرجى اختيار العميل' : 'Please select a customer' }]}
                        >
                          <Select
                            placeholder={t.quotations.customer}
                            showSearch
                            allowClear
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            onSearch={handleCustomerSearch}
                            onChange={(value) => {
                              if (value) {
                                const customer = customers.find(c => c.id === value)
                                if (customer) {
                                  handleCustomerSelect(value, { customer })
                                }
                              } else {
                                setSelectedCustomer(null)
                                form.setFieldsValue({
                                  customerName: '',
                                  customerPhone: '',
                                  customerEmail: ''
                                })
                                setFormValues(prev => ({
                                  ...prev,
                                  customerName: '',
                                  customerPhone: '',
                                  customerEmail: '',
                                  attention: ''
                                }))
                              }
                            }}
                            options={customers.map(c => ({
                              value: c.id,
                              label: `${c.name || ''} - ${c.phone || ''}${c.email ? ` (${c.email})` : ''}`
                            }))}
                            notFoundContent={customers.length === 0 ? (language === 'ar' ? 'لا توجد عملاء' : 'No customers found') : (language === 'ar' ? 'لا توجد نتائج' : 'No results')}
                          />
                        </Form.Item>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item name="customerName" label={t.quotations.customerName}>
                              <Input 
                                placeholder={t.quotations.customerName}
                                readOnly
                                style={{ backgroundColor: '#f5f5f5' }}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="customerPhone" label={t.quotations.phone}>
                              <Input 
                                placeholder={t.quotations.phone}
                                readOnly
                                style={{ backgroundColor: '#f5f5f5' }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="customerEmail" label={t.quotations.email}>
                          <Input 
                            placeholder={t.quotations.email}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
                          />
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
                          <Button type="dashed" icon={<PlusOutlined />} onClick={addBOQRow}>
                            {t.quotations.addRow}
                          </Button>
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
                        <Form.Item name="introductionText" label={t.quotations.introduction}>
                          <TextArea rows={4} placeholder={t.quotations.introduction} />
                        </Form.Item>
                        <Form.Item name="scopeOfWork" label={t.quotations.scopeOfWork}>
                          <Select
                            mode="tags"
                            placeholder={t.quotations.scopeOfWork}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item name="exclusions" label={t.quotations.exclusions}>
                          <Select
                            mode="tags"
                            placeholder={t.quotations.exclusions}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item name="facilities" label={t.quotations.facilities}>
                          <Select
                            mode="tags"
                            placeholder={t.quotations.facilities}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item name="termsAndConditions" label={t.quotations.termsAndConditions}>
                          <TextArea rows={6} placeholder={t.quotations.termsAndConditions} />
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
          </Card>
        </Col>

        {/* Right Side - PDF Preview */}
        <Col span={12} style={{ height: '100%', overflow: 'hidden' }}>
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
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default QuotationBuilder
