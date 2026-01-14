# Quotation Builder - Final Integration Summary

## Overview
Complete integration of Company Settings into the Settings page and finalization of the Quotation Builder with full-page letterhead support, automated reference numbers, and multilingual support.

## Features Implemented

### 1. Company Settings Integration
**Location:** `/settings` → "Company Settings" tab

#### Integrated into Settings Page:
- Added as a new tab in the existing Settings page
- Accessible via `/settings` with tab key `company`
- Fully multilingual (Arabic/English)
- All upload functionality preserved

#### Form Fields:
- **Company Information:**
  - Company Name (required)
  - Authorized Manager Name (required)
  - Manager Title/Position (required)
  - Company Address, Phone, Email, Website
  - Tax Number, Commercial Register

- **Branding & Media:**
  - Full-Page Letterhead Upload (A4 background)
  - Digital Stamp Upload (transparent PNG)
  - Company Logo Upload (optional)

- **Content Margins:**
  - Top Margin (cm) - Default: 4.0
  - Bottom Margin (cm) - Default: 3.0

### 2. Automated Reference Number Generation
**Service:** `quotationDraftsService.generateRefNumber()`

#### Format:
- Pattern: `REF-YYYY-XXX`
- Example: `REF-2026-001`, `REF-2026-002`, etc.
- Auto-increments based on existing drafts for the current year
- Tenant-isolated (only counts drafts for current tenant)

#### Implementation:
- Automatically generates on Quotation Builder load
- Manual regeneration button available
- Format: `REF-{YEAR}-{SEQUENCE}` (3-digit sequence)

### 3. Relational Data Integration

#### Customer Selection:
- **Searchable Select** dropdown
- Fetches from `customers` table filtered by `tenant_id`
- Displays: `Name - Phone (Email)`
- Auto-fills customer details when selected
- Customer fields become read-only after selection

#### Project Selection:
- **Searchable Select** dropdown
- Fetches from `projects` table filtered by `tenant_id`
- Auto-fills project name when selected

### 4. Full-Page Letterhead Background

#### PDF Preview Engine:
- **Full-Page Background**: Letterhead covers entire A4 page (210mm x 297mm)
- **Dynamic Margins**: 
  - Top margin: Configurable (default 4cm)
  - Bottom margin: Configurable (default 3cm)
- **Content Flow**: Text and tables flow over watermark area
- **Readability**: Semi-transparent white backgrounds on tables/text
- **Z-Index Layering**: Background (z:0) → Content (z:2)

### 5. Multilingual Support (i18n)

#### PDF Preview:
- All labels use `t()` function
- RTL/LTR support based on language
- Direction and text alignment switch automatically
- Font family adjusts (Arial/Tahoma for Arabic)

#### Settings Page:
- All Company Settings labels translated
- Upload instructions in both languages
- Form validation messages translated

#### Quotation Builder:
- All form labels translated
- Button text translated
- Error messages translated

### 6. Signature & Stamp Placement

#### Automatic Placement:
- Digital stamp and manager signature at end of document
- Positioned within bottom margin
- White background for visibility over watermark
- Manager name and title displayed below stamp

## Technical Implementation

### Reference Number Generation
```javascript
// Format: REF-YYYY-XXX
async generateRefNumber() {
  const year = new Date().getFullYear()
  const prefix = `REF-${year}-`
  
  // Get highest existing number for this year
  // Increment and return
  return `${prefix}${nextNumber.padStart(3, '0')}`
}
```

### Customer/Project Selects
```javascript
// Customer Select - Searchable
<Select
  showSearch
  filterOption={(input, option) => ...}
  options={customers.map(c => ({
    value: c.id,
    label: `${c.name} - ${c.phone}`
  }))}
/>

// Project Select - Searchable
<Select
  showSearch
  options={projects.map(p => ({
    value: p.id,
    label: p.name
  }))}
/>
```

### Full-Page Background
```css
/* Background Layer */
position: absolute
top: 0, left: 0, right: 0, bottom: 0
backgroundSize: 'cover'
zIndex: 0

/* Content Layer */
position: relative
paddingTop: [topMargin]mm
paddingBottom: [bottomMargin]mm
zIndex: 2
```

### RTL/LTR Support
```javascript
const isRTL = language === 'ar'
direction: isRTL ? 'rtl' : 'ltr'
textAlign: isRTL ? 'right' : 'left'
fontFamily: isRTL ? 'Arial, Tahoma, sans-serif' : 'Arial, sans-serif'
```

## Files Modified

### Modified:
- `src/pages/SettingsPage.tsx` - Added Company Settings tab
- `src/pages/QuotationBuilder.tsx` - Auto Ref No generation, improved customer/project selects
- `src/components/QuotationPDFPreview.tsx` - Full multilingual support, RTL/LTR
- `src/services/quotationDraftsService.js` - Added `generateRefNumber()` method
- `src/App.tsx` - Removed separate Company Settings route
- `src/components/Navigation.tsx` - Removed separate Company Settings menu item

### Created:
- `add_company_settings_margins.sql` - Database migration for margin fields

## Usage Flow

### 1. Configure Company Settings
1. Navigate to `/settings`
2. Click "Company Settings" tab
3. Fill in company information
4. Upload full-page letterhead (A4 image)
5. Upload digital stamp (transparent PNG)
6. Set top/bottom margins
7. Click "Save Company Settings"

### 2. Create Quotation
1. Navigate to `/quotation-builder`
2. Reference number auto-generates (e.g., REF-2026-001)
3. Select customer from searchable dropdown
4. Select project from searchable dropdown
5. Fill in quotation details
6. Add BOQ items
7. Preview updates in real-time with full-page letterhead background
8. Content automatically respects margins
9. Generate PDF

### 3. PDF Output
- Full-page letterhead as background
- Content flows over watermark
- Proper margins applied
- Digital stamp and signature at end
- Multilingual labels based on selected language
- RTL/LTR layout based on language

## Key Features

### ✅ Full-Page Letterhead
- Upload A4 image with header, footer, watermark
- Background covers entire page
- Content flows naturally over watermark

### ✅ Dynamic Margins
- Configurable top margin (default: 4cm)
- Configurable bottom margin (default: 3cm)
- Content automatically respects margins

### ✅ Automated Reference Numbers
- Format: REF-YYYY-XXX
- Auto-increments per year
- Tenant-isolated

### ✅ Relational Data
- Searchable customer dropdown
- Searchable project dropdown
- Auto-fills related fields

### ✅ Multilingual
- All labels translated
- RTL/LTR support
- PDF layout adapts to language

### ✅ Brand-Agnostic
- All branding from company settings
- Change settings → All quotations update
- No code changes needed

## Database Schema

### Company Settings Table
```sql
company_settings (
  id, tenant_id,
  company_name, authorized_manager_name, authorized_manager_title,
  letterhead_url, digital_stamp_url, logo_url,
  top_margin_cm, bottom_margin_cm,
  ...
)
```

### Quotation Drafts Table
```sql
quotation_drafts (
  id, tenant_id,
  ref_number, -- Auto-generated REF-YYYY-XXX
  customer_id, project_id,
  boq_items, boq_total,
  ...
)
```

## Testing Checklist

- [ ] Navigate to Settings → Company Settings tab
- [ ] Upload full-page letterhead
- [ ] Upload digital stamp
- [ ] Configure margins
- [ ] Save settings
- [ ] Navigate to Quotation Builder
- [ ] Verify auto-generated Ref No (REF-2026-001)
- [ ] Select customer from dropdown
- [ ] Verify customer details auto-fill
- [ ] Select project from dropdown
- [ ] Verify project name auto-fills
- [ ] Add BOQ items
- [ ] Verify live preview with letterhead background
- [ ] Verify content respects margins
- [ ] Switch language (Arabic/English)
- [ ] Verify PDF layout switches RTL/LTR
- [ ] Generate PDF
- [ ] Verify PDF includes full-page letterhead
- [ ] Verify watermark visibility
- [ ] Verify signature/stamp placement

## Next Steps

1. **Run Database Migration:**
   ```sql
   -- Execute add_company_settings_margins.sql
   ```

2. **Configure Company Settings:**
   - Navigate to Settings → Company Settings
   - Upload your A4 letterhead
   - Upload digital stamp
   - Set margins

3. **Test Quotation Builder:**
   - Create a new quotation
   - Verify all features work correctly
   - Generate PDF and verify output

## Notes

- Reference numbers are tenant-isolated and year-based
- Customer/project selects filter by current tenant automatically
- Full-page letterhead should be high-resolution (300 DPI recommended)
- Margins are in centimeters (converted to mm for CSS)
- PDF generation uses html2canvas + jsPDF
- All images stored as base64 in database
