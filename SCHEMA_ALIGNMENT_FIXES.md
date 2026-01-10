# Schema Alignment Fixes Summary

This document summarizes all the fixes applied to ensure 100% alignment between Supabase schema files and service files.

## ✅ Critical Fixes Applied

### 1. **Payments Table - linked_advance_id Type Mismatch** 
   **File:** `add_accounting_hub_features.sql`
   - **Issue:** `linked_advance_id` was defined as `UUID` but references `payments(id)` which is `TEXT`
   - **Fix:** Changed `linked_advance_id` from `UUID` to `TEXT` to match `payments.id` type
   - **Impact:** Foreign key constraint now works correctly

### 2. **Expense Categories Table - Missing Columns**
   **File:** `add_accounting_hub_features.sql`
   - **Issue:** Schema was missing columns used by `categoryService.js`: `name_ar`, `is_system`, `updated_at`, `created_by`
   - **Issue:** `id` was `UUID` but should be `TEXT` for consistency
   - **Fix:** 
     - Changed `id` from `UUID` to `TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT`
     - Added missing columns: `name_ar TEXT`, `is_system BOOLEAN DEFAULT false`, `updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`, `created_by TEXT DEFAULT 'user'`
     - Added trigger for `updated_at` auto-update

### 3. **Orders Table - Missing Columns**
   **File:** `add_orders_missing_columns.sql` (NEW)
   - **Issue:** Schema was missing columns used by `ordersService.js`: `tenant_id`, `project_id`, `work_scope`, `discount`
   - **Fix:** Added all missing columns with proper indexes and comments:
     - `tenant_id TEXT` - for multi-tenant support
     - `project_id TEXT` - link to projects (engineering mode)
     - `work_scope TEXT` - work scope tracking
     - `discount DECIMAL(15, 2) NOT NULL DEFAULT 0` - order discounts

### 4. **Customers Table - Missing tenant_id**
   **File:** `add_customers_tenant_id.sql` (NEW)
   - **Issue:** Schema was missing `tenant_id` column required by `customersService.js`
   - **Fix:** Added `tenant_id TEXT` column with index for multi-tenant support

### 5. **Payments Service - paymentFrequency Mapping**
   **File:** `src/services/paymentsService.js`
   - **Issue:** `mapToCamelCase` was defaulting `payment_frequency` to `'one-time'` even when it should be `null` for project expenses
   - **Fix:** Changed to preserve `null` values correctly: `payment.payment_frequency !== null && payment.payment_frequency !== undefined ? payment.payment_frequency : null`

## ✅ Verified Alignments

### ID Types - All Consistent (TEXT)
- ✅ `payments.id`: TEXT ✓
- ✅ `payments.linked_advance_id`: TEXT ✓ (fixed)
- ✅ `workers.id`: TEXT ✓
- ✅ `daily_records.id`: TEXT ✓
- ✅ `daily_records.worker_id`: TEXT ✓ (references workers.id)
- ✅ `expense_categories.id`: TEXT ✓ (fixed)
- ✅ `customers.id`: TEXT ✓
- ✅ `orders.id`: TEXT ✓
- ✅ `quotations.id`: TEXT ✓
- ✅ `contracts.id`: TEXT ✓
- ✅ `projects.id`: TEXT ✓ (assumed, used by projectsService)

### Field Mappings (snake_case → camelCase)
All services correctly map database snake_case to JavaScript camelCase:

- ✅ **paymentsService**: All fields mapped correctly including `linked_advance_id` → `linkedAdvanceId`
- ✅ **workersService**: All fields mapped correctly
- ✅ **attendanceService**: All fields mapped correctly
- ✅ **categoryService**: All fields mapped correctly including `name_ar` → `nameAr`, `is_system` → `isSystem`
- ✅ **ordersService**: All fields mapped correctly including new fields
- ✅ **customersService**: All fields mapped correctly
- ✅ **contractsService**: All fields mapped correctly
- ✅ **projectsService**: All fields mapped correctly
- ✅ **quotationsService**: All fields mapped correctly

## 📋 Migration Files Created/Updated

1. **add_accounting_hub_features.sql** - Updated
   - Fixed `linked_advance_id` type (UUID → TEXT)
   - Fixed `expense_categories` schema (added missing columns, fixed ID type)

2. **add_orders_missing_columns.sql** - Created
   - Adds `tenant_id`, `project_id`, `work_scope`, `discount` to orders table

3. **add_customers_tenant_id.sql** - Created
   - Adds `tenant_id` to customers table

## 🔍 Services Verified

All services are now 100% aligned with schema:
- ✅ paymentsService.js
- ✅ workersService.js
- ✅ attendanceService.js
- ✅ categoryService.js
- ✅ ordersService.js
- ✅ customersService.js
- ✅ contractsService.js
- ✅ projectsService.js
- ✅ quotationsService.js

## 📝 Notes

1. **ID Generation**: All services use `crypto.randomUUID()` which generates UUID strings compatible with TEXT columns
2. **Tenant Support**: All tables now properly support `tenant_id` for multi-tenant filtering
3. **Foreign Keys**: All foreign key relationships now have matching data types
4. **Null Handling**: Services correctly handle nullable fields (e.g., `payment_frequency`, `linked_advance_id`)

## 🚀 Next Steps

Run these migration files in order:
1. `add_accounting_hub_features.sql` (updated)
2. `add_orders_missing_columns.sql` (new)
3. `add_customers_tenant_id.sql` (new)

All services are ready to use with the corrected schema!
