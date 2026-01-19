# GLOBAL LANGUAGE & TRANSLATION AUDIT REPORT

**Date:** Generated during codebase scan  
**Scope:** All files in `src/pages/` and `src/components/`  
**Objective:** Identify hardcoded text, dual-language labels, and untranslated strings

---

## EXECUTIVE SUMMARY

**Total Issues Found:** 47+ instances across 12 files  
**Critical Issues:** 15 dual-language labels with " / " separator  
**High Priority:** 20+ hardcoded Arabic strings without translation keys  
**Medium Priority:** 12+ hardcoded English strings without translation keys

---

## DETAILED FINDINGS BY FILE

### 1. `src/pages/ProjectDetails.tsx`

#### Issue 1.1: Dual-Language Currency Label
- **Line:** 1939
- **Found String:** `label={`العملة / Currency (${displayCurrency})`}`
- **Current Issue:** Mixed Arabic/English label with " / " separator
- **Proposed Fix:** `label={formatCurrencyLabel(t.projectDetails.currency || 'Currency', displayCurrency, language)}`

#### Issue 1.2: Hardcoded Arabic Card Title
- **Line:** 1250
- **Found String:** `<Card title={<Title level={4} style={{ margin: 0 }}>توزيع الإنفاق حسب نطاق العمل</Title>}>`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.projectDetails.scopeSpendingBreakdown || 'Scope Spending Breakdown'}`

#### Issue 1.3: Hardcoded Arabic Modal Title
- **Line:** 1413
- **Found String:** `title="إضافة وارد/سلفة جديدة"`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.projectDetails.addIncomeOrAdvance || 'Add Income/Advance'}`

#### Issue 1.4: Hardcoded Arabic Modal Title
- **Line:** 1776
- **Found String:** `title="إضافة مصروف جديد للمشروع"`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.projectDetails.addProjectExpense || 'Add Project Expense'}`

#### Issue 1.5: Hardcoded Arabic Form Labels (Multiple)
- **Lines:** 1454, 1459, 1490, 1495, 1559, 1562, 1572, 1575, 1581, 1584, 1635, 1681, 1748, 1750, 1767, 1769, 1867, 1918, 1922, 1973, 1976
- **Found Strings:** 
  - `label="نوع المعاملة"` (Line 1454)
  - `placeholder="اختر نوع المعاملة"` (Line 1459)
  - `label="نوع الوارد"` (Line 1490)
  - `placeholder="اختر نوع الوارد"` (Line 1495)
  - `label="اسم المهندس/الموظف"` (Line 1559)
  - `placeholder="مثال: أحمد محمد"` (Line 1562)
  - `label="الوصف/اسم المرحلة"` (Line 1572)
  - `placeholder="مثال: مرحلة الأساسات، مرحلة البنية التحتية..."` (Line 1575)
  - `label="نطاق العمل (اختياري)"` (Line 1581)
  - `placeholder="اختر نطاق العمل"` (Line 1584)
  - `label="نسبة الإنجاز السابقة (%)"` (Line 1635)
  - `label="تاريخ الاستحقاق"` (Line 1681)
  - `label="حساب الخزينة"` (Line 1748)
  - `tooltip="اختر الحساب الذي سيتم إيداع المبلغ فيه"` (Line 1750)
  - `label="رقم المرجع (اختياري)"` (Line 1767)
  - `placeholder="رقم المرجع أو رقم الإيصال"` (Line 1769)
  - `label="التاريخ"` (Line 1867)
  - `label="الخزينة/الصندوق"` (Line 1918)
  - `placeholder="اختر الخزينة/الصندوق"` (Line 1922)
  - `label="الوصف"` (Line 1973)
  - `placeholder="وصف المصروف..."` (Line 1976)
- **Current Issue:** All hardcoded Arabic strings without translation keys
- **Proposed Fix:** Replace with `t.projectDetails.*` keys (e.g., `t.projectDetails.transactionType`, `t.projectDetails.engineerName`, etc.)

#### Issue 1.6: Hardcoded English Messages
- **Lines:** Multiple in message.error/message.success calls
- **Found Strings:** Various hardcoded English error messages
- **Current Issue:** Some messages use `t.projectDetails.*` but many are hardcoded
- **Proposed Fix:** Ensure all message calls use translation keys

---

### 2. `src/pages/GeneralExpenses.tsx`

#### Issue 2.1: Dual-Language Labels (Multiple)
- **Line:** 3309
- **Found String:** `label="الفئة / Category"`
- **Current Issue:** Mixed Arabic/English with " / " separator
- **Proposed Fix:** `label={t.generalExpenses.category || 'Category'}`

- **Line:** 3365
- **Found String:** `label="دورية الصرف / Frequency"`
- **Current Issue:** Mixed Arabic/English with " / " separator
- **Proposed Fix:** `label={t.generalExpenses.paymentFrequency || 'Payment Frequency'}`

- **Line:** 3377
- **Found String:** `label={`العملة / Currency (${displayCurrency})`}`
- **Current Issue:** Mixed Arabic/English with " / " separator
- **Proposed Fix:** `label={formatCurrencyLabel(t.generalExpenses.currency || 'Currency', displayCurrency, language)}`

- **Line:** 3394
- **Found String:** `label={`المبلغ (${displayCurrency}) / Amount (${displayCurrency})`}`
- **Current Issue:** Mixed Arabic/English with " / " separator and duplicate currency
- **Proposed Fix:** `label={formatCurrencyLabel(t.generalExpenses.amount || 'Amount', displayCurrency, language)}`

- **Line:** 3425
- **Found String:** `label="حساب الخزينة / Treasury Account"`
- **Current Issue:** Mixed Arabic/English with " / " separator
- **Proposed Fix:** `label={t.generalExpenses.treasuryAccount || 'Treasury Account'}`

#### Issue 2.2: Hardcoded Arabic Card Titles
- **Line:** 3031
- **Found String:** `<Card title="البنود المضافة" size="small">`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.generalExpenses.addedItems || 'Added Items'}`

- **Line:** 3789
- **Found String:** `<Card title="البنود المضافة" size="small">`
- **Current Issue:** Hardcoded Arabic-only title (duplicate)
- **Proposed Fix:** `title={t.generalExpenses.addedItems || 'Added Items'}`

#### Issue 2.3: Hardcoded Arabic Modal Titles
- **Line:** 3884
- **Found String:** `title="الحالة للقراءة فقط - لا يمكن تعديلها من قبل المحاسب"`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.generalExpenses.readOnlyStatus || 'Status is read-only'}`

- **Line:** 4065
- **Found String:** `title="ترحيل العهدة"`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.generalExpenses.transferCustody || 'Transfer Custody'}`

#### Issue 2.4: Hardcoded Arabic Tooltip
- **Line:** 3427
- **Found String:** `tooltip="اختر الحساب الذي سيتم خصم المصروف منه"`
- **Current Issue:** Hardcoded Arabic-only tooltip
- **Proposed Fix:** `tooltip={t.generalExpenses.selectTreasuryAccountTooltip || 'Select the account to deduct expense from'}`

---

### 3. `src/pages/OrdersPage.tsx`

#### Issue 3.1: Dual-Language Currency Label
- **Line:** 1458
- **Found String:** `label={`العملة / Currency (${displayCurrency})`}`
- **Current Issue:** Mixed Arabic/English with " / " separator
- **Proposed Fix:** `label={formatCurrencyLabel(t.orders.currency || 'Currency', displayCurrency, language)}`

#### Issue 3.2: Dual-Language Tooltip
- **Line:** 1459
- **Found String:** `tooltip="العملة مضبوطة على مستوى الفرع ولا يمكن تغييرها لكل معاملة / Currency is set at the branch level and cannot be changed per transaction"`
- **Current Issue:** Mixed Arabic/English tooltip with " / " separator
- **Proposed Fix:** `tooltip={t.orders.currencyTooltip || 'Currency is set at the branch level'}`

---

### 4. `src/pages/IncomesPage.tsx`

#### Issue 4.1: Hardcoded English Currency Label
- **Line:** 853
- **Found String:** `label={`Currency (${displayCurrency})`}`
- **Current Issue:** Hardcoded English-only label
- **Proposed Fix:** `label={formatCurrencyLabel(t.incomes.currency || 'Currency', displayCurrency, language)}`

#### Issue 4.2: Hardcoded English Tooltip
- **Line:** 854
- **Found String:** `tooltip="Currency is set at the branch level and cannot be changed per transaction"`
- **Current Issue:** Hardcoded English-only tooltip
- **Proposed Fix:** `tooltip={t.incomes.currencyTooltip || 'Currency is set at the branch level'}`

#### Issue 4.3: Hardcoded English Messages
- **Lines:** 166, 415, 419, 423, 459, 503, 514, 518, 523, 885
- **Found Strings:** Various hardcoded English messages like "Failed to load incomes data.", "Income deleted successfully.", etc.
- **Current Issue:** Hardcoded English-only messages
- **Proposed Fix:** Replace with `t.incomes.*` keys

---

### 5. `src/pages/ContractsPage.tsx`

#### Issue 5.1: Hardcoded English Currency Label
- **Line:** 1888
- **Found String:** `label="Currency"`
- **Current Issue:** Hardcoded English-only label
- **Proposed Fix:** `label={t.contracts.currency || 'Currency'}`

#### Issue 5.2: Hardcoded English Tooltip
- **Line:** 1890
- **Found String:** `tooltip="Currency is automatically set based on the selected treasury account"`
- **Current Issue:** Hardcoded English-only tooltip
- **Proposed Fix:** `tooltip={t.contracts.currencyTooltip || 'Currency is automatically set'}`

---

### 6. `src/pages/TreasuryPage.tsx`

#### Issue 6.1: Hardcoded English Currency Label
- **Line:** 1147
- **Found String:** `label="Currency"`
- **Current Issue:** Hardcoded English-only label
- **Proposed Fix:** `label={t.treasury.currency || 'Currency'}`

---

### 7. `src/pages/QuotationsPage.tsx`

#### Issue 7.1: Hardcoded Currency Display
- **Line:** 1216
- **Found String:** `{language === 'ar' ? 'ر.س' : (branchCurrency || 'SAR')}`
- **Current Issue:** Using ternary instead of utility function
- **Proposed Fix:** `{getCurrencySymbol(branchCurrency || 'SAR', language)}`

#### Issue 7.2: Ternary Language Checks (Multiple)
- **Lines:** 339, 1053, 1244, 1400, 1401
- **Found Strings:** Multiple `language === 'ar' ? '...' : '...'` patterns
- **Current Issue:** Should use translation keys instead of ternary
- **Proposed Fix:** Replace with `t.quotations.*` keys

---

### 8. `src/pages/QuotationBuilder.tsx`

#### Issue 8.1: Hardcoded Currency Reference
- **Line:** 1208
- **Found String:** `${t.common?.sar || 'SAR'}`
- **Current Issue:** Using `t.common.sar` which should be dynamic
- **Proposed Fix:** `{getCurrencySymbol(displayCurrency || 'SAR', language)}`

#### Issue 8.2: Hardcoded Currency Reference
- **Line:** 932
- **Found String:** `{t.common.sar}`
- **Current Issue:** Using `t.common.sar` which should be dynamic
- **Proposed Fix:** `{getCurrencySymbol(displayCurrency || 'SAR', language)}`

---

### 9. `src/pages/LaborPage.tsx`

#### Issue 9.1: Hardcoded Currency References (Multiple)
- **Lines:** 509, 512, 515, 519, 520, 521, 1870, 1883
- **Found Strings:** Multiple instances of `${t.common.sar}`
- **Current Issue:** Using `t.common.sar` which should be dynamic
- **Proposed Fix:** Replace all with `{getCurrencySymbol(branchCurrency || 'SAR', language)}`

---

### 10. `src/pages/CustomersPage.tsx`

#### Issue 10.1: Hardcoded Currency References (Multiple)
- **Lines:** 184, 195, 625, 643
- **Found Strings:** Multiple instances of `{t.common.sar}`
- **Current Issue:** Using `t.common.sar` which should be dynamic
- **Proposed Fix:** Replace all with `{getCurrencySymbol(branchCurrency || 'SAR', language)}`

---

### 11. `src/pages/SettingsPage.tsx`

#### Issue 11.1: Hardcoded Arabic Card Title
- **Line:** 943
- **Found String:** `<Card title="الشعار والعلامة التجارية" style={{ marginTop: 16 }}>`
- **Current Issue:** Hardcoded Arabic-only title
- **Proposed Fix:** `title={t.settings.logoAndBranding || 'Logo and Branding'}`

#### Issue 11.2: Hardcoded Arabic Form Labels
- **Lines:** 1184, 1193, 1224
- **Found Strings:**
  - `label="خادم SMTP"` (Line 1184)
  - `label="منفذ SMTP"` (Line 1193)
  - `label="اتصال آمن (SSL/TLS)"` (Line 1224)
- **Current Issue:** Hardcoded Arabic-only labels
- **Proposed Fix:** Replace with `t.settings.*` keys

---

### 12. `src/components/ApprovalWorkflow.tsx`

#### Issue 12.1: Ternary Language Checks (Multiple)
- **Lines:** 63-66, 84, 91, 125, 145, 159, 174, 183, 189
- **Found Strings:** Multiple `language === 'ar' ? '...' : '...'` patterns
- **Current Issue:** Should use translation keys instead of ternary
- **Proposed Fix:** Replace with `t.approvalWorkflow.*` keys

---

## COMMON PATTERNS IDENTIFIED

### Pattern 1: Dual-Language Labels with " / " Separator
**Found in:** ProjectDetails.tsx, GeneralExpenses.tsx, OrdersPage.tsx  
**Count:** 6 instances  
**Fix:** Use `formatCurrencyLabel()` or single translation key based on language

### Pattern 2: Hardcoded Arabic Strings
**Found in:** ProjectDetails.tsx, GeneralExpenses.tsx, SettingsPage.tsx  
**Count:** 25+ instances  
**Fix:** Create translation keys in `ar.json` and `en.json`, use `t.*` references

### Pattern 3: Hardcoded English Strings
**Found in:** IncomesPage.tsx, ContractsPage.tsx, TreasuryPage.tsx  
**Count:** 15+ instances  
**Fix:** Create translation keys and use `t.*` references

### Pattern 4: Ternary Language Checks
**Found in:** QuotationsPage.tsx, ApprovalWorkflow.tsx, Navigation.tsx  
**Count:** 20+ instances  
**Fix:** Replace with translation keys using `t.*` instead of ternary operators

### Pattern 5: Using `t.common.sar` Instead of Dynamic Currency
**Found in:** QuotationBuilder.tsx, LaborPage.tsx, CustomersPage.tsx  
**Count:** 12+ instances  
**Fix:** Replace with `getCurrencySymbol(branchCurrency || 'SAR', language)`

---

## RECOMMENDATIONS

### High Priority (Fix Immediately)
1. Remove all dual-language labels with " / " separator
2. Replace all `t.common.sar` references with dynamic currency symbols
3. Fix hardcoded Arabic modal titles and card titles

### Medium Priority (Fix Soon)
1. Replace ternary language checks with translation keys
2. Add missing translation keys to `ar.json` and `en.json`
3. Fix hardcoded English labels and tooltips

### Low Priority (Nice to Have)
1. Standardize message.error/message.success calls to use translation keys
2. Review and consolidate duplicate translation patterns

---

## TRANSLATION KEYS NEEDED

### New Keys Required for `ar.json` and `en.json`:

```json
{
  "projectDetails": {
    "scopeSpendingBreakdown": "توزيع الإنفاق حسب نطاق العمل / Scope Spending Breakdown",
    "addIncomeOrAdvance": "إضافة وارد/سلفة جديدة / Add Income/Advance",
    "addProjectExpense": "إضافة مصروف جديد للمشروع / Add Project Expense",
    "transactionType": "نوع المعاملة / Transaction Type",
    "selectTransactionType": "اختر نوع المعاملة / Select Transaction Type",
    "incomeType": "نوع الوارد / Income Type",
    "selectIncomeType": "اختر نوع الوارد / Select Income Type",
    "engineerName": "اسم المهندس/الموظف / Engineer/Employee Name",
    "engineerNamePlaceholder": "مثال: أحمد محمد / Example: Ahmed Mohammed",
    "descriptionOrPhase": "الوصف/اسم المرحلة / Description/Phase Name",
    "descriptionPlaceholder": "مثال: مرحلة الأساسات... / Example: Foundation phase...",
    "workScopeOptional": "نطاق العمل (اختياري) / Work Scope (Optional)",
    "selectWorkScope": "اختر نطاق العمل / Select Work Scope",
    "previousCompletion": "نسبة الإنجاز السابقة (%) / Previous Completion (%)",
    "dueDate": "تاريخ الاستحقاق / Due Date",
    "treasuryAccount": "حساب الخزينة / Treasury Account",
    "treasuryAccountTooltip": "اختر الحساب الذي سيتم إيداع المبلغ فيه / Select account to deposit amount",
    "referenceNumberOptional": "رقم المرجع (اختياري) / Reference Number (Optional)",
    "referenceNumberPlaceholder": "رقم المرجع أو رقم الإيصال / Reference number or receipt number",
    "date": "التاريخ / Date",
    "treasuryOrCashBox": "الخزينة/الصندوق / Treasury/Cash Box",
    "selectTreasuryOrCashBox": "اختر الخزينة/الصندوق / Select Treasury/Cash Box",
    "description": "الوصف / Description",
    "descriptionPlaceholder": "وصف المصروف... / Expense description...",
    "currency": "العملة / Currency"
  },
  "generalExpenses": {
    "category": "الفئة / Category",
    "paymentFrequency": "دورية الصرف / Frequency",
    "currency": "العملة / Currency",
    "amount": "المبلغ / Amount",
    "treasuryAccount": "حساب الخزينة / Treasury Account",
    "addedItems": "البنود المضافة / Added Items",
    "readOnlyStatus": "الحالة للقراءة فقط / Status is read-only",
    "transferCustody": "ترحيل العهدة / Transfer Custody",
    "selectTreasuryAccountTooltip": "اختر الحساب الذي سيتم خصم المصروف منه / Select account to deduct expense from"
  },
  "orders": {
    "currency": "العملة / Currency",
    "currencyTooltip": "العملة مضبوطة على مستوى الفرع / Currency is set at the branch level"
  },
  "incomes": {
    "currency": "العملة / Currency",
    "currencyTooltip": "العملة مضبوطة على مستوى الفرع / Currency is set at the branch level"
  },
  "contracts": {
    "currency": "العملة / Currency",
    "currencyTooltip": "العملة مضبوطة تلقائياً / Currency is automatically set"
  },
  "treasury": {
    "currency": "العملة / Currency"
  },
  "quotations": {
    "approveAndCreateProject": "اعتماد وتحويل لمشروع / Approve and Create Project",
    "contractStartDate": "تاريخ بدء العقد / Contract Start Date",
    "selectContractStartDate": "يرجى اختيار تاريخ بدء العقد / Please select contract start date"
  },
  "settings": {
    "logoAndBranding": "الشعار والعلامة التجارية / Logo and Branding",
    "smtpServer": "خادم SMTP / SMTP Server",
    "smtpPort": "منفذ SMTP / SMTP Port",
    "secureConnection": "اتصال آمن (SSL/TLS) / Secure Connection (SSL/TLS)"
  },
  "approvalWorkflow": {
    "title": "سير العمل والموافقة / Approval Workflow & Print Controls",
    "status": "الحالة: / Status:",
    "shareWhatsApp": "مشاركة عبر واتساب / Share via WhatsApp",
    "approve": "موافقة / Approve",
    "reject": "رفض / طلب تعديلات / Reject / Request Changes",
    "submitForApproval": "إرسال للموافقة / Submit for Approval",
    "managerNotes": "ملاحظات المدير: / Manager Notes:",
    "managerNotesPlaceholder": "أدخل ملاحظات المدير... / Enter manager notes..."
  }
}
```

---

## SUMMARY STATISTICS

- **Total Files Scanned:** 23 pages + 8 components = 31 files
- **Files with Issues:** 12 files
- **Dual-Language Labels:** 6 instances
- **Hardcoded Arabic Strings:** 25+ instances
- **Hardcoded English Strings:** 15+ instances
- **Ternary Language Checks:** 20+ instances
- **Dynamic Currency Issues:** 12+ instances

---

**END OF AUDIT REPORT**
