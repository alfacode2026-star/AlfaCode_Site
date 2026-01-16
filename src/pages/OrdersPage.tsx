'use client'

import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'
import ordersService from '../services/ordersService'
import customersService from '../services/customersService'
import projectsService from '../services/projectsService'
import treasuryService from '../services/treasuryService'
import paymentsService from '../services/paymentsService'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import { getTranslations } from '../utils/translations'
import { translateWorkType, translateWorkScopes } from '../utils/workTypesTranslation'
import { formatCurrencyWithSymbol, formatCurrencyLabel, getCurrencySymbol } from '../utils/currencyUtils'
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
const { Step } = Steps
// const { TabPane } = Tabs

const OrdersPage = () => {
  const { industryType } = useTenant()
  const { branchCurrency } = useBranch() // Get branch currency from context
  const { language } = useLanguage()
  const t = getTranslations(language)
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
  
  // Use branch currency as the single source of truth
  const displayCurrency = branchCurrency || 'SAR'

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
      message.error(t.orders.failedToLoadCustomers)
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
          const isSettlement = order.notes && typeof order.notes === 'string' && order.notes.includes(t.orders.settlementAdvance)
          if (isSettlement && order.projectId) {
            try {
              // Extract reference number from notes (format: "Settlement Advance Number XXX")
              const notesMatch = order.notes.match(new RegExp(`${t.orders.settlementAdvance}\\s+${t.orders.advanceNumber}\\s+([^\\s-]+)`))
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
              name: normalizedOrder.customerName || t.orders.unknownCustomer,
              phone: normalizedOrder.customerPhone || t.orders.noPhone,
              email: normalizedOrder.customerEmail || ''
            }
          } else if (!normalizedOrder.customer) {
            normalizedOrder.customer = {
              name: t.orders.unknownCustomer,
              phone: t.orders.noPhone,
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
      message.error(t.orders.failedToLoad)
      // Set empty array on error to prevent crashes
      setOrders([])
    } finally {
      setLoading(false)
    }
  }


  // Statistics
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    completedOrders: orders.filter(o => o.status === 'completed').length,
  }

  // Print function
  const handlePrint = (order) => {
    if (!order) return
    
    const orderId = order.id || t.orders.unknownOrder
    const orderDate = order.dates?.created || order.createdAt || moment().format('DD-MMM-YYYY')
    const customerName = order.customer?.name || order.customerName || t.orders.unknownCustomer
    const customerPhone = order.customer?.phone || order.customerPhone || t.orders.noPhone
    const customerEmail = order.customer?.email || order.customerEmail || ''
    const orderItems = Array.isArray(order.items) ? order.items : []
    const orderTotal = order.total || 0
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${t.orders.invoiceTitle} ${orderId}</title>
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
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="company-name">Integrated ERP System</div>
            <div class="invoice-title">${t.orders.invoiceTitle}</div>
            <div>${t.orders.purchaseOrderNumber}: PO-${orderId}</div>
            <div>${t.orders.date}: ${orderDate}</div>
          </div>
          
          <div class="details">
            <div class="section">
              <div class="section-title">${t.orders.supplierCustomerInfo}:</div>
              <div>${t.orders.name}: ${customerName}</div>
              <div>${t.orders.phone}: ${customerPhone}</div>
              ${customerEmail ? `<div>${t.orders.email}: ${customerEmail}</div>` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${t.orders.itemDescription}</th>
                <th>${t.orders.quantity}</th>
                <th>${t.orders.unitPrice}</th>
                <th>${t.orders.itemTotal}</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems.map(item => {
                const productName = item.product || item.productName || t.orders.unknownOrder
                const quantity = item.quantity || 0
                const price = item.price || item.unitPrice || 0
                const total = price * quantity
                return `
                  <tr>
                    <td>${productName}</td>
                    <td>${quantity}</td>
                    <td>${price.toLocaleString()} ${t.common.sar}</td>
                    <td>${total.toLocaleString()} ${t.common.sar}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          
          <div class="total">
            ${t.orders.totalAmount}: ${orderTotal.toLocaleString()} ${t.common.sar}
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

  // Table columns with useMemo for performance
  const columns = useMemo(() => [
    {
      title: t.orders.orderNumber,
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span style={{ fontWeight: 500 }}>PO-{id || t.orders.unknownOrder}</span>,
    },
    ...(isEngineering ? [{
      title: t.orders.projectName || 'Project Name',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (projectName) => (
        <span style={{ fontWeight: 500 }}>{projectName || t.common.notSpecified}</span>
      ),
    },
    {
      title: t.orders.workScope,
      dataIndex: 'workScope',
      key: 'workScope',
      render: (workScope) => (
        <Tag color="blue">{workScope ? translateWorkType(workScope, language) : t.common.notSpecified}</Tag>
      ),
    }] : []),
    {
      title: t.orders.itemType,
      dataIndex: 'items',
      key: 'itemType',
      width: 120,
      render: (items) => {
        if (!items || !Array.isArray(items) || items.length === 0) return '-'
        // Check if all items are manual entries (purchase orders) or have product IDs (inventory items)
        const hasInventoryItems = items.some(item => item.productId && !item.isManualEntry)
        const hasManualItems = items.some(item => !item.productId || item.isManualEntry)
        if (hasInventoryItems && hasManualItems) {
          return <Tag color="purple">{t.orders.mixed}</Tag>
        } else if (hasInventoryItems) {
          return <Tag color="blue">{t.orders.inventory}</Tag>
        } else {
          return <Tag color="orange">{t.orders.manual}</Tag>
        }
      },
    },
    {
      title: t.orders.totalQuantity,
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
      title: t.orders.orderType,
      dataIndex: 'notes',
      key: 'poType',
      width: 150,
      render: (notes, record) => {
        // Check if this is a settlement order by looking at notes
        const isSettlement = notes && typeof notes === 'string' && notes.includes(t.orders.settlementAdvance)
        if (isSettlement) {
          return <Tag color="cyan">{t.orders.settlementOrder}</Tag>
        }
        return <Tag color="green">{t.orders.purchase}</Tag>
      },
    },
    {
      title: t.orders.engineerName,
      dataIndex: 'engineerName',
      key: 'engineerName',
      width: 150,
      render: (engineerName, record) => {
        // Only show for settlement orders
        const isSettlement = record.notes && typeof record.notes === 'string' && record.notes.includes(t.orders.settlementAdvance)
        if (isSettlement && engineerName) {
          return <Tag color="purple">{engineerName}</Tag>
        }
        return '-'
      },
    },
    {
      title: t.orders.totalAmountLabel,
      dataIndex: 'total',
      key: 'total',
      render: (total) => {
        const totalValue = total || 0
        return (
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {totalValue.toLocaleString()} {t.common.sar}
          </span>
        )
      },
      sorter: (a, b) => (a?.total || 0) - (b?.total || 0),
    },
    {
      title: t.orders.status,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          pending: { color: 'orange', text: t.orders.pending, icon: <ClockCircleOutlined /> },
          processing: { color: 'blue', text: t.orders.processing, icon: <ClockCircleOutlined /> },
          shipped: { color: 'purple', text: t.orders.shipped || 'Shipped', icon: <TruckOutlined /> },
          completed: { color: 'green', text: t.orders.completed, icon: <CheckCircleOutlined /> },
          cancelled: { color: 'red', text: t.orders.cancelled, icon: <CloseCircleOutlined /> },
        }
        const config = statusConfig[status] || { color: 'default', text: t.common.notSpecified, icon: null }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: t.orders.dateLabel,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => {
        if (!date) return t.common.notSpecified
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
      title: t.common.actions,
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
            title={t.orders.viewDetails}
          />
          <Button 
            type="link" 
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(record)}
            title={t.orders.printInvoice}
          />
          <Popconfirm
            title={t.orders.deleteOrderConfirm}
            description={t.orders.deleteOrderDescription}
            onConfirm={async () => {
              try {
                const result = await ordersService.deleteOrder(record.id)
                if (result.success) {
                  message.success(t.orders.orderDeleted)
                  loadOrders() // Refresh the list
                } else {
                  message.error(result.error || t.orders.failedToDelete)
                }
              } catch (error) {
                console.error('Error deleting order:', error)
                message.error(t.orders.failedToDelete)
              }
            }}
            okText={t.orders.yes}
            cancelText={t.orders.no}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              title={t.orders.delete}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ], [t, language, treasuryAccounts])

  // Filter orders
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

  // Item selector component (Manual Entry)
  const ItemSelector = () => {
    const [itemDescription, setItemDescription] = useState('')
    const [quantity, setQuantity] = useState(undefined)
    const [unitPrice, setUnitPrice] = useState(undefined)
    
    const handleAddItem = () => {
      if (!itemDescription || itemDescription.trim() === '') {
        message.error(t.orders.itemDescriptionRequired || 'Please enter item description')
        return
      }

      if (quantity === undefined || quantity === null || quantity <= 0) {
        message.error(t.orders.quantityRequired || 'Please enter a valid quantity greater than zero')
        return
      }

      if (unitPrice === undefined || unitPrice === null || unitPrice < 0) {
        message.error(t.orders.unitPriceRequired || 'Please enter a valid unit price')
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
      message.success(t.orders.itemAdded || 'Item added successfully')
    }
    
    const handleRemoveProduct = (index) => {
      const updatedProducts = [...selectedProducts]
      updatedProducts.splice(index, 1)
      setSelectedProducts(updatedProducts)
    }
    
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>{t.orders.addPurchaseItems}</h4>
          
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Input
                placeholder={t.orders.itemDescriptionPlaceholder}
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                onPressEnter={handleAddItem}
              />
            </Col>
            <Col span={6}>
              <InputNumber
                placeholder={t.orders.quantityPlaceholder}
                min={0.01}
                step={1}
                value={quantity}
                onChange={setQuantity}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={6}>
              <InputNumber
                placeholder={t.orders.unitPricePlaceholder}
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
            {t.orders.addItem}
          </Button>
        </div>
        
        {/* Added Items List */}
        {selectedProducts.length > 0 && (
          <Card title={t.orders.addedItems} size="small">
            <Table
              dataSource={selectedProducts.map((item, index) => ({ ...item, key: index }))}
              columns={[
                { 
                  title: t.orders.materialDescription, 
                  dataIndex: 'product',
                  render: (product) => <span style={{ fontWeight: 500 }}>{product}</span>
                },
                { 
                  title: t.orders.quantity, 
                  dataIndex: 'quantity',
                  render: (quantity, record) => (
                    <InputNumber
                      placeholder={t.orders.quantityPlaceholder}
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
                  title: t.orders.unitPrice, 
                  dataIndex: 'price', 
                  render: (p, record) => (
                    <InputNumber
                      placeholder={t.orders.unitPricePlaceholder}
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
                  title: t.orders.itemTotal, 
                  dataIndex: 'total', 
                  render: (value) => (
                    <span style={{ fontWeight: 500, color: '#1890ff' }}>
                      {value.toLocaleString()} {t.common?.sar || 'ر.س'}
                    </span>
                  )
                },
                {
                  title: t.orders.deleteItem,
                  render: (_, record) => (
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveProduct(record.key)}
                    >
                      {t.orders.delete}
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
                      <strong>{t.orders.totalAmountValue}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      <strong style={{ color: '#1890ff', fontSize: 16, fontWeight: 'bold' }}>
                        {total.toLocaleString()} {t.common.sar}
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

  // Create new order
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

  // Search customers
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
          label: `${t.orders.addNewSupplier}: "${searchText.trim()}"`,
          isNew: true
        })
      }
      
      setCustomerSearchOptions(options)
    } catch (error) {
      console.error('Error searching customers:', error)
      setCustomerSearchOptions([])
    }
  }

  // Select customer
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

  // When search text changes manually
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

  // Save order
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      if (selectedProducts.length === 0) {
        message.error(t.orders.selectAtLeastOneItem)
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
          message.error(t.orders.supplierNameRequired)
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
          message.success(t.orders.supplierAddedSuccessfully)
          // Refresh customers list
          await loadCustomers()
        } else {
          message.error(createResult.error || t.orders.failedToAddSupplier)
          return
        }
      } else if (selectedCustomer) {
        // Use existing customer
        finalCustomerId = selectedCustomer.id
        finalCustomerName = selectedCustomer.name
        finalCustomerPhone = selectedCustomer.phone || ''
        finalCustomerEmail = selectedCustomer.email || ''
      } else {
        message.error(t.orders.selectOrAddSupplier)
        return
      }

      // Convert selected items to order format
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
        message.error(t.orders.selectTreasuryAccount)
        return
      }

      // Derive payment method from treasury account type
      const selectedAccount = treasuryAccounts.find(acc => acc.id === values.treasuryAccountId)
      if (!selectedAccount) {
        message.error(t.orders.treasuryAccountNotFound)
        return
      }
      // Map account type to payment method: 'bank' -> 'bank_transfer', 'cash_box' -> 'cash'
      const derivedPaymentMethod = selectedAccount.type === 'bank' ? 'bank_transfer' : 'cash'
      
      // Use branch currency directly (single source of truth)
      const currency = displayCurrency

      // Create order data
      const orderData = {
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerEmail: finalCustomerEmail,
        projectId: isEngineering ? (values.projectId || null) : null,
        currency: currency, // Include currency from treasury account
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
        message.success(t.orders.orderAddedSuccessfully)
        
        // CRITICAL: Update treasury if account selected - must succeed
        if (values.treasuryAccountId && result.order?.id) {
          try {
            // Use order total (includes tax and discount) instead of items total
            const totalAmount = parseFloat(result.order.total) || 0
            
            if (totalAmount <= 0) {
              message.warning(t.orders.warningZeroAmount)
            } else {
              const treasuryResult = await treasuryService.createTransaction({
                accountId: values.treasuryAccountId,
                transactionType: 'outflow',
                amount: totalAmount,
                referenceType: 'order',
                referenceId: result.order.id,
                description: `${t.orders.invoiceTitle}: ${finalCustomerName} - ${values.notes || ''}`
              })
              
              if (treasuryResult.success) {
                message.success(`${t.orders.amountDeductedFromTreasury} ${totalAmount.toLocaleString()} ${t.common.sar} (${treasuryResult.accountName || t.common.notSpecified})`)
              } else {
                // VISIBLE UI ERROR: Show detailed error to user
                console.error('❌ OrdersPage: Failed to update treasury:', treasuryResult.error)
                const errorMessage = treasuryResult.error || t.common.error
                const errorCode = treasuryResult.errorCode || 'UNKNOWN_ERROR'
                
                message.error({
                  content: `${t.orders.failedToDeductFromTreasury}: ${errorMessage}`,
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
              content: `${t.orders.failedToDeductFromTreasury}: ${error.message || t.common.error}`,
              duration: 10, // Show for 10 seconds
              style: { marginTop: '10vh' }
            })
          }
        } else if (!values.treasuryAccountId) {
          // Warning if no account was selected
          message.warning(t.orders.treasuryAccountNotSelected)
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
        message.error(result.error || t.orders.failedToAddOrder)
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error(t.orders.fillRequiredFieldsCorrectly)
      } else {
        message.error(t.orders.errorSavingOrder)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>{t.orders.title}</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>{t.orders.subtitle}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={createOrder}>
          {t.orders.newOrder}
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.orders.totalOrders}
              value={stats.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.orders.totalValue}
              value={stats.totalRevenue}
              precision={0}
              prefix={<DollarOutlined />}
              suffix={displayCurrency}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.orders.pending}
              value={stats.pendingOrders}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.orders.completed}
              value={stats.completedOrders}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Search Tools */}
      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder={t.orders.searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder={t.orders.filterByStatus}
          >
            <Option value="all">{t.orders.all}</Option>
            <Option value="pending">{t.orders.pending}</Option>
            <Option value="processing">{t.orders.processing}</Option>
            <Option value="completed">{t.orders.completed}</Option>
          </Select>
          <Button 
            icon={<PrinterOutlined />}
            onClick={() => {
              if (filteredOrders.length > 0) {
                handlePrint(filteredOrders[0])
              } else {
                message.warning(t.orders.noOrdersToPrint)
              }
            }}
          >
            {t.orders.print}
          </Button>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredOrders}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey={(record) => record.id || record.updatedAt || `order-${Date.now()}-${Math.random()}`}
          locale={{ emptyText: 'No orders found' }}
        />
      </Card>

      {/* Modal Create New Purchase Order */}
      <Modal
        title={t.orders.createNewOrder}
        open={isModalVisible}
        onOk={handleSave}
        okButtonProps={{ disabled: treasuryAccounts.length === 0 }}
        okText={t.orders.create}
        cancelText={t.orders.cancel}
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
              message={t.orders.treasuryAccountWarning}
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
                      label="المشروع"
                      rules={[{ required: true, message: t.orders.projectRequired }]}
                    >
                      <Select
                        placeholder={t.orders.selectProject}
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
                        label="نطاق العمل / الوصف"
                      >
                        <Select
                          placeholder={t.orders.selectWorkScope}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          size="large"
                        >
                          {availableWorkScopes.map(scope => (
                            <Option key={scope} value={scope}>
                              {translateWorkType(scope, language)}
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
            label="المورد / العميل"
            rules={[
              {
                validator: (_, value) => {
                  if (!selectedCustomer && !isNewSupplier) {
                    return Promise.reject(new Error(t.orders.selectOrAddSupplier))
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
              placeholder={t.orders.searchSupplierCustomer}
              style={{ width: '100%' }}
              filterOption={false}
              notFoundContent={customerSearchOptions.length === 0 && customerSearchValue ? t.orders.addNewSupplier : null}
              size="large"
            />
          </Form.Item>

          {/* Show new supplier fields when adding new supplier */}
          {isNewSupplier && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
              <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#d46b08' }}>
                {t.orders.addNewSupplier}
              </div>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label={t.orders.supplierNameRequired}
                    required
                    tooltip={t.orders.supplierNameRequired}
                  >
                    <Input
                      placeholder={t.orders.supplierNamePlaceholder}
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
                  <Form.Item label={t.orders.phoneOptional}>
                    <Input
                      placeholder={t.orders.phonePlaceholder}
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t.orders.emailOptional}>
                    <Input
                      placeholder={t.orders.emailPlaceholder}
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
                {t.orders.selectedSupplier}:
              </div>
              <div>{t.orders.name}: {selectedCustomer.name}</div>
              {selectedCustomer.phone && <div>{t.orders.phone}: {selectedCustomer.phone}</div>}
              {selectedCustomer.email && <div>{t.orders.email}: {selectedCustomer.email}</div>}
            </Card>
          )}

          <Divider>{t.orders.purchaseItems}</Divider>
          
          {/* Add Items */}
          <Form.Item label={t.orders.items} required>
            <ItemSelector />
            {selectedProducts.length === 0 && (
              <div style={{ color: '#ff4d4f', fontSize: 12 }}>
                {t.orders.addAtLeastOneItem}
              </div>
            )}
          </Form.Item>
          
          <Divider />
          
          <Form.Item
            name="status"
            label="حالة الطلب"
            initialValue="pending"
          >
            <Select>
              <Option value="pending">{t.orders.pending}</Option>
              <Option value="processing">{t.orders.processing}</Option>
              <Option value="completed">{t.orders.completed}</Option>
            </Select>
          </Form.Item>

          {/* Treasury Account Selection */}
          <Form.Item
            name="treasuryAccountId"
            label="حساب الخزينة / الدفع"
            rules={[{ required: true, message: t.orders.selectTreasuryAccount }]}
            tooltip={t.orders.selectTreasuryAccount}
          >
            <Select 
              placeholder={t.orders.selectTreasuryAccount} 
              disabled={treasuryAccounts.length === 0}
              notFoundContent={treasuryAccounts.length === 0 ? t.orders.treasuryAccountWarning : null}
              onChange={(accountId) => {
                // Note: Currency is now fixed to branch currency, no syncing needed
                console.log('✅ Treasury account selected:', { accountId, branchCurrency: displayCurrency });
              }}
            >
              {treasuryAccounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                  {acc.currency && acc.currency !== 'SAR' ? ` - ${acc.currency}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Currency Display - Static label showing branch currency */}
          <Form.Item
            label={`العملة / Currency (${displayCurrency})`}
            tooltip="العملة مضبوطة على مستوى الفرع ولا يمكن تغييرها لكل معاملة / Currency is set at the branch level and cannot be changed per transaction"
          >
            <Input
              readOnly
              value={displayCurrency}
              style={{
                backgroundColor: '#fafafa',
                cursor: 'default',
              }}
            />
          </Form.Item>

          <Form.Item
            name="shippingAddress"
            label="عنوان الشحن"
          >
            <Input.TextArea rows={2} placeholder={t.orders.shippingAddressPlaceholder || 'Enter shipping address'} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="ملاحظات إضافية"
          >
            <Input.TextArea rows={2} placeholder={t.orders.notesPlaceholder} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal View Details */}
      <Modal
        title={`${t.orders.viewOrder} PO-${selectedOrder?.id}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setSelectedOrderTreasuryAccount(null)
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            {t.common.close}
          </Button>,
          <Button 
            key="print" 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(selectedOrder)}
          >
            {t.orders.printInvoice}
          </Button>,
        ]}
        width={700}
      >
        {selectedOrder && (
          <div style={{ marginTop: 24 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t.orders.orderNumber}>PO-{selectedOrder.id || t.orders.unknownOrder}</Descriptions.Item>
              <Descriptions.Item label={t.orders.date}>{selectedOrder.dates?.created || selectedOrder.createdAt || t.common.notSpecified}</Descriptions.Item>
              {isEngineering && selectedOrder.projectName && (
                <Descriptions.Item label={t.orders.projectName || 'Project'}>{selectedOrder.projectName}</Descriptions.Item>
              )}
              {isEngineering && selectedOrder.workScope && (
                <Descriptions.Item label={t.orders.workScope}>
                  <Tag color="blue">{translateWorkType(selectedOrder.workScope, language)}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t.orders.supplierCustomer}>{selectedOrder.customer?.name || selectedOrder.customerName || t.orders.unknownCustomer}</Descriptions.Item>
              <Descriptions.Item label={t.orders.phone}>{selectedOrder.customer?.phone || selectedOrder.customerPhone || t.orders.noPhone}</Descriptions.Item>
              <Descriptions.Item label={t.orders.status}>
                <Tag color={selectedOrder.status === 'completed' ? 'green' : 'orange'}>
                  {selectedOrder.status === 'completed' ? t.orders.completed : selectedOrder.status || t.orders.pending}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t.orders.paymentMethod || 'Payment Method'}>
                {selectedOrder.payment?.method === 'credit_card' ? 'Credit Card' : selectedOrder.paymentMethod === 'credit_card' ? 'Credit Card' : selectedOrder.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : selectedOrder.paymentMethod === 'check' ? 'Check' : 'Cash'}
              </Descriptions.Item>
              {selectedOrderTreasuryAccount && (
                <Descriptions.Item label={t.orders.selectTreasuryAccount}>
                  {selectedOrderTreasuryAccount.name} ({selectedOrderTreasuryAccount.type === 'bank' ? 'Bank' : selectedOrderTreasuryAccount.type === 'cash_box' ? 'Cash' : selectedOrderTreasuryAccount.type})
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Table 
              dataSource={Array.isArray(selectedOrder.items) ? selectedOrder.items : []}
              columns={[
                { 
                  title: t.orders.materialDescription, 
                  dataIndex: 'product',
                  render: (product, record) => product || record?.productName || t.orders.unknownOrder
                },
                { 
                  title: t.orders.quantity, 
                  dataIndex: 'quantity',
                  render: (quantity) => quantity || 0
                },
                { 
                  title: t.orders.unitPrice, 
                  dataIndex: 'price',
                  render: (p, record) => {
                    const price = p || record?.unitPrice || 0
                    return `${price.toLocaleString()} ${t.common.sar}`
                  }
                },
                { 
                  title: t.orders.itemTotal, 
                  render: (_, item) => {
                    const price = item?.price || item?.unitPrice || 0
                    const quantity = item?.quantity || 0
                    return `${(price * quantity).toLocaleString()} ${t.common.sar}`
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
                      <strong>{t.orders.totalAmountValue}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell>
                      <strong style={{ color: '#1890ff', fontSize: 16 }}>
                        {total.toLocaleString()} {t.common.sar}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              }}
            />

            {selectedOrder.notes && (
              <>
                <Divider />
                <p><strong>{t.orders.notes}:</strong> {selectedOrder.notes}</p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OrdersPage