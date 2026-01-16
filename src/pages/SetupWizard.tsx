'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Steps,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Row,
  Col,
  message,
  Radio,
  Divider
} from 'antd'
import {
  BuildOutlined,
  ShoppingOutlined,
  CustomerServiceOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  BankOutlined,
  UserOutlined
} from '@ant-design/icons'
import setupService from '../services/setupService'

const { Title, Paragraph } = Typography
const { Option } = Select

interface IndustryCard {
  id: 'engineering' | 'retail' | 'services'
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  icon: React.ReactNode
  color: string
}

interface BranchConfig {
  name: string
  currency: string
  isMain: boolean
}

const SetupWizard = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedIndustry, setSelectedIndustry] = useState<'engineering' | 'retail' | 'services' | null>(null)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<BranchConfig[]>([{ name: '', currency: 'SAR', isMain: true }])

  const industries: IndustryCard[] = [
    {
      id: 'engineering',
      title: 'الهندسة والمقاولات',
      titleEn: 'Engineering & Contracting',
      description: 'إدارة المشاريع، المستخلصات، المواد والمعدات',
      descriptionEn: 'Project management, invoices, materials and equipment',
      icon: <BuildOutlined style={{ fontSize: 48 }} />,
      color: '#1890ff'
    },
    {
      id: 'retail',
      title: 'التجارة والتجزئة',
      titleEn: 'Retail & POS',
      description: 'إدارة المنتجات، الطلبات، المخزون، والأسعار',
      descriptionEn: 'Product management, orders, inventory, and pricing',
      icon: <ShoppingOutlined style={{ fontSize: 48 }} />,
      color: '#52c41a'
    },
    {
      id: 'services',
      title: 'الخدمات العامة',
      titleEn: 'Services',
      description: 'إدارة الخدمات، العملاء، والحجوزات',
      descriptionEn: 'Service management, customers, and bookings',
      icon: <CustomerServiceOutlined style={{ fontSize: 48 }} />,
      color: '#fa8c16'
    }
  ]

  const steps = [
    {
      title: 'Industry Selection',
      description: 'Choose Company Type'
    },
    {
      title: 'Organization',
      description: 'Company & Branches'
    },
    {
      title: 'Admin Accounts',
      description: 'Create Administrators'
    }
  ]

  // Step 1: Industry Selection
  const renderStep1 = () => {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Select Your Industry Type
        </Title>
        <Paragraph style={{ textAlign: 'center', marginBottom: '32px', color: '#666' }}>
          Choose the type that best describes your business
        </Paragraph>
        
        <Row gutter={[24, 24]} justify="center">
          {industries.map((industry) => (
            <Col xs={24} sm={12} md={8} key={industry.id}>
              <Card
                hoverable
                onClick={() => {
                  setSelectedIndustry(industry.id)
                  form.setFieldsValue({ industryType: industry.id })
                }}
                style={{
                  height: '100%',
                  border: selectedIndustry === industry.id ? `2px solid ${industry.color}` : '1px solid #d9d9d9',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  backgroundColor: selectedIndustry === industry.id ? `${industry.color}08` : 'white'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 16px',
                    borderRadius: '50%',
                    backgroundColor: `${industry.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: industry.color
                  }}>
                    {industry.icon}
                  </div>
                  <Title level={4} style={{ margin: '0 0 8px 0' }}>
                    {industry.titleEn}
                  </Title>
                  <Paragraph style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                    {industry.descriptionEn}
                  </Paragraph>
                  {selectedIndustry === industry.id && (
                    <CheckCircleOutlined 
                      style={{ 
                        fontSize: '24px', 
                        color: industry.color, 
                        marginTop: '16px',
                        display: 'block'
                      }} 
                    />
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    )
  }

  // Handle number of branches change
  const handleNumberOfBranchesChange = (value: number | null) => {
    if (value === null || value < 1) return
    
    const newBranches: BranchConfig[] = []
    for (let i = 0; i < value; i++) {
      if (i < branches.length) {
        // Keep existing branch data
        newBranches.push(branches[i])
      } else {
        // Create new branch with default values
        newBranches.push({
          name: '',
          currency: 'SAR',
          isMain: i === 0 // First branch is main by default
        })
      }
    }
    
    // Ensure exactly one main branch
    const mainCount = newBranches.filter(b => b.isMain).length
    if (mainCount === 0 && newBranches.length > 0) {
      newBranches[0].isMain = true
    } else if (mainCount > 1) {
      // If multiple are main, keep only the first one
      let foundFirst = false
      newBranches.forEach(b => {
        if (b.isMain && !foundFirst) {
          foundFirst = true
        } else if (b.isMain) {
          b.isMain = false
        }
      })
    }
    
    setBranches(newBranches)
  }

  // Handle branch field changes
  const handleBranchChange = (index: number, field: keyof BranchConfig, value: string | boolean) => {
    const newBranches = [...branches]
    
    if (field === 'isMain' && value === true) {
      // If setting this branch as main, unset all others
      newBranches.forEach((b, i) => {
        b.isMain = i === index
      })
    } else {
      newBranches[index][field] = value as any
    }
    
    setBranches(newBranches)
  }

  // Step 2: Organization Structure
  const renderStep2 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Organization Structure
        </Title>
        
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            numberOfBranches: 1
          }}
        >
          <Form.Item
            label="Company Name"
            name="companyName"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input size="large" placeholder="Enter company name" />
          </Form.Item>

          <Form.Item
            label="Number of Branches"
            name="numberOfBranches"
            rules={[{ required: true, message: 'Please enter number of branches' }]}
          >
            <InputNumber
              size="large"
              min={1}
              max={50}
              style={{ width: '100%' }}
              placeholder="Enter number of branches"
              onChange={handleNumberOfBranchesChange}
            />
          </Form.Item>

          <Divider>Branch Configuration</Divider>
          
          {branches.map((branch, index) => (
            <Card
              key={index}
              title={`Branch ${index + 1}${branch.isMain ? ' (Main Branch)' : ''}`}
              style={{ marginBottom: 16 }}
              headStyle={{ backgroundColor: branch.isMain ? '#e6f7ff' : '#fafafa' }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Branch Name"
                    required
                    validateStatus={!branch.name ? 'error' : ''}
                    help={!branch.name ? 'Branch name is required' : ''}
                  >
                    <Input
                      size="large"
                      placeholder={`Enter branch ${index + 1} name`}
                      value={branch.name}
                      onChange={(e) => handleBranchChange(index, 'name', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Currency" required>
                    <Select
                      size="large"
                      style={{ width: '100%' }}
                      value={branch.currency}
                      onChange={(value) => handleBranchChange(index, 'currency', value)}
                    >
                      <Option value="SAR">SAR - Saudi Riyal</Option>
                      <Option value="USD">USD - US Dollar</Option>
                      <Option value="EUR">EUR - Euro</Option>
                      <Option value="AED">AED - UAE Dirham</Option>
                      <Option value="IQD">IQD - Iraqi Dinar</Option>
                      <Option value="EGP">EGP - Egyptian Pound</Option>
                      <Option value="JOD">JOD - Jordanian Dinar</Option>
                      <Option value="KWD">KWD - Kuwaiti Dinar</Option>
                      <Option value="BHD">BHD - Bahraini Dinar</Option>
                      <Option value="OMR">OMR - Omani Rial</Option>
                      <Option value="QAR">QAR - Qatari Riyal</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item label="Main Branch">
                    <Radio
                      checked={branch.isMain}
                      onChange={(e) => handleBranchChange(index, 'isMain', e.target.checked)}
                    >
                      Main
                    </Radio>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
        </Form>
      </div>
    )
  }

  // Step 3: Financial Setup
  const renderStep3 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Financial Setup
        </Title>
        
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            currency: 'SAR',
            treasuryName: 'Main Treasury'
          }}
        >
          <Form.Item
            label="Default Currency"
            name="currency"
            rules={[{ required: true, message: 'Please select currency' }]}
          >
            <Select size="large">
              <Option value="SAR">SAR - Saudi Riyal</Option>
              <Option value="USD">USD - US Dollar</Option>
              <Option value="EUR">EUR - Euro</Option>
              <Option value="AED">AED - UAE Dirham</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Treasury Account Name"
            name="treasuryName"
            rules={[{ required: true, message: 'Please enter treasury name' }]}
          >
            <Input size="large" placeholder="Enter treasury account name" />
          </Form.Item>

          <Form.Item
            label="Initial Balance"
            name="initialBalance"
            rules={[{ required: true, message: 'Please enter initial balance' }]}
          >
            <InputNumber
              size="large"
              min={0}
              style={{ width: '100%' }}
              placeholder="Enter initial balance"
              prefix={<BankOutlined />}
            />
          </Form.Item>
        </Form>
      </div>
    )
  }

  // Step 4: Admin Accounts
  const renderStep4 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Create Admin Accounts
        </Title>
        
        <Form
          form={form}
          layout="vertical"
        >
          <Card title="Super Admin" style={{ marginBottom: '24px' }}>
            <Form.Item
              label="Full Name"
              name="superAdminName"
              rules={[{ required: true, message: 'Please enter super admin name' }]}
            >
              <Input size="large" placeholder="Enter super admin full name" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="superAdminEmail"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input size="large" type="email" placeholder="Enter super admin email" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="superAdminPassword"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password size="large" placeholder="Enter password (min 8 characters)" />
            </Form.Item>
          </Card>

          <Card title="Branch Manager (Optional)">
            <Form.Item
              label="Full Name"
              name="branchManagerName"
            >
              <Input size="large" placeholder="Enter branch manager name" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="branchManagerEmail"
              rules={[
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input size="large" type="email" placeholder="Enter branch manager email" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="branchManagerPassword"
              rules={[
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password size="large" placeholder="Enter password (min 8 characters)" />
            </Form.Item>
          </Card>
        </Form>
      </div>
    )
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!selectedIndustry) {
        message.warning('Please select an industry type')
        return
      }
      setCurrentStep(1)
    } else if (currentStep === 1) {
      try {
        await form.validateFields(['companyName', 'numberOfBranches'])
        
        // Validate branches
        const hasEmptyNames = branches.some(b => !b.name || b.name.trim() === '')
        const mainBranchCount = branches.filter(b => b.isMain).length
        
        if (hasEmptyNames) {
          message.error('Please enter a name for all branches')
          return
        }
        
        if (mainBranchCount !== 1) {
          message.error('Please select exactly one branch as the main branch')
          return
        }
        
        setCurrentStep(2)
      } catch (error) {
        console.error('Validation failed:', error)
      }
    } else if (currentStep === 2) {
      try {
        await form.validateFields(['superAdminName', 'superAdminEmail', 'superAdminPassword'])
        await handleFinish()
      } catch (error) {
        console.error('Validation failed:', error)
      }
    }
  }

  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      // Validate all form fields
      const values = await form.validateFields()
      
      // Ensure industry is selected
      if (!selectedIndustry) {
        message.error('Please select an industry type')
        setCurrentStep(0)
        setIsSubmitting(false)
        return
      }

      // Collect all data from steps
      const companyName = values.companyName
      const industryType = selectedIndustry

      // Collect admin credentials from Step 4
      const superAdminEmail = values.superAdminEmail
      const superAdminPassword = values.superAdminPassword
      const superAdminName = values.superAdminName

      // Validate admin credentials
      if (!superAdminEmail || !superAdminPassword) {
        message.error('Please provide Super Admin email and password')
        setCurrentStep(2) // Go back to Admin Accounts step
        setIsSubmitting(false)
        return
      }

      // Validate branches before submission
      const hasEmptyNames = branches.some(b => !b.name || b.name.trim() === '')
      const mainBranchCount = branches.filter(b => b.isMain).length
      
      if (hasEmptyNames) {
        message.error('Please enter a name for all branches')
        setCurrentStep(1) // Go back to branch configuration
        setIsSubmitting(false)
        return
      }
      
      if (mainBranchCount !== 1) {
        message.error('Please select exactly one branch as the main branch')
        setCurrentStep(1) // Go back to branch configuration
        setIsSubmitting(false)
        return
      }

      // Prepare branches array for service
      const branchesConfig = branches.map(b => ({
        name: b.name.trim(),
        currency: b.currency,
        isMain: b.isMain
      }))

      // Prepare payload matching service interface
      const payload = {
        name: companyName, // Company name
        industry_type: industryType, // Industry type
        branches: branchesConfig, // Array of branch configurations with name, currency, and isMain
        // Admin credentials for user creation
        adminData: {
          email: superAdminEmail,
          password: superAdminPassword,
          full_name: superAdminName
        }
      }

      // CRITICAL DEBUG: Log the exact payload being sent
      console.log('🔥 [SetupWizard] Payload being sent to setupService:', JSON.stringify(payload, null, 2))
      console.log('🔥 [SetupWizard] Company Name:', companyName)
      console.log('🔥 [SetupWizard] Number of branches:', branchesConfig.length)
      branchesConfig.forEach((b, i) => {
        console.log(`🔥 [SetupWizard] Branch ${i + 1}:`, JSON.stringify(b, null, 2))
      })

      // Call setup service
      const result = await setupService.completeSystemSetup(payload)

      if (result.success) {
        // CRITICAL: Verify user linking before redirecting
        console.log('✅ [SetupWizard] Setup completed. Verifying user linking...')
        console.log('✅ [SetupWizard] Result:', {
          tenantId: result.tenantId,
          mainBranchId: result.mainBranchId,
          user: result.user
        })
        
        // CRITICAL VERIFICATION: Ensure user data is present and linked
        if (!result.user) {
          const errorMsg = 'CRITICAL: Setup completed but user data is missing. Cannot proceed.'
          console.error(`❌ [SetupWizard] ${errorMsg}`)
          message.error(errorMsg)
          setIsSubmitting(false)
          return
        }
        
        if (!result.user.tenant_id || !result.user.branch_id) {
          const errorMsg = `CRITICAL: User linking incomplete. tenant_id: ${result.user.tenant_id}, branch_id: ${result.user.branch_id}. Setup cannot complete.`
          console.error(`❌ [SetupWizard] ${errorMsg}`)
          message.error(errorMsg)
          setIsSubmitting(false)
          return
        }
        
        console.log('✅ [SetupWizard] User linking confirmed:', {
          tenant_id: result.user.tenant_id,
          branch_id: result.user.branch_id,
          role: result.user.role
        })
        
        message.success('Setup completed successfully! Refreshing session...')
        
        // CRITICAL: Force context refresh before redirect
        // Wait a moment for any pending database writes to complete
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Force a hard reload to refresh all contexts (TenantContext, BranchContext, AuthContext, etc.)
        // This ensures the app reloads with the new tenant_id and branch_id
        console.log('🔄 [SetupWizard] Force reloading application to refresh contexts...')
        window.location.href = '/'
      } else {
        // Show error message with details
        const errorMessage = result.error || 'Failed to complete setup'
        message.error(`Setup failed: ${errorMessage}`)
        
        // Show specific error messages based on error code
        if (result.errorCode === 'MISSING_ADMIN_CREDENTIALS') {
          message.warning('Please provide Super Admin email and password')
          setCurrentStep(2) // Go back to Admin Accounts step
        } else if (result.errorCode === 'SIGNUP_FAILED' || result.errorCode === 'SIGNIN_FAILED') {
          message.warning('Failed to create or sign in admin account. Please check your credentials.')
          setCurrentStep(2) // Go back to Admin Accounts step
        }
      }
    } catch (error: any) {
      console.error('Setup error:', error)
      
      // Handle validation errors
      if (error.errorFields) {
        message.error('Please fill in all required fields')
        setIsSubmitting(false)
        return
      }
      
      // Handle other errors
      const errorMessage = error.message || 'Unknown error occurred'
      message.error(`Setup failed: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1()
      case 1:
        return renderStep2()
      case 2:
        return renderStep4() // Admin Accounts (Step 3 removed)
      default:
        return null
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card
        style={{
          maxWidth: '1200px',
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '8px' }}>
            System Setup Wizard
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#666' }}>
            Configure your ERP system in 3 simple steps
          </Paragraph>
        </div>

        <Steps
          current={currentStep}
          items={steps}
          style={{ marginBottom: '48px' }}
        />

        <div style={{ minHeight: '400px', marginBottom: '32px' }}>
          {renderStepContent()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <Button
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Space>
            {currentStep < steps.length - 1 ? (
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={handleNext}
                loading={loading}
              >
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleFinish}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Complete Setup
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default SetupWizard
