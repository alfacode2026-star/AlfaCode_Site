'use client'

import React, { useState, useEffect } from 'react'
import { Form, Modal, Input, Button, Row, Col, message } from 'antd'
import { useLanguage } from '../../contexts/LanguageContext'
import { getTranslations } from '../../utils/translations'
import SmartTextArea from '../common/SmartTextArea'
import { 
  SCOPE_SUGGESTIONS, 
  TERMS_SUGGESTIONS, 
  INTRODUCTION_SUGGESTIONS, 
  FACILITIES_SUGGESTIONS,
  EXCLUSIONS_SUGGESTIONS 
} from '../../constants/quotationSuggestions'

const { TextArea } = Input

interface QuotationModalProps {
  visible: boolean
  onCancel: () => void
  onOk: (values: any) => void
  initialValues?: any
  title?: string
}

const QuotationModal: React.FC<QuotationModalProps> = ({
  visible,
  onCancel,
  onOk,
  initialValues,
  title
}) => {
  const { language } = useLanguage()
  const t = getTranslations(language)
  const [form] = Form.useForm()
  const [introductionText, setIntroductionText] = useState<string>('')
  const [facilitiesText, setFacilitiesText] = useState<string>('')
  const [exclusionsText, setExclusionsText] = useState<string>('')

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues)
      if (initialValues.introduction) {
        setIntroductionText(initialValues.introduction)
      }
      if (initialValues.facilities) {
        const facilitiesValue = Array.isArray(initialValues.facilities) 
          ? initialValues.facilities.join('\n') 
          : initialValues.facilities || ''
        setFacilitiesText(facilitiesValue)
      }
      if (initialValues.exclusions) {
        const exclusionsValue = Array.isArray(initialValues.exclusions) 
          ? initialValues.exclusions.join('\n') 
          : initialValues.exclusions || ''
        setExclusionsText(exclusionsValue)
      }
    } else if (visible) {
      form.resetFields()
      setIntroductionText('')
      setFacilitiesText('')
      setExclusionsText('')
    }
  }, [visible, initialValues, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const formData = {
        ...values,
        introduction: introductionText,
        facilities: facilitiesText ? facilitiesText.split('\n').filter(line => line.trim() !== '') : [],
        exclusions: exclusionsText ? exclusionsText.split('\n').filter(line => line.trim() !== '') : []
      }
      onOk(formData)
      form.resetFields()
      setIntroductionText('')
      setFacilitiesText('')
      setExclusionsText('')
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleCancel = () => {
      form.resetFields()
      setIntroductionText('')
      setFacilitiesText('')
      setExclusionsText('')
      onCancel()
  }

  return (
    <Modal
      title={title || (language === 'ar' ? 'إنشاء عرض سعر' : 'Create Quotation')}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={1000}
      okText={t.quotations?.save || 'Save'}
      cancelText={t.quotations?.cancel || 'Cancel'}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item 
          name="introduction" 
          label={t.quotations?.introduction || 'Introduction'}
        >
          <SmartTextArea
            rows={4}
            suggestions={INTRODUCTION_SUGGESTIONS}
            placeholder="Select an introduction template..."
            value={introductionText}
            onChange={(e) => {
              const text = e?.target?.value || ''
              setIntroductionText(text)
              form.setFieldsValue({ introduction: text })
            }}
          />
        </Form.Item>

        <Form.Item 
          name="facilities" 
          label={t.quotations?.facilities || 'Facilities & Logistics'}
        >
          <SmartTextArea
            rows={4}
            suggestions={FACILITIES_SUGGESTIONS}
            placeholder="Describe site facilities and logistics..."
            value={facilitiesText}
            onChange={(e) => {
              const text = e?.target?.value || ''
              setFacilitiesText(text)
              form.setFieldsValue({ facilities: text })
            }}
          />
        </Form.Item>

        <Form.Item 
          name="exclusions" 
          label={t.quotations?.exclusions || 'Exclusions'}
        >
          <SmartTextArea
            rows={5}
            suggestions={EXCLUSIONS_SUGGESTIONS}
            placeholder="List project exclusions..."
            value={exclusionsText}
            onChange={(e) => {
              const text = e?.target?.value || ''
              setExclusionsText(text)
              form.setFieldsValue({ exclusions: text })
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default QuotationModal
