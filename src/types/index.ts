// Product types
export interface Product {
  id: string
  name: string
  sku: string
  category: string
  description?: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  minQuantity: number
  maxQuantity: number
  unit: string
  supplier: string
  location: string
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  lastUpdated: string
  createdAt: string
  barcode?: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  projectId?: string | null
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer'
  paymentStatus: 'paid' | 'unpaid' | 'partial'
  shippingMethod?: string
  shippingAddress?: string
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  address?: string
  city?: string
  country?: string
  type?: 'individual' | 'corporate'
  status?: 'active' | 'inactive'
  taxNumber?: string
  balance: number
  creditLimit?: number
  totalOrders: number
  totalSpent: number
  firstPurchase?: string
  lastPurchase?: string
  notes?: string
  createdAt?: string
  createdBy: string
}

// Chart data types
export interface ChartData {
  name: string
  value: number
  color?: string
}

export interface MonthlyData {
  month: string
  sales: number
  orders: number
  target?: number
}

export interface Project {
  id: string
  name: string
  clientId: string | null
  client?: {
    id: string
    name: string
  } | null
  status: 'active' | 'on_hold' | 'completed' | 'cancelled'
  budget: number
  completionPercentage: number
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
  workScopes?: string[]
  createdAt?: string
  createdBy: string
  updatedAt?: string
}

// Engineering Workflow Types
export interface Quotation {
  id: string
  quoteNumber: string
  customerId?: string | null
  customerName: string
  customerPhone: string
  customerEmail?: string
  projectName?: string | null
  documentType: 'original' | 'addendum'
  workType: 'civil_works' | 'finishing' | 'mep' | 'low_current' | 'infrastructure' | 'special'
  workScopes?: string[]
  totalAmount: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted'
  validUntil?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ContractItem {
  id?: string
  itemDescription: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Contract {
  id: string
  contractNumber: string
  quotationId?: string | null
  customerId?: string | null
  customerName: string
  customerPhone: string
  customerEmail?: string
  contractType: 'original' | 'amendment'
  originalContractId?: string | null
  workType: 'civil_works' | 'finishing' | 'mep' | 'low_current' | 'infrastructure' | 'special'
  totalAmount: number
  status: 'in_progress' | 'on_hold' | 'fully_completed'
  startDate?: string
  endDate?: string
  projectId?: string | null
  projectName?: string | null
  items: ContractItem[]
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Payment {
  id: string
  contractId: string
  paymentNumber: string
  amount: number
  dueDate: string
  paidDate?: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'other'
  referenceNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  projectId?: string | null
  workScope?: string | null
  projectName?: string | null
  isGeneralExpense?: boolean
  expenseCategory?: string | null
  treasuryAccountId?: string | null
}

export interface TreasuryAccount {
  id: string
  name: string
  type: 'bank' | 'cash_box'
  balance: number
  currency?: string
  accountNumber?: string
  bankName?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}