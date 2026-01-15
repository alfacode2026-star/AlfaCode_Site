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
  message
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

const SetupWizard = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedIndustry, setSelectedIndustry] = useState<'engineering' | 'retail' | 'services' | null>(null)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      title: 'Financial Setup',
      description: 'Currencies & Treasuries'
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

  // Step 2: Organization Structure
  const renderStep2 = () => {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
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
            />
          </Form.Item>

          <Form.Item
            label="Main Branch Name"
            name="mainBranchName"
            rules={[{ required: true, message: 'Please enter main branch name' }]}
          >
            <Input size="large" placeholder="Enter main branch name" />
          </Form.Item>

          <Form.Item
            label="Main Branch Address"
            name="mainBranchAddress"
          >
            <Input.TextArea
              rows={3}
              placeholder="Enter main branch address (optional)"
            />
          </Form.Item>
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
        await form.validateFields(['companyName', 'numberOfBranches', 'mainBranchName'])
        setCurrentStep(2)
      } catch (error) {
        console.error('Validation failed:', error)
      }
    } else if (currentStep === 2) {
      try {
        await form.validateFields(['currency', 'treasuryName', 'initialBalance'])
        setCurrentStep(3)
      } catch (error) {
        console.error('Validation failed:', error)
      }
    } else if (currentStep === 3) {
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
      const numberOfBranches = values.numberOfBranches || 1
      const mainBranchName = values.mainBranchName
      const currency = values.currency || 'SAR'

      // Collect admin credentials from Step 4
      const superAdminEmail = values.superAdminEmail
      const superAdminPassword = values.superAdminPassword
      const superAdminName = values.superAdminName

      // Validate admin credentials
      if (!superAdminEmail || !superAdminPassword) {
        message.error('Please provide Super Admin email and password')
        setCurrentStep(3) // Go back to Step 4 (Admin Accounts)
        setIsSubmitting(false)
        return
      }

      // Build additionalBranches array if numberOfBranches > 1
      const additionalBranches: Array<{ name: string }> = []
      if (numberOfBranches > 1) {
        for (let i = 2; i <= numberOfBranches; i++) {
          additionalBranches.push({ name: `Branch ${i}` })
        }
      }

      // Prepare payload matching service interface
      const payload = {
        name: companyName, // Company name
        industry_type: industryType, // Industry type
        currency: currency, // Currency code
        mainBranchName: mainBranchName, // Main branch name
        additionalBranches: additionalBranches.length > 0 ? additionalBranches : undefined, // Additional branches array
        // Also include numberOfBranches for backward compatibility
        numberOfBranches: numberOfBranches,
        // Admin credentials for user creation
        adminData: {
          email: superAdminEmail,
          password: superAdminPassword,
          full_name: superAdminName
        }
      }

      // Call setup service
      const result = await setupService.completeSystemSetup(payload)

      if (result.success) {
        message.success('Setup completed successfully! Redirecting to dashboard...')
        
        // Wait 2 seconds then force full page refresh
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        // Show error message with details
        const errorMessage = result.error || 'Failed to complete setup'
        message.error(`Setup failed: ${errorMessage}`)
        
        // Show specific error messages based on error code
        if (result.errorCode === 'MISSING_ADMIN_CREDENTIALS') {
          message.warning('Please provide Super Admin email and password')
          setCurrentStep(3) // Go back to Step 4 (Admin Accounts)
        } else if (result.errorCode === 'SIGNUP_FAILED' || result.errorCode === 'SIGNIN_FAILED') {
          message.warning('Failed to create or sign in admin account. Please check your credentials.')
          setCurrentStep(3) // Go back to Step 4 (Admin Accounts)
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
      case 3:
        return renderStep4()
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
            Configure your ERP system in 4 simple steps
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
