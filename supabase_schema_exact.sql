-- ============================================
-- EXACT SQL SCHEMA FOR SUPABASE
-- Generated based on customersService.js and ordersService.js
-- Column names in snake_case match camelCase mapping in code
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
-- Based on customersService.js mapping:
-- camelCase (code) -> snake_case (DB)
-- taxNumber -> tax_number
-- creditLimit -> credit_limit
-- totalOrders -> total_orders
-- totalSpent -> total_spent
-- firstPurchase -> first_purchase
-- lastPurchase -> last_purchase
-- createdBy -> created_by
-- createdAt -> created_at
-- updatedAt -> updated_at
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  company TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  type TEXT NOT NULL CHECK (type IN ('individual', 'corporate')) DEFAULT 'individual',
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  tax_number TEXT,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(15, 2),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(15, 2) NOT NULL DEFAULT 0,
  first_purchase DATE,
  last_purchase DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for customers (based on queries in customersService.js)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- ============================================
-- ORDERS TABLE
-- ============================================
-- Based on ordersService.js mapping:
-- camelCase (code) -> snake_case (DB)
-- customerId -> customer_id
-- customerName -> customer_name
-- customerPhone -> customer_phone
-- customerEmail -> customer_email
-- paymentMethod -> payment_method
-- paymentStatus -> payment_status
-- shippingMethod -> shipping_method
-- shippingAddress -> shipping_address
-- trackingNumber -> tracking_number
-- createdBy -> created_by
-- createdAt -> created_at
-- updatedAt -> updated_at
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer')) DEFAULT 'cash',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'unpaid', 'partial')) DEFAULT 'unpaid',
  shipping_method TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for orders (based on queries in ordersService.js)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
-- Based on ordersService.js mapping:
-- camelCase (code) -> snake_case (DB)
-- orderId -> order_id
-- productId -> product_id
-- productName -> product_name
-- unitPrice -> unit_price
-- createdAt -> created_at
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for order_items (based on queries in ordersService.js)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customers updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for orders updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON customers;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON orders;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON order_items;

-- Policies for customers (adjust based on your auth requirements)
CREATE POLICY "Allow all operations for authenticated users" ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON order_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE customers IS 'Stores customer information and statistics. Column names in snake_case map to camelCase in JavaScript code.';
COMMENT ON TABLE orders IS 'Stores order information. Column names in snake_case map to camelCase in JavaScript code.';
COMMENT ON TABLE order_items IS 'Stores individual items within each order. Column names in snake_case map to camelCase in JavaScript code.';
