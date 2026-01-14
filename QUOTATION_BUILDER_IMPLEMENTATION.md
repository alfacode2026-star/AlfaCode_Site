# Universal Smart Quotation Builder - Implementation Summary

## Overview
A comprehensive, brand-agnostic Quotation Builder module that dynamically pulls company branding from centralized settings and provides a live preview with PDF generation capabilities.

## Features Implemented

### 1. Dynamic Branding & Identity
- **Company Settings Table**: Stores company name, logo, letterhead, footer, digital stamp, and authorized manager details
- **Auto-Letterhead**: Letterhead is rendered as a dynamic background layer
- **Smart Padding**: Content margins are calculated dynamically based on letterhead height to prevent overlap
- **Brand-Agnostic**: All branding is fetched from `company_settings` table, making it completely brand-agnostic

### 2. Flexible Document Structure
- **Header Table**: Fixed labels (COMPANY, ATTENTION, PROJECT, SUBJECT, REF NO, DATE) with dynamic values
- **BOQ Table**: 
  - Columns: SQ (Auto-numbered), Activities (Text), Amount (Numeric)
  - Add/Delete rows functionality
  - Live total calculation
- **Signature Section**: Dynamic signature block pulling authorized manager name/title from settings

### 3. Smart Defaults System
- **Templates Table**: Stores reusable snippets for:
  - Introductions
  - Scope of Work (bullet points)
  - Exclusions & Facilities (checklists)
  - Terms & Conditions
- **Editable Defaults**: When starting a new quotation, defaults load automatically but can be fully modified
- **Template Management**: Service layer for managing templates with default flag support

### 4. Technical Implementation
- **Live Preview**: Side-by-side editing (Form on left, PDF preview on right)
- **Database**: All drafts stored in `quotation_drafts` using JSONB for flexible structure
- **Tenant Isolation**: All data strictly filtered by `tenant_id: e490935f-7141-443a-b8cc-09187575101d`
- **PDF Generation**: Uses jsPDF and html2canvas for high-quality PDF export

## Database Schema

### Tables Created
1. **company_settings**: Company branding and identity
2. **quotation_drafts**: Draft quotations with JSONB structure
3. **quotation_templates**: Reusable snippet templates

### SQL File
- `add_quotation_builder_schema.sql` - Contains all table definitions, indexes, triggers, and RLS policies

## Services Created

1. **companySettingsService.js**
   - `getCompanySettings()` - Fetch company settings for current tenant
   - `saveCompanySettings(settingsData)` - Create or update company settings

2. **quotationDraftsService.js**
   - `getQuotationDrafts()` - Get all drafts for tenant
   - `getQuotationDraft(id)` - Get specific draft
   - `createQuotationDraft(draftData)` - Create new draft
   - `updateQuotationDraft(id, draftData)` - Update existing draft
   - `deleteQuotationDraft(id)` - Delete draft

3. **quotationTemplatesService.js**
   - `getTemplates(templateType)` - Get templates (optionally filtered by type)
   - `getDefaultTemplate(templateType)` - Get default template for a type
   - `getAllDefaultTemplates()` - Get all default templates
   - `createTemplate(templateData)` - Create new template
   - `updateTemplate(id, templateData)` - Update template
   - `deleteTemplate(id)` - Delete template

## Components Created

1. **QuotationBuilder.tsx** - Main builder page with:
   - Form on left side with tabs (Header, BOQ, Content)
   - PDF preview on right side
   - Save draft functionality
   - PDF generation
   - Smart defaults loading

2. **QuotationPDFPreview.tsx** - PDF preview component with:
   - Dynamic letterhead rendering
   - Header table
   - BOQ table
   - Content sections (Introduction, Scope, Exclusions, Facilities, Terms)
   - Signature section
   - Footer

## Integration

### Routing
- Route: `/quotation-builder`
- Added to `App.tsx` routes

### Navigation
- Added to `Navigation.tsx` menu (only visible for engineering companies)
- Uses translation key: `t.quotations.quotationBuilder`

### Translations
- Added comprehensive translations for both English and Arabic
- All UI elements are translatable

## Usage Instructions

### 1. Setup Company Settings
First, configure your company branding:
```javascript
// Use companySettingsService to save settings
await companySettingsService.saveCompanySettings({
  companyName: 'Your Company Name',
  logoUrl: 'https://example.com/logo.png', // or base64
  letterheadUrl: 'https://example.com/letterhead.png',
  footerText: 'Footer text here',
  digitalStampUrl: 'https://example.com/stamp.png',
  authorizedManagerName: 'John Doe',
  authorizedManagerTitle: 'General Manager',
  letterheadHeightPx: 150 // Adjust based on your letterhead
})
```

### 2. Create Smart Default Templates
Set up reusable templates:
```javascript
// Create introduction template
await quotationTemplatesService.createTemplate({
  templateName: 'Standard Introduction',
  templateType: 'introduction',
  content: 'Having examined the instructions...',
  isDefault: true
})

// Create scope template
await quotationTemplatesService.createTemplate({
  templateName: 'Standard Scope',
  templateType: 'scope',
  content: ['Item 1', 'Item 2', 'Item 3'], // Array for bullet points
  isDefault: true
})
```

### 3. Build Quotation
1. Navigate to `/quotation-builder`
2. Fill in header information (Company, Attention, Project, etc.)
3. Add BOQ items using the "Add Row" button
4. Edit content sections (Introduction, Scope, Exclusions, etc.)
5. Preview updates in real-time on the right
6. Save as draft or generate PDF

### 4. Generate PDF
- Click "Generate PDF" button
- PDF will be generated with all branding and content
- File will be saved as `quotation_{refNumber}_{date}.pdf`

## Key Features

### Dynamic Branding
- Change company settings → All quotations automatically update branding
- No hard-coded values
- Supports logo, letterhead, footer, and digital stamp

### Smart Padding
- Letterhead height is configurable
- Content automatically adjusts padding to prevent overlap
- Responsive to different letterhead sizes

### Live Preview
- Real-time updates as you type
- Side-by-side view for easy editing
- Accurate representation of final PDF

### Flexible Structure
- JSONB storage allows for future expansion
- Easy to add new fields without schema changes
- Supports complex nested data

## Tenant Isolation
All queries are automatically filtered by `tenant_id`:
- `e490935f-7141-443a-b8cc-09187575101d` (as specified)
- Services use `tenantStore.getTenantId()` for automatic filtering
- RLS policies ensure data isolation

## Future Enhancements
- Template library management UI
- Multiple letterhead templates
- Custom PDF layouts
- Email integration for sending quotations
- Version history for drafts
- Collaboration features

## Files Modified/Created

### Created:
- `add_quotation_builder_schema.sql`
- `src/services/companySettingsService.js`
- `src/services/quotationDraftsService.js`
- `src/services/quotationTemplatesService.js`
- `src/pages/QuotationBuilder.tsx`
- `src/components/QuotationPDFPreview.tsx`

### Modified:
- `src/App.tsx` - Added route
- `src/components/Navigation.tsx` - Added menu item
- `src/utils/translations.ts` - Added translations

### Dependencies Added:
- `jspdf` - PDF generation
- `html2canvas` - HTML to canvas conversion

## Testing Checklist
- [ ] Run SQL schema file to create tables
- [ ] Configure company settings
- [ ] Create smart default templates
- [ ] Test quotation builder form
- [ ] Verify live preview updates
- [ ] Test PDF generation
- [ ] Verify tenant isolation
- [ ] Test save/load drafts
- [ ] Test translations (English/Arabic)

## Notes
- Ensure `update_updated_at_column()` function exists in database (already present in `supabase_schema.sql`)
- Letterhead images should be optimized for web (recommended: PNG or JPG, max 2MB)
- PDF generation may take a few seconds for complex documents
- Preview uses A4 page size (210mm x 297mm)
