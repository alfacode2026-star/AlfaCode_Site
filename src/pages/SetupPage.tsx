'use client'

import { useState } from 'react'
import { Card, Typography, Button, message, Space } from 'antd'
import { 
  BuildOutlined, 
  ShoppingOutlined, 
  CustomerServiceOutlined,
  CheckCircleOutlined,
  RocketOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import { supabase } from '../services/supabaseClient'

const { Title, Paragraph } = Typography

interface IndustryCard {
  id: 'engineering' | 'retail' | 'services'
  title: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
}

const SetupPage = () => {
  const navigate = useNavigate()
  const { currentTenantId, refreshIndustryType } = useTenant()
  const [loading, setLoading] = useState<string | null>(null)

  const industries: IndustryCard[] = [
    {
      id: 'engineering',
      title: 'الهندسة والمقاولات',
      description: 'إدارة المشاريع، المستخلصات، المواد والمعدات، والمقاولات',
      icon: <BuildOutlined style={{ fontSize: 48 }} />,
      color: '#1890ff',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'retail',
      title: 'التجارة والتجزئة',
      description: 'إدارة المنتجات، الطلبات، المخزون، والأسعار',
      icon: <ShoppingOutlined style={{ fontSize: 48 }} />,
      color: '#52c41a',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 'services',
      title: 'الخدمات العامة',
      description: 'إدارة الخدمات، العملاء، والحجوزات',
      icon: <CustomerServiceOutlined style={{ fontSize: 48 }} />,
      color: '#fa8c16',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ]

  const handleIndustrySelect = async (industryId: 'engineering' | 'retail' | 'services') => {
    if (!currentTenantId) {
      message.error('يرجى اختيار الشركة أولاً')
      return
    }

    setLoading(industryId)

    try {
      // Update tenant's industry_type in Supabase
      const { error } = await supabase
        .from('tenants')
        .update({ industry_type: industryId })
        .eq('id', currentTenantId)

      if (error) {
        // If tenants table doesn't exist or update fails, try to insert
        console.warn('Update failed, attempting insert:', error)
        
        // Try to insert if the tenant doesn't exist in tenants table
        const { error: insertError } = await supabase
          .from('tenants')
          .upsert({ 
            id: currentTenantId, 
            industry_type: industryId 
          }, { 
            onConflict: 'id' 
          })

        if (insertError) {
          throw insertError
        }
      }

      // Refresh industry type in context
      await refreshIndustryType()

      message.success('تم تحديد نوع الصناعة بنجاح!')
      
      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/')
      }, 500)
    } catch (error: any) {
      console.error('Error updating industry type:', error)
      message.error(`فشل في تحديث نوع الصناعة: ${error.message || 'خطأ غير معروف'}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      direction: 'rtl'
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Header */}
        <Space vertical size="large" style={{ marginBottom: '48px', width: '100%' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            borderRadius: '16px', 
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <RocketOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: '16px' }} />
            <Title level={1} style={{ margin: 0, color: '#333' }}>
              مرحباً بك في نظام ERP
            </Title>
            <Paragraph style={{ fontSize: '18px', color: '#666', marginTop: '16px', marginBottom: 0 }}>
              اختر نوع نشاطك التجاري لبدء الإعداد
            </Paragraph>
          </div>
        </Space>

        {/* Industry Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginTop: '32px'
        }}>
          {industries.map((industry) => (
            <Card
              key={industry.id}
              hoverable
              loading={loading === industry.id}
              onClick={() => handleIndustrySelect(industry.id)}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                background: 'white'
              }}
              styles={{
                body: {
                  padding: '32px',
                  textAlign: 'center'
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: industry.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 4px 16px ${industry.color}40`
              }}>
                {industry.icon}
              </div>
              
              <Title level={3} style={{ 
                margin: '0 0 16px 0', 
                color: '#333',
                fontWeight: 'bold'
              }}>
                {industry.title}
              </Title>
              
              <Paragraph style={{ 
                color: '#666', 
                fontSize: '16px',
                marginBottom: '24px',
                minHeight: '48px'
              }}>
                {industry.description}
              </Paragraph>

              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                loading={loading === industry.id}
                style={{
                  background: industry.gradient,
                  border: 'none',
                  borderRadius: '8px',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleIndustrySelect(industry.id)
                }}
              >
                اختر هذا النوع
              </Button>
            </Card>
          ))}
        </div>

        {/* Footer Note */}
        <div style={{
          marginTop: '48px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          padding: '16px',
          color: '#666'
        }}>
          <Paragraph style={{ margin: 0, fontSize: '14px' }}>
            يمكنك تغيير هذا الإعداد لاحقاً من صفحة الإعدادات
          </Paragraph>
        </div>
      </div>
    </div>
  )
}

export default SetupPage
