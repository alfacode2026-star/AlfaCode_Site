'use client'

import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import { getTranslations } from '../utils/translations'
import { getCurrencySymbol } from '../utils/currencyUtils'

interface QuotationPDFPreviewProps {
  companySettings: any
  formValues: any
  boqItems: Array<{ sq: number; activities: string; amount: number }>
  boqTotal: number
  includeLetterhead?: boolean
  includeSignature?: boolean
}

const QuotationPDFPreview: React.FC<QuotationPDFPreviewProps> = ({
  companySettings,
  formValues,
  boqItems,
  boqTotal,
  includeLetterhead = true,
  includeSignature = true
}) => {
  const { language } = useLanguage()
  const { branchCurrency } = useBranch()
  const t = getTranslations(language)
  const isRTL = language === 'ar'
  const displayCurrency = branchCurrency || 'SAR'
  const currencySymbol = getCurrencySymbol(displayCurrency, language)
  
  // Get margins from settings (default: 4cm top, 3cm bottom) with null-safety
  const topMarginCm = companySettings?.topMarginCm ?? 4.0
  const bottomMarginCm = companySettings?.bottomMarginCm ?? 3.0
  
  // Convert cm to mm for CSS (1cm = 10mm)
  const topMarginMm = topMarginCm * 10
  const bottomMarginMm = bottomMarginCm * 10

  // Helper function to safely convert input to an array
  const getListItems = (data: any): string[] => {
    if (Array.isArray(data)) return data 
    if (typeof data === 'string') {
      return data.split('\n').filter(line => line.trim() !== '')
    }
    return [] 
  }

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { 
            size: A4; 
            /* هذا الهامش سيطبق على كل صفحة في الملف (للشعار والفوتر) */
            margin-top: 80mm !important;    
            margin-bottom: 60mm !important; 
            margin-left: 10mm;              
            margin-right: 10mm;
          }
          body { 
            transform: scale(1) !important; 
            zoom: 1 !important; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            width: 100% !important;
            padding: 0 !important; 
            margin: 0 !important;
          }
          /* هام جداً: إلغاء البادينج الداخلي عند الطباعة لتجنب تضاعف المسافات */
          /* لأن @page قام بالمهمة بالفعل */
          .content-area {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            min-height: auto !important;
          }
        `}
      </style>
      <div
        className="print-container"
        style={{
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          backgroundColor: '#fff',
          position: 'relative',
          fontFamily: isRTL ? 'Arial, Tahoma, sans-serif' : 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#000',
          overflow: 'hidden',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
        {/* Full-Page Letterhead Background - Only render if includeLetterhead is true */}
        {includeLetterhead && companySettings?.letterheadUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${companySettings.letterheadUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              zIndex: 0,
              opacity: 1
            }}
          />
        )}

        {/* Content Area - Flows over Watermark */}
        {/* Added className 'content-area' to control print padding via CSS */}
        <div
          className="content-area"
          style={{
            paddingTop: `${topMarginMm}mm`,
            paddingLeft: '20mm',
            paddingRight: '20mm',
            paddingBottom: `${bottomMarginMm}mm`,
            position: 'relative',
            zIndex: 2,
            minHeight: `calc(297mm - ${topMarginMm}mm - ${bottomMarginMm}mm)`
          }}
        >
          {/* Header Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '20px',
              border: '1px solid #ddd',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              fontSize: '12px'
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', width: '25%', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.quotations.company || 'COMPANY'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', width: '75%', textAlign: isRTL ? 'right' : 'left' }}>
                  {formValues.company || companySettings?.companyName || ''}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.quotations.attention || 'ATTENTION'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: isRTL ? 'right' : 'left' }}>
                  {formValues.attention || formValues.customerName || ''}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.quotations.project || 'PROJECT'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: isRTL ? 'right' : 'left' }}>
                  {formValues.projectName || ''}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.quotations.subject || 'SUBJECT'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: isRTL ? 'right' : 'left' }}>
                  {formValues.subject || ''}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.quotations.refNo || 'REF NO'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: isRTL ? 'right' : 'left' }}>
                  {formValues.refNumber || ''}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.quotations.date || 'DATE'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: isRTL ? 'right' : 'left' }}>
                  {formValues.quotationDate
                    ? moment(formValues.quotationDate).format('YYYY-MM-DD')
                    : moment().format('YYYY-MM-DD')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Introduction */}
          {formValues.introductionText && (
            <div style={{ 
              marginBottom: '20px', 
              textAlign: 'justify',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              padding: '10px',
              borderRadius: '4px'
            }}>
              {formValues.introductionText}
            </div>
          )}

          {/* Scope of Work */}
          {(() => {
            const scopeItems = getListItems(formValues.scopeOfWork)
            return scopeItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                  {t.quotations.scopeOfWork || 'Scope of Work:'}
                </h3>
                <div style={{ width: '100%' }}>
                  {scopeItems.map((item: string, index: number) => (
                    <div key={index} style={{ marginBottom: '4px', fontSize: '12px', color: '#000', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: isRTL ? 'right' : 'left' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* BOQ Table */}
          {boqItems.length > 0 && (
            <div style={{ marginTop: '24px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px', fontSize: '12px' }}>
                {t.quotations.boq || 'Bill of Quantities:'}
              </div>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', border: '1px solid #000', backgroundColor: 'rgba(255, 255, 255, 0.95)', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', width: '10%', fontSize: '10px' }}>SQ</th>
                    <th style={{ padding: '4px', border: '1px solid #000', textAlign: isRTL ? 'right' : 'left', fontWeight: 'bold', width: '50%', fontSize: '10px' }}>{t.quotations.activities || 'Activities'}</th>
                    <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right', fontWeight: 'bold', width: '40%', fontSize: '10px' }}>{t.quotations.amount || 'Amount'} ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', fontSize: '10px', verticalAlign: 'top' }}>{item.sq || index + 1}</td>
                      <td style={{ padding: '4px', border: '1px solid #000', fontSize: '10px', textAlign: isRTL ? 'right' : 'left', wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', verticalAlign: 'top', lineHeight: '1.5' }}>{item.activities || '-'}</td>
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right', fontSize: '10px', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'nowrap', backgroundColor: '#f9f9f9' }}>{parseFloat(String(item.amount || 0)).toLocaleString()} {currencySymbol}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ padding: '4px', border: '1px solid #000', textAlign: 'right', fontSize: '10px' }}>{t.quotations.total || 'Total Amount'}:</td>
                    <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' }}>{boqTotal.toLocaleString()} {currencySymbol}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Exclusions */}
          {(() => {
            const exclusionItems = getListItems(formValues.exclusions)
            return exclusionItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                  {t.quotations.exclusions || 'Exclusions:'}
                </h3>
                <div style={{ width: '100%' }}>
                  {exclusionItems.map((item: string, index: number) => (
                    <div key={index} style={{ marginBottom: '4px', fontSize: '12px', color: '#000', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: isRTL ? 'right' : 'left' }}>{item}</div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Facilities */}
          {(() => {
            const facilityItems = getListItems(formValues.facilities)
            return facilityItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                  {t.quotations.facilities || 'Facilities:'}
                </h3>
                <div style={{ width: '100%' }}>
                  {facilityItems.map((item: string, index: number) => (
                    <div key={index} style={{ marginBottom: '4px', fontSize: '12px', color: '#000', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: isRTL ? 'right' : 'left' }}>{item}</div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Terms & Conditions */}
          {(() => {
            const termsItems = getListItems(formValues.termsAndConditions)
            return termsItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                  {t.quotations.termsAndConditions || 'Terms & Conditions:'}
                </h3>
                <div style={{ width: '100%' }}>
                  {termsItems.map((item: string, index: number) => (
                    <div key={index} style={{ marginBottom: '4px', fontSize: '12px', color: '#000', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: isRTL ? 'right' : 'left' }}>{item}</div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Validity Period */}
          {formValues.validityPeriod && (
            <div style={{ marginBottom: '20px', fontSize: '11px', fontStyle: 'italic' }}>
              {isRTL 
                ? `هذا العرض صالح لمدة ${formValues.validityPeriod} يوم من تاريخ الإصدار.`
                : `This quotation is valid for ${formValues.validityPeriod} days from the date of issue.`}
            </div>
          )}

          {/* Signature Section - Only render if includeSignature is true */}
          {includeSignature && (
            <div
              style={{
                marginTop: '40px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'flex-end',
                paddingBottom: '10mm'
              }}
            >
              <div style={{ width: '45%' }}>
                {companySettings?.digitalStampUrl && (
                  <div style={{ marginBottom: '15px' }}>
                    <img
                      src={companySettings.digitalStampUrl}
                      alt="Digital Stamp"
                      style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'contain', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '5px', borderRadius: '4px' }}
                    />
                  </div>
                )}
                {companySettings?.authorizedManagerName && (
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '8px', borderRadius: '4px', display: 'inline-block' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#000' }}>
                      {companySettings.authorizedManagerName}
                    </div>
                    {companySettings?.authorizedManagerTitle && (
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {companySettings.authorizedManagerTitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default QuotationPDFPreview