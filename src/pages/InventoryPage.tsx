'use client'

import { useState, useEffect } from 'react'
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
  InputNumber,
  Popconfirm,
  message,
  notification,
  Tabs,
  Progress,
  Tooltip,
  Spin,
  Empty,
  Alert
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  DollarOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import inventoryService from '../services/inventoryService'
import userManagementService from '../services/userManagementService'
import { useTenant } from '../contexts/TenantContext'
import { useBranch } from '../contexts/BranchContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useSyncStatus } from '../contexts/SyncStatusContext'

const { Option } = Select
// const { TabPane } = Tabs

const InventoryPage = () => {
  const { industryType } = useTenant()
  const { branchId, branchName } = useBranch()
  const { language } = useLanguage()
  const { updateStatus } = useSyncStatus()
  const isEngineering = industryType === 'engineering'
  const isRetail = industryType === 'retail'
  // State
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('products')

  // Load products on component mount and when branch changes
  useEffect(() => {
    loadProducts()
  }, [branchId])

  const loadProducts = async () => {
    setLoading(true)
    updateStatus('loading', language === 'ar' ? 'جاري تحميل المنتجات...' : 'Loading products...', branchName)
    try {
      const data = await inventoryService.getProducts();
      
      if (Array.isArray(data)) {
        setProducts(data)
        
        // محاولة جلب الإحصائيات مع تجاهل الأخطاء البسيطة
        try {
            const stats = await inventoryService.getInventoryStats()
            setInventoryStats(stats)
        } catch (e) { console.warn('Stats not ready') }
        
        try {
            const lowStock = await inventoryService.getLowStockProducts()
            setLowStockAlerts(Array.isArray(lowStock) ? lowStock : [])
        } catch (e) { console.warn('Low stock alerts not ready') }

        // Update sync status
        if (data.length === 0) {
          updateStatus('empty', language === 'ar' ? 'لا توجد منتجات' : 'No products found', branchName)
        } else {
          updateStatus('success', language === 'ar' ? `تم تحميل ${data.length} منتج` : `Loaded ${data.length} products`, branchName)
        }
      } else {
        setProducts([])
        updateStatus('empty', language === 'ar' ? 'لا توجد منتجات' : 'No products found', branchName)
      }
      
    } catch (error) {
      console.error('Error loading products:', error)
      const errorMsg = language === 'ar' ? 'تعذر المزامنة مع قاعدة البيانات' : 'Could not sync with the database'
      updateStatus('error', errorMsg, branchName)
      notification.error({
        message: language === 'ar' ? 'خطأ في الاتصال' : 'Connection error',
        description: errorMsg
      })
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // State for statistics
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalItems: 0
  })

  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [productToDelete, setProductToDelete] = useState<any>(null)
  const [deleteForm] = Form.useForm()

  // Filter products
  const filteredProducts = (Array.isArray(products) ? products : []).filter((product: any) => {
    if (!product) return false
    
    const matchesSearch =
      product.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchText.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchText.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // أعمدة الجدول
  const columns = [
    {
      title: 'المنتج',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <div style={{ 
            width: 40, 
            height: 40, 
            backgroundColor: '#f0f2f5', // لون ثابت آمن
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {record.category === 'إلكترونيات' ? '💻' : 
             record.category === 'هواتف' ? '📱' : '📦'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              SKU: {record.sku} | {record.supplier}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'التصنيف',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="blue">
          {category || 'غير مصنف'}
        </Tag>
      )
    },
    {
      title: 'الكمية',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => (
        <Space orientation="vertical" size={2} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>{quantity} {record.unit}</span>
            <span style={{ fontSize: 12, color: '#666' }}>
               {record.minQuantity} - {record.maxQuantity}
            </span>
          </div>
          <Progress
            percent={Math.min(100, (quantity / (record.maxQuantity || 100)) * 100)}
            size="small"
            status={record.status === 'low-stock' ? 'exception' : 'normal'}
            showInfo={false}
          />
        </Space>
      ),
      sorter: (a: any, b: any) => a.quantity - b.quantity
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        // 🔥 الحماية من الانهيار هنا
        const statusConfig: any = {
          'in-stock': { 
            color: 'green', 
            text: 'متوفر', 
            icon: <CheckCircleOutlined /> 
          },
          'low-stock': { 
            color: 'orange', 
            text: 'منخفض', 
            icon: <WarningOutlined /> 
          },
          'out-of-stock': { 
            color: 'red', 
            text: 'نفذ', 
            icon: <WarningOutlined /> 
          }
        }
        
        // استخدام قيمة افتراضية إذا كانت الحالة غير معروفة
        const config = statusConfig[status] || { color: 'default', text: status || 'غير محدد', icon: null };
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    },
    {
      title: isEngineering ? 'تكلفة الوحدة' : 'السعر',
      key: 'price',
      render: (_, record) => {
        if (isEngineering) {
          return (
            <span style={{ color: '#52c41a', fontWeight: 500 }}>
              {record.purchasePrice?.toLocaleString()} ريال
            </span>
          )
        }
        return (
          <Space orientation="vertical" size={2}>
            <span style={{ color: '#52c41a', fontWeight: 500 }}>
              {record.sellingPrice?.toLocaleString()} ريال
            </span>
            <span style={{ fontSize: 12, color: '#666' }}>
              شراء: {record.purchasePrice?.toLocaleString()}
            </span>
          </Space>
        )
      }
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="تعديل الكمية">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleAdjustQuantity(record)}
            />
          </Tooltip>
          <Tooltip title="تعديل المنتج">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditProduct(record)}
            />
          </Tooltip>
          <Tooltip title="حذف">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setProductToDelete(record)
                setDeleteModalVisible(true)
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  // Handlers
  const handleViewProduct = (product) => {
    setSelectedProduct(product)
    setIsModalVisible(true)
  }

  const handleAdjustQuantity = (product) => {
    let newQuantity = product.quantity
    
    Modal.confirm({
      title: `تعديل كمية ${product.name}`,
      content: (
        <div style={{ marginTop: 16 }}>
          <p>الكمية الحالية: <strong>{product.quantity} {product.unit}</strong></p>
          <InputNumber
            min={0}
            max={1000000}
            defaultValue={product.quantity}
            style={{ width: '100%', marginTop: 8 }}
            onChange={(value) => newQuantity = value}
          />
        </div>
      ),
      async onOk() {
        try {
          // استخدام updateProduct بدلاً من adjustQuantity
          const result = await inventoryService.updateProduct(product.id, { quantity: newQuantity })
          
          if (result.success) {
            loadProducts() 
            message.success('تم تعديل الكمية بنجاح')
          } else {
            message.error(result.error || 'فشل في تعديل الكمية')
          }
        } catch (error) {
          console.error('Error adjusting quantity:', error)
          message.error('حدث خطأ أثناء تعديل الكمية')
        }
      }
    })
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    const formValues: any = {
      name: product.name,
      category: product.category,
      purchasePrice: product.purchasePrice,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      maxQuantity: product.maxQuantity,
      supplier: product.supplier,
      location: product.location,
      unit: product.unit
    }
    
    // Only set SKU and sellingPrice for retail mode
    if (isRetail) {
      formValues.sku = product.sku
      formValues.sellingPrice = product.sellingPrice
    }
    
    form.setFieldsValue(formValues)
    setIsModalVisible(true)
  }

  // Pre-fill SKU when opening modal for new product
  const handleOpenAddModal = async () => {
    setSelectedProduct(null)
    form.resetFields()
    
    // Generate and pre-fill SKU only for retail mode
    if (isRetail) {
      try {
        const suggestedSKU = await inventoryService.generateUniqueSKU()
        form.setFieldsValue({ sku: suggestedSKU })
      } catch (error) {
        console.error('Error generating SKU:', error)
        // Continue without pre-filled SKU if generation fails
      }
    }
    
    setIsModalVisible(true)
  }

  const handleDeleteProduct = async (productId, password?: string, deletionReason?: string) => {
    try {
      const result = await inventoryService.deleteProduct(productId, password, deletionReason)
      if (result.success) {
        message.success('تم حذف المنتج بنجاح')
        loadProducts() 
      } else {
        message.error(result.error || 'فشل في حذف المنتج')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      message.error('حدث خطأ أثناء حذف المنتج')
    }
  }

  const handleSaveProduct = async () => {
    try {
      const values = await form.validateFields()
      
      // Auto-generate SKU if empty (only for retail mode)
      // Service will handle this, but we can also do it here for better UX
      if (isRetail && (!values.sku || !values.sku.trim())) {
        try {
          values.sku = await inventoryService.generateUniqueSKU()
          // Update form field to show generated SKU
          form.setFieldsValue({ sku: values.sku })
        } catch (error) {
          console.error('Error generating SKU:', error)
          // Service will handle generation if this fails
        }
      }
      
      // For engineering mode, ensure sellingPrice is not set (or set to 0/null)
      if (isEngineering && values.sellingPrice === undefined) {
        values.sellingPrice = 0 // Set default for engineering mode
      }
      
      // GLOBAL FIX: Inject branch_id for non-super admins if missing
      const userProfile = await userManagementService.getCurrentUserProfile()
      const isSuperAdmin = userProfile?.role === 'super_admin'
      if (!isSuperAdmin && userProfile?.branch_id && !values.branch_id) {
        values.branch_id = userProfile.branch_id
      }
      
      if (selectedProduct) {
        // Update existing product
        const result = await inventoryService.updateProduct(selectedProduct.id, values)
        
        if (result.success) {
          message.success('تم تحديث المنتج بنجاح')
          setIsModalVisible(false)
          setSelectedProduct(null)
          form.resetFields()
          loadProducts() 
        } else {
          if (result.errorCode === 'DUPLICATE_SKU') {
            message.error('SKU موجود مسبقاً في هذه الشركة. يرجى استخدام SKU آخر.')
          } else {
            message.error(result.error || 'فشل في تحديث المنتج')
          }
        }
      } else {
        // Add new product
        const result = await inventoryService.addProduct(values)
        
        if (result.success) {
          message.success('تم إضافة المنتج بنجاح')
          setIsModalVisible(false)
          setSelectedProduct(null)
          form.resetFields()
          loadProducts() 
        } else {
          if (result.errorCode === 'DUPLICATE_SKU') {
            message.error('SKU موجود مسبقاً في هذه الشركة. يرجى استخدام SKU آخر.')
          } else {
            message.error(result.error || 'فشل في إضافة المنتج')
          }
        }
      }
    } catch (error: any) {
      console.error('Validation failed:', error)
      message.error('يرجى التأكد من البيانات')
    }
  }

  const handleExportData = () => {
    const dataStr = JSON.stringify(products, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', 'inventory-data.json')
    linkElement.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>
            <DatabaseOutlined style={{ marginLeft: 8 }} />
            إدارة المخزون
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>مراقبة وإدارة مخزون المنتجات</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleOpenAddModal}
        >
          إضافة منتج جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي المنتجات"
              value={inventoryStats.totalProducts}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="قيمة المخزون"
              value={inventoryStats.totalValue}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="ريال"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="كميات منخفضة"
              value={inventoryStats.lowStockCount}
              prefix={<WarningOutlined />}
              formatter={(val) => <span style={{ color: '#faad14' }}>{val}</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي القطع"
              value={inventoryStats.totalItems}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* أدوات البحث والتصفية */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'products',
              label: 'المنتجات',
              children: (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
                  <Input
                    placeholder="ابحث باسم المنتج، SKU، أو التصنيف..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                  />
                  <Select
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    style={{ width: 150 }}
                    placeholder="التصنيف"
                    allowClear
                  >
                    <Option value="all">الكل</Option>
                    {[...new Set(products.map((p: any) => p.category))].map((cat: any) => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 150 }}
                    placeholder="حالة المخزون"
                    allowClear
                  >
                    <Option value="all">الكل</Option>
                    <Option value="in-stock">متوفر</Option>
                    <Option value="low-stock">كمية منخفضة</Option>
                    <Option value="out-of-stock">نفذ</Option>
                  </Select>
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={handleExportData}
                  >
                    تصدير البيانات
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* جدول المنتجات */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredProducts}
            loading={false}
            pagination={{ pageSize: 10 }}
            rowKey="id"
            scroll={{ x: 1200 }}
            locale={{
              emptyText: (
                <Empty
                  description={language === 'ar' ? 'لا توجد سجلات لهذا الفرع' : 'No records found for this branch'}
                />
              )
            }}
          />
        </Spin>
      </Card>

      {/* Modal إضافة/تعديل منتج */}
      <Modal
        title={selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
        open={isModalVisible}
        onOk={handleSaveProduct}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedProduct(null)
          form.resetFields()
        }}
        okText={selectedProduct ? "تحديث" : "إضافة"}
        cancelText="إلغاء"
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={isRetail ? 12 : 24}>
              <Form.Item name="name" label="اسم المنتج" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            {/* SKU - only show for retail */}
            {isRetail && (
              <Col span={12}>
                <Form.Item 
                  name="sku" 
                  label="SKU" 
                  tooltip="سيتم توليد SKU تلقائياً إذا تركت الحقل فارغاً"
                >
                  <Input placeholder="اتركه فارغاً للتوليد التلقائي" />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="التصنيف" rules={[{ required: true }]}>
                <Select>
                  <Option value="إلكترونيات">إلكترونيات</Option>
                  <Option value="هواتف">هواتف</Option>
                  <Option value="إكسسوارات">إكسسوارات</Option>
                  <Option value="كاميرات">كاميرات</Option>
                  <Option value="سماعات">سماعات</Option>
                  <Option value="كتب">كتب</Option>
                  <Option value="ملابس">ملابس</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Price fields - different for retail vs engineering */}
          {isEngineering ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="purchasePrice" label="تكلفة الوحدة" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="purchasePrice" label="سعر الشراء" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sellingPrice" label="سعر البيع" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="الكمية" rules={[{ required: true }]} initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minQuantity" label="الحد الأدنى" rules={[{ required: true }]} initialValue={5}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxQuantity" label="الحد الأقصى" rules={[{ required: true }]} initialValue={100}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier" label="المورد" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="موقع التخزين" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          {/* Unit Type - different options for engineering vs retail */}
          {isEngineering ? (
            <Form.Item name="unit" label="نوع الوحدة" rules={[{ required: true }]} initialValue="Meter">
              <Select>
                <Option value="Meter">متر</Option>
                <Option value="Ton">طن</Option>
                <Option value="Man-hour">ساعة عمل</Option>
                <Option value="Piece">قطعة</Option>
              </Select>
            </Form.Item>
          ) : (
            <Form.Item name="unit" label="وحدة القياس" initialValue="قطعة">
              <Select>
                <Option value="قطعة">قطعة</Option>
                <Option value="كرتونة">كرتونة</Option>
                <Option value="علبة">علبة</Option>
                <Option value="زوج">زوج</Option>
                <Option value="كيلو">كيلو</Option>
                <Option value="لتر">لتر</Option>
                <Option value="متر">متر</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Secure Deletion Modal (3-Layer Security Protocol) */}
      <Modal
        title={language === 'ar' ? `حذف المنتج - ${productToDelete?.name || productToDelete?.id || ''}` : `Delete Product - ${productToDelete?.name || productToDelete?.id || ''}`}
        open={deleteModalVisible}
        onOk={async () => {
          try {
            const values = await deleteForm.validateFields()
            
            if (!productToDelete) {
              message.error(language === 'ar' ? 'لم يتم تحديد منتج للحذف' : 'No product selected for deletion')
              return
            }

            await handleDeleteProduct(productToDelete.id, values.password, values.deletionReason)
            
            setDeleteModalVisible(false)
            setProductToDelete(null)
            deleteForm.resetFields()
          } catch (error) {
            console.error('Error validating deletion form:', error)
            if (error.errorFields) {
              message.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields')
            }
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false)
          setProductToDelete(null)
          deleteForm.resetFields()
        }}
        okText={language === 'ar' ? 'حذف' : 'Delete'}
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
        okButtonProps={{ danger: true }}
        width={600}
      >
        <Alert
          type="warning"
          message={language === 'ar' ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه' : 'Warning: This action cannot be undone'}
          description={language === 'ar' ? 'سيتم حذف المنتج وجميع بياناته المرتبطة. يرجى إدخال كلمة المرور للتأكيد.' : 'This will permanently delete the product and all associated data. Please enter your password to confirm.'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={deleteForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="password"
            label={language === 'ar' ? 'كلمة المرور' : 'Password'}
            rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password' }]}
          >
            <Input.Password
              placeholder={language === 'ar' ? 'أدخل كلمة المرور للتأكيد' : 'Enter password to confirm'}
              autoComplete="current-password"
            />
          </Form.Item>
          
          <Form.Item
            name="deletionReason"
            label={language === 'ar' ? 'سبب الحذف' : 'Deletion Reason'}
            rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال سبب الحذف' : 'Please provide a reason for deletion' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={language === 'ar' ? 'اشرح سبب حذف هذا المنتج...' : 'Explain why you are deleting this product...'}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default InventoryPage