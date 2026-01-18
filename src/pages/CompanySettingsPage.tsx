'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import companySettingsService from '../services/companySettingsService'
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  message,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  Alert
} from 'antd'
import {
  SaveOutlined,
  UploadOutlined,
  FileImageOutlined,
  UserOutlined,
  ShopOutlined
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'

const { Title, Text } = Typography

const CompanySettingsPage = () => {
  const { currentTenantId } = useTenant()
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [companySettings, setCompanySettings] = useState<any>(null)
  
  // Image states
  const [letterheadFile, setLetterheadFile] = useState<UploadFile | null>(null)
  const [stampFile, setStampFile] = useState<UploadFile | null>(null)
  const [logoFile, setLogoFile] = useState<UploadFile | null>(null)

  useEffect(() => {
    loadCompanySettings()
  }, [currentTenantId])

  const loadCompanySettings = async () => {
    try {
      const settings = await companySettingsService.getCompanySettings()
      if (settings) {
        setCompanySettings(settings)
        form.setFieldsValue({
          companyName: settings.companyName,
          authorizedManagerName: settings.authorizedManagerName,
          authorizedManagerTitle: settings.authorizedManagerTitle,
          companyAddress: settings.companyAddress,
          companyPhone: settings.companyPhone,
          companyEmail: settings.companyEmail,
          companyWebsite: settings.companyWebsite,
          taxNumber: settings.taxNumber,
          commercialRegister: settings.commercialRegister,
          topMargin: settings.topMarginCm || 4,
          bottomMargin: settings.bottomMarginCm || 3
        })
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Letterhead upload handler
  const handleLetterheadUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const base64 = await fileToBase64(file as File)
      setLetterheadFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: base64
      } as UploadFile)
      if (onSuccess) onSuccess('ok')
      message.success('Letterhead uploaded successfully')
    } catch (error) {
      console.error('Error uploading letterhead:', error)
      if (onError) onError(error as Error)
      message.error('Failed to upload letterhead')
    }
  }

  // Digital stamp upload handler
  const handleStampUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const base64 = await fileToBase64(file as File)
      setStampFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: base64
      } as UploadFile)
      if (onSuccess) onSuccess('ok')
      message.success('Digital stamp uploaded successfully')
    } catch (error) {
      console.error('Error uploading stamp:', error)
      if (onError) onError(error as Error)
      message.error('Failed to upload digital stamp')
    }
  }

  // Logo upload handler
  const handleLogoUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const base64 = await fileToBase64(file as File)
      setLogoFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: base64
      } as UploadFile)
      if (onSuccess) onSuccess('ok')
      message.success('Logo uploaded successfully')
    } catch (error) {
      console.error('Error uploading logo:', error)
      if (onError) onError(error as Error)
      message.error('Failed to upload logo')
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()

      const settingsData: any = {
        companyName: values.companyName,
        authorizedManagerName: values.authorizedManagerName,
        authorizedManagerTitle: values.authorizedManagerTitle,
        companyAddress: values.companyAddress,
        companyPhone: values.companyPhone,
        companyEmail: values.companyEmail,
        companyWebsite: values.companyWebsite,
        taxNumber: values.taxNumber,
        commercialRegister: values.commercialRegister,
        topMarginCm: values.topMargin || 4,
        bottomMarginCm: values.bottomMargin || 3
      }

      // Add image URLs if uploaded
      if (letterheadFile?.url) {
        settingsData.letterheadUrl = letterheadFile.url
      } else if (companySettings?.letterheadUrl) {
        settingsData.letterheadUrl = companySettings.letterheadUrl
      }

      if (stampFile?.url) {
        settingsData.digitalStampUrl = stampFile.url
      } else if (companySettings?.digitalStampUrl) {
        settingsData.digitalStampUrl = companySettings.digitalStampUrl
      }

      if (logoFile?.url) {
        settingsData.logoUrl = logoFile.url
      } else if (companySettings?.logoUrl) {
        settingsData.logoUrl = companySettings.logoUrl
      }

      const result = await companySettingsService.saveCompanySettings(settingsData)

      if (result.success) {
        message.success('Company settings saved successfully!')
        await loadCompanySettings()
      } else {
        message.error(result.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      message.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Company Settings</Title>
          <Text type="secondary">Configure company branding and quotation settings</Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
          size="large"
        >
          Save Settings
        </Button>
      </div>

      <Alert
        message="Full-Page Letterhead Instructions"
        description="Upload a high-resolution PNG/JPG image of your entire A4 page including header, footer, and watermark. The system will use this as a background layer, and quotation content will flow over it."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Card title="Company Information" style={{ marginBottom: 16 }}>
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Form.Item
                name="companyName"
                label="Company Name"
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input
                  prefix={<ShopOutlined />}
                  placeholder="Enter company name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="authorizedManagerName"
                label="Authorized Manager Name"
                rules={[{ required: true, message: 'Please enter manager name' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Manager name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="authorizedManagerTitle"
                label="Manager Title/Position"
                rules={[{ required: true, message: 'Please enter manager title' }]}
              >
                <Input placeholder="e.g., General Manager" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="companyPhone"
                label="Company Phone"
              >
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="companyEmail"
                label="Company Email"
              >
                <Input placeholder="Email address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="companyWebsite"
                label="Company Website"
              >
                <Input placeholder="Website URL" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="companyAddress"
                label="Company Address"
              >
                <Input.TextArea rows={2} placeholder="Full address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taxNumber"
                label="Tax Number"
              >
                <Input placeholder="Tax number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="commercialRegister"
                label="Commercial Register"
              >
                <Input placeholder="Commercial register number" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Branding & Media" style={{ marginBottom: 16 }}>
          <Row gutter={[24, 24]}>
            {/* Full-Page Letterhead */}
            <Col span={24}>
              <Divider>Full-Page Letterhead (A4 Background)</Divider>
              <Form.Item
                label="Letterhead Image"
                extra="Upload a high-resolution PNG/JPG of the entire A4 page (210mm x 297mm) including header, footer, and watermark. Recommended: 2480x3508 pixels at 300 DPI."
              >
                <Upload
                  customRequest={handleLetterheadUpload}
                  accept="image/png,image/jpeg,image/jpg"
                  maxCount={1}
                  listType="picture-card"
                  showUploadList={{
                    showPreviewIcon: true,
                    showRemoveIcon: true
                  }}
                >
                  {(!letterheadFile && !companySettings?.letterheadUrl) && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload Letterhead</div>
                    </div>
                  )}
                </Upload>
                {companySettings?.letterheadUrl && !letterheadFile && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Current letterhead:</Text>
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={companySettings.letterheadUrl}
                        alt="Current letterhead"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                )}
                {letterheadFile?.url && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="success">New letterhead preview:</Text>
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={letterheadFile.url}
                        alt="New letterhead"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          border: '1px solid #52c41a',
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                )}
              </Form.Item>
            </Col>

            {/* Digital Stamp */}
            <Col span={12}>
              <Divider>Digital Stamp</Divider>
              <Form.Item
                label="Digital Stamp (Transparent PNG)"
                extra="Upload a transparent PNG of your company stamp/signature. Recommended: 300x300 pixels."
              >
                <Upload
                  customRequest={handleStampUpload}
                  accept="image/png"
                  maxCount={1}
                  listType="picture-card"
                  showUploadList={{
                    showPreviewIcon: true,
                    showRemoveIcon: true
                  }}
                >
                  {(!stampFile && !companySettings?.digitalStampUrl) && (
                    <div>
                      <FileImageOutlined />
                      <div style={{ marginTop: 8 }}>Upload Stamp</div>
                    </div>
                  )}
                </Upload>
                {companySettings?.digitalStampUrl && !stampFile && (
                  <div style={{ marginTop: 16 }}>
                    <img
                      src={companySettings.digitalStampUrl}
                      alt="Current stamp"
                      style={{
                        maxWidth: '150px',
                        maxHeight: '150px',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4
                      }}
                    />
                  </div>
                )}
                {stampFile?.url && (
                  <div style={{ marginTop: 16 }}>
                    <img
                      src={stampFile.url}
                      alt="New stamp"
                      style={{
                        maxWidth: '150px',
                        maxHeight: '150px',
                        border: '1px solid #52c41a',
                        borderRadius: 4
                      }}
                    />
                  </div>
                )}
              </Form.Item>
            </Col>

            {/* Logo */}
            <Col span={12}>
              <Divider>Company Logo</Divider>
              <Form.Item
                label="Company Logo (Optional)"
                extra="Upload your company logo. Recommended: 300x100 pixels."
              >
                <Upload
                  customRequest={handleLogoUpload}
                  accept="image/png,image/jpeg,image/jpg"
                  maxCount={1}
                  listType="picture-card"
                  showUploadList={{
                    showPreviewIcon: true,
                    showRemoveIcon: true
                  }}
                >
                  {(!logoFile && !companySettings?.logoUrl) && (
                    <div>
                      <FileImageOutlined />
                      <div style={{ marginTop: 8 }}>Upload Logo</div>
                    </div>
                  )}
                </Upload>
                {companySettings?.logoUrl && !logoFile && (
                  <div style={{ marginTop: 16 }}>
                    <img
                      src={companySettings.logoUrl}
                      alt="Current logo"
                      style={{
                        maxWidth: '150px',
                        maxHeight: '100px',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4
                      }}
                    />
                  </div>
                )}
                {logoFile?.url && (
                  <div style={{ marginTop: 16 }}>
                    <img
                      src={logoFile.url}
                      alt="New logo"
                      style={{
                        maxWidth: '150px',
                        maxHeight: '100px',
                        border: '1px solid #52c41a',
                        borderRadius: 4
                      }}
                    />
                  </div>
                )}
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Content Margins">
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Form.Item
                name="topMargin"
                label="Top Margin (cm)"
                extra="Distance from top of letterhead to start of content. Default: 4cm"
                rules={[{ required: true, message: 'Please enter top margin' }]}
                initialValue={4}
              >
                <Input type="number" min={1} max={10} step={0.5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bottomMargin"
                label="Bottom Margin (cm)"
                extra="Distance from bottom of letterhead to end of content. Default: 3cm"
                rules={[{ required: true, message: 'Please enter bottom margin' }]}
                initialValue={3}
              >
                <Input type="number" min={1} max={10} step={0.5} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </div>
  )
}

export default CompanySettingsPage
