'use client'

import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'

interface QuotationPDFPreviewProps {
  companySettings: any
  formValues: any
  boqItems: Array<{ sq: number; activities: string; amount: number }>
  boqTotal: number
}

const QuotationPDFPreview: React.FC<QuotationPDFPreviewProps> = ({
  companySettings,
  formValues,
  boqItems,
  boqTotal
}) => {
  const { language } = useLanguage()
  const t = getTranslations(language)
  const isRTL = language === 'ar'
  
  // Get margins from settings (default: 4cm top, 3cm bottom) with null-safety
  const topMarginCm = companySettings?.topMarginCm ?? 4.0
  const bottomMarginCm = companySettings?.bottomMarginCm ?? 3.0
  
  // Convert cm to mm for CSS (1cm = 10mm)
  const topMarginMm = topMarginCm * 10
  const bottomMarginMm = bottomMarginCm * 10

  return (
    <div
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
      {/* Full-Page Letterhead Background */}
      {companySettings?.letterheadUrl && (
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

      {/* Content Area with Dynamic Margins - Flows over Watermark */}
      <div
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
        {/* Header Table - Semi-transparent background for readability over watermark */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '20px',
            border: '1px solid #ddd',
            backgroundColor: 'rgba(255, 255, 255, 0.95)' // Slight white background for readability
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  width: '20%',
                  backgroundColor: '#f5f5f5'
                }}
              >
                {t.quotations.company || 'COMPANY'}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  width: '30%'
                }}
              >
                {formValues.company || companySettings?.companyName || ''}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  width: '20%',
                  backgroundColor: '#f5f5f5'
                }}
              >
                {t.quotations.attention || 'ATTENTION'}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  width: '30%'
                }}
              >
                {formValues.attention || formValues.customerName || ''}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5'
                }}
              >
                {t.quotations.project || 'PROJECT'}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd'
                }}
              >
                {formValues.projectName || ''}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5'
                }}
              >
                {t.quotations.subject || 'SUBJECT'}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd'
                }}
              >
                {formValues.subject || ''}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5'
                }}
              >
                {t.quotations.refNo || 'REF NO'}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd'
                }}
              >
                {formValues.refNumber || ''}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5'
                }}
              >
                {t.quotations.date || 'DATE'}
              </td>
              <td
                style={{
                  padding: '8px',
                  border: '1px solid #ddd'
                }}
              >
                {formValues.quotationDate
                  ? moment(formValues.quotationDate).format('YYYY-MM-DD')
                  : moment().format('YYYY-MM-DD')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Introduction - Text flows over watermark */}
        {formValues.introductionText && (
          <div style={{ 
            marginBottom: '20px', 
            textAlign: 'justify',
            backgroundColor: 'rgba(255, 255, 255, 0.7)', // Slight white background for readability
            padding: '10px',
            borderRadius: '4px'
          }}>
            {formValues.introductionText}
          </div>
        )}

        {/* Scope of Work */}
        {formValues.scopeOfWork && formValues.scopeOfWork.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
              {t.quotations.scopeOfWork || 'Scope of Work:'}
            </h3>
            <ul style={{ marginLeft: '20px', paddingLeft: '10px' }}>
              {formValues.scopeOfWork.map((item: string, index: number) => (
                <li key={index} style={{ marginBottom: '5px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* BOQ Table - Semi-transparent background for readability over watermark */}
        {boqItems.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
              {t.quotations.boq || 'Bill of Quantities:'}
            </h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '10px',
                border: '1px solid #ddd',
                backgroundColor: 'rgba(255, 255, 255, 0.95)' // Slight white background for readability
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      width: '10%'
                    }}
                  >
                    SQ
                  </th>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: isRTL ? 'right' : 'left',
                      fontWeight: 'bold'
                    }}
                  >
                    {t.quotations.activities || 'Activities'}
                  </th>
                  <th
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      width: '20%'
                    }}
                  >
                    {t.quotations.amount || 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map((item, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'center'
                      }}
                    >
                      {item.sq}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd'
                      }}
                    >
                      {item.activities || '-'}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'right'
                      }}
                    >
                      {parseFloat(String(item.amount || 0)).toLocaleString()} {t.common.sar || 'SAR'}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  <td
                    colSpan={2}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'right'
                    }}
                  >
                    {t.quotations.total || 'TOTAL'}:
                  </td>
                  <td
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'right'
                    }}
                  >
                    {boqTotal.toLocaleString()} {t.common.sar || 'SAR'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Exclusions */}
        {formValues.exclusions && formValues.exclusions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
              {t.quotations.exclusions || 'Exclusions:'}
            </h3>
            <ul style={{ marginLeft: '20px', paddingLeft: '10px' }}>
              {formValues.exclusions.map((item: string, index: number) => (
                <li key={index} style={{ marginBottom: '5px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Facilities */}
        {formValues.facilities && formValues.facilities.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
              {t.quotations.facilities || 'Facilities:'}
            </h3>
            <ul style={{ marginLeft: '20px', paddingLeft: '10px' }}>
              {formValues.facilities.map((item: string, index: number) => (
                <li key={index} style={{ marginBottom: '5px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Terms & Conditions */}
        {formValues.termsAndConditions && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
              {t.quotations.termsAndConditions || 'Terms & Conditions:'}
            </h3>
            <div style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
              {formValues.termsAndConditions}
            </div>
          </div>
        )}

        {/* Validity Period */}
        {formValues.validityPeriod && (
          <div style={{ marginBottom: '20px', fontSize: '11px', fontStyle: 'italic' }}>
            {isRTL 
              ? `هذا العرض صالح لمدة ${formValues.validityPeriod} يوم من تاريخ الإصدار.`
              : `This quotation is valid for ${formValues.validityPeriod} days from the date of issue.`}
          </div>
        )}

        {/* Signature Section - Placed at end of content, within margins */}
        <div
          style={{
            marginTop: '40px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            paddingBottom: '10mm' // Ensure it stays within bottom margin
          }}
        >
          <div style={{ width: '45%' }}>
            {companySettings?.digitalStampUrl && (
              <div style={{ marginBottom: '15px' }}>
                <img
                  src={companySettings.digitalStampUrl}
                  alt="Digital Stamp"
                  style={{
                    maxWidth: '150px',
                    maxHeight: '100px',
                    objectFit: 'contain',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight white background for visibility
                    padding: '5px',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}
            {companySettings?.authorizedManagerName && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slight white background for visibility
                padding: '8px',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
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
      </div>
    </div>
  )
}

export default QuotationPDFPreview
