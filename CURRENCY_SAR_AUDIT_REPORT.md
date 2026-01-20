# CURRENCY "SAR" AUDIT REPORT
**Generated:** Comprehensive audit of all "SAR" currency symbol occurrences across the project

---

## EXECUTIVE SUMMARY
- **Total Occurrences Found:** 179 matches for "SAR" (case-sensitive)
- **Total Occurrences Found:** 54 matches for "sar" (lowercase, mostly translation keys)
- **Files Affected:** 30+ files across services, pages, components, and utilities

---

## CATEGORY 1: HARDCODED IN UI
*Direct display of "SAR" in JSX/TSX components*

### 1.1 TreasuryPage.tsx
- **Line 201:** Currency option in dropdown: `{ id: null, code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', is_common: true }`
- **Line 245:** Currency option in dropdown: `{ id: null, code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', is_common: true }`
- **Line 692:** Warning message fallback: `message.warning(\`Currency ${currencyCode} not found. Using SAR as fallback.\`);`

### 1.2 SettingsPage.tsx
- **Line 1035:** Currency option in dropdown: `<Option value="SAR">ريال سعودي (SAR)</Option>`

### 1.3 QuotationsPage.tsx
- **Line 305:** Display currency: `{amount?.toLocaleString() || 0} {branchCurrency || 'SAR'}`
- **Line 793:** Input suffix: `suffix={branchCurrency || 'SAR'}`
- **Line 1415:** Display in modal: `{selectedQuotation?.totalAmount?.toLocaleString()} {selectedQuotation?.currency || branchCurrency || 'SAR'}`

### 1.4 OrdersPage.tsx
- **Line 104:** Display currency constant: `const displayCurrency = branchCurrency || 'SAR'`
- **Line 1423:** Conditional display: `{acc.currency && acc.currency !== 'SAR' ? \` - ${acc.currency}\` : ''}`

### 1.5 IncomesPage.tsx
- **Line 124:** Display currency constant: `const displayCurrency = branchCurrency || 'SAR';`
- **Line 832:** Conditional display: `{acc.currency && acc.currency !== 'SAR' ? \` - ${acc.currency}\` : ''}`

### 1.6 GeneralExpenses.tsx
- **Line 126:** Base currency state: `const [baseCurrency] = useState<string>('SAR')`
- **Line 129:** Display currency constant: `const displayCurrency = branchCurrency || 'SAR'`
- **Line 1177:** Currency for settlement: `const currencyForSettlement = branchCurrency || 'SAR'`
- **Line 1327:** Currency for advance: `const currencyForAdvance = branchCurrency || 'SAR'`
- **Line 1498:** Currency for admin: `const currencyForAdmin = branchCurrency || 'SAR'`
- **Line 1767:** Hardcoded in table cell: `<td>${parseFloat(expense.amount || 0).toLocaleString()} ${language === 'ar' ? 'ريال' : 'SAR'}</td>`
- **Line 1832:** Hardcoded in total display: `<p>${language === 'ar' ? 'إجمالي المصاريف:' : 'Total Expenses:'} ${totalExpenses.toLocaleString()} ${language === 'ar' ? 'ريال' : 'SAR'}</p>`

### 1.7 ContractsPage.tsx
- **Line 129:** Selected currency state: `const [selectedCurrency, setSelectedCurrency] = useState<string>('SAR')`
- **Line 997:** Currency fallback: `const currency = selectedAccount?.currency || selectedCurrency || 'SAR';`
- **Line 1041:** Reset to default: `setSelectedCurrency('SAR')`
- **Line 1043:** Form reset: `paymentForm.setFieldsValue({ currency: 'SAR' })`
- **Line 1113:** Input suffix: `suffix={branchCurrency || 'SAR'}`
- **Line 1480:** Reset to default: `setSelectedCurrency('SAR')`
- **Line 1482:** Form reset: `paymentForm.setFieldsValue({ currency: 'SAR' })`
- **Line 1720:** Reset to default: `setSelectedCurrency('SAR')`
- **Line 1722:** Form reset: `paymentForm.setFieldsValue({ currency: 'SAR' })`
- **Line 1868:** Currency fallback: `const currency = account?.currency || 'SAR';`
- **Line 1877:** Conditional display: `{acc.currency && acc.currency !== 'SAR' ? \` - ${acc.currency}\` : ''}`

### 1.8 Projects.tsx
- **Line 462:** Input suffix: `suffix={branchCurrency || 'SAR'}`

### 1.9 ProjectDetails.tsx
- **Line 90:** Display currency constant: `const displayCurrency = branchCurrency || 'SAR'`
- **Line 474:** Currency in form: `currency: 'SAR',`
- **Line 1824:** Currency fallback: `const currency = branchCurrency || 'SAR';`
- **Line 1936:** Conditional display: `{acc.currency && acc.currency !== 'SAR' ? \` - ${acc.currency}\` : ''}`

### 1.10 QuotationBuilder.tsx
- **Line 1208:** Display in item: `{item.price > 0 ? \`${item.price.toLocaleString()} ${t.common?.sar || 'SAR'}\` : 'TBD'}`

### 1.11 BranchesSettings.tsx
- **Line 132:** Default currency: `currency: 'SAR',`
- **Line 396:** Currency option: `<Option value="SAR">SAR</Option>`

### 1.12 AdminApprovals.tsx
- **Line 274:** Default currency: `currency: 'SAR',`
- **Line 384:** Hardcoded display: `return <strong>{formatted} SAR</strong>`
- **Line 457:** Hardcoded display: `return <strong>{formatted} SAR</strong>`

### 1.13 LaborPage.tsx
- **Line 874:** Intl.NumberFormat currency: `currency: branchCurrency || 'SAR'`
- **Line 880:** Intl.NumberFormat currency: `currency: branchCurrency || 'SAR'`
- **Line 886:** Intl.NumberFormat currency: `currency: branchCurrency || 'SAR'`
- **Line 892:** Intl.NumberFormat currency: `currency: branchCurrency || 'SAR'`
- **Line 899:** Intl.NumberFormat currency: `currency: branchCurrency || 'SAR'`
- **Line 911:** Intl.NumberFormat currency: `currency: branchCurrency || 'SAR'`
- **Line 972:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1073:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1761:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1772:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1784:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1795:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1959:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1971:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1983:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 1997:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 2009:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 2020:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 2079:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 2112:** Currency in payment: `currency: branchCurrency || 'SAR',`
- **Line 2290:** Currency in payment: `currency: branchCurrency || 'SAR',`

### 1.14 SuppliersPage.tsx
- **Line 488:** Input suffix: `suffix={branchCurrency || 'SAR'}`
- **Line 498:** Input suffix: `suffix={branchCurrency || 'SAR'}`

### 1.15 CustomersPage.tsx
- **Line 405:** Input suffix: `suffix={branchCurrency || 'SAR'}`

### 1.16 SetupWizard.tsx
- **Line 155:** Currency option: `<Option value="SAR">SAR - Saudi Riyal</Option>`
- **Line 275:** Default currency: `currency: 'SAR',`
- **Line 387:** Currency fallback: `currency: b.currency || 'SAR',`

---

## CATEGORY 2: DEFAULT STATE/INITIAL VALUES
*useState, const declarations, or form initial values*

### 2.1 SettingsPage.tsx
- **Line 99:** Initial settings state: `currency: 'SAR',`

### 2.2 GeneralExpenses.tsx
- **Line 126:** Base currency state: `const [baseCurrency] = useState<string>('SAR')`

### 2.3 ContractsPage.tsx
- **Line 129:** Selected currency state: `const [selectedCurrency, setSelectedCurrency] = useState<string>('SAR')`

### 2.4 BranchesSettings.tsx
- **Line 132:** Default currency: `currency: 'SAR',`

### 2.5 AdminApprovals.tsx
- **Line 274:** Default currency: `currency: 'SAR',`

### 2.6 SetupWizard.tsx
- **Line 275:** Default currency: `currency: 'SAR',`

---

## CATEGORY 3: UTILITY FUNCTIONS
*Functions that use 'SAR' as default parameter or return value*

### 3.1 TreasuryPage.tsx
- **Line 87:** Function default parameter: `const formatCurrency = (value: number, currency: string = 'SAR'): string => {`
- **Line 654:** Default currency assignment: `currency: branchCurrency || 'SAR',`
- **Line 705:** Currency assignment: `currency: currencyCode,`
- **Line 1097:** Form initial value: `initialValue={branchCurrency || 'SAR'}`
- **Line 1115:** Currency array: `const mainCurrencies = ['IQD', 'AED', 'USD', 'SAR', 'EUR'];`
- **Line 1156:** Currency array: `const mainCurrencies = ['IQD', 'AED', 'USD', 'SAR', 'EUR'];`

### 3.2 IncomesPage.tsx
- **Line 86:** Function default parameter: `const formatCurrency = (value: number, currency: string = 'SAR'): string => {`
- **Line 250:** Currency assignment: `const currency = branchCurrency || 'SAR';`
- **Line 433:** Currency assignment: `const currency = branchCurrency || 'SAR';`

### 3.3 currencyUtils.ts
- **Line 8:** Currency symbol mapping: `SAR: 'ر.س',`
- **Line 60:** Comment reference: `* Format currency label (e.g., "Total (SAR)" or "Total (AED)")`
- **Line 89:** Comment reference: `* @returns Formatted string like "500,000 IQD" or "1,234 SAR"`

---

## CATEGORY 4: DATABASE/SERVICE LAYER
*Service files, API calls, and database operations*

### 4.1 paymentsService.js
- **Line 318:** Comment: `// Get currency from treasury account if provided, otherwise default to SAR`
- **Line 319:** Default currency: `const currency = paymentData.currency || 'SAR'`
- **Line 1484:** Comment: `// Get currency from settlement data or linked advance, default to SAR`
- **Line 1485:** Default currency: `const currency = settlementData.currency || linkedAdvance?.currency || 'SAR'`

### 4.2 ordersService.js
- **Line 267:** Comment: `// Get currency from treasury account if provided, otherwise default to SAR`
- **Line 268:** Default currency: `const currency = orderData.currency || 'SAR'`

### 4.3 incomesService.js
- **Line 229:** Comment: `// Get currency from treasury account if provided, otherwise default to SAR`
- **Line 230:** Default currency: `const currency = incomeData.currency || 'SAR'`

### 4.4 treasuryService.js
- **Line 176:** Comment: `// CRITICAL: currency must be a string (currency code like 'SAR', 'USD', 'IQD')`
- **Line 179:** Default currency: `: (accountData.currency || 'SAR');`
- **Line 187:** Comment: `currency: currencyValue, // REQUIRED: currency code as string (e.g., 'SAR', 'USD', 'IQD')`
- **Line 198:** Comment: `currency: newAccount.currency, // Should be string like 'SAR', 'USD', etc.`
- **Line 676:** Default currency: `currency: data.currency || 'SAR',`

### 4.5 setupService.ts
- **Line 252:** Default currency: `const currency = data.currency || 'SAR'`

### 4.6 companySettingsService.js
- **Line 122:** Default currency: `currency: branchData?.currency || 'SAR',`
- **Line 409:** Default currency: `currency: settings.currency || 'SAR', // Currency from branches table (installation data)`

---

## CATEGORY 5: TRANSLATION FILES
*Translation keys and language files*

### 5.1 translations.ts
- **Line 26:** Type definition: `sar: string`
- **Line 109:** Type definition: `sar: string`
- **Line 1005:** English translation: `sar: 'SAR',`
- **Line 1055:** English label: `totalAmountLabel: 'Total Amount (SAR)',`
- **Line 1073:** English label: `paymentAmount: 'Amount (SAR)',`
- **Line 1084:** English translation: `sar: 'SAR',`
- **Line 1127:** English label: `monthlySalary: 'Monthly Salary (SAR)',`
- **Line 1139:** English label: `normalRate: 'Daily Rate for Normal Labor (SAR)',`
- **Line 1140:** English label: `skilledRate: 'Daily Rate (SAR) (Optional)',`
- **Line 1977:** Arabic translation: `sar: 'ريال',`
- **Line 2056:** Arabic translation: `sar: 'ريال',`

---

## CATEGORY 6: COMPONENT FILES
*Reusable components using 'SAR'*

### 6.1 ApprovalWorkflow.tsx
- **Line 69:** Arabic message: `${totalAmount.toLocaleString()} ${t.common?.sar || 'SAR'}`
- **Line 70:** English message: `${totalAmount.toLocaleString()} ${t.common?.sar || 'SAR'}`

### 6.2 QuotationPDFPreview.tsx
- **Line 240:** Table header: `{t.quotations.amount || 'Amount'} ({t.common.sar || 'SAR'})`
- **Line 248:** Table cell: `${parseFloat(String(item.amount || 0)).toLocaleString()} {t.common.sar || 'SAR'}`
- **Line 255:** Table cell: `${boqTotal.toLocaleString()} {t.common.sar || 'SAR'}`

---

## USAGE PATTERNS ANALYSIS

### Pattern 1: Fallback Chain (`branchCurrency || 'SAR'`)
**Most Common Pattern** - Used in 40+ locations
- Used as a fallback when `branchCurrency` is not available
- **Files:** TreasuryPage, QuotationsPage, OrdersPage, IncomesPage, GeneralExpenses, ContractsPage, Projects, ProjectDetails, LaborPage, SuppliersPage, CustomersPage

### Pattern 2: Default Function Parameter (`currency: string = 'SAR'`)
**Used in:** TreasuryPage.tsx (line 87), IncomesPage.tsx (line 86)

### Pattern 3: State Initialization (`useState('SAR')`)
**Used in:** GeneralExpenses.tsx (line 126), ContractsPage.tsx (line 129)

### Pattern 4: Service Layer Defaults (`|| 'SAR'`)
**Used in:** paymentsService.js, ordersService.js, incomesService.js, treasuryService.js, setupService.ts, companySettingsService.js

### Pattern 5: Hardcoded Display Strings
**Used in:** AdminApprovals.tsx (lines 384, 457), GeneralExpenses.tsx (lines 1767, 1832)

### Pattern 6: Translation Key Fallback (`t.common?.sar || 'SAR'`)
**Used in:** QuotationBuilder.tsx, ApprovalWorkflow.tsx, QuotationPDFPreview.tsx

---

## RECOMMENDATIONS

### High Priority (Should be replaced with dynamic currency)
1. **Service Layer Defaults** - All `|| 'SAR'` fallbacks in services should use branch currency or settings
2. **Hardcoded UI Displays** - AdminApprovals.tsx lines 384, 457 and GeneralExpenses.tsx lines 1767, 1832
3. **Default Function Parameters** - TreasuryPage.tsx and IncomesPage.tsx formatCurrency functions
4. **State Initializations** - GeneralExpenses.tsx and ContractsPage.tsx useState defaults

### Medium Priority (Consider replacing)
1. **Fallback Chains** - `branchCurrency || 'SAR'` could be `branchCurrency || settings.currency || 'SAR'`
2. **Translation Labels** - Labels like "Total Amount (SAR)" should be dynamic

### Low Priority (Acceptable as-is)
1. **Currency Symbol Mapping** - currencyUtils.ts line 8 (this is a lookup table, acceptable)
2. **Translation Keys** - `t.common.sar` keys are fine as they're translation strings
3. **Currency Arrays** - Arrays listing SAR as an option are acceptable

---

## FILES SUMMARY

| File | Occurrences | Category |
|------|-------------|----------|
| LaborPage.tsx | 25 | UI, Service Calls |
| TreasuryPage.tsx | 11 | UI, Utility Functions |
| ContractsPage.tsx | 12 | UI, State |
| GeneralExpenses.tsx | 7 | UI, State, Hardcoded |
| translations.ts | 11 | Translation Files |
| paymentsService.js | 4 | Service Layer |
| QuotationsPage.tsx | 3 | UI |
| OrdersPage.tsx | 2 | UI |
| IncomesPage.tsx | 4 | UI, Utility Functions |
| AdminApprovals.tsx | 3 | UI, State |
| treasuryService.js | 5 | Service Layer |
| QuotationBuilder.tsx | 2 | UI |
| ProjectDetails.tsx | 4 | UI |
| SetupWizard.tsx | 3 | UI, State |
| BranchesSettings.tsx | 2 | UI, State |
| SettingsPage.tsx | 3 | UI, State |
| Others | Various | Mixed |

---

## NEXT STEPS

1. **Review this report** to determine which occurrences should be replaced
2. **Decide on replacement strategy:**
   - Replace with `branchCurrency` from BranchContext
   - Replace with `settings.currency` from company settings
   - Create a centralized currency utility function
3. **Prioritize fixes** based on usage frequency and impact
4. **Test thoroughly** after replacements to ensure currency displays correctly across all pages

---

**END OF AUDIT REPORT**
