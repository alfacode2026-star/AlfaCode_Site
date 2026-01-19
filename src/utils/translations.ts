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
    and: string
    more: string
    to: string
    days: string
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
    workScope: string
    workScopeFromQuotation: string
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
    searchByContractNumberPlaceholder: string
    searchForClientPlaceholder: string
    clientNamePlaceholder: string
    phoneNumberPlaceholder: string
    projectNamePlaceholder: string
    selectProjectPlaceholder: string
    selectWorkScopePlaceholder: string
    additionalNotesPlaceholder: string
    currencyAutoSetPlaceholder: string
    amountPlaceholder: string
    selectStartDatePlaceholder: string
    selectEndDatePlaceholder: string
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
    deductionReason: string
    deductionReasonRequired: string
    // Payment methods
    paymentFromTreasury: string
    paymentFromAdvance: string
    addGroup: string
    noLaborGroups: string
    totalGroups: string
    noEmployees: string
    totalEmployees: string
    deleteEmployeeConfirm: string
    deleteGroupConfirm: string
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
    // Additional Orders translations
    unknownCustomer: string
    noPhone: string
    unknownOrder: string
    orderId: string
    invoiceTitle: string
    purchaseOrderNumber: string
    date: string
    supplierCustomerInfo: string
    name: string
    phone: string
    email: string
    itemDescription: string
    totalAmount: string
    print: string
    deleteOrderConfirm: string
    deleteOrderDescription: string
    yes: string
    no: string
    delete: string
    viewDetails: string
    printInvoice: string
    statistics: string
    totalOrders: string
    searchPlaceholder: string
    filterByStatus: string
    all: string
    workScope: string
    itemType: string
    mixed: string
    inventory: string
    manual: string
    totalQuantity: string
    orderType: string
    purchase: string
    totalAmountLabel: string
    status: string
    dateLabel: string
    actions: string
    unknown: string
    notSpecified: string
    addPurchaseItems: string
    itemDescriptionPlaceholder: string
    quantityPlaceholder: string
    unitPricePlaceholder: string
    addItem: string
    addedItems: string
    materialDescription: string
    deleteItem: string
    totalAmountValue: string
    createNewOrder: string
    create: string
    cancel: string
    project: string
    projectRequired: string
    selectProject: string
    workScopeOptional: string
    selectWorkScope: string
    supplierCustomer: string
    searchSupplierCustomer: string
    addNewSupplier: string
    supplierName: string
    supplierNameRequired: string
    supplierNamePlaceholder: string
    phoneOptional: string
    phonePlaceholder: string
    emailOptional: string
    emailPlaceholder: string
    selectedSupplier: string
    purchaseItems: string
    items: string
    addAtLeastOneItem: string
    orderStatus: string
    treasuryAccountWarning: string
    treasuryAccountRequired: string
    selectTreasuryAccount: string
    notesOptional: string
    notesPlaceholder: string
    shippingAddressPlaceholder: string
    failedToLoadCustomers: string
    failedToAddSupplier: string
    supplierAddedSuccessfully: string
    selectOrAddSupplier: string
    treasuryAccountNotFound: string
    orderAddedSuccessfully: string
    warningZeroAmount: string
    amountDeductedFromTreasury: string
    failedToDeductFromTreasury: string
    treasuryAccountNotSelected: string
    failedToAddOrder: string
    fillRequiredFieldsCorrectly: string
    errorSavingOrder: string
    noOrdersToPrint: string
    // New keys from audit
    currency: string
    currencyTooltip: string
  }
  
  // Incomes
  incomes: {
    title: string
    subtitle: string
    newIncome: string
    editIncome: string
    deleteIncome: string
    incomeNumber: string
    projectName: string
    amount: string
    date: string
    description: string
    status: string
    incomeCreated: string
    incomeUpdated: string
    incomeDeleted: string
    failedToLoad: string
    failedToSave: string
    failedToDelete: string
    fillRequiredFields: string
    // New keys from audit
    currency: string
    currencyTooltip: string
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
    totalProjects: string
    activeProjects: string
    totalBudget: string
    averageCompletion: string
    searchPlaceholder: string
    details: string
    editDates: string
    edit: string
    deleteProjectConfirm: string
    deleteProjectDescription: string
    yes: string
    no: string
    delete: string
    errorDeletingProject: string
    projectNameLabel: string
    clientLabel: string
    statusLabel: string
    budgetLabel: string
    completionPercentageLabel: string
    notesLabel: string
    notesOptional: string
    save: string
    cancel: string
    create: string
    update: string
    startDateLabel: string
    endDateLabel: string
    startDatePlaceholder: string
    endDatePlaceholder: string
    startDateBeforeEndDate: string
    endDateAfterStartDate: string
    noProjectSelected: string
    datesUpdateSuccess: string
    datesUpdateError: string
    datesValidationError: string
    errorUpdatingDates: string
    projectNotFound: string
    failedToLoadProject: string
  }
  
  // Project Details
  projectDetails: {
    expenseType: string
    paymentExpense: string
    payment: string
    transactionType: string
    milestoneNumber: string
    descriptionMilestone: string
    milestone: string
    engineer: string
    treasuryAccount: string
    selectTreasuryAccount: string
    selectTransactionType: string
    investorInflowCreated: string
    failedToCreateInvestorInflow: string
    enterEngineerName: string
    advanceForEngineer: string
    advanceCreatedTreasuryError: string
    employeeAdvanceCreated: string
    failedToCreateEmployeeAdvance: string
    errorCreatingTransaction: string
    projectExpenses: string
    addNewExpense: string
    expenseWarning: string
    itemType: string
    generalExpense: string
    custodyDeduction: string
    expensesProcurementLedger: string
    generalExpensesExcluded: string
    noTransactions: string
    totalTransactions: string
    totalExpenses: string
    noExpenses: string
    projectIdNotFound: string
    selectCustody: string
    custodyNotFound: string
    custodyInsufficient: string
    expenseDeductedFromCustody: string
    failedToDeductExpense: string
    errorCreatingExpense: string
    expenseCreated: string
    failedToCreateExpense: string
    navigateToOrders: string
    totalMilestones: string
    noMilestones: string
    engineerAdvance: string
    investorInflow: string
    projectExpense: string
    totalBudget: string
    totalCollected: string
    cashFlow: string
    totalLaborCost: string
    budgetUsage: string
    mainContract: string
    amendments: string
    fromProjectBudget: string
    paidMilestones: string
    expensePayments: string
    paidLaborGroups: string
    margin: string
    netMargin: string
    used: string
    available: string
    backToProjects: string
    // New keys from audit
    scopeSpendingBreakdown: string
    addIncomeOrAdvance: string
    addProjectExpense: string
    selectTransactionType: string
    incomeType: string
    selectIncomeType: string
    engineerName: string
    engineerNamePlaceholder: string
    descriptionOrPhase: string
    descriptionPlaceholder: string
    workScopeOptional: string
    selectWorkScope: string
    previousCompletion: string
    dueDate: string
    treasuryAccountTooltip: string
    referenceNumberOptional: string
    referenceNumberPlaceholder: string
    date: string
    treasuryOrCashBox: string
    selectTreasuryOrCashBox: string
    description: string
    descriptionPlaceholder: string
    currency: string
  }
  
  // Customers
  customers: {
    title: string
    subtitle: string
    customer: string
    contactInfo: string
    type: string
    status: string
    balance: string
    totalPurchases: string
    actions: string
    viewDetails: string
    edit: string
    delete: string
    deleteCustomer: string
    deleteCustomerConfirm: string
    addCustomer: string
    editCustomer: string
    newCustomer: string
    customerName: string
    customerNameRequired: string
    email: string
    emailRequired: string
    emailInvalid: string
    phone: string
    phoneRequired: string
    phoneInvalid: string
    company: string
    companyOptional: string
    address: string
    notes: string
    notesOptional: string
    individual: string
    corporate: string
    active: string
    inactive: string
    totalCustomers: string
    activeCustomers: string
    corporateCustomers: string
    totalBalance: string
    searchPlaceholder: string
    statusFilter: string
    typeFilter: string
    all: string
    export: string
    registrationDate: string
    totalOrders: string
    lastPurchase: string
    customerAdded: string
    customerUpdated: string
    customerDeleted: string
    failedToAdd: string
    failedToUpdate: string
    failedToDelete: string
    failedToLoad: string
    fillRequiredFields: string
    errorSaving: string
    versionMismatch: string
    exportSuccess: string
    noData: string
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
    filterByAccountPlaceholder: string
    searchTransactionsPlaceholder: string
    accountNamePlaceholder: string
    selectAccountTypePlaceholder: string
    selectVisibilityPlaceholder: string
    selectCurrencyPlaceholder: string
    initialBalancePlaceholder: string
    visibility: string
    initialBalance: string
    mainCurrenciesLabel: string
    otherCurrenciesLabel: string
    // New keys from audit
    currency: string
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
    companyNamePlaceholder: string
    emailPlaceholder: string
    phonePlaceholder: string
    taxNumberPlaceholder: string
    addressPlaceholder: string
    smtpHostPlaceholder: string
    smtpPortPlaceholder: string
    smtpUserPlaceholder: string
    smtpPasswordPlaceholder: string
    fromEmailPlaceholder: string
    fromNamePlaceholder: string
    managerNamePlaceholder: string
    managerTitlePlaceholder: string
    websiteUrlPlaceholder: string
    commercialRegisterPlaceholder: string
    passwordPlaceholder: string
    fullNamePlaceholder: string
    selectRolePlaceholder: string
    branches: string
    companySettings: string
    userManagement: string
    companyInformation: string
    authorizedManagerName: string
    managerTitle: string
    companyPhone: string
    companyEmail: string
    companyWebsite: string
    companyAddress: string
    vatPercentage: string
    enableVAT: string
    brandingAndMedia: string
    fullPageLetterhead: string
    letterheadImage: string
    digitalStamp: string
    companyLogo: string
    contentMargins: string
    topMargin: string
    bottomMargin: string
    saveCompanySettings: string
    logoAndBranding: string
    vatPercentageExample: string
    vatPercentageExtra: string
    enabled: string
    disabled: string
    uploadLetterhead: string
    currentLetterhead: string
    newLetterheadPreview: string
    uploadStamp: string
    uploadLogo: string
    letterheadInstructions: string
    letterheadInstructionsDescription: string
    letterheadImageExtra: string
    digitalStampExtra: string
    companyLogoExtra: string
    topMarginExtra: string
    bottomMarginExtra: string
    pleaseEnterCompanyName: string
    pleaseEnterManagerName: string
    pleaseEnterManagerTitle: string
    pleaseEnterTopMargin: string
    pleaseEnterBottomMargin: string
    // New keys from audit
    smtpServer: string
    secureConnection: string
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
    // New keys from audit
    category: string
    paymentFrequency: string
    currency: string
    addedItems: string
    readOnlyStatus: string
    transferCustody: string
    selectTreasuryAccountTooltip: string
    searchExpensePlaceholder: string
    searchAdvanceSettlement: string
    selectEmployee: string
    enterVendorRepresentativeName: string
    selectOpenAdvanceApproved: string
    selectWorkScopeOptional: string
    searchSupplierCustomer: string
    supplierNamePlaceholder: string
    phoneNumberPlaceholder: string
    emailPlaceholder: string
    itemDescriptionPlaceholder: string
    quantityPlaceholder: string
    unitPricePlaceholder: string
    selectProjectOptional: string
    amountPlaceholder: string
    selectTreasuryAccountPlaceholder: string
    referenceNumberPlaceholder: string
    selectCategoryPlaceholder: string
    newCategoryNamePlaceholder: string
    expenseDescriptionPlaceholder: string
    enterExternalRecipientName: string
    selectDatePlaceholder: string
    expenseNumberPlaceholder: string
    selectProjectPlaceholder: string
    additionalNotesPlaceholder: string
    selectNewProjectPlaceholder: string
    workScopeLabel: string
    vendorRecipientLabel: string
    supplierNameLabel: string
    phoneOptionalLabel: string
    emailOptionalLabel: string
    purchaseOrderItemsLabel: string
    addItemButton: string
    addedItemsLabel: string
    itemDescriptionColumn: string
    quantityColumn: string
    unitPriceColumn: string
    totalColumn: string
    deleteColumn: string
    totalAmountLabel: string
    exceedsRemainingLabel: string
    projectOptionalLabel: string
    treasuryAccountLabel: string
    recipientTypeLabel: string
    recipientNameLabel: string
    dateLabel: string
    statusLabel: string
    referenceNumberLabel: string
    referenceNumberOptionalLabel: string
    purchaseOrderStatusLabel: string
    settlementPoDivider: string
    projectLabel: string
    workScopeBoldLabel: string
    purchaseItemsDivider: string
    settlementAdvanceNote: string
    autoGeneratedReference: string
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
    documentType: string
    workScope: string
    approveQuotation: string
    approveQuotationDescription: string
    quotationApprovedAndConverted: string
    quotationApprovedAndProjectCreated: string
    quotationApproved: string
    builder: string
    quotationBuilder: string
    saveDraft: string
    generatePDF: string
    header: string
    boq: string
    content: string
    company: string
    attention: string
    project: string
    subject: string
    refNo: string
    date: string
    customer: string
    customerName: string
    phone: string
    email: string
    addRow: string
    total: string
    introduction: string
    scopeOfWork: string
    exclusions: string
    facilities: string
    termsAndConditions: string
    validityPeriod: string
    days: string
    pdfPreview: string
    refresh: string
    draftSaved: string
    pdfGenerated: string
    activities: string
    amount: string
    projectCreatedButContractFailed: string
    failedToApprove: string
    errorApprovingQuotation: string
    approve: string
    deleteQuotationConfirm: string
    deleteQuotationDescription: string
    yes: string
    no: string
    delete: string
    searchPlaceholder: string
    filterByStatus: string
    all: string
    statistics: string
    totalQuotations: string
    draftQuotations: string
    sentQuotations: string
    acceptedQuotations: string
    rejectedQuotations: string
    totalValue: string
    pending: string
    client: string
    description: string
    totalAmountLabel: string
    customerSearchPlaceholder: string
    customerNameLabel: string
    customerPhoneLabel: string
    customerEmailLabel: string
    projectNameLabel: string
    workTypeLabel: string
    selectWorkType: string
    workScopesLabel: string
    addWorkScope: string
    totalAmountLabelForm: string
    statusLabel: string
    validUntilLabel: string
    notesLabel: string
    notesPlaceholder: string
    save: string
    cancel: string
    create: string
    update: string
    fillRequiredFields: string
    convertToContract: string
    convertToContractTitle: string
    contractTypeLabel: string
    selectContractType: string
    convert: string
    cannotConvertNonApproved: string
      quotationDetails: string
      close: string
      addNewWorkCategory: string
      enterCustomWorkType: string
      amountPlaceholder: string
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
      and: 'and',
      more: 'more',
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
      yes: 'Yes',
      to: 'to',
      days: 'days'
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
      workScope: 'Work Scope',
      workScopeFromQuotation: 'Work Scope is inherited from the selected quotation',
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
      workTypes: {}, // Will be populated dynamically
      searchByContractNumberPlaceholder: 'Search by contract number or client name...',
      searchForClientPlaceholder: 'Search for client by name or phone...',
      clientNamePlaceholder: 'Client name',
      phoneNumberPlaceholder: 'Phone number',
      projectNamePlaceholder: 'Project name',
      selectProjectPlaceholder: 'Select project',
      selectWorkScopePlaceholder: 'Select work scope',
      additionalNotesPlaceholder: 'Additional notes...',
      currencyAutoSetPlaceholder: 'Currency will be set automatically',
      amountPlaceholder: '0',
      selectStartDatePlaceholder: 'Select start date',
      selectEndDatePlaceholder: 'Select end date',
      // New keys from audit
      currency: 'Currency',
      currencyTooltip: 'Currency is automatically set based on the selected treasury account'
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
      failedToLoadProjects: 'Failed to load projects',
      failedToSaveEmployee: 'Failed to save employee',
      failedToSaveGroup: 'Failed to save group',
      failedToDeleteEmployee: 'Failed to delete employee',
      errorSavingEmployee: 'Error occurred while saving employee',
      errorDeletingEmployee: 'Error occurred while deleting employee',
      errorSavingGroup: 'Error occurred while saving group',
      errorClosingGroup: 'Error occurred while closing group',
      errorApprovingGroup: 'Error occurred while approving group',
      cannotEditInactiveGroup: 'Cannot edit inactive group',
      groupNotActive: 'Group is not active',
      selectedProjectsNotFound: 'Selected projects not found',
      cannotStartBeforeProjectDate: 'Cannot start labor group before project contract date',
      endDateRequired: 'End date is required',
      closeDateCannotExceed7Days: 'Close date cannot exceed 7 days from current date',
      groupNotPendingApproval: 'Group is not pending approval',
      groupNotApprovedForPayment: 'Group is not approved for payment',
      defaultEngineer: 'Engineer',
      period: 'Period',
      calculationDetails: 'Calculation Details',
      baseTotal: 'Base Total',
      overtime: 'Overtime/Bonus',
      deductions: 'Deductions',
      finalTotalAmount: 'Final Total Amount',
      confirmCloseGroup: 'Confirm Close Group',
      confirmAndClose: 'Confirm and Close',
      failedToCloseGroup: 'Failed to close group',
      failedToApproveGroup: 'Failed to approve group',
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
      deductionReason: 'Deduction Reason',
      deductionReasonRequired: 'Deduction reason is required when deductions exist',
      paymentFromTreasury: 'From Treasury/Bank',
      paymentFromAdvance: 'Deduct from Engineer Advance',
      addGroup: 'Create New Group',
      noLaborGroups: 'No labor groups registered',
      totalGroups: 'Total',
      noEmployees: 'No employees registered',
      totalEmployees: 'Total',
      deleteEmployeeConfirm: 'Are you sure you want to delete this employee?',
      deleteGroupConfirm: 'Are you sure you want to delete this group?'
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
      processing: 'Processing',
      cancelled: 'Cancelled',
      searchOrders: 'Search Orders',
      allStatuses: 'All Statuses',
      selectSupplier: 'Select Supplier',
      orderItems: 'Order Items',
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
      engineerName: 'Engineer Name',
      // Additional Orders translations
      unknownCustomer: 'Unknown Customer',
      noPhone: 'No Phone',
      unknownOrder: 'Unknown',
      orderId: 'Order ID',
      invoiceTitle: 'Purchase Order',
      purchaseOrderNumber: 'Purchase Order Number',
      date: 'Date',
      supplierCustomerInfo: 'Supplier/Customer Information',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      itemDescription: 'Item Description',
      totalAmount: 'Total Amount',
      print: 'Print',
      deleteOrderConfirm: 'Delete Order',
      deleteOrderDescription: 'Are you sure you want to delete this purchase order?',
      yes: 'Yes',
      no: 'No',
      delete: 'Delete',
      viewDetails: 'View Details',
      printInvoice: 'Print Invoice',
      statistics: 'Statistics',
      totalOrders: 'Total Purchase Orders',
      totalValue: 'Total Value',
      pending: 'Pending',
      completed: 'Completed',
      searchPlaceholder: 'Search by order number or project name...',
      filterByStatus: 'Order Status',
      all: 'All',
      workScope: 'Work Scope',
      itemType: 'Item Type',
      mixed: 'Mixed',
      inventory: 'Inventory',
      manual: 'Manual',
      totalQuantity: 'Total Quantity',
      orderType: 'Order Type',
      purchase: 'Purchase',
      totalAmountLabel: 'Total Amount',
      status: 'Status',
      dateLabel: 'Date',
      actions: 'Actions',
      unknown: 'Unknown',
      notSpecified: 'Not Specified',
      addPurchaseItems: 'Add Purchase Items',
      itemDescriptionPlaceholder: 'Item description (e.g., 100 bags of cement)',
      quantityPlaceholder: 'Quantity',
      unitPricePlaceholder: 'Unit Price',
      addItem: 'Add Item',
      addedItems: 'Added Items',
      materialDescription: 'Material/Description',
      deleteItem: 'Delete',
      totalAmountValue: 'Total Amount:',
      createNewOrder: 'Create New Purchase Order',
      create: 'Create',
      cancel: 'Cancel',
      project: 'Project',
      projectRequired: 'Project *',
      selectProject: 'Select Project',
      workScopeOptional: 'Work Scope (Optional)',
      selectWorkScope: 'Select Work Scope',
      supplierCustomer: 'Supplier/Customer',
      searchSupplierCustomer: 'Search for supplier or customer by name or phone...',
      addNewSupplier: 'Add New Supplier',
      supplierName: 'Supplier Name',
      supplierNameRequired: 'Supplier Name *',
      supplierNamePlaceholder: 'Supplier Name',
      phoneOptional: 'Phone Number (Optional)',
      phonePlaceholder: 'Phone Number',
      emailOptional: 'Email (Optional)',
      emailPlaceholder: 'Email',
      selectedSupplier: 'Selected Supplier:',
      purchaseItems: 'Purchase Items',
      items: 'Items',
      addAtLeastOneItem: '* You must add at least one item',
      orderStatus: 'Order Status',
      treasuryAccountWarning: 'Warning: No treasury accounts defined. Please create an account in the Treasury page first',
      treasuryAccountRequired: 'Treasury Account *',
      selectTreasuryAccount: 'Select Treasury Account',
      notesOptional: 'Notes (Optional)',
      notesPlaceholder: 'Additional notes...',
      failedToLoadCustomers: 'Failed to load customers list',
      failedToAddSupplier: 'Failed to add new supplier',
      supplierAddedSuccessfully: 'New supplier added successfully',
      selectOrAddSupplier: 'Please select or add a supplier',
      treasuryAccountNotFound: 'Selected treasury account not found',
      orderAddedSuccessfully: 'Purchase order added successfully!',
      warningZeroAmount: '⚠️ Warning: Total amount is zero or negative, will not deduct from treasury',
      amountDeductedFromTreasury: '✅ Amount deducted from treasury account',
      failedToDeductFromTreasury: '❌ Failed to deduct amount from treasury',
      treasuryAccountNotSelected: '⚠️ No treasury account selected, amount will not be deducted',
      failedToAddOrder: 'Failed to add purchase order',
      fillRequiredFieldsCorrectly: 'Please fill all required fields correctly',
      errorSavingOrder: 'An error occurred while saving the purchase order',
      noOrdersToPrint: 'No purchase orders to print',
      projectName: 'Project Name',
      shipped: 'Shipped',
      itemDescriptionRequired: 'Please enter item description',
      quantityRequired: 'Please enter a valid quantity greater than zero',
      unitPriceRequired: 'Please enter a valid unit price',
      itemAdded: 'Item added successfully',
      // New keys from audit
      currency: 'Currency',
      currencyTooltip: 'Currency is set at the branch level and cannot be changed per transaction'
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
      validateDates: 'Please verify the entered dates',
      totalProjects: 'Total Projects',
      activeProjects: 'Active Projects',
      totalBudget: 'Total Budget',
      averageCompletion: 'Average Completion',
      searchPlaceholder: 'Search by project name or client...',
      details: 'Details',
      editDates: 'Edit Dates',
      edit: 'Edit',
      deleteProjectConfirm: 'Delete Project',
      deleteProjectDescription: 'Are you sure you want to delete this project?',
      yes: 'Yes',
      no: 'No',
      delete: 'Delete',
      errorDeletingProject: 'An error occurred while deleting the project',
      projectNameLabel: 'Project Name',
      clientLabel: 'Client',
      statusLabel: 'Status',
      budgetLabel: 'Budget',
      completionPercentageLabel: 'Completion Percentage',
      notesLabel: 'Notes',
      notesOptional: 'Notes (Optional)',
      save: 'Save',
      cancel: 'Cancel',
      create: 'Create',
      update: 'Update',
      startDateLabel: 'Start Date',
      endDateLabel: 'End Date',
      startDatePlaceholder: 'Select start date',
      endDatePlaceholder: 'Select end date',
      startDateBeforeEndDate: 'Start date must be before end date',
      endDateAfterStartDate: 'End date must be after start date',
      noProjectSelected: 'No project selected',
      datesUpdateSuccess: 'Project dates updated successfully!',
      datesUpdateError: 'Failed to update project dates',
      datesValidationError: 'Please verify the entered dates',
      errorUpdatingDates: 'An error occurred while updating project dates',
      projectNotFound: 'Project not found',
      failedToLoadProject: 'Failed to load project data'
    },
    projectDetails: {
      expenseType: 'Expense Type',
      paymentExpense: 'Payment (Expense)',
      payment: 'Payment',
      transactionType: 'Transaction Type',
      milestoneNumber: 'Milestone Number',
      descriptionMilestone: 'Description/Milestone',
      milestone: 'Milestone',
      engineer: 'Engineer',
      treasuryAccount: 'Treasury/Account',
      selectTreasuryAccount: 'Please select treasury account',
      selectTransactionType: 'Please select transaction type',
      investorInflowCreated: 'Investor inflow created successfully',
      failedToCreateInvestorInflow: 'Failed to create investor inflow',
      enterEngineerName: 'Please enter engineer/employee name',
      advanceForEngineer: 'Advance for Engineer',
      advanceCreatedTreasuryError: 'Advance created successfully, but error updating treasury',
      employeeAdvanceCreated: 'Employee advance created successfully',
      failedToCreateEmployeeAdvance: 'Failed to create employee advance',
      errorCreatingTransaction: 'Error occurred while creating transaction',
      projectExpenses: 'Project Expenses',
      addNewExpense: 'Add New Expense',
      expenseWarning: 'Warning: Expenses entered here are exclusively linked to this project',
      itemType: 'Item Type',
      generalExpense: 'General Expense',
      custodyDeduction: 'Custody Deduction',
      expensesProcurementLedger: 'Expenses & Procurement Ledger',
      generalExpensesExcluded: 'General expenses excluded',
      noTransactions: 'No transactions for this project',
      totalTransactions: 'Total',
      totalExpenses: 'Total',
      noExpenses: 'No expenses registered',
      projectIdNotFound: 'Project ID not found',
      selectCustody: 'Please select custody',
      custodyNotFound: 'Selected custody not found',
      custodyInsufficient: 'Custody balance insufficient. Available',
      expenseDeductedFromCustody: 'Expense deducted from custody successfully',
      failedToDeductExpense: 'Failed to deduct expense',
      errorCreatingExpense: 'Error occurred while creating expense',
      expenseCreated: 'Expense created successfully',
      failedToCreateExpense: 'Failed to create expense',
      navigateToOrders: 'You will be redirected to the orders page to create a new purchase order',
      totalMilestones: 'Total',
      noMilestones: 'No milestones registered',
      engineerAdvance: 'Engineer Advance',
      investorInflow: 'Investor Inflow',
      projectExpense: 'Project Expense',
      totalBudget: 'Total Budget',
      totalCollected: 'Total Collected',
      cashFlow: 'Cash Flow',
      totalLaborCost: 'Total Labor Cost',
      budgetUsage: 'Budget Usage',
      mainContract: 'Main Contract',
      amendments: 'Amendments',
      fromProjectBudget: 'From Project Budget',
      paidMilestones: 'Paid Milestones',
      expensePayments: 'Expense Payments',
      paidLaborGroups: 'Paid Labor Groups',
      margin: 'Margin',
      netMargin: 'Net Margin',
      used: 'Used',
      available: 'Available',
      backToProjects: 'Back to Projects',
      // New keys from audit
      scopeSpendingBreakdown: 'Scope Spending Breakdown',
      addIncomeOrAdvance: 'Add Income/Advance',
      addProjectExpense: 'Add Project Expense',
      transactionType: 'Transaction Type',
      selectTransactionType: 'Select Transaction Type',
      incomeType: 'Income Type',
      selectIncomeType: 'Select Income Type',
      engineerName: 'Engineer/Employee Name',
      engineerNamePlaceholder: 'Example: Ahmed Mohammed',
      descriptionOrPhase: 'Description/Phase Name',
      descriptionPlaceholder: 'Example: Foundation phase...',
      workScopeOptional: 'Work Scope (Optional)',
      selectWorkScope: 'Select Work Scope',
      previousCompletion: 'Previous Completion (%)',
      dueDate: 'Due Date',
      treasuryAccountTooltip: 'Select account to deposit amount',
      referenceNumberOptional: 'Reference Number (Optional)',
      referenceNumberPlaceholder: 'Reference number or receipt number',
      date: 'Date',
      treasuryOrCashBox: 'Treasury/Cash Box',
      selectTreasuryOrCashBox: 'Select Treasury/Cash Box',
      description: 'Description',
      descriptionPlaceholder: 'Expense description...',
      currency: 'Currency'
    },
    customers: {
      title: 'Customer Management',
      subtitle: 'Manage company customer base',
      customer: 'Customer',
      contactInfo: 'Contact Information',
      type: 'Type',
      status: 'Status',
      balance: 'Balance',
      totalPurchases: 'Total Purchases',
      actions: 'Actions',
      viewDetails: 'View Details',
      edit: 'Edit',
      delete: 'Delete',
      deleteCustomer: 'Delete Customer',
      deleteCustomerConfirm: 'Are you sure you want to delete this customer?',
      addCustomer: 'Add Customer',
      editCustomer: 'Edit Customer',
      newCustomer: 'New Customer',
      customerName: 'Customer Name',
      customerNameRequired: 'Please enter customer name',
      email: 'Email',
      emailRequired: 'Please enter email',
      emailInvalid: 'Please enter a valid email',
      phone: 'Phone',
      phoneRequired: 'Please enter phone number',
      phoneInvalid: 'Please enter a valid phone number',
      company: 'Company Name',
      companyOptional: 'Company Name (Optional)',
      address: 'Address',
      notes: 'Notes',
      notesOptional: 'Notes (Optional)',
      individual: 'Individual',
      corporate: 'Corporate',
      active: 'Active',
      inactive: 'Inactive',
      totalCustomers: 'Total Customers',
      activeCustomers: 'Active Customers',
      corporateCustomers: 'Corporate Customers',
      totalBalance: 'Total Balance',
      searchPlaceholder: 'Search by customer name, email or phone...',
      statusFilter: 'Customer Status',
      typeFilter: 'Customer Type',
      all: 'All',
      export: 'Export',
      registrationDate: 'Registration Date',
      totalOrders: 'Total Orders',
      lastPurchase: 'Last Purchase',
      customerAdded: 'Customer added successfully',
      customerUpdated: 'Customer updated successfully',
      customerDeleted: 'Customer deleted successfully',
      failedToAdd: 'Failed to add customer',
      failedToUpdate: 'Failed to update customer',
      failedToDelete: 'Failed to delete customer',
      failedToLoad: 'Failed to load customer data',
      fillRequiredFields: 'Please fill all required fields correctly',
      errorSaving: 'An error occurred while saving customer',
      versionMismatch: 'Customer data has been modified. Please refresh and try again.',
      exportSuccess: 'Data exported successfully',
      noData: 'No data available'
    },
    incomes: {
      title: 'Incomes Management',
      subtitle: 'Manage all income records',
      newIncome: 'New Income',
      editIncome: 'Edit Income',
      deleteIncome: 'Delete Income',
      incomeNumber: 'Income Number',
      projectName: 'Project Name',
      amount: 'Amount',
      date: 'Date',
      description: 'Description',
      status: 'Status',
      incomeCreated: 'Income created successfully!',
      incomeUpdated: 'Income updated successfully!',
      incomeDeleted: 'Income deleted successfully',
      failedToLoad: 'Failed to load incomes data',
      failedToSave: 'Failed to save income',
      failedToDelete: 'Failed to delete income',
      fillRequiredFields: 'Please fill all required fields',
      // New keys from audit
      currency: 'Currency',
      currencyTooltip: 'Currency is set at the branch level and cannot be changed per transaction'
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
      transactions: 'Transactions',
      filterByAccountPlaceholder: 'Filter by account',
      searchTransactionsPlaceholder: 'Search transactions',
      accountNamePlaceholder: 'Account name',
      selectAccountTypePlaceholder: 'Select account type',
      selectVisibilityPlaceholder: 'Select visibility',
      selectCurrencyPlaceholder: 'Select currency',
      initialBalancePlaceholder: '0',
      visibility: 'Visibility',
      initialBalance: 'Initial Balance',
      mainCurrenciesLabel: 'Main Currencies',
      otherCurrenciesLabel: 'Other Global Currencies',
      // New keys from audit
      currency: 'Currency'
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
      users: 'Users',
      companyNamePlaceholder: 'Company Name',
      emailPlaceholder: 'Email Address',
      phonePlaceholder: 'Phone Number',
      taxNumberPlaceholder: 'Tax Number (Optional)',
      addressPlaceholder: 'Full Address',
      smtpHostPlaceholder: 'smtp.gmail.com',
      smtpPortPlaceholder: '587',
      smtpUserPlaceholder: 'Email Address',
      smtpPasswordPlaceholder: 'Email Password',
      fromEmailPlaceholder: 'noreply@company.com',
      fromNamePlaceholder: 'ERP System',
      managerNamePlaceholder: 'Manager Name',
      managerTitlePlaceholder: 'e.g., General Manager',
      websiteUrlPlaceholder: 'Website URL',
      commercialRegisterPlaceholder: 'Commercial Register Number',
      passwordPlaceholder: 'Password (min 8 characters)',
      fullNamePlaceholder: 'Full Name',
      selectRolePlaceholder: 'Select Role',
      branchNamePlaceholder: 'Enter branch name',
      selectCurrencyPlaceholder: 'Select currency',
      branches: 'Branches',
      companySettings: 'Company Settings',
      userManagement: 'User Management',
      companyInformation: 'Company Information',
      authorizedManagerName: 'Authorized Manager Name',
      managerTitle: 'Manager Title/Position',
      companyPhone: 'Company Phone',
      companyEmail: 'Company Email',
      companyWebsite: 'Company Website',
      companyAddress: 'Company Address',
      vatPercentage: 'VAT Percentage (%)',
      enableVAT: 'Enable VAT',
      brandingAndMedia: 'Branding & Media',
      fullPageLetterhead: 'Full-Page Letterhead (A4 Background)',
      letterheadImage: 'Letterhead Image',
      digitalStamp: 'Digital Stamp (Transparent PNG)',
      companyLogo: 'Company Logo (Optional)',
      contentMargins: 'Content Margins',
      topMargin: 'Top Margin (cm)',
      bottomMargin: 'Bottom Margin (cm)',
      saveCompanySettings: 'Save Company Settings',
      logoAndBranding: 'Logo & Branding',
      vatPercentageExample: 'e.g., 15',
      vatPercentageExtra: 'Leave empty or 0 to disable VAT',
      enabled: 'Enabled',
      disabled: 'Disabled',
      uploadLetterhead: 'Upload Letterhead',
      currentLetterhead: 'Current letterhead:',
      newLetterheadPreview: 'New letterhead preview:',
      uploadStamp: 'Upload Stamp',
      uploadLogo: 'Upload Logo',
      letterheadInstructions: 'Full-Page Letterhead Instructions',
      letterheadInstructionsDescription: 'Upload a high-resolution PNG/JPG image of your entire A4 page including header, footer, and watermark. The system will use this as a background layer, and quotation content will flow over it.',
      letterheadImageExtra: 'Upload a high-resolution PNG/JPG of the entire A4 page (210mm x 297mm) including header, footer, and watermark. Recommended: 2480x3508 pixels at 300 DPI.',
      digitalStampExtra: 'Upload a transparent PNG of your company stamp/signature. Recommended: 300x300 pixels.',
      companyLogoExtra: 'Upload your company logo. Recommended: 300x100 pixels.',
      topMarginExtra: 'Distance from top of letterhead to start of content. Default: 4cm',
      bottomMarginExtra: 'Distance from bottom of letterhead to end of content. Default: 3cm',
      pleaseEnterCompanyName: 'Please enter company name',
      pleaseEnterManagerName: 'Please enter manager name',
      pleaseEnterManagerTitle: 'Please enter manager title',
      pleaseEnterTopMargin: 'Please enter top margin',
      pleaseEnterBottomMargin: 'Please enter bottom margin'
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
      selectTreasuryAccount: 'Select Treasury Account',
      subtitle: 'Manage general expenses',
      title: 'General Expenses',
      totalExpenses: 'Total Expenses',
      treasuryAccount: 'Treasury Account',
      searchExpensePlaceholder: 'Search expenses...',
      searchAdvanceSettlement: 'Search advance or settlement...',
      selectEmployee: 'Select Employee',
      enterVendorRepresentativeName: 'Enter vendor/representative name',
      selectOpenAdvanceApproved: 'Select open advance (approved only)',
      selectWorkScopeOptional: 'Select work scope (Optional)',
      searchSupplierCustomer: 'Search for supplier or customer by name or phone...',
      supplierNamePlaceholder: 'Supplier Name',
      phoneNumberPlaceholder: 'Phone Number',
      emailPlaceholder: 'Email Address',
      itemDescriptionPlaceholder: 'Item/Material description',
      quantityPlaceholder: 'Quantity',
      unitPricePlaceholder: 'Unit Price',
      selectProjectOptional: 'Select Project (Optional)',
      amountPlaceholder: '0.00',
      selectTreasuryAccountPlaceholder: 'Select Treasury Account',
      referenceNumberPlaceholder: 'Reference Number',
      selectCategoryPlaceholder: 'Select Category',
      newCategoryNamePlaceholder: 'New Category Name',
      expenseDescriptionPlaceholder: 'Expense description (Optional)',
      enterExternalRecipientName: 'Enter external recipient name',
      selectDatePlaceholder: 'Select date (default: today)',
      expenseNumberPlaceholder: 'EXP-001 (will be auto-generated if empty)',
      selectProjectPlaceholder: 'Select Project',
      additionalNotesPlaceholder: 'Any additional notes...',
      selectNewProjectPlaceholder: 'Select New Project',
      workScopeLabel: 'Work Scope (Optional)',
      vendorRecipientLabel: 'Vendor/Recipient',
      supplierNameLabel: 'Supplier Name',
      phoneOptionalLabel: 'Phone Number (Optional)',
      emailOptionalLabel: 'Email Address (Optional)',
      purchaseOrderItemsLabel: 'Purchase Order Items',
      addItemButton: 'Add Item',
      addedItemsLabel: 'Added Items',
      itemDescriptionColumn: 'Item/Material Description',
      quantityColumn: 'Quantity',
      unitPriceColumn: 'Unit Price',
      totalColumn: 'Total',
      deleteColumn: 'Delete',
      totalAmountLabel: 'Total Amount:',
      exceedsRemainingLabel: 'Exceeds remaining amount',
      projectOptionalLabel: 'Project (Optional)',
      treasuryAccountLabel: 'Treasury Account',
      recipientTypeLabel: 'Recipient Type',
      recipientNameLabel: 'Recipient Name',
      dateLabel: 'Date',
      statusLabel: 'Status',
      referenceNumberLabel: 'Reference Number',
      referenceNumberOptionalLabel: 'Reference Number (Optional)',
      purchaseOrderStatusLabel: 'Purchase Order Status',
      settlementPoDivider: 'Create Purchase Order (PO) for Settlement',
      projectLabel: 'Project',
      workScopeBoldLabel: 'Work Scope',
      purchaseItemsDivider: 'Purchase Items',
      settlementAdvanceNote: 'Note: Payment method for this settlement is "Settlement Advance" (settlement) - automatically set and cannot be modified.',
      autoGeneratedReference: 'Will be auto-generated',
      amountExceedsAdvance: 'Amount exceeds available advance balance',
      categoryNameRequired: 'Please enter category name',
      categoryAdded: 'Category added successfully',
      failedToAddCategory: 'Failed to add category',
      itemDescriptionRequired: 'Please enter item description',
      quantityMustBeGreaterThanZero: 'Quantity must be greater than zero',
      unitPriceMustBeGreaterThanOrEqualToZero: 'Unit price must be greater than or equal to zero',
      itemAdded: 'Item added successfully',
      addNewSupplier: 'Add New Supplier',
      addAtLeastOneItem: 'Please add at least one item',
      supplierNameRequired: 'Please enter supplier name',
      supplierAddedSuccessfully: 'New supplier added successfully',
      failedToAddSupplier: 'Failed to add new supplier',
      selectOrAddSupplier: 'Please select or add a supplier',
      selectProjectRequired: 'Please select project',
      selectTreasuryAccountRequired: 'Please select treasury account/bank for payment',
      treasuryAccountNotFound: 'Selected treasury account not found',
      orderAddedSuccessfully: 'Purchase order added successfully',
      zeroOrNegativeAmountWarning: 'Warning: Total amount is zero or negative, will not deduct from treasury',
      purchaseOrderDescription: 'Purchase Order',
      amountDeductedFromTreasury: 'Amount deducted from treasury account',
      failedToDeductFromTreasury: 'Failed to deduct amount from treasury',
      errorDeductingFromTreasury: 'Error while deducting amount from treasury',
      unknownError: 'Unknown error',
      failedToCreateOrder: 'Failed to create purchase order',
      selectEmployeeRequired: 'Please select employee (Project manager required when linking project)',
      employeeNotFound: 'Selected employee not found',
      employeeLabel: 'Employee',
      verifyEmployeeSelection: 'Please verify employee selection is correct',
      enterManagerNameOrSelectEmployee: 'Please enter project manager name or select employee',
      enterValidAmount: 'Please enter a valid amount',
      selectOpenAdvance: 'Please select open advance',
      linkedAdvanceDetailsNotFound: 'Linked advance details not found',
      linkedAdvanceNoProject: 'Linked advance does not have a project. Please select a project for settlement',
      selectOrAddVendorForPO: 'Please select or add vendor/recipient for purchase order',
      addAtLeastOneItemForPO: 'Please add at least one item for purchase order',
      itemTotalMustBeGreaterThanZero: 'Item total must be greater than zero',
      advanceFullySettled: 'Advance is fully settled - cannot create new settlement',
      amountExceedsAvailableBalance: 'Amount exceeds available advance balance',
      enterVendorRecipientName: 'Please enter vendor/recipient name',
      settlementAndPOSaved: 'Settlement and purchase order saved successfully',
      failedToSaveSettlementAndPO: 'Failed to save settlement and purchase order',
      selectTreasuryAccountForReturn: 'Please select treasury account for return',
      settlementSaved: 'Settlement saved successfully',
      advanceRequestSaved: 'Advance request saved successfully - pending approval',
      advanceSaved: 'Advance saved successfully',
      settlementReturnDescription: 'Settlement Advance (Return)',
      selectCategory: 'Please select category',
      selectPaymentFrequency: 'Please select payment frequency',
      expenseRequestSaved: 'Expense request saved successfully - pending approval',
      expenseSaved: 'Expense saved successfully',
      failedToSaveExpense: 'Failed to save expense',
      saveError: 'Save error',
      allowPopupsForPrinting: 'Please allow popups for printing'
    },
    approvalWorkflow: {
      title: 'Approval Workflow & Print Controls',
      status: 'Status:',
      shareWhatsApp: 'Share via WhatsApp',
      approve: 'Approve',
      reject: 'Reject / Request Changes',
      submitForApproval: 'Submit for Approval',
      managerNotes: 'Manager Notes:',
      managerNotesPlaceholder: 'Enter manager notes...'
    },
    quotations: {
      accepted: 'Accepted',
      converted: 'Converted',
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
      workType: 'Work Type',
      builder: 'Builder',
      quotationBuilder: 'Quotation Builder',
      saveDraft: 'Save Draft',
      generatePDF: 'Generate PDF',
      header: 'Header',
      boq: 'BOQ',
      content: 'Content',
      company: 'Company',
      attention: 'Attention',
      project: 'Project',
      subject: 'Subject',
      refNo: 'REF NO',
      date: 'Date',
      customer: 'Customer',
      customerName: 'Customer Name',
      phone: 'Phone',
      email: 'Email',
      addRow: 'Add Row',
      total: 'Total',
      introduction: 'Introduction',
      scopeOfWork: 'Scope of Work',
      exclusions: 'Exclusions',
      facilities: 'Facilities',
      termsAndConditions: 'Terms & Conditions',
      validityPeriod: 'Validity Period (Days)',
      days: 'days',
      pdfPreview: 'PDF Preview',
      refresh: 'Refresh',
      draftSaved: 'Draft saved successfully',
      pdfGenerated: 'PDF generated successfully',
      activities: 'Activities',
      amount: 'Amount',
      statistics: 'Statistics',
      totalQuotations: 'Total Quotations',
      draftQuotations: 'Draft Quotations',
      sentQuotations: 'Sent Quotations',
      acceptedQuotations: 'Approved Quotations',
      rejectedQuotations: 'Rejected Quotations',
      totalValue: 'Total Value',
      pending: 'Pending',
      client: 'Client',
      description: 'Description'
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
      and: 'و',
      more: 'المزيد',
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
      yes: 'نعم',
      to: 'إلى',
      days: 'أيام'
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
      workScope: 'نطاق العمل',
      workScopeFromQuotation: 'نطاق العمل موروث من العرض المحدد',
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
      workTypes: {}, // Will be populated dynamically
      searchByContractNumberPlaceholder: 'البحث برقم العقد أو اسم العميل...',
      searchForClientPlaceholder: 'البحث عن العميل بالاسم أو الهاتف...',
      clientNamePlaceholder: 'اسم العميل',
      phoneNumberPlaceholder: 'رقم الهاتف',
      projectNamePlaceholder: 'اسم المشروع',
      selectProjectPlaceholder: 'اختر المشروع',
      selectWorkScopePlaceholder: 'اختر نطاق العمل',
      additionalNotesPlaceholder: 'ملاحظات إضافية...',
      currencyAutoSetPlaceholder: 'سيتم تعيين العملة تلقائياً',
      amountPlaceholder: '0',
      selectStartDatePlaceholder: 'اختر تاريخ البدء',
      selectEndDatePlaceholder: 'اختر تاريخ الانتهاء',
      // New keys from audit
      currency: 'العملة',
      currencyTooltip: 'العملة مضبوطة تلقائياً بناءً على حساب الخزينة المحدد'
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
      deductionReason: 'سبب الخصومات',
      deductionReasonRequired: 'سبب الخصومات مطلوب عند وجود خصومات',
      selectPaymentMethod: 'يرجى اختيار طريقة الدفع',
      selectTreasuryAccount: 'يرجى اختيار حساب الخزينة',
      selectAdvance: 'يرجى اختيار العهدة',
      noAdvancesAvailable: 'لا توجد عهد مفتوحة ومعتمدة لهذا المهندس',
      advanceInsufficient: 'تحذير: رصيد العهدة غير كاف',
      advanceSufficient: 'رصيد العهدة كاف',
      paymentFromTreasury: 'من الخزينة/البنك',
      paymentFromAdvance: 'خصم من عهدة المهندس',
      addGroup: 'إنشاء مجموعة جديدة',
      noLaborGroups: 'لا توجد مجموعات عمالة مسجلة',
      totalGroups: 'إجمالي',
      noEmployees: 'لا توجد موظفين مسجلين',
      totalEmployees: 'إجمالي',
      deleteEmployeeConfirm: 'هل أنت متأكد من حذف هذا الموظف؟',
      deleteGroupConfirm: 'هل أنت متأكد من حذف هذه المجموعة؟'
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
      validateDates: 'يرجى التحقق من صحة التواريخ المدخلة',
      projectNotFound: 'المشروع غير موجود',
      failedToLoadProject: 'فشل في تحميل بيانات المشروع'
    },
    projectDetails: {
      expenseType: 'نوع المصروف',
      paymentExpense: 'دفعة (مصروف)',
      payment: 'دفعة',
      transactionType: 'نوع المعاملة',
      milestoneNumber: 'رقم المستخلص',
      descriptionMilestone: 'الوصف/المرحلة',
      milestone: 'مستخلص',
      engineer: 'المهندس',
      treasuryAccount: 'الخزينة/الحساب',
      selectTreasuryAccount: 'يرجى اختيار حساب الخزينة',
      selectTransactionType: 'يرجى اختيار نوع المعاملة',
      investorInflowCreated: 'تم إنشاء وارد المستثمر بنجاح',
      failedToCreateInvestorInflow: 'فشل في إنشاء وارد المستثمر',
      enterEngineerName: 'يرجى إدخال اسم المهندس/الموظف',
      advanceForEngineer: 'صرف عهدة لمهندس',
      advanceCreatedTreasuryError: 'تم إنشاء العهدة بنجاح، لكن حدث خطأ في تحديث الخزينة',
      employeeAdvanceCreated: 'تم إنشاء عهدة الموظف بنجاح',
      failedToCreateEmployeeAdvance: 'فشل في إنشاء عهدة الموظف',
      errorCreatingTransaction: 'حدث خطأ أثناء إنشاء المعاملة',
      projectExpenses: 'مصاريف المشروع',
      addNewExpense: 'إضافة مصروف جديد',
      expenseWarning: 'تنبيه: المصاريف المدخلة هنا مرتبطة حصرياً بهذا المشروع',
      itemType: 'نوع العنصر',
      generalExpense: 'مصروف عام',
      custodyDeduction: 'خصم من عهدة',
      expensesProcurementLedger: 'سجل المصاريف والمشتريات',
      generalExpensesExcluded: 'المصاريف العامة مستثناة',
      noTransactions: 'لا توجد معاملات لهذا المشروع',
      totalTransactions: 'إجمالي',
      totalExpenses: 'إجمالي',
      noExpenses: 'لا توجد مصاريف مسجلة',
      projectIdNotFound: 'معرف المشروع غير موجود',
      selectCustody: 'يرجى اختيار العهدة',
      custodyNotFound: 'العهدة المحددة غير موجودة',
      custodyInsufficient: 'رصيد العهدة غير كاف. المتاح',
      expenseDeductedFromCustody: 'تم خصم المصروف من العهدة بنجاح',
      failedToDeductExpense: 'فشل في خصم المصروف',
      errorCreatingExpense: 'حدث خطأ أثناء إنشاء المصروف',
      expenseCreated: 'تم إنشاء المصروف بنجاح',
      failedToCreateExpense: 'فشل في إنشاء المصروف',
      navigateToOrders: 'سيتم توجيهك إلى صفحة أوامر الشراء لإنشاء أمر شراء جديد',
      totalMilestones: 'إجمالي',
      noMilestones: 'لا توجد مستخلصات مسجلة',
      engineerAdvance: 'عهدة مهندس',
      investorInflow: 'وارد مستثمر',
      projectExpense: 'مصروف مشروع',
      totalBudget: 'الميزانية الإجمالية',
      totalCollected: 'إجمالي المحصل',
      cashFlow: 'التدفق النقدي',
      totalLaborCost: 'إجمالي تكلفة العمالة',
      budgetUsage: 'استخدام الميزانية',
      mainContract: 'العقد الأساسي',
      amendments: 'ملحق',
      fromProjectBudget: 'من ميزانية المشروع',
      paidMilestones: 'مستخلص مدفوع',
      expensePayments: 'دفعة مصروف',
      paidLaborGroups: 'مجموعة عمالة مدفوعة',
      margin: 'الهامش',
      netMargin: 'صافي الهامش',
      used: 'المستخدم',
      available: 'المتاح',
      backToProjects: 'العودة إلى المشاريع',
      // New keys from audit
      scopeSpendingBreakdown: 'توزيع الإنفاق حسب نطاق العمل',
      addIncomeOrAdvance: 'إضافة وارد/سلفة جديدة',
      addProjectExpense: 'إضافة مصروف جديد للمشروع',
      transactionType: 'نوع المعاملة',
      selectTransactionType: 'اختر نوع المعاملة',
      incomeType: 'نوع الوارد',
      selectIncomeType: 'اختر نوع الوارد',
      engineerName: 'اسم المهندس/الموظف',
      engineerNamePlaceholder: 'مثال: أحمد محمد',
      descriptionOrPhase: 'الوصف/اسم المرحلة',
      descriptionPlaceholder: 'مثال: مرحلة الأساسات، مرحلة البنية التحتية...',
      workScopeOptional: 'نطاق العمل (اختياري)',
      selectWorkScope: 'اختر نطاق العمل',
      previousCompletion: 'نسبة الإنجاز السابقة (%)',
      dueDate: 'تاريخ الاستحقاق',
      treasuryAccountTooltip: 'اختر الحساب الذي سيتم إيداع المبلغ فيه',
      referenceNumberOptional: 'رقم المرجع (اختياري)',
      referenceNumberPlaceholder: 'رقم المرجع أو رقم الإيصال',
      date: 'التاريخ',
      treasuryOrCashBox: 'الخزينة/الصندوق',
      selectTreasuryOrCashBox: 'اختر الخزينة/الصندوق',
      description: 'الوصف',
      descriptionPlaceholder: 'وصف المصروف...',
      currency: 'العملة'
    },
    incomes: {
      title: 'إدارة الواردات',
      subtitle: 'إدارة جميع سجلات الواردات',
      newIncome: 'وارد جديد',
      editIncome: 'تعديل وارد',
      deleteIncome: 'حذف وارد',
      incomeNumber: 'رقم الوارد',
      projectName: 'اسم المشروع',
      amount: 'المبلغ',
      date: 'التاريخ',
      description: 'الوصف',
      status: 'الحالة',
      incomeCreated: 'تم إنشاء الوارد بنجاح!',
      incomeUpdated: 'تم تحديث الوارد بنجاح!',
      incomeDeleted: 'تم حذف الوارد بنجاح',
      failedToLoad: 'فشل في تحميل بيانات الواردات',
      failedToSave: 'فشل في حفظ الوارد',
      failedToDelete: 'فشل في حذف الوارد',
      fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
      // New keys from audit
      currency: 'العملة',
      currencyTooltip: 'العملة مضبوطة على مستوى الفرع ولا يمكن تغييرها لكل معاملة'
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
      transactions: 'المعاملات',
      filterByAccountPlaceholder: 'تصفية حسب الحساب',
      searchTransactionsPlaceholder: 'بحث في المعاملات',
      accountNamePlaceholder: 'اسم الحساب',
      selectAccountTypePlaceholder: 'اختر نوع الحساب',
      selectVisibilityPlaceholder: 'اختر الرؤية',
      selectCurrencyPlaceholder: 'اختر العملة',
      initialBalancePlaceholder: '0',
      visibility: 'الرؤية',
      initialBalance: 'الرصيد الأولي',
      mainCurrenciesLabel: 'العملات الأساسية',
      otherCurrenciesLabel: 'باقي العملات العالمية',
      // New keys from audit
      currency: 'العملة'
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
      users: 'المستخدمون',
      companyNamePlaceholder: 'اسم الشركة',
      emailPlaceholder: 'البريد الإلكتروني',
      phonePlaceholder: 'رقم الهاتف',
      taxNumberPlaceholder: 'الرقم الضريبي (اختياري)',
      addressPlaceholder: 'العنوان الكامل',
      smtpHostPlaceholder: 'smtp.gmail.com',
      smtpPortPlaceholder: '587',
      smtpUserPlaceholder: 'البريد الإلكتروني',
      smtpPasswordPlaceholder: 'كلمة مرور البريد',
      fromEmailPlaceholder: 'noreply@company.com',
      fromNamePlaceholder: 'نظام ERP',
      managerNamePlaceholder: 'اسم المدير',
      managerTitlePlaceholder: 'مثل: المدير العام',
      websiteUrlPlaceholder: 'رابط الموقع',
      commercialRegisterPlaceholder: 'رقم السجل التجاري',
      passwordPlaceholder: 'كلمة المرور (8 أحرف على الأقل)',
      fullNamePlaceholder: 'الاسم الكامل',
      selectRolePlaceholder: 'اختر الدور',
      branchNamePlaceholder: 'أدخل اسم الفرع',
      selectCurrencyPlaceholder: 'اختر العملة',
      branches: 'الفروع',
      companySettings: 'إعدادات الشركة',
      userManagement: 'إدارة المستخدمين',
      companyInformation: 'معلومات الشركة',
      authorizedManagerName: 'اسم المدير المصرح',
      managerTitle: 'منصب المدير',
      companyPhone: 'هاتف الشركة',
      companyEmail: 'بريد الشركة',
      companyWebsite: 'موقع الشركة',
      companyAddress: 'عنوان الشركة',
      vatPercentage: 'نسبة ضريبة القيمة المضافة (%)',
      enableVAT: 'تفعيل ضريبة القيمة المضافة',
      brandingAndMedia: 'العلامة التجارية والوسائط',
      fullPageLetterhead: 'الورقة الرسمية الكاملة (خلفية A4)',
      letterheadImage: 'صورة الورقة الرسمية',
      digitalStamp: 'الختم الرقمي (PNG شفاف)',
      companyLogo: 'شعار الشركة (اختياري)',
      contentMargins: 'هوامش المحتوى',
      topMargin: 'الهامش العلوي (سم)',
      bottomMargin: 'الهامش السفلي (سم)',
      saveCompanySettings: 'حفظ إعدادات الشركة',
      logoAndBranding: 'الشعار والعلامة التجارية',
      vatPercentageExample: 'مثال: 15',
      vatPercentageExtra: 'اتركه فارغاً أو 0 لإلغاء ضريبة القيمة المضافة',
      enabled: 'مفعل',
      disabled: 'معطل',
      uploadLetterhead: 'رفع الورقة الرسمية',
      currentLetterhead: 'الورقة الرسمية الحالية:',
      newLetterheadPreview: 'معاينة الورقة الرسمية الجديدة:',
      uploadStamp: 'رفع الختم',
      uploadLogo: 'رفع الشعار',
      letterheadInstructions: 'تعليمات الورقة الرسمية',
      letterheadInstructionsDescription: 'قم برفع صورة عالية الدقة PNG/JPG لصفحة A4 كاملة تتضمن الرأس والتذييل والعلامة المائية. سيستخدم النظام هذا كطبقة خلفية، وسيتدفق محتوى العرض فوقها.',
      letterheadImageExtra: 'قم برفع صورة عالية الدقة PNG/JPG للصفحة الكاملة (210mm x 297mm) تتضمن الرأس والتذييل والعلامة المائية. الموصى به: 2480x3508 بكسل بدقة 300 DPI.',
      digitalStampExtra: 'قم برفع PNG شفاف لختم الشركة/التوقيع. الموصى به: 300x300 بكسل.',
      companyLogoExtra: 'قم برفع شعار الشركة. الموصى به: 300x100 بكسل.',
      topMarginExtra: 'المسافة من أعلى الورقة الرسمية إلى بداية المحتوى. الافتراضي: 4سم',
      bottomMarginExtra: 'المسافة من أسفل الورقة الرسمية إلى نهاية المحتوى. الافتراضي: 3سم',
      pleaseEnterCompanyName: 'يرجى إدخال اسم الشركة',
      pleaseEnterManagerName: 'يرجى إدخال اسم المدير',
      pleaseEnterManagerTitle: 'يرجى إدخال منصب المدير',
      pleaseEnterTopMargin: 'يرجى إدخال الهامش العلوي',
      pleaseEnterBottomMargin: 'يرجى إدخال الهامش السفلي'
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
      selectTreasuryAccount: 'اختر حساب الخزينة',
      subtitle: 'إدارة المصاريف العامة',
      title: 'المصاريف العامة',
      totalExpenses: 'إجمالي المصاريف',
      treasuryAccount: 'حساب الخزينة',
      searchExpensePlaceholder: 'البحث في المصاريف...',
      searchAdvanceSettlement: 'البحث في العهدة أو التسوية...',
      selectEmployee: 'اختر الموظف',
      enterVendorRepresentativeName: 'أدخل اسم المورد/الممثل',
      selectOpenAdvanceApproved: 'اختر العهدة المفتوحة (معتمدة فقط)',
      selectWorkScopeOptional: 'اختر نطاق العمل (اختياري)',
      searchSupplierCustomer: 'ابحث عن مورد أو عميل بالاسم أو الهاتف...',
      supplierNamePlaceholder: 'اسم المورد',
      phoneNumberPlaceholder: 'رقم الهاتف',
      emailPlaceholder: 'البريد الإلكتروني',
      itemDescriptionPlaceholder: 'وصف البند/المادة',
      quantityPlaceholder: 'الكمية',
      unitPricePlaceholder: 'سعر الوحدة',
      selectProjectOptional: 'اختر المشروع (اختياري)',
      amountPlaceholder: '0.00',
      selectTreasuryAccountPlaceholder: 'اختر حساب الخزينة',
      referenceNumberPlaceholder: 'رقم المرجع',
      selectCategoryPlaceholder: 'اختر الفئة',
      newCategoryNamePlaceholder: 'اسم الفئة الجديدة',
      expenseDescriptionPlaceholder: 'وصف المصروف (اختياري)',
      enterExternalRecipientName: 'أدخل اسم المستلم الخارجي',
      selectDatePlaceholder: 'اختر التاريخ (افتراضي: اليوم)',
      expenseNumberPlaceholder: 'EXP-001 (سيتم توليده تلقائياً إذا كان فارغاً)',
      selectProjectPlaceholder: 'اختر المشروع',
      additionalNotesPlaceholder: 'أي ملاحظات إضافية...',
      selectNewProjectPlaceholder: 'اختر المشروع الجديد',
      workScopeLabel: 'نطاق العمل (اختياري)',
      vendorRecipientLabel: 'المورد/المستلم',
      supplierNameLabel: 'اسم المورد',
      phoneOptionalLabel: 'رقم الهاتف (اختياري)',
      emailOptionalLabel: 'البريد الإلكتروني (اختياري)',
      purchaseOrderItemsLabel: 'بنود أمر الشراء',
      addItemButton: 'إضافة بند',
      addedItemsLabel: 'البنود المضافة',
      itemDescriptionColumn: 'وصف البند/المادة',
      quantityColumn: 'الكمية',
      unitPriceColumn: 'سعر الوحدة',
      totalColumn: 'الإجمالي',
      deleteColumn: 'حذف',
      totalAmountLabel: 'المبلغ الإجمالي:',
      exceedsRemainingLabel: 'يتجاوز المبلغ المتبقي',
      projectOptionalLabel: 'المشروع (اختياري)',
      treasuryAccountLabel: 'حساب الخزينة',
      recipientTypeLabel: 'نوع المستلم',
      recipientNameLabel: 'اسم المستلم',
      dateLabel: 'التاريخ',
      statusLabel: 'الحالة',
      referenceNumberLabel: 'رقم المرجع',
      referenceNumberOptionalLabel: 'رقم المرجع (اختياري)',
      purchaseOrderStatusLabel: 'حالة أمر الشراء',
      settlementPoDivider: 'إنشاء أمر شراء (Purchase Order) للتسوية',
      projectLabel: 'المشروع',
      workScopeBoldLabel: 'نطاق العمل',
      purchaseItemsDivider: 'بنود الشراء',
      settlementAdvanceNote: 'ملاحظة: طريقة الدفع لهذه التسوية هي "تسوية عهدة" (settlement) - يتم تعيينها تلقائياً ولا يمكن تعديلها.',
      autoGeneratedReference: 'سيتم توليد الرقم تلقائياً',
      amountExceedsAdvance: 'المبلغ المدخل أكبر من الرصيد المتاح في العهدة',
      categoryNameRequired: 'يرجى إدخال اسم الفئة',
      categoryAdded: 'تم إضافة الفئة بنجاح',
      failedToAddCategory: 'فشل في إضافة الفئة',
      itemDescriptionRequired: 'يرجى إدخال وصف البند',
      quantityMustBeGreaterThanZero: 'الكمية يجب أن تكون أكبر من صفر',
      unitPriceMustBeGreaterThanOrEqualToZero: 'سعر الوحدة يجب أن يكون أكبر من أو يساوي صفر',
      itemAdded: 'تم إضافة البند',
      // New keys from audit
      currency: 'العملة',
      currencyTooltip: 'العملة مضبوطة على مستوى الفرع ولا يمكن تغييرها لكل معاملة',
      addNewSupplier: 'إضافة مورد جديد',
      addAtLeastOneItem: 'يرجى إضافة بند واحد على الأقل',
      supplierNameRequired: 'يرجى إدخال اسم المورد',
      supplierAddedSuccessfully: 'تم إضافة المورد الجديد بنجاح',
      failedToAddSupplier: 'فشل في إضافة المورد الجديد',
      selectOrAddSupplier: 'يرجى اختيار أو إضافة مورد',
      selectProjectRequired: 'يرجى اختيار المشروع',
      selectTreasuryAccountRequired: 'يرجى اختيار حساب الخزينة/البنك للصرف',
      treasuryAccountNotFound: 'حساب الخزينة المحدد غير موجود',
      orderAddedSuccessfully: 'تم إضافة أمر الشراء بنجاح',
      zeroOrNegativeAmountWarning: '⚠️ تحذير: المبلغ الإجمالي صفر أو سالب، لن يتم خصم من الخزينة',
      purchaseOrderDescription: 'أمر شراء',
      amountDeductedFromTreasury: 'تم خصم المبلغ من حساب الخزينة',
      failedToDeductFromTreasury: 'فشل خصم المبلغ من الخزينة',
      errorDeductingFromTreasury: 'خطأ أثناء خصم المبلغ من الخزينة',
      unknownError: 'خطأ غير معروف',
      failedToCreateOrder: 'فشل في إنشاء أمر الشراء',
      selectEmployeeRequired: 'يرجى اختيار الموظف (مدير المشروع مطلوب عند ربط المشروع)',
      employeeNotFound: 'الموظف المحدد غير موجود',
      employeeLabel: 'الموظف',
      verifyEmployeeSelection: 'يرجى التأكد من اختيار الموظف بشكل صحيح',
      enterManagerNameOrSelectEmployee: 'يرجى إدخال اسم مدير المشروع أو اختيار الموظف',
      enterValidAmount: 'يرجى إدخال مبلغ صحيح',
      selectOpenAdvance: 'يرجى اختيار العهدة المفتوحة',
      linkedAdvanceDetailsNotFound: 'لم يتم العثور على تفاصيل العهدة المرتبطة',
      linkedAdvanceNoProject: 'العهدة المرتبطة لا تحتوي على مشروع. يرجى اختيار مشروع للتسوية',
      selectOrAddVendorForPO: 'يرجى اختيار أو إضافة مورد/مستلم لأمر الشراء',
      addAtLeastOneItemForPO: 'يرجى إضافة بند واحد على الأقل لأمر الشراء',
      itemTotalMustBeGreaterThanZero: 'يجب أن يكون مجموع البنود أكبر من صفر',
      advanceFullySettled: 'العهدة تم تسويتها بالكامل - لا يمكن إنشاء تسوية جديدة',
      amountExceedsAvailableBalance: 'المبلغ المدخل أكبر من الرصيد المتاح في العهدة',
      enterVendorRecipientName: 'يرجى إدخال اسم المورد/المستلم',
      settlementAndPOSaved: 'تم حفظ التسوية وأمر الشراء بنجاح',
      failedToSaveSettlementAndPO: 'فشل في حفظ التسوية وأمر الشراء',
      selectTreasuryAccountForReturn: 'يرجى اختيار حساب الخزينة للإرجاع',
      settlementSaved: 'تم حفظ التسوية بنجاح',
      advanceRequestSaved: 'تم حفظ طلب العهدة بنجاح - في انتظار الموافقة',
      advanceSaved: 'تم حفظ العهدة بنجاح',
      settlementReturnDescription: 'تسوية عهدة (مرتجع)',
      selectCategory: 'يرجى اختيار الفئة',
      selectPaymentFrequency: 'يرجى اختيار دورية الصرف',
      expenseRequestSaved: 'تم حفظ طلب المصروف بنجاح - في انتظار الموافقة',
      expenseSaved: 'تم حفظ المصروف بنجاح',
      failedToSaveExpense: 'فشل في حفظ المصروف',
      saveError: 'خطأ في الحفظ',
      allowPopupsForPrinting: 'يرجى السماح بالنوافذ المنبثقة للطباعة',
      // New keys from audit
      readOnlyStatus: 'الحالة للقراءة فقط - لا يمكن تعديلها من قبل المحاسب',
      transferCustody: 'ترحيل العهدة',
      selectTreasuryAccountTooltip: 'اختر الحساب الذي سيتم خصم المصروف منه'
    },
    approvalWorkflow: {
      title: 'سير العمل والموافقة',
      status: 'الحالة:',
      shareWhatsApp: 'مشاركة عبر واتساب',
      approve: 'موافقة',
      reject: 'رفض / طلب تعديلات',
      submitForApproval: 'إرسال للموافقة',
      managerNotes: 'ملاحظات المدير:',
      managerNotesPlaceholder: 'أدخل ملاحظات المدير...'
    },
    quotations: {
      accepted: 'مقبول',
      converted: 'محول',
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
      workType: 'نوع العمل',
      builder: 'منشئ',
      quotationBuilder: 'منشئ العروض',
      saveDraft: 'حفظ المسودة',
      generatePDF: 'إنشاء PDF',
      header: 'الرأس',
      boq: 'جدول الكميات',
      content: 'المحتوى',
      company: 'الشركة',
      attention: 'الانتباه',
      project: 'المشروع',
      subject: 'الموضوع',
      refNo: 'رقم المرجع',
      date: 'التاريخ',
      customer: 'العميل',
      customerName: 'اسم العميل',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      addRow: 'إضافة صف',
      total: 'الإجمالي',
      introduction: 'المقدمة',
      scopeOfWork: 'نطاق العمل',
      exclusions: 'الاستثناءات',
      facilities: 'المرافق',
      termsAndConditions: 'الشروط والأحكام',
      validityPeriod: 'فترة الصلاحية (أيام)',
      days: 'أيام',
      pdfPreview: 'معاينة PDF',
      refresh: 'تحديث',
      draftSaved: 'تم حفظ المسودة بنجاح',
      pdfGenerated: 'تم إنشاء PDF بنجاح',
      activities: 'الأنشطة',
      amount: 'المبلغ',
      statistics: 'الإحصائيات',
      totalQuotations: 'إجمالي العروض',
      draftQuotations: 'العروض المسودة',
      sentQuotations: 'العروض المرسلة',
      acceptedQuotations: 'العروض المعتمدة',
      rejectedQuotations: 'العروض المرفوضة',
      totalValue: 'إجمالي القيمة',
      pending: 'قيد الانتظار',
      client: 'العميل',
      description: 'الوصف'
    }
  }
}

export const getTranslations = (lang: Language): Translations => {
  return translations[lang]
}

export default translations
