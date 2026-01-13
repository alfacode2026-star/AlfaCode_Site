'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import ordersService from '../services/ordersService'
import customersService from '../services/customersService'
import projectsService from '../services/projectsService'
import treasuryService from '../services/treasuryService'
import paymentsService from '../services/paymentsService'
import { useTenant } from '../contexts/TenantContext'
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Space, 
  Modal, 
  Form,
  DatePicker,
  Row,
  Col,
  Statistic,
  Badge,
  Popconfirm,
  message,
  Steps,
  Descriptions,
  Divider,
  Tabs,
  InputNumber,
  AutoComplete,
  Alert
} from 'antd'
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  DollarOutlined,
  UserOutlined,
  TruckOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'

const { Option } = Select
const { RangePicker } = DatePicker
const { Step } = Steps
// const { TabPane } = Tabs

const OrdersPage = () => {
  const { industryType } = useTenant()
  const isEngineering = industryType === 'engineering'
  
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('all')
  const [customers, setCustomers] = useState([])
  const [customerSearchOptions, setCustomerSearchOptions] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearchValue, setCustomerSearchValue] = useState('')
  const [isNewSupplier, setIsNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [newSupplierEmail, setNewSupplierEmail] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [availableWorkScopes, setAvailableWorkScopes] = useState([])
  const [treasuryAccounts, setTreasuryAccounts] = useState([])
  const [selectedOrderTreasuryAccount, setSelectedOrderTreasuryAccount] = useState(null)

  // Load orders on mount
  useEffect(() => {
    loadOrders()
    loadCustomers()
    if (isEngineering) {
      loadProjects()
    }
    loadTreasuryAccounts()
  }, [isEngineering])

  const loadCustomers = async () => {
    try {
      const customersList = await customersService.getCustomers()
      setCustomers(customersList || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      message.error('فشل في تحميل قائمة العملاء')
      setCustomers([])
    }
  }

  const loadProjects = async () => {
    try {
      const projectsList = await projectsService.getActiveProjects()
      setProjects(projectsList || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    }
  }

  const loadTreasuryAccounts = async () => {
    try {
      const accounts = await treasuryService.getAccounts()
      setTreasuryAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading treasury accounts:', error)
      setTreasuryAccounts([])
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await ordersService.loadOrders()
      
      // Fetch project names and engineer names for orders
      const ordersWithProjects = await Promise.all(
        (data || []).map(async (order) => {
          let projectName = null
          let engineerName = null
          
          if (order.projectId) {
            const project = await projectsService.getProjectById(order.projectId)
            projectName = project?.name || null
          }
          
          // Check if this is a settlement order and fetch engineer name
          const isSettlement = order.notes && typeof order.notes === 'string' && order.notes.includes('تسوية عهدة')
          if (isSettlement && order.projectId) {
            try {
              // Extract reference number from notes (format: "تسوية عهدة رقم XXX")
              const notesMatch = order.notes.match(/تسوية عهدة رقم\s+([^\s-]+)/)
              if (notesMatch && notesMatch[1]) {
                const referenceNumber = notesMatch[1].trim()
                // Find settlement payment by reference number
                const allPayments = await paymentsService.getPayments()
                const settlementPayment = allPayments.find(p => 
                  p.transactionType === 'settlement' && 
                  (p.paymentNumber === referenceNumber || p.referenceNumber === referenceNumber)
                )
                
                if (settlementPayment) {
                  // Try to get managerName from settlement payment first
                  engineerName = settlementPayment.managerName || null
                  
                  // If not found, get from linked advance
                  if (!engineerName && settlementPayment.linkedAdvanceId) {
                    const linkedAdvance = await paymentsService.getPayment(settlementPayment.linkedAdvanceId)
                    if (linkedAdvance) {
                      engineerName = linkedAdvance.managerName || null
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching engineer name for settlement order:', error)
            }
          }
          
          return { ...order, projectName, engineerName }
        })
      )
      
      // Ensure data is an array before mapping
      if (Array.isArray(ordersWithProjects) && ordersWithProjects.length > 0) {
        // Normalize order structure to handle both old and new formats
        setOrders(ordersWithProjects.map(o => {
          // Normalize customer structure
          const normalizedOrder = { ...o }
          
          // If customer is an object, keep it; otherwise create from customerName/customerPhone
          if (!normalizedOrder.customer && (normalizedOrder.customerName || normalizedOrder.customerPhone)) {
            normalizedOrder.customer = {
              name: normalizedOrder.customerName || 'عميل غير معروف',
              phone: normalizedOrder.customerPhone || 'لا يوجد',
              email: normalizedOrder.customerEmail || ''
            }
          } else if (!normalizedOrder.customer) {
            normalizedOrder.customer = {
              name: 'عميل غير معروف',
              phone: 'لا يوجد',
              email: ''
            }
          }
          
          // Ensure items is an array
          if (!Array.isArray(normalizedOrder.items)) {
            normalizedOrder.items = []
          }
          
          // Ensure total is a number
          if (typeof normalizedOrder.total !== 'number') {
            normalizedOrder.total = normalizedOrder.total || 0
          }
          
          return {
            ...normalizedOrder,
            key: normalizedOrder.id || normalizedOrder.key || `order-${Date.now()}-${Math.random()}`
          }
        }))
      } else if (Array.isArray(ordersWithProjects)) {
        // Empty array is valid
        setOrders([])
      } else {
        console.warn('loadOrders returned non-array data:', ordersWithProjects)
        setOrders([])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      message.error('فشل في تحميل بيانات أوامر الشراء')
      // Set empty array on error to prevent crashes
      setOrders([])
    } finally {
      setLoading(false)
    }
  }


  // إحصائيات
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    completedOrders: orders.filter(o => o.status === 'completed').length,
  }

  // دالة الطباعة
  const handlePrint = (order) => {
    if (!order) return
    
    const orderId = order.id || 'غير معروف'
    const orderDate = order.dates?.created || order.createdAt || moment().format('DD-MMM-YYYY')
    const customerName = order.customer?.name || order.customerName || 'عميل غير معروف'
    const customerPhone = order.customer?.phone || order.customerPhone || 'لا يوجد'
    const customerEmail = order.customer?.email || order.customerEmail || ''
    const orderItems = Array.isArray(order.items) ? order.items : []
    const orderTotal = order.total || 0
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${orderId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .invoice { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; }
          .invoice-title { font-size: 20px; margin: 10px 0; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .section { flex: 1; }
          .section-title { font-weight: bold; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
          .total { text-align: left; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="company-name">نظام ERP المتكامل</div>
            <div class="invoice-title">أمر شراء</div>
            <div>رقم أمر الشراء: PO-${orderId}</div>
            <div>التاريخ: ${orderDate}</div>
          </div>
          
          <div class="details">
            <div class="section">
              <div class="section-title">معلومات المورد/العميل:</div>
              <div>الاسم: ${customerName}</div>
              <div>الهاتف: ${customerPhone}</div>
              ${customerEmail ? `<div>البريد: ${customerEmail}</div>` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>وصف البند/المادة</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems.map(item => {
                const productName = item.product || item.productName || 'بند غير معروف'
                const quantity = item.quantity || 0
                const price = item.price || item.unitPrice || 0
                const total = price * quantity
                return `
                  <tr>
                    <td>${productName}</td>
                    <td>${quantity}</td>
                    <td>${price.toLocaleString()} ريال</td>
                    <td>${total.toLocaleString()} ريال</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          
          <div class="total">
            المبلغ الإجمالي: ${orderTotal.toLocaleString()} ريال
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  // أعمدة الجدول
  const columns = [
    {
      title: 'رقم أمر الشراء',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span style={{ fontWeight: 500 }}>PO-{id || 'غير معروف'}</span>,
    },
    ...(isEngineering ? [{
      title: 'اسم المشروع',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (projectName) => (
        <span style={{ fontWeight: 500 }}>{projectName || 'غير محدد'}</span>
      ),
    },
    {
      title: 'نطاق العمل',
      dataIndex: 'workScope',
      key: 'workScope',
      render: (workScope) => (
        <Tag color="blue">{workScope || 'غير محدد'}</Tag>
      ),
    }] : []),
    {
      title: 'نوع البند',
      dataIndex: 'items',
      key: 'itemType',
      width: 120,
      render: (items) => {
        if (!items || !Array.isArray(items) || items.length === 0) return '-'
        // Check if all items are manual entries (purchase orders) or have product IDs (inventory items)
        const hasInventoryItems = items.some(item => item.productId && !item.isManualEntry)
        const hasManualItems = items.some(item => !item.productId || item.isManualEntry)
        if (hasInventoryItems && hasManualItems) {
          return <Tag color="purple">مختلط</Tag>
        } else if (hasInventoryItems) {
          return <Tag color="blue">مخزون</Tag>
        } else {
          return <Tag color="orange">يدوي</Tag>
        }
      },
    },
    {
      title: 'الكمية الإجمالية',
      dataIndex: 'items',
      key: 'totalQuantity',
      width: 120,
      render: (items) => {
        if (!items || !Array.isArray(items)) return '-'
        const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
        return <span style={{ fontWeight: 500 }}>{totalQty.toLocaleString()}</span>
      },
      sorter: (a, b) => {
        const aQty = (a.items || []).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
        const bQty = (b.items || []).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
        return aQty - bQty
      },
    },
    {
      title: 'نوع أمر الشراء',
      dataIndex: 'notes',
      key: 'poType',
      width: 150,
      render: (notes, record) => {
        // Check if this is a settlement order by looking at notes
        const isSettlement = notes && typeof notes === 'string' && notes.includes('تسوية عهدة')
        if (isSettlement) {
          return <Tag color="cyan">تسوية عهدة</Tag>
        }
        return <Tag color="green">شراء</Tag>
      },
    },
    {
      title: 'اسم المهندس',
      dataIndex: 'engineerName',
      key: 'engineerName',
      width: 150,
      render: (engineerName, record) => {
        // Only show for settlement orders
        const isSettlement = record.notes && typeof record.notes === 'string' && record.notes.includes('تسوية عهدة')
        if (isSettlement && engineerName) {
          return <Tag color="purple">{engineerName}</Tag>
        }
        return '-'
      },
    },
    {
      title: 'المبلغ الإجمالي',
      dataIndex: 'total',
      key: 'total',
      render: (total) => {
        const totalValue = total || 0
        return (
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {totalValue.toLocaleString()} ريال
          </span>
        )
      },
      sorter: (a, b) => (a?.total || 0) - (b?.total || 0),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'قيد الانتظار', icon: <ClockCircleOutlined /> },
          processing: { color: 'blue', text: 'قيد المعالجة', icon: <ClockCircleOutlined /> },
          shipped: { color: 'purple', text: 'تم الشحن', icon: <TruckOutlined /> },
          completed: { color: 'green', text: 'مكتمل', icon: <CheckCircleOutlined /> },
          cancelled: { color: 'red', text: 'ملغي', icon: <CloseCircleOutlined /> },
        }
        const config = statusConfig[status] || { color: 'default', text: 'غير محدد', icon: null }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: 'التاريخ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => {
        if (!date) return 'غير محدد'
        const parsed = moment(date, 'YYYY-MM-DD', true)
        return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
      },
      sorter: (a, b) => {
        const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateA - dateB
      },
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={async () => {
              setSelectedOrder(record)
              setViewModalVisible(true)
              // Fetch treasury account for this order
              try {
                const allTransactions = await treasuryService.getTransactions()
                const orderTransaction = allTransactions.find(txn => 
                  txn.referenceType === 'order' && txn.referenceId === record.id
                )
                if (orderTransaction) {
                  const account = treasuryAccounts.find(acc => acc.id === orderTransaction.accountId)
                  setSelectedOrderTreasuryAccount(account || null)
                } else {
                  setSelectedOrderTreasuryAccount(null)
                }
              } catch (error) {
                console.error('Error fetching treasury transaction for order:', error)
                setSelectedOrderTreasuryAccount(null)
              }
            }}
            title="عرض التفاصيل"
          />
          <Button 
            type="link" 
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(record)}
            title="طباعة الفاتورة"
          />
          <Popconfirm
            title="حذف أمر الشراء"
            description="هل أنت متأكد من حذف أمر الشراء هذا؟"
            onConfirm={async () => {
              try {
                const result = await ordersService.deleteOrder(record.id)
                if (result.success) {
                  message.success('تم حذف أمر الشراء بنجاح')
                  loadOrders() // Refresh the list
                } else {
                  message.error(result.error || 'فشل في حذف أمر الشراء')
                }
              } catch (error) {
                console.error('Error deleting order:', error)
                message.error('حدث خطأ أثناء حذف أمر الشراء')
              }
            }}
            okText="نعم"
            cancelText="لا"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              title="حذف"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // فلترة الطلبات
  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order => {
    if (!order) return false
    
    const matchesSearch = 
      order.id?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.projectName?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.workScope?.toLowerCase().includes(searchText.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesTab = activeTab === 'all' || order.status === activeTab
    
    return matchesSearch && matchesStatus && matchesTab
  })

  // مكون إضافة البنود (Manual Entry)
  const ItemSelector = () => {
    const [itemDescription, setItemDescription] = useState('')
    const [quantity, setQuantity] = useState(undefined)
    const [unitPrice, setUnitPrice] = useState(undefined)
    
    const handleAddItem = () => {
      if (!itemDescription || itemDescription.trim() === '') {
        message.error('يرجى إدخال وصف البند')
        return
      }

      if (quantity === undefined || quantity === null || quantity <= 0) {
        message.error('يرجى إدخال كمية صحيحة أكبر من صفر')
        return
      }

      if (unitPrice === undefined || unitPrice === null || unitPrice < 0) {
        message.error('يرجى إدخال سعر الوحدة بشكل صحيح')
        return
      }
      
      const newItem = {
        id: Date.now(),
        productId: null, // Manual entry, no product ID
        product: itemDescription.trim(),
        price: unitPrice,
        quantity: quantity,
        total: unitPrice * quantity,
        isManualEntry: true // Flag to indicate manual entry
      }
      
      setSelectedProducts([...selectedProducts, newItem])
      setItemDescription('')
      setQuantity(undefined)
      setUnitPrice(undefined)
      message.success('تم إضافة البند')
    }
    
    const handleRemoveProduct = (index) => {
      const updatedProducts = [...selectedProducts]
      updatedProducts.splice(index, 1)
      setSelectedProducts(updatedProducts)
    }
    
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>إضافة بنود الشراء</h4>
          
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Input
                placeholder="وصف البند/المادة (مثال: 100 كيس أسمنت)"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                onPressEnter={handleAddItem}
              />
            </Col>
            <Col span={6}>
              <InputNumber
                placeholder="الكمية"
                min={0.01}
                step={1}
                value={quantity}
                onChange={setQuantity}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={6}>
              <InputNumber
                placeholder="سعر الوحدة"
                min={0}
                step={0.01}
                value={unitPrice}
                onChange={setUnitPrice}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Col>
          </Row>
          
          <Button 
            type="primary" 
            onClick={handleAddItem}
            disabled={!itemDescription || !quantity || quantity <= 0 || unitPrice === undefined || unitPrice === null || unitPrice < 0}
            icon={<PlusOutlined />}
          >
            إضافة بند
          </Button>
        </div>
        
        {/* قائمة البنود المضافة */}
        {selectedProducts.length > 0 && (
          <Card title="البنود المضافة" size="small">
            <Table
              dataSource={selectedProducts.map((item, index) => ({ ...item, key: index }))}
              columns={[
                { 
                  title: 'المادة/الوصف', 
                  dataIndex: 'product',
                  render: (product) => <span style={{ fontWeight: 500 }}>{product}</span>
                },
                { 
                  title: 'الكمية', 
                  dataIndex: 'quantity',
                  render: (quantity, record) => (
                    <InputNumber
                      placeholder="الكمية"
                      min={1}
                      value={quantity}
                      onChange={(value) => {
                        const updated = [...selectedProducts]
                        updated[record.key] = {
                          ...updated[record.key],
                          quantity: value,
                          total: updated[record.key].price * value
                        }
                        setSelectedProducts(updated)
                      }}
                      style={{ width: '100%' }}
                    />
                  )
                },
                { 
                  title: 'سعر الوحدة', 
                  dataIndex: 'price', 
                  render: (p, record) => (
                    <InputNumber
                      placeholder="سعر الوحدة"
                      min={0}
                      precision={2}
                      value={p}
                      onChange={(value) => {
                        const updated = [...selectedProducts]
                        updated[record.key] = {
                          ...updated[record.key],
                          price: value,
                          total: value * updated[record.key].quantity
                        }
                        setSelectedProducts(updated)
                      }}
                      style={{ width: '100%' }}
                    />
                  )
                },
                { 
                  title: 'الإجمالي', 
                  dataIndex: 'total', 
                  render: t => (
                    <span style={{ fontWeight: 500, color: '#1890ff' }}>
                      {t.toLocaleString()} ريال
                    </span>
                  )
                },
                {
                  title: 'حذف',
                  render: (_, record) => (
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveProduct(record.key)}
                    >
                      حذف
                    </Button>
                  ),
                },
              ]}
              pagination={false}
              size="small"
              summary={() => {
                const total = selectedProducts.reduce((sum, item) => sum + (item.total || 0), 0)
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={3} align="right">
                      <strong>المبلغ الإجمالي:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      <strong style={{ color: '#1890ff', fontSize: 16, fontWeight: 'bold' }}>
                        {total.toLocaleString()} ريال
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell />
                  </Table.Summary.Row>
                )
              }}
            />
          </Card>
        )}
      </div>
    )
  }

  // Handle project selection change
  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId)
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project && project.workScopes && Array.isArray(project.workScopes) && project.workScopes.length > 0) {
        setAvailableWorkScopes(project.workScopes)
      } else {
        setAvailableWorkScopes([])
      }
    } else {
      setAvailableWorkScopes([])
    }
    
    // Reset work scope when project changes
    form.setFieldsValue({ workScope: undefined })
  }

  // إنشاء طلب جديد
  const createOrder = () => {
    setSelectedOrder(null)
    setSelectedProducts([])
    setSelectedCustomer(null)
    setCustomerSearchValue('')
    setIsNewSupplier(false)
    setNewSupplierName('')
    setNewSupplierPhone('')
    setNewSupplierEmail('')
    setCustomerSearchOptions([])
    setSelectedProject(null)
    setAvailableWorkScopes([])
    form.resetFields()
    setIsModalVisible(true)
  }

  // البحث عن العملاء
  // STRICT VENDOR FILTERING: Only fetch type = 'vendor' or 'supplier', exclude 'client'
  const handleCustomerSearch = async (searchText) => {
    setCustomerSearchValue(searchText)
    
    if (!searchText || searchText.trim() === '') {
      setCustomerSearchOptions([])
      setIsNewSupplier(false)
      setSelectedCustomer(null)
      return
    }

    try {
      // STRICT VENDOR FILTERING: Only fetch type = 'vendor' or 'supplier', exclude 'client'
      const searchResults = await customersService.searchCustomers(searchText, 'vendor')
      const options = searchResults.map(customer => ({
        value: customer.name, // Use name as value to display name instead of UUID
        label: `${customer.name} - ${customer.phone}${customer.email ? ` (${customer.email})` : ''}`,
        customer: customer
      }))
      
      // Add "Add New Supplier" option if no exact match
      const exactMatch = searchResults.find(c => 
        c.name.toLowerCase() === searchText.toLowerCase().trim() ||
        c.phone === searchText.trim()
      )
      
      if (!exactMatch && searchText.trim().length > 0) {
        options.push({
          value: '__NEW__',
          label: `إضافة مورد جديد: "${searchText.trim()}"`,
          isNew: true
        })
      }
      
      setCustomerSearchOptions(options)
    } catch (error) {
      console.error('Error searching customers:', error)
      setCustomerSearchOptions([])
    }
  }

  // اختيار عميل
  const handleCustomerSelect = (value, option) => {
    if (value === '__NEW__' || option?.isNew) {
      // New supplier mode
      setIsNewSupplier(true)
      setSelectedCustomer(null)
      const nameFromSearch = customerSearchValue.trim()
      setNewSupplierName(nameFromSearch)
      setNewSupplierPhone('')
      setNewSupplierEmail('')
    } else {
      // Existing customer selected
      // Find customer by name (value is now the name) or from option
      const customer = option?.customer || customerSearchOptions.find(opt => opt.value === value || opt.customer?.name === value)?.customer || customers.find(c => c.name === value)
      if (customer) {
        setSelectedCustomer(customer)
        setCustomerSearchValue(customer.name) // Show vendor NAME instead of ID
        form.setFieldsValue({ customerSearch: customer.name }) // Update form field to display name
        setIsNewSupplier(false)
        setNewSupplierName('')
        setNewSupplierPhone('')
        setNewSupplierEmail('')
      }
    }
  }

  // عند تغيير نص البحث يدوياً
  const handleCustomerChange = (value) => {
    setCustomerSearchValue(value)
    if (!value) {
      setSelectedCustomer(null)
      setIsNewSupplier(false)
      setNewSupplierName('')
      setNewSupplierPhone('')
      setNewSupplierEmail('')
    }
  }

  // حفظ الطلب
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      if (selectedProducts.length === 0) {
        message.error('يرجى إضافة بنود على الأقل')
        return
      }

      // Handle supplier/customer - create new if needed
      let finalCustomerId = null
      let finalCustomerName = ''
      let finalCustomerPhone = ''
      let finalCustomerEmail = ''

      if (isNewSupplier) {
        // Validate new supplier name is required
        const supplierName = newSupplierName.trim() || customerSearchValue.trim()
        if (!supplierName) {
          message.error('يرجى إدخال اسم المورد')
          return
        }

        // Create new supplier
        const newSupplierData = {
          name: supplierName,
          phone: newSupplierPhone.trim() || null,
          email: newSupplierEmail.trim() || null,
          type: 'supplier',
          status: 'active'
        }

        const createResult = await customersService.addCustomer(newSupplierData)
        if (createResult.success) {
          finalCustomerId = createResult.customer.id
          finalCustomerName = createResult.customer.name
          finalCustomerPhone = createResult.customer.phone || ''
          finalCustomerEmail = createResult.customer.email || ''
          message.success('تم إضافة المورد الجديد بنجاح')
          // Refresh customers list
          await loadCustomers()
        } else {
          message.error(createResult.error || 'فشل في إضافة المورد الجديد')
          return
        }
      } else if (selectedCustomer) {
        // Use existing customer
        finalCustomerId = selectedCustomer.id
        finalCustomerName = selectedCustomer.name
        finalCustomerPhone = selectedCustomer.phone || ''
        finalCustomerEmail = selectedCustomer.email || ''
      } else {
        message.error('يرجى اختيار أو إضافة مورد')
        return
      }

      // تحويل البنود المختارة إلى تنسيق أمر الشراء
      const orderItems = selectedProducts.map(p => {
        return {
          productId: p.productId || null, // null for manual entries
          productName: p.product,
          quantity: p.quantity,
          unitPrice: p.price,
          total: p.total,
          isManualEntry: p.isManualEntry || false
        }
      })

      // Validate treasury account selection
      if (!values.treasuryAccountId) {
        message.error('يرجى اختيار حساب الخزينة/البنك للصرف')
        return
      }

      // Derive payment method from treasury account type
      const selectedAccount = treasuryAccounts.find(acc => acc.id === values.treasuryAccountId)
      if (!selectedAccount) {
        message.error('حساب الخزينة المحدد غير موجود')
        return
      }
      // Map account type to payment method: 'bank' -> 'bank_transfer', 'cash_box' -> 'cash'
      const derivedPaymentMethod = selectedAccount.type === 'bank' ? 'bank_transfer' : 'cash'

      // إنشاء بيانات الطلب
      const orderData = {
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerEmail: finalCustomerEmail,
        projectId: isEngineering ? (values.projectId || null) : null,
        workScope: isEngineering ? (values.workScope || null) : null,
        items: orderItems,
        status: values.status || 'pending',
        paymentMethod: derivedPaymentMethod,
        shippingAddress: values.shippingAddress || '',
        shippingMethod: 'standard',
        notes: values.notes || '',
        createdBy: 'user' // TODO: Get from auth context
      }

      const result = await ordersService.createOrder(orderData)
      
      if (result.success) {
        message.success('تم إضافة أمر الشراء بنجاح!')
        
        // CRITICAL: Update treasury if account selected - must succeed
        if (values.treasuryAccountId && result.order?.id) {
          try {
            // Console log to trace account_id value
            console.log('OrdersPage: Creating treasury transaction for order', {
              orderId: result.order.id,
              accountId: values.treasuryAccountId,
              accountIdType: typeof values.treasuryAccountId,
              accountIdLength: values.treasuryAccountId?.length
            })
            
            // Use order total (includes tax and discount) instead of items total
            const totalAmount = parseFloat(result.order.total) || 0
            
            if (totalAmount <= 0) {
              message.warning('⚠️ تحذير: المبلغ الإجمالي صفر أو سالب، لن يتم خصم من الخزينة')
            } else {
              const treasuryResult = await treasuryService.createTransaction({
                accountId: values.treasuryAccountId,
                transactionType: 'outflow',
                amount: totalAmount,
                referenceType: 'order',
                referenceId: result.order.id,
                description: `أمر شراء: ${finalCustomerName} - ${values.notes || ''}`
              })
              
              if (treasuryResult.success) {
                console.log('✅ OrdersPage: Treasury transaction created successfully', {
                  transactionId: treasuryResult.transaction?.id,
                  accountId: values.treasuryAccountId,
                  accountName: treasuryResult.accountName,
                  newBalance: treasuryResult.newBalance
                })
                message.success(`✅ تم خصم ${totalAmount.toLocaleString()} ريال من حساب الخزينة (${treasuryResult.accountName || 'غير محدد'})`)
              } else {
                // VISIBLE UI ERROR: Show detailed error to user
                console.error('❌ OrdersPage: Failed to update treasury:', treasuryResult.error)
                const errorMessage = treasuryResult.error || 'خطأ غير معروف'
                const errorCode = treasuryResult.errorCode || 'UNKNOWN_ERROR'
                
                message.error({
                  content: `❌ فشل خصم المبلغ من الخزينة: ${errorMessage}`,
                  duration: 10, // Show for 10 seconds
                  style: { marginTop: '10vh' }
                })
                
                // Also show a more detailed error in console for debugging
                console.error('Treasury deduction failed details:', {
                  errorCode,
                  errorMessage,
                  accountId: values.treasuryAccountId,
                  amount: totalAmount,
                  orderId: result.order.id
                })
              }
            }
          } catch (error) {
            // VISIBLE UI ERROR: Show exception error to user
            console.error('❌ OrdersPage: Exception during treasury update:', error)
            message.error({
              content: `❌ خطأ أثناء خصم المبلغ من الخزينة: ${error.message || 'خطأ غير معروف'}`,
              duration: 10, // Show for 10 seconds
              style: { marginTop: '10vh' }
            })
          }
        } else if (!values.treasuryAccountId) {
          // Warning if no account was selected
          message.warning('⚠️ لم يتم اختيار حساب خزينة، لن يتم خصم المبلغ')
        }
        
        setIsModalVisible(false)
        setSelectedProducts([])
        setSelectedCustomer(null)
        setCustomerSearchValue('')
        setIsNewSupplier(false)
        setNewSupplierName('')
        setNewSupplierPhone('')
        setNewSupplierEmail('')
        setCustomerSearchOptions([])
        form.resetFields()
        loadOrders() // Refresh the list
        loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
      } else {
        message.error(result.error || 'فشل في إضافة أمر الشراء')
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح')
      } else {
        message.error('حدث خطأ أثناء حفظ أمر الشراء')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>إدارة أوامر الشراء</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>عرض وإدارة جميع أوامر الشراء للمشاريع</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={createOrder}>
          أمر شراء جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي أوامر الشراء"
              value={stats.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي القيمة"
              value={stats.totalRevenue}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="ريال"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="قيد الانتظار"
              value={stats.pendingOrders}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="مكتملة"
              value={stats.completedOrders}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* أدوات البحث */}
      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="ابحث برقم أمر الشراء أو اسم المشروع..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="حالة أمر الشراء"
          >
            <Option value="all">الكل</Option>
            <Option value="pending">قيد الانتظار</Option>
            <Option value="processing">قيد المعالجة</Option>
            <Option value="completed">مكتمل</Option>
          </Select>
          <Button 
            icon={<PrinterOutlined />}
            onClick={() => {
              if (filteredOrders.length > 0) {
                handlePrint(filteredOrders[0])
              } else {
                message.warning('لا توجد أوامر شراء للطباعة')
              }
            }}
          >
            طباعة
          </Button>
        </div>
      </Card>

      {/* جدول أوامر الشراء */}
      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredOrders}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey="key"
        />
      </Card>

      {/* Modal إنشاء أمر شراء جديد */}
      <Modal
        title="إنشاء أمر شراء جديد"
        open={isModalVisible}
        onOk={handleSave}
        okButtonProps={{ disabled: treasuryAccounts.length === 0 }}
        okText="إنشاء"
        cancelText="إلغاء"
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedProducts([])
          setSelectedCustomer(null)
          setCustomerSearchValue('')
          setIsNewSupplier(false)
          setNewSupplierName('')
          setNewSupplierPhone('')
          setNewSupplierEmail('')
          setCustomerSearchOptions([])
          setSelectedProject(null)
          setAvailableWorkScopes([])
          form.resetFields()
        }}
        width={800}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          {/* Alert if no treasury accounts */}
          {treasuryAccounts.length === 0 && (
            <Alert
              type="error"
              message="تنبيه: لا يوجد حسابات خزينة معرفة. يرجى إنشاء حساب في صفحة الخزينة أولاً"
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          {/* Project and Work Scope - Prominent at top for engineering mode */}
          {isEngineering && (
            <>
              <Card size="small" style={{ marginBottom: 24, backgroundColor: '#f0f9ff', border: '1px solid #91d5ff' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="projectId"
                      label={<span style={{ fontWeight: 'bold' }}>المشروع <span style={{ color: 'red' }}>*</span></span>}
                      rules={[{ required: true, message: 'يرجى اختيار المشروع (مطلوب)' }]}
                    >
                      <Select
                        placeholder="اختر المشروع"
                        showSearch
                        onChange={handleProjectChange}
                        filterOption={(input, option) =>
                          (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        size="large"
                      >
                        {projects.map(project => (
                          <Option key={project.id} value={project.id}>
                            {project.name} {project.client?.name ? `- ${project.client.name}` : ''}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    {selectedProject && availableWorkScopes.length > 0 && (
                      <Form.Item
                        name="workScope"
                        label={<span style={{ fontWeight: 'bold' }}>نطاق العمل (اختياري)</span>}
                      >
                        <Select
                          placeholder="اختر نطاق العمل"
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          size="large"
                        >
                          {availableWorkScopes.map(scope => (
                            <Option key={scope} value={scope}>
                              {scope}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}
                  </Col>
                </Row>
              </Card>
            </>
          )}

          <Form.Item
            name="customerSearch"
            label="المورد/العميل"
            rules={[
              {
                validator: (_, value) => {
                  if (!selectedCustomer && !isNewSupplier) {
                    return Promise.reject(new Error('يرجى البحث واختيار مورد أو عميل'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <AutoComplete
              options={customerSearchOptions}
              onSearch={handleCustomerSearch}
              onSelect={handleCustomerSelect}
              onChange={handleCustomerChange}
              value={customerSearchValue}
              placeholder="ابحث عن مورد أو عميل بالاسم أو الهاتف..."
              style={{ width: '100%' }}
              filterOption={false}
              notFoundContent={customerSearchOptions.length === 0 && customerSearchValue ? 'لا توجد نتائج - يمكنك إضافة مورد جديد' : null}
              size="large"
            />
          </Form.Item>

          {/* Show new supplier fields when adding new supplier */}
          {isNewSupplier && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
              <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#d46b08' }}>
                إضافة مورد جديد
              </div>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="اسم المورد"
                    required
                    tooltip="اسم المورد مطلوب"
                  >
                    <Input
                      placeholder="اسم المورد"
                      value={newSupplierName}
                      onChange={(e) => {
                        const value = e.target.value
                        setNewSupplierName(value)
                        setCustomerSearchValue(value)
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="رقم الهاتف (اختياري)">
                    <Input
                      placeholder="رقم الهاتف"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="البريد الإلكتروني (اختياري)">
                    <Input
                      placeholder="البريد الإلكتروني"
                      value={newSupplierEmail}
                      onChange={(e) => setNewSupplierEmail(e.target.value)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

          {/* Show selected customer info */}
          {selectedCustomer && !isNewSupplier && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#389e0d' }}>
                المورد المحدد:
              </div>
              <div>الاسم: {selectedCustomer.name}</div>
              {selectedCustomer.phone && <div>الهاتف: {selectedCustomer.phone}</div>}
              {selectedCustomer.email && <div>البريد: {selectedCustomer.email}</div>}
            </Card>
          )}

          <Divider>بنود الشراء</Divider>
          
          {/* إضافة البنود */}
          <Form.Item label="البنود" required>
            <ItemSelector />
            {selectedProducts.length === 0 && (
              <div style={{ color: '#ff4d4f', fontSize: 12 }}>
                * يجب إضافة بند واحد على الأقل
              </div>
            )}
          </Form.Item>
          
          <Divider />
          
          <Form.Item
            name="status"
            label="حالة أمر الشراء"
            initialValue="pending"
          >
            <Select>
              <Option value="pending">قيد الانتظار</Option>
              <Option value="processing">قيد المعالجة</Option>
              <Option value="completed">مكتمل</Option>
            </Select>
          </Form.Item>

          {/* Treasury Account Selection */}
          <Form.Item
            name="treasuryAccountId"
            label="حساب الخزينة"
            rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة/البنك للصرف' }]}
            tooltip="اختر الحساب الذي سيتم خصم قيمة أمر الشراء منه"
          >
            <Select 
              placeholder="اختر حساب الخزينة" 
              disabled={treasuryAccounts.length === 0}
              notFoundContent={treasuryAccounts.length === 0 ? "لا توجد حسابات خزينة" : null}
            >
              {treasuryAccounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="shippingAddress"
            label="عنوان التسليم (اختياري)"
          >
            <Input.TextArea rows={2} placeholder="أدخل عنوان التسليم" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="ملاحظات (اختياري)"
          >
            <Input.TextArea rows={2} placeholder="ملاحظات إضافية..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal عرض التفاصيل */}
      <Modal
        title={`تفاصيل أمر الشراء PO-${selectedOrder?.id}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setSelectedOrderTreasuryAccount(null)
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            إغلاق
          </Button>,
          <Button 
            key="print" 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(selectedOrder)}
          >
            طباعة أمر الشراء
          </Button>,
        ]}
        width={700}
      >
        {selectedOrder && (
          <div style={{ marginTop: 24 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="رقم أمر الشراء">PO-{selectedOrder.id || 'غير معروف'}</Descriptions.Item>
              <Descriptions.Item label="التاريخ">{selectedOrder.dates?.created || selectedOrder.createdAt || 'غير محدد'}</Descriptions.Item>
              {isEngineering && selectedOrder.projectName && (
                <Descriptions.Item label="المشروع">{selectedOrder.projectName}</Descriptions.Item>
              )}
              {isEngineering && selectedOrder.workScope && (
                <Descriptions.Item label="نطاق العمل">
                  <Tag color="blue">{selectedOrder.workScope}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="المورد/العميل">{selectedOrder.customer?.name || selectedOrder.customerName || 'غير معروف'}</Descriptions.Item>
              <Descriptions.Item label="الهاتف">{selectedOrder.customer?.phone || selectedOrder.customerPhone || 'لا يوجد'}</Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={selectedOrder.status === 'completed' ? 'green' : 'orange'}>
                  {selectedOrder.status === 'completed' ? 'مكتمل' : selectedOrder.status || 'قيد الانتظار'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="طريقة الدفع">
                {selectedOrder.payment?.method === 'credit_card' ? 'بطاقة ائتمان' : selectedOrder.paymentMethod === 'credit_card' ? 'بطاقة ائتمان' : selectedOrder.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : selectedOrder.paymentMethod === 'check' ? 'شيك' : 'نقداً'}
              </Descriptions.Item>
              {selectedOrderTreasuryAccount && (
                <Descriptions.Item label="حساب الخزينة">
                  {selectedOrderTreasuryAccount.name} ({selectedOrderTreasuryAccount.type === 'bank' ? 'Bank' : selectedOrderTreasuryAccount.type === 'cash_box' ? 'Cash' : selectedOrderTreasuryAccount.type})
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Table 
              dataSource={Array.isArray(selectedOrder.items) ? selectedOrder.items : []}
              columns={[
                { 
                  title: 'المادة/الوصف', 
                  dataIndex: 'product',
                  render: (product, record) => product || record?.productName || 'بند غير معروف'
                },
                { 
                  title: 'الكمية', 
                  dataIndex: 'quantity',
                  render: (quantity) => quantity || 0
                },
                { 
                  title: 'سعر الوحدة', 
                  dataIndex: 'price',
                  render: (p, record) => {
                    const price = p || record?.unitPrice || 0
                    return `${price.toLocaleString()} ريال`
                  }
                },
                { 
                  title: 'الإجمالي', 
                  render: (_, item) => {
                    const price = item?.price || item?.unitPrice || 0
                    const quantity = item?.quantity || 0
                    return `${(price * quantity).toLocaleString()} ريال`
                  }
                },
              ]}
              pagination={false}
              size="small"
              summary={() => {
                const total = selectedOrder?.total || 0
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={3} align="right">
                      <strong>المبلغ الإجمالي:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      <strong style={{ color: '#1890ff', fontSize: 16 }}>
                        {total.toLocaleString()} ريال
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              }}
            />

            {selectedOrder.notes && (
              <>
                <Divider />
                <p><strong>ملاحظات:</strong> {selectedOrder.notes}</p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OrdersPage