export type Language = 'en' | 'ar'

export interface Translations {
  // Common
  common: {
    actions: string
    add: string
    all: string
    amount: string
    cancel: string
    close: string
    confirm: string
    create: string
    date: string
    delete: string
    description: string
    edit: string
    error: string
    info: string
    loading: string
    no: string
    notSpecified: string
    notes: string
    optional: string
    required: string
    sar: string
    save: string
    search: string
    select: string
    status: string
    success: string
    total: string
    update: string
    view: string
    warning: string
    yes: string
  }
  
  // Contracts
  contracts: {
    title: string
    subtitle: string
    contractNumber: string
    clientName: string
    projectName: string
    startDate: string
    endDate: string
    contractType: string
    workType: string
    totalAmount: string
    status: string
    newContract: string
    editContract: string
    createContract: string
    deleteContract: string
    viewDetails: string
    editDates: string
    totalContracts: string
    inProgress: string
    completed: string
    onHold: string
    totalValue: string
    contractStatus: string
    acceptedQuotation: string
    selectQuotation: string
    searchCustomer: string
    customerName: string
    customerPhone: string
    customerEmail: string
    selectContractType: string
    originalContract: string
    amendment: string
    selectWorkType: string
    totalAmountLabel: string
    statusLabel: string
    projectNameLabel: string
    notesLabel: string
    contractDetails: string
    contractDate: string
    quotationSource: string
    contractItems: string
    description: string
    quantity: string
    unitPrice: string
    itemTotal: string
    payments: string
    paymentNumber: string
    dueDate: string
    paidDate: string
    addPayment: string
    newPayment: string
    paymentAmount: string
    paymentStatus: string
    treasuryAccount: string
    selectTreasuryAccount: string
    updateDates: string
    updateDatesTitle: string
    datesUpdateNote: string
    startDateBeforeEndDate: string
    endDateAfterStartDate: string
    notSpecified: string
    generalExpense: string
    sar: string
    // Status labels
    statusInProgress: string
    statusOnHold: string
    statusFullyCompleted: string
    statusPending: string
    statusPaid: string
    statusOverdue: string
    statusCancelled: string
    // Messages
    contractCreated: string
    contractUpdated: string
    contractDeleted: string
    datesUpdated: string
    paymentAdded: string
    failedToLoad: string
    failedToSave: string
    failedToDelete: string
    failedToUpdate: string
    fillRequiredFields: string
    selectContract: string
    selectTreasuryAccountRequired: string
    // Work types (will be populated dynamically)
    workTypes: Record<string, string>
  }
  
  // Labor
  labor: {
    title: string
    internalStaff: string
    externalLabor: string
    employees: string
    laborGroups: string
    name: string
    employeeId: string
    jobTitle: string
    monthlySalary: string
    addEmployee: string
    editEmployee: string
    deleteEmployee: string
    projects: string
    engineer: string
    startDate: string
    endDate: string
    normalLabor: string
    skilledLabor: string
    normalCount: string
    skilledCount: string
    normalRate: string
    skilledRate: string
    holidays: string
    netDays: string
    totalAmount: string
    closeGroup: string
    approveGroup: string
    payGroup: string
    viewReceipt: string
    print: string
    // Status
    active: string
    pendingApproval: string
    approvedForPayment: string
    paid: string
    cancelled: string
    // Messages
    employeeAdded: string
    employeeUpdated: string
    employeeDeleted: string
    groupCreated: string
    groupUpdated: string
    groupDeleted: string
    groupClosed: string
    groupApproved: string
    groupPaid: string
    failedToLoadEmployees: string
    failedToLoadGroups: string
    failedToSaveEmployee: string
    failedToSaveGroup: string
    failedToDeleteEmployee: string
    failedToDeleteGroup: string
    selectAtLeastOneProject: string
    startDateBeforeProject: string
    endDateMoreThan7Days: string
    endDateBeforeStartDate: string
    selectPaymentMethod: string
    selectTreasuryAccount: string
    selectAdvance: string
    noAdvancesAvailable: string
    advanceInsufficient: string
    advanceSufficient: string
    // Payment methods
    paymentFromTreasury: string
    paymentFromAdvance: string
  }
  
  // Language Selection
  languageSelection: {
    arabic: string
    continue: string
    english: string
    pleaseSelectLanguage: string
    selectLanguage: string
    subtitle: string
    title: string
  }
  
  // Navigation
  navigation: {
    adminApprovals: string
    contracts: string
    customers: string
    dashboard: string
    generalExpenses: string
    incomesAdvances: string
    laborStaffManagement: string
    language: string
    orders: string
    products: string
    projects: string
    purchaseOrdersExpenses: string
    quotations: string
    reports: string
    resources: string
    selectCompany: string
    selectLanguage: string
    settings: string
    suppliers: string
    switchCompany: string
    treasury: string
  }
  
  // Dashboard
  dashboard: {
    title: string
    welcomeMessage: string
    welcomeDescription: string
    totalOrders: string
    totalCustomers: string
    inventoryItems: string
    inventoryValue: string
    totalProjectsProfit: string
    totalGeneralExpenses: string
    netCompanyProfit: string
    quickActions: string
    createNewOrder: string
    addCustomer: string
    manageInventory: string
    viewReports: string
    systemStatus: string
    systemWorking: string
    viteReactWorking: string
    antDesignInstalled: string
    reactRouterWorking: string
    rtlSupportEnabled: string
    allPagesAvailable: string
    startUsingSystem: string
    recentActivity: string
    newOrdersAdded: string
    newCustomerRegistered: string
    salesReportsUpdated: string
    productsNeedRestock: string
    systemRunningNormal: string
    projectsProfitMinusExpenses: string
  }
  
  // Orders
  orders: {
    title: string
    subtitle: string
    newOrder: string
    editOrder: string
    deleteOrder: string
    viewOrder: string
    orderNumber: string
    supplier: string
    orderDate: string
    deliveryDate: string
    totalValue: string
    status: string
    pending: string
    processing: string
    completed: string
    cancelled: string
    searchOrders: string
    filterByStatus: string
    allStatuses: string
    selectSupplier: string
    selectProject: string
    selectTreasuryAccount: string
    orderItems: string
    addItem: string
    productName: string
    quantity: string
    unitPrice: string
    itemTotal: string
    orderTotal: string
    notes: string
    orderCreated: string
    orderUpdated: string
    orderDeleted: string
    failedToLoad: string
    failedToSave: string
    failedToDelete: string
    fillRequiredFields: string
    selectAtLeastOneItem: string
    settlementOrder: string
    settlementAdvance: string
    advanceNumber: string
    engineerName: string
  }
  
  // Projects
  projects: {
    title: string
    subtitle: string
    newProject: string
    editProject: string
    deleteProject: string
    projectName: string
    client: string
    status: string
    active: string
    onHold: string
    completed: string
    cancelled: string
    budget: string
    completionPercentage: string
    startDate: string
    endDate: string
    workScopes: string
    projectCreated: string
    projectUpdated: string
    projectDeleted: string
    datesUpdated: string
    failedToLoad: string
    failedToSave: string
    failedToDelete: string
    failedToUpdate: string
    fillRequiredFields: string
    selectClient: string
    updateDates: string
    updateDatesTitle: string
    datesUpdateNote: string
    validateDates: string
  }
  
  // Treasury
  treasury: {
    accountCreated: string
    accountDeleted: string
    accountName: string
    accountType: string
    accountUpdated: string
    accounts: string
    allAccounts: string
    amount: string
    balance: string
    bank: string
    cashBox: string
    date: string
    deleteAccount: string
    description: string
    editAccount: string
    expense: string
    failedToDelete: string
    failedToLoad: string
    failedToSave: string
    fillRequiredFields: string
    filterByAccount: string
    income: string
    newAccount: string
    searchTransactions: string
    selectAccount: string
    title: string
    totalBalance: string
    totalBank: string
    totalCash: string
    transactionCreated: string
    transactionType: string
    transactions: string
  }
  
  // Settings
  settings: {
    address: string
    allowRegistration: string
    commercialRegister: string
    company: string
    companyName: string
    currency: string
    email: string
    enable2FA: string
    failedToSave: string
    fromEmail: string
    fromName: string
    general: string
    language: string
    maintenanceMode: string
    maxLoginAttempts: string
    phone: string
    requireEmailVerification: string
    security: string
    sessionTimeout: string
    settingsSaved: string
    smtpHost: string
    smtpPort: string
    smtpSecure: string
    smtpUser: string
    system: string
    taxNumber: string
    timezone: string
    title: string
    users: string
  }
  
  // General Expenses
  generalExpenses: {
    amount: string
    date: string
    deleteExpense: string
    description: string
    editExpense: string
    exceedsLimit: string
    expenseCategory: string
    expenseCreated: string
    expenseDeleted: string
    expenseUpdated: string
    failedToDelete: string
    failedToLoad: string
    failedToSave: string
    fillRequiredFields: string
    linkedAdvance: string
    newExpense: string
    remainingAmount: string
    selectAdvance: string
    selectCategory: string
    selectTreasuryAccount: string
    subtitle: string
    title: string
    totalExpenses: string
    treasuryAccount: string
  }
  
  // Quotations
  quotations: {
    accepted: string
    converted: string
    customerName: string
    deleteQuotation: string
    draft: string
    editQuotation: string
    failedToDelete: string
    failedToLoad: string
    failedToSave: string
    newQuotation: string
    projectName: string
    quotationCreated: string
    quotationDeleted: string
    quotationUpdated: string
    quoteNumber: string
    rejected: string
    sent: string
    status: string
    subtitle: string
    title: string
    totalAmount: string
    validUntil: string
    workType: string
  }
}

const translations: Record<Language, Translations> = {
  en: {
    common: {
      actions: 'Actions',
      add: 'Add',
      all: 'All',
      amount: 'Amount',
      cancel: 'Cancel',
      close: 'Close',
      confirm: 'Confirm',
      create: 'Create',
      date: 'Date',
      delete: 'Delete',
      description: 'Description',
      edit: 'Edit',
      error: 'Error',
      info: 'Info',
      loading: 'Loading...',
      no: 'No',
      notSpecified: 'Not Specified',
      notes: 'Notes',
      optional: '(Optional)',
      required: 'Required',
      sar: 'SAR',
      save: 'Save',
      search: 'Search',
      select: 'Select',
      status: 'Status',
      success: 'Success',
      total: 'Total',
      update: 'Update',
      view: 'View',
      warning: 'Warning',
      yes: 'Yes'
    },
    contracts: {
      title: 'Contracts',
      subtitle: 'Manage contracts and payments',
      contractNumber: 'Contract Number',
      clientName: 'Client Name',
      projectName: 'Project Name',
      startDate: 'Start Date',
      endDate: 'End Date',
      contractType: 'Contract Type',
      workType: 'Work Type',
      totalAmount: 'Total Amount',
      status: 'Status',
      newContract: 'New Contract',
      editContract: 'Edit Contract',
      createContract: 'Create New Contract',
      deleteContract: 'Delete Contract',
      viewDetails: 'View',
      editDates: 'Edit Dates',
      totalContracts: 'Total Contracts',
      inProgress: 'In Progress',
      completed: 'Completed',
      onHold: 'On Hold',
      totalValue: 'Total Value',
      contractStatus: 'Contract Status',
      acceptedQuotation: 'Accepted Quotation (Optional)',
      selectQuotation: 'Select Accepted Quotation',
      searchCustomer: 'Search for Client',
      customerName: 'Client Name',
      customerPhone: 'Phone Number',
      customerEmail: 'Email',
      selectContractType: 'Select Contract Type',
      originalContract: 'Original Contract',
      amendment: 'Amendment',
      selectWorkType: 'Select Work Type',
      totalAmountLabel: 'Total Amount (SAR)',
      statusLabel: 'Status',
      projectNameLabel: 'Project Name',
      notesLabel: 'Notes (Optional)',
      contractDetails: 'Contract Details',
      contractDate: 'Date',
      quotationSource: 'Quotation Source',
      contractItems: 'Contract Items',
      description: 'Description',
      quantity: 'Quantity',
      unitPrice: 'Unit Price',
      itemTotal: 'Total',
      payments: 'Payments',
      paymentNumber: 'Payment Number',
      dueDate: 'Due Date',
      paidDate: 'Paid Date',
      addPayment: 'Add Payment',
      newPayment: 'Add New Payment',
      paymentAmount: 'Amount (SAR)',
      paymentStatus: 'Status',
      treasuryAccount: 'Treasury Account',
      selectTreasuryAccount: 'Select Treasury Account',
      updateDates: 'Update Dates',
      updateDatesTitle: 'Update Contract Dates',
      datesUpdateNote: 'Changing contract dates may automatically update related project dates (based on database logic). Past dates can be modified to allow backdated data scenarios.',
      startDateBeforeEndDate: 'Start date must be before end date',
      endDateAfterStartDate: 'End date must be after start date',
      notSpecified: 'Not Specified',
      generalExpense: 'General Expense',
      sar: 'SAR',
      statusInProgress: 'In Progress',
      statusOnHold: 'On Hold',
      statusFullyCompleted: 'Fully Completed',
      statusPending: 'Pending',
      statusPaid: 'Paid',
      statusOverdue: 'Overdue',
      statusCancelled: 'Cancelled',
      contractCreated: 'Contract created successfully!',
      contractUpdated: 'Contract updated successfully!',
      contractDeleted: 'Contract deleted successfully',
      datesUpdated: 'Contract dates updated successfully!',
      paymentAdded: 'Payment added successfully!',
      failedToLoad: 'Failed to load contracts data',
      failedToSave: 'Failed to save contract',
      failedToDelete: 'Failed to delete contract',
      failedToUpdate: 'Failed to update contract dates',
      fillRequiredFields: 'Please fill all required fields correctly',
      selectContract: 'Please select a contract',
      selectTreasuryAccountRequired: 'Please select a treasury account',
      workTypes: {} // Will be populated dynamically
    },
    labor: {
      title: 'Labor & Staff Management',
      internalStaff: 'Internal Staff',
      externalLabor: 'External Labor Groups',
      employees: 'Employees',
      laborGroups: 'Labor Groups',
      name: 'Name',
      employeeId: 'Employee ID',
      jobTitle: 'Job Title',
      monthlySalary: 'Monthly Salary (SAR)',
      addEmployee: 'Add Employee',
      editEmployee: 'Edit Employee',
      deleteEmployee: 'Delete Employee',
      projects: 'Projects',
      engineer: 'Engineer',
      startDate: 'Start Date',
      endDate: 'End Date',
      normalLabor: 'Normal Labor',
      skilledLabor: 'Skilled Labor',
      normalCount: 'Normal Labor Count',
      skilledCount: 'Skilled Labor Count (Optional)',
      normalRate: 'Daily Rate for Normal Labor (SAR)',
      skilledRate: 'Daily Rate (SAR) (Optional)',
      holidays: 'Excluded Days (Holidays)',
      netDays: 'Net Days',
      totalAmount: 'Total Amount',
      closeGroup: 'Close',
      approveGroup: 'Approve',
      payGroup: 'Pay',
      viewReceipt: 'View Receipt',
      print: 'Print',
      active: 'Active',
      pendingApproval: 'Pending Approval',
      approvedForPayment: 'Approved for Payment',
      paid: 'Paid',
      cancelled: 'Cancelled',
      employeeAdded: 'Employee added successfully',
      employeeUpdated: 'Employee updated successfully',
      employeeDeleted: 'Employee deleted successfully',
      groupCreated: 'Group created successfully',
      groupUpdated: 'Group updated successfully',
      groupDeleted: 'Group deleted successfully',
      groupClosed: 'Group closed successfully',
      groupApproved: 'Group approved successfully',
      groupPaid: 'Payment successful',
      failedToLoadEmployees: 'Failed to load employees',
      failedToLoadGroups: 'Failed to load labor groups',
      failedToSaveEmployee: 'Failed to save employee',
      failedToSaveGroup: 'Failed to save group',
      failedToDeleteEmployee: 'Failed to delete employee',
      failedToDeleteGroup: 'Failed to delete group',
      selectAtLeastOneProject: 'Please select at least one project',
      startDateBeforeProject: 'Start date cannot be before project contract date',
      endDateMoreThan7Days: 'End date cannot be more than 7 days from current date',
      endDateBeforeStartDate: 'End date cannot be before start date',
      selectPaymentMethod: 'Please select a payment method',
      selectTreasuryAccount: 'Please select a treasury account',
      selectAdvance: 'Please select an advance',
      noAdvancesAvailable: 'No approved advances with remaining balance available for this engineer',
      advanceInsufficient: 'Warning: Advance balance insufficient',
      advanceSufficient: 'Advance balance sufficient',
      paymentFromTreasury: 'From Treasury/Bank',
      paymentFromAdvance: 'Deduct from Engineer Advance'
    },
    languageSelection: {
      arabic: 'Arabic',
      continue: 'Continue',
      english: 'English',
      pleaseSelectLanguage: 'Please select a language',
      selectLanguage: 'Select Language',
      subtitle: 'Please select your preferred language',
      title: 'Welcome'
    },
    navigation: {
      adminApprovals: 'Admin Approvals',
      contracts: 'Contracts',
      customers: 'Customers',
      dashboard: 'Dashboard',
      generalExpenses: 'General Expenses',
      incomesAdvances: 'Incomes & Advances',
      laborStaffManagement: 'Labor & Staff Management',
      language: 'Language',
      orders: 'Purchase Orders / Expenses',
      products: 'Products',
      projects: 'Projects',
      purchaseOrdersExpenses: 'Purchase Orders / Expenses',
      quotations: 'Quotations',
      reports: 'Reports',
      resources: 'Resources',
      selectCompany: 'Select Company',
      selectLanguage: 'Select Language',
      settings: 'Settings',
      suppliers: 'Suppliers',
      switchCompany: 'Switch Company',
      treasury: 'Treasury'
    },
    dashboard: {
      title: 'Dashboard',
      welcomeMessage: 'Welcome to the Integrated ERP System',
      welcomeDescription: 'Your project has been successfully migrated to Vite + React. The system is running efficiently on the new platform.',
      totalOrders: 'Total Orders',
      totalCustomers: 'Total Customers',
      inventoryItems: 'Inventory Items',
      inventoryValue: 'Inventory Value',
      totalProjectsProfit: 'Total Projects Profit',
      totalGeneralExpenses: 'Total General Expenses',
      netCompanyProfit: 'Net Company Profit',
      quickActions: 'Quick Actions',
      createNewOrder: 'Create New Order',
      addCustomer: 'Add Customer',
      manageInventory: 'Manage Inventory',
      viewReports: 'View Reports',
      systemStatus: 'System Status',
      systemWorking: 'System is running normally',
      viteReactWorking: 'Vite + React are working correctly',
      antDesignInstalled: 'Ant Design is installed and enabled',
      reactRouterWorking: 'React Router is working for navigation',
      rtlSupportEnabled: 'Arabic support (RTL) is enabled',
      allPagesAvailable: 'All ERP pages are available',
      startUsingSystem: 'Start Using the System',
      recentActivity: 'Recent Activity',
      newOrdersAdded: '3 new orders added',
      newCustomerRegistered: 'New customer registered',
      salesReportsUpdated: 'Sales reports updated',
      productsNeedRestock: 'products need restocking',
      systemRunningNormal: 'System is running normally',
      projectsProfitMinusExpenses: 'Projects Profit - General Expenses'
    },
    orders: {
      title: 'Purchase Orders Management',
      subtitle: 'View and manage all purchase orders for projects',
      newOrder: 'New Purchase Order',
      editOrder: 'Edit Order',
      deleteOrder: 'Delete Order',
      viewOrder: 'View Order',
      orderNumber: 'Order Number',
      supplier: 'Supplier',
      orderDate: 'Order Date',
      deliveryDate: 'Delivery Date',
      totalValue: 'Total Value',
      status: 'Status',
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      searchOrders: 'Search Orders',
      filterByStatus: 'Filter by Status',
      allStatuses: 'All Statuses',
      selectSupplier: 'Select Supplier',
      selectProject: 'Select Project',
      selectTreasuryAccount: 'Select Treasury Account',
      orderItems: 'Order Items',
      addItem: 'Add Item',
      productName: 'Product Name',
      quantity: 'Quantity',
      unitPrice: 'Unit Price',
      itemTotal: 'Item Total',
      orderTotal: 'Order Total',
      notes: 'Notes',
      orderCreated: 'Order created successfully!',
      orderUpdated: 'Order updated successfully!',
      orderDeleted: 'Order deleted successfully',
      failedToLoad: 'Failed to load orders',
      failedToSave: 'Failed to save order',
      failedToDelete: 'Failed to delete order',
      fillRequiredFields: 'Please fill all required fields',
      selectAtLeastOneItem: 'Please add at least one item',
      settlementOrder: 'Settlement Order',
      settlementAdvance: 'Settlement Advance',
      advanceNumber: 'Advance Number',
      engineerName: 'Engineer Name'
    },
    projects: {
      title: 'Projects Management',
      subtitle: 'View and manage all projects',
      newProject: 'New Project',
      editProject: 'Edit Project',
      deleteProject: 'Delete Project',
      projectName: 'Project Name',
      client: 'Client',
      status: 'Status',
      active: 'Active',
      onHold: 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled',
      budget: 'Budget',
      completionPercentage: 'Completion Percentage',
      startDate: 'Start Date',
      endDate: 'End Date',
      workScopes: 'Work Scopes',
      projectCreated: 'Project created successfully!',
      projectUpdated: 'Project updated successfully!',
      projectDeleted: 'Project deleted successfully',
      datesUpdated: 'Project dates updated successfully!',
      failedToLoad: 'Failed to load projects',
      failedToSave: 'Failed to save project',
      failedToDelete: 'Failed to delete project',
      failedToUpdate: 'Failed to update project dates',
      fillRequiredFields: 'Please fill all required fields',
      selectClient: 'Select Client',
      updateDates: 'Update Dates',
      updateDatesTitle: 'Update Project Dates',
      datesUpdateNote: 'Changing project dates may affect related contracts and payments.',
      validateDates: 'Please verify the entered dates'
    },
    treasury: {
      accountCreated: 'Account created successfully!',
      accountDeleted: 'Account deleted successfully',
      accountName: 'Account Name',
      accountType: 'Account Type',
      accountUpdated: 'Account updated successfully!',
      accounts: 'Accounts',
      allAccounts: 'All Accounts',
      amount: 'Amount',
      balance: 'Balance',
      bank: 'Bank',
      cashBox: 'Cash Box',
      date: 'Date',
      deleteAccount: 'Delete Account',
      description: 'Description',
      editAccount: 'Edit Account',
      expense: 'Expense',
      failedToDelete: 'Failed to delete',
      failedToLoad: 'Failed to load data',
      failedToSave: 'Failed to save',
      fillRequiredFields: 'Please fill all required fields',
      filterByAccount: 'Filter by Account',
      income: 'Income',
      newAccount: 'New Account',
      searchTransactions: 'Search Transactions',
      selectAccount: 'Select Account',
      title: 'Treasury Management',
      totalBalance: 'Total Balance',
      totalBank: 'Total Bank',
      totalCash: 'Total Cash',
      transactionCreated: 'Transaction created successfully!',
      transactionType: 'Transaction Type',
      transactions: 'Transactions'
    },
    settings: {
      address: 'Address',
      allowRegistration: 'Allow Registration',
      commercialRegister: 'Commercial Register',
      company: 'Company',
      companyName: 'Company Name',
      currency: 'Currency',
      email: 'Email',
      enable2FA: 'Enable 2FA',
      failedToSave: 'Failed to save settings',
      fromEmail: 'From Email',
      fromName: 'From Name',
      general: 'General',
      language: 'Language',
      maintenanceMode: 'Maintenance Mode',
      maxLoginAttempts: 'Max Login Attempts',
      phone: 'Phone',
      requireEmailVerification: 'Require Email Verification',
      security: 'Security',
      sessionTimeout: 'Session Timeout (minutes)',
      settingsSaved: 'Settings saved successfully!',
      smtpHost: 'SMTP Host',
      smtpPort: 'SMTP Port',
      smtpSecure: 'SMTP Secure',
      smtpUser: 'SMTP User',
      system: 'System',
      taxNumber: 'Tax Number',
      timezone: 'Timezone',
      title: 'Settings',
      users: 'Users'
    },
    generalExpenses: {
      amount: 'Amount',
      date: 'Date',
      deleteExpense: 'Delete Expense',
      description: 'Description',
      editExpense: 'Edit Expense',
      exceedsLimit: 'Exceeds remaining amount',
      expenseCategory: 'Expense Category',
      expenseCreated: 'Expense created successfully!',
      expenseDeleted: 'Expense deleted successfully',
      expenseUpdated: 'Expense updated successfully!',
      failedToDelete: 'Failed to delete expense',
      failedToLoad: 'Failed to load expenses',
      failedToSave: 'Failed to save expense',
      fillRequiredFields: 'Please fill all required fields',
      linkedAdvance: 'Linked Advance',
      newExpense: 'New Expense',
      remainingAmount: 'Remaining Amount',
      selectAdvance: 'Select Advance',
      selectCategory: 'Select Category',
      selectTreasuryAccount: 'Select Treasury Account',
      subtitle: 'Manage general expenses',
      title: 'General Expenses',
      totalExpenses: 'Total Expenses',
      treasuryAccount: 'Treasury Account'
    },
    quotations: {
      accepted: 'Accepted',
      converted: 'Converted',
      customerName: 'Customer Name',
      deleteQuotation: 'Delete Quotation',
      draft: 'Draft',
      editQuotation: 'Edit Quotation',
      failedToDelete: 'Failed to delete quotation',
      failedToLoad: 'Failed to load quotations',
      failedToSave: 'Failed to save quotation',
      newQuotation: 'New Quotation',
      projectName: 'Project Name',
      quotationCreated: 'Quotation created successfully!',
      quotationDeleted: 'Quotation deleted successfully',
      quotationUpdated: 'Quotation updated successfully!',
      quoteNumber: 'Quote Number',
      rejected: 'Rejected',
      sent: 'Sent',
      status: 'Status',
      subtitle: 'Manage quotations',
      title: 'Quotations',
      totalAmount: 'Total Amount',
      validUntil: 'Valid Until',
      workType: 'Work Type'
    }
  },
  ar: {
    common: {
      actions: 'الإجراءات',
      add: 'إضافة',
      all: 'الكل',
      amount: 'المبلغ',
      cancel: 'إلغاء',
      close: 'إغلاق',
      confirm: 'تأكيد',
      create: 'إنشاء',
      date: 'التاريخ',
      delete: 'حذف',
      description: 'الوصف',
      edit: 'تعديل',
      error: 'خطأ',
      info: 'معلومات',
      loading: 'جاري التحميل...',
      no: 'لا',
      notSpecified: 'غير محدد',
      notes: 'ملاحظات',
      optional: '(اختياري)',
      required: 'مطلوب',
      sar: 'ريال',
      save: 'حفظ',
      search: 'بحث',
      select: 'اختر',
      status: 'الحالة',
      success: 'نجح',
      total: 'الإجمالي',
      update: 'تحديث',
      view: 'عرض',
      warning: 'تحذير',
      yes: 'نعم'
    },
    contracts: {
      title: 'العقود',
      subtitle: 'إدارة العقود والدفعات',
      contractNumber: 'رقم العقد',
      clientName: 'اسم العميل',
      projectName: 'اسم المشروع',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      contractType: 'نوع العقد',
      workType: 'نوع العمل',
      totalAmount: 'المبلغ الإجمالي',
      status: 'الحالة',
      newContract: 'عقد جديد',
      editContract: 'تعديل العقد',
      createContract: 'إنشاء عقد جديد',
      deleteContract: 'حذف العقد',
      viewDetails: 'عرض',
      editDates: 'تعديل التواريخ',
      totalContracts: 'إجمالي العقود',
      inProgress: 'قيد العمل',
      completed: 'مكتمل',
      onHold: 'متوقف',
      totalValue: 'القيمة الإجمالية',
      contractStatus: 'حالة العقد',
      acceptedQuotation: 'العرض المقبول (اختياري)',
      selectQuotation: 'اختر العرض المقبول',
      searchCustomer: 'البحث عن جهة الإسناد',
      customerName: 'اسم جهة الإسناد',
      customerPhone: 'رقم الهاتف',
      customerEmail: 'البريد الإلكتروني',
      selectContractType: 'اختر نوع العقد',
      originalContract: 'عقد أصلي',
      amendment: 'ملحق/تعديل',
      selectWorkType: 'اختر نوع العمل',
      totalAmountLabel: 'المبلغ الإجمالي (ريال)',
      statusLabel: 'الحالة',
      projectNameLabel: 'اسم المشروع',
      notesLabel: 'ملاحظات (اختياري)',
      contractDetails: 'تفاصيل العقد',
      contractDate: 'التاريخ',
      quotationSource: 'العرض المصدر',
      contractItems: 'بنود العقد',
      description: 'الوصف',
      quantity: 'الكمية',
      unitPrice: 'سعر الوحدة',
      itemTotal: 'الإجمالي',
      payments: 'الدفعات',
      paymentNumber: 'رقم الدفعة',
      dueDate: 'تاريخ الاستحقاق',
      paidDate: 'تاريخ الدفع',
      addPayment: 'إضافة دفعة',
      newPayment: 'إضافة دفعة جديدة',
      paymentAmount: 'المبلغ (ريال)',
      paymentStatus: 'الحالة',
      treasuryAccount: 'حساب الخزينة',
      selectTreasuryAccount: 'اختر حساب الخزينة',
      updateDates: 'تعديل التواريخ',
      updateDatesTitle: 'تعديل تواريخ العقد',
      datesUpdateNote: 'تغيير تواريخ العقد قد يؤدي إلى تحديث تلقائي لتواريخ المشروع المرتبط (حسب منطق قاعدة البيانات). يمكن تعديل التواريخ السابقة للسماح بسيناريوهات البيانات المؤرخة.',
      startDateBeforeEndDate: 'تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء',
      endDateAfterStartDate: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء',
      notSpecified: 'غير محدد',
      generalExpense: 'مصروف عام',
      sar: 'ريال',
      statusInProgress: 'قيد العمل',
      statusOnHold: 'متوقف',
      statusFullyCompleted: 'تم الإنجاز الكامل',
      statusPending: 'معلق',
      statusPaid: 'مدفوع',
      statusOverdue: 'متأخر',
      statusCancelled: 'ملغي',
      contractCreated: 'تم إنشاء العقد بنجاح!',
      contractUpdated: 'تم تحديث العقد بنجاح!',
      contractDeleted: 'تم حذف العقد بنجاح',
      datesUpdated: 'تم تحديث تواريخ العقد بنجاح!',
      paymentAdded: 'تم إضافة الدفعة بنجاح!',
      failedToLoad: 'فشل في تحميل بيانات العقود',
      failedToSave: 'فشل في حفظ العقد',
      failedToDelete: 'فشل في حذف العقد',
      failedToUpdate: 'فشل في تحديث تواريخ العقد',
      fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة بشكل صحيح',
      selectContract: 'يرجى اختيار عقد',
      selectTreasuryAccountRequired: 'يرجى اختيار حساب الخزينة',
      workTypes: {} // Will be populated dynamically
    },
    labor: {
      title: 'إدارة الموظفين والعمالة اليومية',
      internalStaff: 'الموظفون (Internal Staff)',
      externalLabor: 'العمالة الخارجية (External Labor Groups)',
      employees: 'الموظفون',
      laborGroups: 'مجموعات العمالة',
      name: 'الاسم',
      employeeId: 'الرقم الوظيفي',
      jobTitle: 'المسمى الوظيفي',
      monthlySalary: 'الراتب الأساسي (ريال)',
      addEmployee: 'إضافة موظف',
      editEmployee: 'تعديل موظف',
      deleteEmployee: 'حذف موظف',
      projects: 'المشاريع',
      engineer: 'المهندس',
      startDate: 'تاريخ البداية',
      endDate: 'تاريخ النهاية',
      normalLabor: 'العمالة العادية',
      skilledLabor: 'عامل مهني/خلفة/اسطة',
      normalCount: 'عدد العمالة العادية',
      skilledCount: 'عامل مهني/خلفة/اسطة (اختياري)',
      normalRate: 'السعر اليومي للعمالة العادية (ريال)',
      skilledRate: 'السعر اليومي (ريال) (اختياري)',
      holidays: 'الأيام المستثناة (العطل)',
      netDays: 'الأيام الصافية',
      totalAmount: 'المبلغ الإجمالي',
      closeGroup: 'إغلاق',
      approveGroup: 'موافقة',
      payGroup: 'دفع',
      viewReceipt: 'عرض الإيصال',
      print: 'طباعة',
      active: 'نشط',
      pendingApproval: 'بانتظار الموافقة',
      approvedForPayment: 'موافق عليه - جاهز للدفع',
      paid: 'مدفوع',
      cancelled: 'ملغي',
      employeeAdded: 'تم إضافة الموظف بنجاح',
      employeeUpdated: 'تم تحديث الموظف بنجاح',
      employeeDeleted: 'تم حذف الموظف بنجاح',
      groupCreated: 'تم إنشاء المجموعة بنجاح',
      groupUpdated: 'تم تحديث المجموعة بنجاح',
      groupDeleted: 'تم حذف المجموعة بنجاح',
      groupClosed: 'تم إغلاق المجموعة بنجاح',
      groupApproved: 'تمت الموافقة على المجموعة بنجاح',
      groupPaid: 'تم الدفع بنجاح',
      failedToLoadEmployees: 'فشل في تحميل بيانات الموظفين',
      failedToLoadGroups: 'فشل في تحميل مجموعات العمالة',
      failedToSaveEmployee: 'فشل في حفظ الموظف',
      failedToSaveGroup: 'فشل في حفظ المجموعة',
      failedToDeleteEmployee: 'فشل في حذف الموظف',
      failedToDeleteGroup: 'فشل في حذف المجموعة',
      selectAtLeastOneProject: 'يرجى اختيار مشروع واحد على الأقل',
      startDateBeforeProject: 'لا يمكن بدء مجموعة العمل قبل تاريخ عقد المشروع',
      endDateMoreThan7Days: 'تاريخ الإغلاق لا يمكن أن يتجاوز 7 أيام من التاريخ الحالي',
      endDateBeforeStartDate: 'تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية',
      selectPaymentMethod: 'يرجى اختيار طريقة الدفع',
      selectTreasuryAccount: 'يرجى اختيار حساب الخزينة',
      selectAdvance: 'يرجى اختيار العهدة',
      noAdvancesAvailable: 'لا توجد عهد مفتوحة ومعتمدة لهذا المهندس',
      advanceInsufficient: 'تحذير: رصيد العهدة غير كاف',
      advanceSufficient: 'رصيد العهدة كاف',
      paymentFromTreasury: 'من الخزينة/البنك',
      paymentFromAdvance: 'خصم من عهدة المهندس'
    },
    languageSelection: {
      arabic: 'العربية',
      continue: 'متابعة',
      english: 'English',
      pleaseSelectLanguage: 'يرجى اختيار اللغة',
      selectLanguage: 'اختر اللغة',
      subtitle: 'يرجى اختيار اللغة المفضلة',
      title: 'مرحباً'
    },
    navigation: {
      adminApprovals: 'موافقات الإدارة',
      contracts: 'العقود',
      customers: 'العملاء',
      dashboard: 'لوحة التحكم',
      generalExpenses: 'المصاريف العامة',
      incomesAdvances: 'الإيرادات والعهد',
      laborStaffManagement: 'إدارة الموظفين والعمالة اليومية',
      language: 'اللغة',
      orders: 'أوامر الشراء / المصاريف',
      products: 'المنتجات',
      projects: 'المشاريع',
      purchaseOrdersExpenses: 'أوامر الشراء / المصاريف',
      quotations: 'العروض',
      reports: 'التقارير',
      resources: 'الموارد',
      selectCompany: 'اختر الشركة',
      selectLanguage: 'اختر اللغة',
      settings: 'الإعدادات',
      suppliers: 'الموردين',
      switchCompany: 'تبديل الشركة',
      treasury: 'الخزينة'
    },
    dashboard: {
      title: 'لوحة التحكم',
      welcomeMessage: 'مرحباً بك في نظام ERP المتكامل',
      welcomeDescription: 'تم نقل مشروعك بنجاح إلى Vite + React. النظام يعمل بكفاءة على الجهاز الجديد.',
      totalOrders: 'إجمالي الطلبات',
      totalCustomers: 'إجمالي العملاء',
      inventoryItems: 'عناصر المخزون',
      inventoryValue: 'قيمة المخزون',
      totalProjectsProfit: 'ربح المشاريع الإجمالي',
      totalGeneralExpenses: 'إجمالي المصاريف العامة',
      netCompanyProfit: 'صافي ربح الشركة',
      quickActions: 'إجراءات سريعة',
      createNewOrder: 'إنشاء طلب جديد',
      addCustomer: 'إضافة عميل',
      manageInventory: 'إدارة المخزون',
      viewReports: 'عرض التقارير',
      systemStatus: 'حالة النظام',
      systemWorking: 'النظام يعمل بشكل طبيعي',
      viteReactWorking: 'Vite + React يعملان بشكل صحيح',
      antDesignInstalled: 'Ant Design مثبت ومفعل',
      reactRouterWorking: 'React Router يعمل للتنقل بين الصفحات',
      rtlSupportEnabled: 'الدعم العربي (RTL) مفعل',
      allPagesAvailable: 'جميع صفحات ERP متوفرة',
      startUsingSystem: 'ابدأ باستخدام النظام',
      recentActivity: 'آخر النشاطات',
      newOrdersAdded: 'تم إضافة 3 طلبات جديدة',
      newCustomerRegistered: 'تم تسجيل عميل جديد',
      salesReportsUpdated: 'تم تحديث تقارير المبيعات',
      productsNeedRestock: 'منتجات تحتاج إعادة تعبئة',
      systemRunningNormal: 'النظام يعمل بشكل طبيعي',
      projectsProfitMinusExpenses: 'ربح المشاريع - المصاريف العامة'
    },
    orders: {
      title: 'إدارة أوامر الشراء',
      subtitle: 'عرض وإدارة جميع أوامر الشراء للمشاريع',
      newOrder: 'أمر شراء جديد',
      editOrder: 'تعديل الطلب',
      deleteOrder: 'حذف الطلب',
      viewOrder: 'عرض الطلب',
      orderNumber: 'رقم الطلب',
      supplier: 'المورد',
      orderDate: 'تاريخ الطلب',
      deliveryDate: 'تاريخ التسليم',
      totalValue: 'إجمالي القيمة',
      status: 'الحالة',
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      searchOrders: 'بحث في الطلبات',
      filterByStatus: 'تصفية حسب الحالة',
      allStatuses: 'جميع الحالات',
      selectSupplier: 'اختر المورد',
      selectProject: 'اختر المشروع',
      selectTreasuryAccount: 'اختر حساب الخزينة',
      orderItems: 'عناصر الطلب',
      addItem: 'إضافة عنصر',
      productName: 'اسم المنتج',
      quantity: 'الكمية',
      unitPrice: 'سعر الوحدة',
      itemTotal: 'إجمالي العنصر',
      orderTotal: 'إجمالي الطلب',
      notes: 'ملاحظات',
      orderCreated: 'تم إنشاء الطلب بنجاح!',
      orderUpdated: 'تم تحديث الطلب بنجاح!',
      orderDeleted: 'تم حذف الطلب بنجاح',
      failedToLoad: 'فشل في تحميل الطلبات',
      failedToSave: 'فشل في حفظ الطلب',
      failedToDelete: 'فشل في حذف الطلب',
      fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
      selectAtLeastOneItem: 'يرجى إضافة عنصر واحد على الأقل',
      settlementOrder: 'طلب تسوية',
      settlementAdvance: 'تسوية عهدة',
      advanceNumber: 'رقم العهدة',
      engineerName: 'اسم المهندس'
    },
    projects: {
      title: 'إدارة المشاريع',
      subtitle: 'عرض وإدارة جميع المشاريع',
      newProject: 'مشروع جديد',
      editProject: 'تعديل المشروع',
      deleteProject: 'حذف المشروع',
      projectName: 'اسم المشروع',
      client: 'العميل',
      status: 'الحالة',
      active: 'نشط',
      onHold: 'متوقف',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      budget: 'الميزانية',
      completionPercentage: 'نسبة الإنجاز',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      workScopes: 'نطاقات العمل',
      projectCreated: 'تم إنشاء المشروع بنجاح!',
      projectUpdated: 'تم تحديث المشروع بنجاح!',
      projectDeleted: 'تم حذف المشروع بنجاح',
      datesUpdated: 'تم تحديث تواريخ المشروع بنجاح!',
      failedToLoad: 'فشل في تحميل المشاريع',
      failedToSave: 'فشل في حفظ المشروع',
      failedToDelete: 'فشل في حذف المشروع',
      failedToUpdate: 'فشل في تحديث تواريخ المشروع',
      fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
      selectClient: 'اختر العميل',
      updateDates: 'تعديل التواريخ',
      updateDatesTitle: 'تعديل تواريخ المشروع',
      datesUpdateNote: 'تغيير تواريخ المشروع قد يؤثر على العقود والدفعات المرتبطة.',
      validateDates: 'يرجى التحقق من صحة التواريخ المدخلة'
    },
    treasury: {
      accountCreated: 'تم إنشاء الحساب بنجاح!',
      accountDeleted: 'تم حذف الحساب بنجاح',
      accountName: 'اسم الحساب',
      accountType: 'نوع الحساب',
      accountUpdated: 'تم تحديث الحساب بنجاح!',
      accounts: 'الحسابات',
      allAccounts: 'جميع الحسابات',
      amount: 'المبلغ',
      balance: 'الرصيد',
      bank: 'بنك',
      cashBox: 'صندوق نقدي',
      date: 'التاريخ',
      deleteAccount: 'حذف الحساب',
      description: 'الوصف',
      editAccount: 'تعديل الحساب',
      expense: 'مصروف',
      failedToDelete: 'فشل في الحذف',
      failedToLoad: 'فشل في تحميل البيانات',
      failedToSave: 'فشل في الحفظ',
      fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
      filterByAccount: 'تصفية حسب الحساب',
      income: 'دخل',
      newAccount: 'حساب جديد',
      searchTransactions: 'بحث في المعاملات',
      selectAccount: 'اختر الحساب',
      title: 'إدارة الخزينة',
      totalBalance: 'إجمالي الرصيد',
      totalBank: 'إجمالي البنك',
      totalCash: 'إجمالي النقد',
      transactionCreated: 'تم إنشاء المعاملة بنجاح!',
      transactionType: 'نوع المعاملة',
      transactions: 'المعاملات'
    },
    settings: {
      address: 'العنوان',
      allowRegistration: 'السماح بالتسجيل',
      commercialRegister: 'السجل التجاري',
      company: 'الشركة',
      companyName: 'اسم الشركة',
      currency: 'العملة',
      email: 'البريد الإلكتروني',
      enable2FA: 'تفعيل المصادقة الثنائية',
      failedToSave: 'فشل في حفظ الإعدادات',
      fromEmail: 'البريد الإلكتروني المرسل',
      fromName: 'اسم المرسل',
      general: 'عام',
      language: 'اللغة',
      maintenanceMode: 'وضع الصيانة',
      maxLoginAttempts: 'الحد الأقصى لمحاولات تسجيل الدخول',
      phone: 'الهاتف',
      requireEmailVerification: 'يتطلب التحقق من البريد الإلكتروني',
      security: 'الأمان',
      sessionTimeout: 'انتهاء الجلسة (بالدقائق)',
      settingsSaved: 'تم حفظ الإعدادات بنجاح!',
      smtpHost: 'خادم SMTP',
      smtpPort: 'منفذ SMTP',
      smtpSecure: 'SMTP آمن',
      smtpUser: 'مستخدم SMTP',
      system: 'النظام',
      taxNumber: 'الرقم الضريبي',
      timezone: 'المنطقة الزمنية',
      title: 'الإعدادات',
      users: 'المستخدمون'
    },
    generalExpenses: {
      amount: 'المبلغ',
      date: 'التاريخ',
      deleteExpense: 'حذف المصروف',
      description: 'الوصف',
      editExpense: 'تعديل المصروف',
      exceedsLimit: 'يتجاوز المبلغ المتبقي',
      expenseCategory: 'فئة المصروف',
      expenseCreated: 'تم إنشاء المصروف بنجاح!',
      expenseDeleted: 'تم حذف المصروف بنجاح',
      expenseUpdated: 'تم تحديث المصروف بنجاح!',
      failedToDelete: 'فشل في حذف المصروف',
      failedToLoad: 'فشل في تحميل المصاريف',
      failedToSave: 'فشل في حفظ المصروف',
      fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
      linkedAdvance: 'العهدة المرتبطة',
      newExpense: 'مصروف جديد',
      remainingAmount: 'المبلغ المتبقي',
      selectAdvance: 'اختر العهدة',
      selectCategory: 'اختر الفئة',
      selectTreasuryAccount: 'اختر حساب الخزينة',
      subtitle: 'إدارة المصاريف العامة',
      title: 'المصاريف العامة',
      totalExpenses: 'إجمالي المصاريف',
      treasuryAccount: 'حساب الخزينة'
    },
    quotations: {
      accepted: 'مقبول',
      converted: 'محول',
      customerName: 'اسم العميل',
      deleteQuotation: 'حذف العرض',
      draft: 'مسودة',
      editQuotation: 'تعديل العرض',
      failedToDelete: 'فشل في حذف العرض',
      failedToLoad: 'فشل في تحميل العروض',
      failedToSave: 'فشل في حفظ العرض',
      newQuotation: 'عرض جديد',
      projectName: 'اسم المشروع',
      quotationCreated: 'تم إنشاء العرض بنجاح!',
      quotationDeleted: 'تم حذف العرض بنجاح',
      quotationUpdated: 'تم تحديث العرض بنجاح!',
      quoteNumber: 'رقم العرض',
      rejected: 'مرفوض',
      sent: 'مرسل',
      status: 'الحالة',
      subtitle: 'إدارة العروض',
      title: 'العروض',
      totalAmount: 'المبلغ الإجمالي',
      validUntil: 'صالح حتى',
      workType: 'نوع العمل'
    }
  }
}

export const getTranslations = (lang: Language): Translations => {
  return translations[lang]
}

export default translations
