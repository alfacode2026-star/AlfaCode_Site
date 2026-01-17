'use client'

import { useState } from 'react'
import { Form, Input, Button, Card, Alert, Typography } from 'antd'
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { supabase } from '../services/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'

const { Title } = Typography

const AuthPage = () => {
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔐 [AuthPage] Attempting login for:', values.email)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      })

      if (signInError) {
        console.error('❌ [AuthPage] Login error:', signInError)
        setError(
          signInError.message ||
            (language === 'ar' ? 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.' : 'Login failed. Please check your email and password.')
        )
        setLoading(false)
        return
      }

      if (!data.user) {
        console.error('❌ [AuthPage] No user returned from sign in')
        setError(
          language === 'ar'
            ? 'فشل تسجيل الدخول. لم يتم إنشاء جلسة المستخدم.'
            : 'Login failed. User session was not created.'
        )
        setLoading(false)
        return
      }

      console.log('✅ [AuthPage] Login successful for user:', data.user.id)

      // Simple redirect - Supabase auth state change will handle the rest
      // The onAuthStateChange listener in App.tsx will update the session
      window.location.replace('/')
    } catch (err: any) {
      console.error('❌ [AuthPage] Exception during login:', err)
      setError(
        err.message ||
          (language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
      )
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        direction: language === 'ar' ? 'rtl' : 'ltr'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <UserOutlined
            style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }}
          />
          <Title level={2} style={{ margin: 0 }}>
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Title>
          <p style={{ color: '#666', marginTop: '8px' }}>
            {language === 'ar'
              ? 'يرجى تسجيل الدخول للوصول إلى النظام'
              : 'Please login to access the system'}
          </p>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required' },
              { type: 'email', message: language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: language === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={language === 'ar' ? 'كلمة المرور' : 'Password'}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: '44px', fontSize: '16px' }}
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default AuthPage
