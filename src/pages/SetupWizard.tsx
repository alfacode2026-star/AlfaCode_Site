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
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  UserOutlined,
  BankOutlined,
  ShopOutlined
} from '@ant-design/icons'
import setupService from '../services/setupService'

const { Title, Paragraph } = Typography
const { Option } = Select

interface BranchConfig {
  name: string
  currency: string
  isMain: boolean
}

const SetupWizard = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [numberOfBranches, setNumberOfBranches] = useState<number>(1)
  const [branches, setBranches] = useState<BranchConfig[]>([])

  const steps = [
    {
      title: 'Branch Quantity',
      description: 'How many branches?'
    },
    {
      title: 'Branch Configuration',
      description: 'Define your branches'
    },
    {
      title: 'Admin Account',
      description: 'Create administrator'
    }
  ]

  // Step 1: Branch Quantity
  const renderStep1 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          How many branches do you have?
        </Title>
        <Paragraph style={{ textAlign: 'center', marginBottom: '32px', color: '#666' }}>
          Enter the number of branches you want to configure
        </Paragraph>
        
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            numberOfBranches: 1
          }}
        >
          <Form.Item
            label="Number of Branches"
            name="numberOfBranches"
            rules={[
              { required: true, message: 'Please enter number of branches' },
              { type: 'number', min: 1, message: 'Must be at least 1' },
              { type: 'number', max: 50, message: 'Maximum 50 branches' }
            ]}
          >
            <InputNumber
              size="large"
              min={1}
              max={50}
              style={{ width: '100%' }}
              placeholder="Enter number of branches"
              prefix={<ShopOutlined />}
            />
          </Form.Item>
        </Form>
      </div>
    )
  }

  // Step 2: Branch Definitions
  const renderStep2 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '16px' }}>
          Configure Your Branches
        </Title>
        <Paragraph style={{ textAlign: 'center', marginBottom: '32px', color: '#666' }}>
          Define each branch with a name, currency, and mark one as the main branch
        </Paragraph>
        
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
                    value={branch.name || ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      handleBranchChange(index, 'name', newValue)
                    }}
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
      </div>
    )
  }

  // Step 3: Admin Account
  const renderStep3 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Create Admin Account
        </Title>
        <Paragraph style={{ textAlign: 'center', marginBottom: '32px', color: '#666' }}>
          Set up your administrator account credentials
        </Paragraph>
        
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
        </Form>
      </div>
    )
  }

  // Handle branch field changes
  const handleBranchChange = (index: number, field: keyof BranchConfig, value: string | boolean) => {
    // Create a deep copy to ensure state updates properly
    const newBranches = branches.map(b => ({ ...b }))
    
    if (field === 'isMain' && value === true) {
      // If setting this branch as main, unset all others
      newBranches.forEach((b, i) => {
        b.isMain = i === index
      })
    } else {
      // Update the specific field for the specific branch
      newBranches[index][field] = value as any
    }
    
    // Update state immediately - this is the source of truth for branch data
    setBranches(newBranches)
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      // Step 1: Validate number of branches and initialize branches array
      try {
        const values = await form.validateFields(['numberOfBranches'])
        const numBranches = values.numberOfBranches || 1
        
        if (numBranches < 1 || numBranches > 50) {
          message.error('Number of branches must be between 1 and 50')
          return
        }
        
        setNumberOfBranches(numBranches)
        
        // Initialize branches array
        const newBranches: BranchConfig[] = []
        for (let i = 0; i < numBranches; i++) {
          newBranches.push({
            name: '',
            currency: 'SAR',
            isMain: i === 0 // First branch is main by default
          })
        }
        
        setBranches(newBranches)
        setCurrentStep(1)
      } catch (error) {
        console.error('Validation failed:', error)
      }
    } else if (currentStep === 1) {
      // Step 2: Validate branch configurations
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
      
      // Validate all branches have currencies
      const hasEmptyCurrencies = branches.some(b => !b.currency || b.currency.trim() === '')
      if (hasEmptyCurrencies) {
        message.error('Please select a currency for all branches')
        return
      }
      
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Step 3: Validate admin credentials and finish
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
      
      // CRITICAL: Validate branches state BEFORE using it
      console.log('🔍 [SetupWizard] Validating branches state:', branches.map(b => ({ name: b.name, currency: b.currency, isMain: b.isMain })))
      
      // Ensure branches state is not empty
      if (!branches || branches.length === 0) {
        message.error('No branches configured. Please add at least one branch.')
        setCurrentStep(1)
        setIsSubmitting(false)
        return
      }
      
      // Validate branches before submission
      const hasEmptyNames = branches.some(b => !b.name || b.name.trim() === '')
      const mainBranchCount = branches.filter(b => b.isMain).length
      
      if (hasEmptyNames) {
        message.error('Please enter a name for all branches')
        setCurrentStep(1)
        setIsSubmitting(false)
        return
      }
      
      if (mainBranchCount !== 1) {
        message.error('Please select exactly one branch as the main branch')
        setCurrentStep(1)
        setIsSubmitting(false)
        return
      }

      // CRITICAL: Find the main branch and use its name as tenant name
      const mainBranch = branches.find(b => b.isMain)
      if (!mainBranch || !mainBranch.name) {
        message.error('Main branch not found or has no name')
        setCurrentStep(1)
        setIsSubmitting(false)
        return
      }
      
      const tenantName = mainBranch.name.trim()
      console.log('🏢 [SetupWizard] Tenant name (from main branch):', tenantName)

      // Collect admin credentials
      const superAdminEmail = values.superAdminEmail
      const superAdminPassword = values.superAdminPassword
      const superAdminName = values.superAdminName

      // Validate admin credentials
      if (!superAdminEmail || !superAdminPassword) {
        message.error('Please provide Super Admin email and password')
        setCurrentStep(2)
        setIsSubmitting(false)
        return
      }

      // CRITICAL: Prepare branches array DIRECTLY from state (NOT from form values)
      const branchesConfig = branches.map((b, index) => {
        const branchData = {
          name: (b.name || '').trim(),
          currency: b.currency || 'SAR',
          isMain: b.isMain || false
        }
        
        // Fail-loud if name is still empty after trim
        if (!branchData.name) {
          console.error(`❌ [SetupWizard] CRITICAL: Branch ${index + 1} has empty name after trim!`)
          throw new Error(`Branch ${index + 1} name cannot be empty`)
        }
        
        return branchData
      })
      
      // Final validation: Ensure all branches have names
      const allBranchesHaveNames = branchesConfig.every(b => b.name && b.name.length > 0)
      if (!allBranchesHaveNames) {
        message.error('One or more branches have empty names. Please fill in all branch names.')
        setCurrentStep(1)
        setIsSubmitting(false)
        return
      }

      // Prepare payload matching service interface
      // CRITICAL: Tenant name = Main branch name (automatic, no user input)
      const payload = {
        name: tenantName, // Company/Tenant name = Main branch name
        industry_type: 'engineering', // Default to engineering (can be made configurable later)
        branches: branchesConfig, // Array of branch configurations
        adminData: {
          email: superAdminEmail,
          password: superAdminPassword,
          full_name: superAdminName
        }
      }

      // CRITICAL DEBUG: Log the exact payload being sent
      console.log('🔥 [SetupWizard] ========== FINAL PAYLOAD VERIFICATION ==========')
      console.log('🔥 [SetupWizard] Tenant Name (from main branch):', tenantName)
      console.log('🔥 [SetupWizard] Raw branches state:', JSON.stringify(branches, null, 2))
      console.log('🔥 [SetupWizard] Processed branchesConfig:', JSON.stringify(branchesConfig, null, 2))
      console.log('🔥 [SetupWizard] Number of branches:', branchesConfig.length)
      branchesConfig.forEach((b, i) => {
        console.log(`🔥 [SetupWizard] Branch ${i + 1} FINAL:`, {
          name: b.name,
          nameLength: b.name?.length || 0,
          currency: b.currency,
          isMain: b.isMain
        })
      })
      console.log('🔥 [SetupWizard] Complete payload:', JSON.stringify(payload, null, 2))
      console.log('🔥 [SetupWizard] ================================================')

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
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Force a hard reload to refresh all contexts
        console.log('🔄 [SetupWizard] Force reloading application to refresh contexts...')
        window.location.href = '/'
      } else {
        // Show error message with details
        const errorMessage = result.error || 'Failed to complete setup'
        message.error(`Setup failed: ${errorMessage}`)
        
        // Show specific error messages based on error code
        if (result.errorCode === 'MISSING_ADMIN_CREDENTIALS') {
          message.warning('Please provide Super Admin email and password')
          setCurrentStep(2)
        } else if (result.errorCode === 'SIGNUP_FAILED' || result.errorCode === 'SIGNIN_FAILED') {
          message.warning('Failed to create or sign in admin account. Please check your credentials.')
          setCurrentStep(2)
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
        return renderStep3()
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
            Configure your system in 3 simple steps
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
