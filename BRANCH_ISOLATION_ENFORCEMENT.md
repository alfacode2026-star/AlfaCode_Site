# CRITICAL: MANDATORY BRANCH ISOLATION ENFORCEMENT

## Status: IN PROGRESS

This document tracks the enforcement of **MANDATORY** branch isolation across all services.

## Change Pattern

**OLD (WRONG - Conditional):**
```javascript
const branchId = branchStore.getBranchId()

let query = supabase
  .from('table')
  .select('*')
  .eq('tenant_id', tenantId)

if (branchId) {
  query = query.eq('branch_id', branchId)
}
```

**NEW (CORRECT - Mandatory):**
```javascript
const branchId = branchStore.getBranchId()

// MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
if (!branchId) {
  console.warn('No branch ID set. Cannot fetch data.')
  return [] // or null for single record methods
}

let query = supabase
  .from('table')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
```

## Services Status

### ✅ COMPLETED
- `projectsService.js` - getProjects, getActiveProjects, getProject, updateProject, deleteProject
- `customersService.js` - getCustomers, getCustomer, getCustomerByEmail, updateCustomer, deleteCustomer, searchCustomers

### 🔄 IN PROGRESS
- `incomesService.js` - All methods need update
- `paymentsService.js` - All methods need update  
- `treasuryService.js` - getAccounts, getTransactions need update
- `inventoryService.js` - All methods need update
- `quotationsService.js` - All methods need update
- `contractsService.js` - All methods need update
- `ordersService.js` - All methods need update
- `workersService.js` - All methods need update
- `laborGroupsService.js` - All methods need update

### 📋 PENDING FILES
1. All remaining service files with `if (branchId)` conditional checks
2. Direct Supabase queries in page components (e.g., ProjectDetails.tsx line 119-127)
3. Dashboard aggregations
4. Reports aggregations

## Notes
- Total instances found: ~80 conditional `if (branchId)` checks
- All must be converted to mandatory checks
- If `branchId` is null, methods should return empty array/null immediately
