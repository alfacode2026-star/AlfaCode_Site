# Step 2: Full-Page Branding & Watermark Integration - Implementation Summary

## Overview
Enhanced the Quotation Builder with full-page letterhead background support, allowing quotation content to flow over watermarks while maintaining proper margins and readability.

## Features Implemented

### 1. Company Settings Page
**New Component:** `src/pages/CompanySettingsPage.tsx`

#### Media Upload Fields:
- **Full-Page Letterhead**: Upload field for high-resolution A4 page (210mm x 297mm) including header, footer, and watermark
  - Accepts: PNG, JPG, JPEG
  - Recommended: 2480x3508 pixels at 300 DPI
  - Stored as base64 in database
  - Preview available before saving

- **Digital Stamp**: Upload field for transparent PNG stamp/signature
  - Accepts: PNG only (for transparency)
  - Recommended: 300x300 pixels
  - Preview available

- **Company Logo**: Optional logo upload
  - Accepts: PNG, JPG, JPEG
  - Recommended: 300x100 pixels

#### Form Fields:
- Company Name (required)
- Authorized Manager Name (required)
- Manager Title/Position (required)
- Company Address, Phone, Email, Website
- Tax Number, Commercial Register
- **Top Margin (cm)**: Distance from top to content start (default: 4cm)
- **Bottom Margin (cm)**: Distance from bottom to content end (default: 3cm)

### 2. Enhanced PDF Preview Engine
**Updated:** `src/components/QuotationPDFPreview.tsx`

#### Full-Page Background Implementation:
- **Fixed Background Layer**: Letterhead image covers entire A4 page (210mm x 297mm)
- **Z-Index Layering**: 
  - Background (z-index: 0) - Full-page letterhead
  - Content (z-index: 2) - All text and tables flow over watermark

#### Dynamic Margins:
- **Top Margin**: Configurable (default: 4cm = 40mm)
  - Content starts below header portion of letterhead
  - Prevents text from overlapping header graphics

- **Bottom Margin**: Configurable (default: 3cm = 30mm)
  - Content ends before footer portion of letterhead
  - Ensures signature/stamp stay within printable area

#### Content Readability:
- **Semi-Transparent Backgrounds**: 
  - Header table: `rgba(255, 255, 255, 0.95)`
  - BOQ table: `rgba(255, 255, 255, 0.95)`
  - Introduction text: `rgba(255, 255, 255, 0.7)`
  - Ensures text remains readable over watermark

- **Signature Section**:
  - Digital stamp with white background for visibility
  - Manager name/title with background for readability
  - Positioned at end of content, within bottom margin

### 3. Database Schema Updates
**New SQL File:** `add_company_settings_margins.sql`

Added columns to `company_settings` table:
- `top_margin_cm` (DECIMAL 4,2) - Default: 4.0
- `bottom_margin_cm` (DECIMAL 4,2) - Default: 3.0

### 4. Service Updates
**Updated:** `src/services/companySettingsService.js`

- Added support for `topMarginCm` and `bottomMarginCm` fields
- Updated `mapToCamelCase` to include margin fields
- Backward compatible with existing settings

### 5. Navigation & Routing
- **New Route**: `/company-settings`
- **Navigation Menu**: Added "Company Settings" link (engineering companies only)
- Integrated into `App.tsx` routing

## Technical Implementation Details

### Image Storage
- Images are converted to base64 and stored directly in the database
- No external storage bucket required
- Supports PNG, JPG, JPEG formats
- File size considerations: Base64 encoding increases size by ~33%

### Margin Calculation
```javascript
// Convert cm to mm for CSS (1cm = 10mm)
const topMarginMm = topMarginCm * 10
const bottomMarginMm = bottomMarginCm * 10

// Apply to content area
paddingTop: `${topMarginMm}mm`
paddingBottom: `${bottomMarginMm}mm`
```

### Background Layering
```css
/* Full-page background */
position: absolute
top: 0, left: 0, right: 0, bottom: 0
backgroundSize: 'cover'
backgroundPosition: 'center center'
zIndex: 0

/* Content layer */
position: relative
zIndex: 2
paddingTop: [topMargin]mm
paddingBottom: [bottomMargin]mm
```

## Usage Instructions

### 1. Configure Company Settings
1. Navigate to `/company-settings`
2. Fill in company information:
   - Company Name
   - Manager Name and Title
   - Contact information
3. Upload Full-Page Letterhead:
   - Click "Upload Letterhead"
   - Select high-resolution A4 image (PNG/JPG)
   - Preview will show immediately
4. Upload Digital Stamp:
   - Click "Upload Stamp"
   - Select transparent PNG
5. Configure Margins:
   - Set Top Margin (default: 4cm)
   - Set Bottom Margin (default: 3cm)
   - Adjust based on your letterhead design
6. Click "Save Settings"

### 2. Create Quotation
1. Navigate to `/quotation-builder`
2. Fill in quotation details
3. Content will automatically:
   - Start below header (top margin)
   - Flow over watermark area
   - End before footer (bottom margin)
   - Display with semi-transparent backgrounds for readability

### 3. Generate PDF
- Click "Generate PDF"
- PDF will include:
  - Full-page letterhead background
  - Content flowing over watermark
  - Proper margins
  - Digital stamp and signature at end

## Key Features

### ✅ Full-Page Background
- Letterhead covers entire A4 page
- Content flows naturally over watermark
- No hard-coded header/footer heights

### ✅ Dynamic Margins
- Configurable top and bottom margins
- Content automatically respects margins
- Signature/stamp stay within printable area

### ✅ Watermark Support
- Content flows over watermark in middle section
- Semi-transparent backgrounds ensure readability
- Watermark remains visible

### ✅ Brand-Agnostic
- All branding from company settings
- Change settings → All quotations update automatically
- No code changes needed for different brands

## Files Created/Modified

### Created:
- `src/pages/CompanySettingsPage.tsx` - Company settings management page
- `add_company_settings_margins.sql` - Database migration for margin fields

### Modified:
- `src/components/QuotationPDFPreview.tsx` - Full-page background implementation
- `src/services/companySettingsService.js` - Added margin support
- `add_quotation_builder_schema.sql` - Added margin columns
- `src/App.tsx` - Added route
- `src/components/Navigation.tsx` - Added menu item

## Database Migration

Run the following SQL to add margin columns:
```sql
-- Execute add_company_settings_margins.sql
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS top_margin_cm DECIMAL(4, 2) DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS bottom_margin_cm DECIMAL(4, 2) DEFAULT 3.0;
```

## Testing Checklist

- [ ] Run database migration
- [ ] Navigate to Company Settings page
- [ ] Upload full-page letterhead (A4 size)
- [ ] Upload digital stamp (transparent PNG)
- [ ] Configure margins (test different values)
- [ ] Save settings
- [ ] Create quotation in Quotation Builder
- [ ] Verify content starts below header
- [ ] Verify content flows over watermark
- [ ] Verify content ends before footer
- [ ] Verify signature/stamp placement
- [ ] Generate PDF and verify output
- [ ] Test with different letterhead designs

## Best Practices

### Letterhead Design:
- Use high-resolution images (300 DPI minimum)
- Ensure watermark is subtle enough for text readability
- Test margins with your specific letterhead design
- Keep header/footer areas clear of important content

### Margin Configuration:
- Start with defaults (4cm top, 3cm bottom)
- Adjust based on your letterhead header/footer heights
- Test with sample quotations before finalizing
- Consider printer margins when setting values

### Image Optimization:
- Compress images before upload (reduce file size)
- Use PNG for stamps (transparency support)
- Use JPG for letterheads (smaller file size)
- Recommended max file size: 2-3MB per image

## Future Enhancements
- Multiple letterhead templates per company
- Automatic margin detection from letterhead image
- Image compression on upload
- Supabase Storage integration for large files
- Preview margin adjustments in real-time
- Template library for common letterhead designs
