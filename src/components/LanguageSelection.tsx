import React from 'react'
import { Card, Button, Select, Typography, Space } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'

const { Title, Text } = Typography
const { Option } = Select

const LanguageSelection: React.FC = () => {
  const { language, setLanguage } = useLanguage()
  // Use English as default for the selection screen itself
  const t = getTranslations(language || 'en')

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    setLanguage(lang)
    // Immediately update localStorage
    localStorage.setItem('language', lang)
  }

  const handleContinue = () => {
    // Language should already be set via handleLanguageChange
    // This will trigger App.tsx to re-render and show the main app
    if (!language) {
      // If somehow language is still not set, default to English
      handleLanguageChange('en')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <GlobalOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {t.languageSelection.title}
            </Title>
            <Text type="secondary" style={{ fontSize: 16, display: 'block', marginTop: 8 }}>
              {t.languageSelection.subtitle}
            </Text>
          </div>

          <div style={{ textAlign: 'left' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              {t.languageSelection.selectLanguage}
            </Text>
            <Select
              value={language || undefined}
              onChange={handleLanguageChange}
              style={{ width: '100%' }}
              size="large"
            >
              <Option value="en">
                <span style={{ marginRight: 8 }}>🇬🇧</span>
                {t.languageSelection.english}
              </Option>
              <Option value="ar">
                <span style={{ marginRight: 8 }}>🇸🇦</span>
                {t.languageSelection.arabic}
              </Option>
            </Select>
          </div>

          <Button
            type="primary"
            size="large"
            block
            onClick={handleContinue}
            disabled={!language}
            style={{ height: 48, fontSize: 16 }}
          >
            {t.languageSelection.continue}
          </Button>
          {!language && (
            <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12, textAlign: 'center' }}>
              {t.languageSelection.pleaseSelectLanguage}
            </div>
          )}
        </Space>
      </Card>
    </div>
  )
}

export default LanguageSelection
