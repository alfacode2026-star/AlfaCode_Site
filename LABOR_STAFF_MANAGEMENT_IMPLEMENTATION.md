# Labor & Staff Management Module Implementation

## Overview
This document describes the comprehensive "Labor & Staff Management" module (إدارة الموظفين والعمالة اليومية) that has been implemented.

## Module Structure

The module consists of two main tabs:

### 1. Internal Staff (الموظفون)
- **CRUD Interface**: Full Create, Read, Update, Delete functionality
- **Fields**:
  - Name (الاسم)
  - Employee ID (الرقم الوظيفي)
  - Job Title (المسمى الوظيفي)
  - Monthly Salary (الراتب الأساسي)
- **Data Storage**: `employees` table

### 2. External Labor Groups (العمالة الخارجية)
- **Group Creation**: Engineers can create groups with:
  - Start Date
  - Number of Normal Laborers (عمالة عادية)
  - Number of Skilled Laborers (عمالة خلفة/مساعدة)
  - Daily Rate for each category
  - Project association
  - Engineer name
  - Holiday exclusions (multi-select)

- **Closing Logic**:
  - User selects End Date
  - Smart Holiday Exclusion: Calculates net days by excluding selected holidays (Friday, Saturday, Sunday, etc.)
  - Financial Adjustments:
    - Overtime/Bonus (إضافي/مكافأة) - Adds to total
    - Deductions (خصومات) - Subtracts from total (with mandatory reason field)
  - **Formula**: 
    ```
    Total = [(Net Days × Normal Count × Normal Rate) + (Net Days × Skilled Count × Skilled Rate)] + Overtime - Deductions
    ```

- **Approval Workflow**:
  - Upon closing, status is set to "Pending Approval" (بانتظار الموافقة)
  - Engineers CANNOT execute treasury payments
  - **Payment Options**:
    1. **Option A (Treasury/Bank)**: Only accessible by Admin/Manager. Creates treasury outflow upon approval.
    2. **Option B (Advance/عهدة)**: If Engineer has a personal advance, allows "Deduct from my Advance". Updates Engineer's advance balance immediately without bank transaction.

## Database Schema

### Tables Created

#### 1. `employees` Table
- `id` (TEXT PRIMARY KEY)
- `tenant_id` (TEXT NOT NULL)
- `name` (TEXT NOT NULL)
- `employee_id` (TEXT NOT NULL) - الرقم الوظيفي
- `job_title` (TEXT NOT NULL) - المسمى الوظيفي
- `monthly_salary` (DECIMAL(15, 2)) - الراتب الأساسي
- `created_at`, `updated_at`, `created_by`
- Unique constraint on `(tenant_id, employee_id)`

#### 2. `labor_groups` Table
- `id` (TEXT PRIMARY KEY)
- `tenant_id` (TEXT NOT NULL)
- `project_id` (TEXT REFERENCES projects)
- `engineer_id` (TEXT) - Engineer identifier
- `engineer_name` (TEXT) - Engineer name for display
- `start_date` (DATE NOT NULL)
- `end_date` (DATE) - Set when closing
- `normal_count` (INTEGER) - Number of normal laborers
- `skilled_count` (INTEGER) - Number of skilled laborers
- `normal_rate` (DECIMAL(15, 2)) - Daily rate for normal laborers
- `skilled_rate` (DECIMAL(15, 2)) - Daily rate for skilled laborers
- `holidays` (TEXT[]) - Array of holiday day names
- `net_days` (INTEGER) - Calculated net days (excluding holidays)
- `overtime` (DECIMAL(15, 2)) - إضافي/مكافأة
- `deductions` (DECIMAL(15, 2)) - خصومات
- `deduction_reason` (TEXT) - Reason for deductions
- `total_amount` (DECIMAL(15, 2)) - Final calculated total
- `status` (TEXT) - 'active', 'pending_approval', 'approved', 'paid', 'cancelled'
- `payment_method` (TEXT) - 'treasury' or 'advance'
- `linked_advance_id` (TEXT REFERENCES payments) - If paid from advance
- `treasury_account_id` (TEXT) - Treasury account used
- `approved_by` (TEXT) - User who approved
- `approved_at` (TIMESTAMP) - When approved
- `notes` (TEXT)
- `created_at`, `updated_at`, `created_by`

## Files Created/Modified

### New Files
1. **`add_labor_staff_management_schema.sql`**
   - Database schema for `employees` and `labor_groups` tables
   - Includes indexes, triggers, RLS policies

2. **`src/services/employeesService.js`**
   - CRUD operations for internal staff
   - Tenant-aware service

3. **`src/services/laborGroupsService.js`**
   - Complex labor group management
   - Holiday exclusion algorithm
   - Financial calculations
   - Approval workflow
   - Advance deduction logic

### Modified Files
1. **`src/pages/LaborPage.tsx`**
   - Completely rewritten with two-tab structure
   - Internal Staff tab with CRUD interface
   - External Labor Groups tab with full workflow
   - Summary modal showing calculation breakdown
   - Approval modal with payment method selection

## Key Features

### Holiday Exclusion Algorithm
- Iterates through each day from start to end date
- Excludes days matching selected holidays (by day of week)
- Calculates net working days
- Supports Arabic day names (الأحد, الإثنين, etc.)

### Financial Calculations
- Base calculation: (Net Days × Count × Rate) for each labor type
- Adds overtime/bonus
- Subtracts deductions (with mandatory reason)
- Displays detailed breakdown in summary modal

### Approval Workflow
1. Engineer closes group → Status: "Pending Approval"
2. Admin/Manager reviews and approves
3. Payment method selection:
   - **Treasury**: Creates treasury transaction (outflow)
   - **Advance**: Creates settlement payment, updates advance remaining_amount
4. Status updated to "Paid" upon successful payment

### Advance Deduction
- Validates advance balance before approval
- Creates settlement payment with `transaction_type: 'settlement'`
- Automatically updates advance `remaining_amount` via paymentsService
- Updates advance status to 'settled' or 'partially_settled'

## UI/UX Features

- **RTL Support**: All labels and tables support Arabic RTL
- **Summary Screen**: Shows breakdown before final submission:
  - Start/End dates
  - Net days (excluding holidays)
  - Cost breakdown by labor type
  - Overtime/bonus
  - Deductions
  - Final total
- **Validation**: 
  - Deduction reason required if deductions > 0
  - Advance balance validation before approval
  - Treasury account required for treasury payments
- **Status Indicators**: Color-coded tags for group status
- **Responsive Design**: Works on all screen sizes

## Usage Instructions

### For Database Setup
1. Run the SQL migration file:
   ```sql
   -- Execute: add_labor_staff_management_schema.sql
   ```

### For Internal Staff Management
1. Navigate to Labor page → "الموظفون" tab
2. Click "إضافة موظف" to add new employee
3. Fill in: Name, Employee ID, Job Title, Monthly Salary
4. Use Edit/Delete buttons for existing employees

### For External Labor Groups
1. Navigate to Labor page → "العمالة الخارجية" tab
2. Click "إنشاء مجموعة جديدة"
3. Fill in:
   - Project
   - Engineer name
   - Start date
   - Labor counts and rates
   - Select holidays to exclude
4. Click "إغلاق" when ready to close
5. Set end date, adjust holidays, add overtime/deductions
6. Review summary, then submit
7. Admin/Manager approves and selects payment method
8. System processes payment (treasury or advance deduction)

## Integration Points

- **Projects Service**: Links labor groups to projects
- **Treasury Service**: Creates outflows for treasury payments
- **Payments Service**: Creates settlement payments for advance deductions
- **Tenant Context**: All operations are tenant-aware

## Notes

- Engineers cannot approve their own groups (status remains "pending_approval" until admin approval)
- Advance deduction requires sufficient balance
- Paid groups cannot be deleted
- Active groups can be edited; closed groups cannot
- All financial calculations are done server-side for accuracy
