'use client'

import React from 'react'
import { Card, Button, Space, Tag, Input, message } from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SendOutlined, 
  FileTextOutlined, 
  EditOutlined,
  WhatsAppOutlined
} from '@ant-design/icons'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'

const { TextArea } = Input

interface ApprovalWorkflowProps {
  status: string
  refNumber: string
  clientName: string
  totalAmount: number
  includeLetterhead: boolean
  includeSignature: boolean
  managerNotes: string
  isManager: boolean
  onStatusChange: (status: string) => void
  onLetterheadToggle: (value: boolean) => void
  onSignatureToggle: (value: boolean) => void
  onNotesChange: (notes: string) => void
  onApprove?: () => void
  onReject?: () => void
  onSubmit?: () => void
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  status,
  refNumber,
  clientName,
  totalAmount,
  includeLetterhead,
  includeSignature,
  managerNotes,
  isManager,
  onStatusChange,
  onLetterheadToggle,
  onSignatureToggle,
  onNotesChange,
  onApprove,
  onReject,
  onSubmit
}) => {
  const { language } = useLanguage()
  const t = getTranslations(language)

  // Status configuration
  const statusConfig: Record<string, { color: string; text: string }> = {
    draft: { color: 'default', text: language === 'ar' ? 'مسودة' : 'Draft' },
    pending: { color: 'processing', text: language === 'ar' ? 'قيد المراجعة' : 'Pending Approval' },
    approved: { color: 'success', text: language === 'ar' ? 'موافق عليه' : 'Approved' },
    rejected: { color: 'error', text: language === 'ar' ? 'مرفوض' : 'Rejected' }
  }

  const currentStatus = statusConfig[status] || statusConfig.draft

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const message = language === 'ar' 
      ? `عرض سعر\nرقم المرجع: ${refNumber}\nالعميل: ${clientName}\nالمبلغ الإجمالي: ${totalAmount.toLocaleString()} ${t.common?.sar || 'SAR'}\nالحالة: ${currentStatus.text}`
      : `Quotation\nRef No: ${refNumber}\nClient: ${clientName}\nTotal Amount: ${totalAmount.toLocaleString()} ${t.common?.sar || 'SAR'}\nStatus: ${currentStatus.text}`
    
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <Card 
      title={language === 'ar' ? 'سير العمل والموافقة' : 'Approval Workflow & Print Controls'} 
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Status Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 'bold' }}>
            {language === 'ar' ? 'الحالة:' : 'Status:'}
          </span>
          <Tag color={currentStatus.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
            {currentStatus.text}
          </Tag>
        </div>

        {/* Print Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            type={includeLetterhead ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            onClick={() => onLetterheadToggle(!includeLetterhead)}
          >
            {language === 'ar' 
              ? `الترويسة ${includeLetterhead ? 'مفعلة' : 'معطلة'}`
              : `Letterhead ${includeLetterhead ? 'ON' : 'OFF'}`
            }
          </Button>
          <Button
            type={includeSignature ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => onSignatureToggle(!includeSignature)}
          >
            {language === 'ar' 
              ? `التوقيع ${includeSignature ? 'مفعل' : 'معطل'}`
              : `Signature ${includeSignature ? 'ON' : 'OFF'}`
            }
          </Button>
          <Button
            type="default"
            icon={<WhatsAppOutlined />}
            onClick={handleWhatsAppShare}
          >
            {language === 'ar' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
          </Button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isManager ? (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  if (onApprove) {
                    onApprove()
                  } else {
                    onStatusChange('approved')
                  }
                }}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                {language === 'ar' ? 'موافقة' : 'Approve'}
              </Button>
              <Button
                type="primary"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  if (onReject) {
                    onReject()
                  } else {
                    onStatusChange('rejected')
                  }
                }}
              >
                {language === 'ar' ? 'رفض / طلب تعديلات' : 'Reject / Request Changes'}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => {
                if (onSubmit) {
                  onSubmit()
                } else {
                  onStatusChange('pending')
                }
              }}
            >
              {language === 'ar' ? 'إرسال للموافقة' : 'Submit for Approval'}
            </Button>
          )}
        </div>

        {/* Manager Notes */}
        {(status === 'rejected' || managerNotes) && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
              {language === 'ar' ? 'ملاحظات المدير:' : 'Manager Notes:'}
            </div>
            <TextArea
              rows={3}
              value={managerNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل ملاحظات المدير...' : 'Enter manager notes...'}
              disabled={!isManager}
            />
          </div>
        )}
      </Space>
    </Card>
  )
}

export default ApprovalWorkflow
