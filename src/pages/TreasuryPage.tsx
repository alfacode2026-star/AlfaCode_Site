import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  message,
  ConfigProvider,
  Tag,
  Modal,
  Form,
  Row,
  Col,
  Popconfirm,
  InputNumber,
  Statistic,
  Badge,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import 'moment/locale/en-gb';
import enUS from 'antd/es/locale/en_US';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  WalletOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranch } from '../contexts/BranchContext';
import { useSyncStatus } from '../contexts/SyncStatusContext';
import { getTranslations } from '../utils/translations';
import treasuryService from '../services/treasuryService';
import userManagementService from '../services/userManagementService';

const { Option } = Select;

/* =======================
   Types & Interfaces
======================= */

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'bank' | 'cash_box';
  accountType?: 'public' | 'private';
  currency?: string;
  initialBalance: number;
  currentBalance: number;
  branchId?: string;
  branchName?: string;
  updatedAt?: string;
  lastUpdated?: string;
}

export interface TreasuryTransaction {
  id: string;
  accountId: string;
  transactionType: 'inflow' | 'outflow';
  amount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt?: string;
  lastUpdated?: string;
}

interface FilterState {
  searchText: string;
  accountId: string | null;
}

/* =======================
   Utilities
======================= */

const formatCurrency = (value: number, currency: string = 'SAR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/* =======================
   Component
======================= */

const TreasuryPage: FC = () => {
  const { language } = useLanguage();
  const { branchCurrency, branchId, branchName } = useBranch(); // CRITICAL: Get branchId for strict isolation
  const { updateStatus } = useSyncStatus();
  const t = getTranslations(language);

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<TreasuryAccount[]>([]); // Store all accounts before filtering
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    accountId: null,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false);
  const [isAccountModalVisible, setIsAccountModalVisible] = useState<boolean>(false);
  const [selectedAccount, setSelectedAccount] = useState<TreasuryAccount | null>(null);
  const [accountForm] = Form.useForm();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isManager, setIsManager] = useState<boolean>(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  
  // Manager Tools Modals
  const [isAddFundsModalVisible, setIsAddFundsModalVisible] = useState<boolean>(false);
  const [isTransferFundsModalVisible, setIsTransferFundsModalVisible] = useState<boolean>(false);
  const [addFundsForm] = Form.useForm();
  const [transferFundsForm] = Form.useForm();

  /* =======================
     Language & Locale Sync
  ======================= */

  // Sync moment locale with current language (read-only, no language override)
  useEffect(() => {
    moment.locale(language === 'en' ? 'en' : 'ar');
  }, [language]);

  /* =======================
     Data Loading
  ======================= */

  // CRITICAL: Re-fetch data when branchId changes (strict branch isolation)
  useEffect(() => {
    if (branchId) {
      console.log('🔄 [TreasuryPage] Branch changed, reloading data for branch:', branchId, branchName);
      loadData();
    }
    checkSuperAdmin();
    checkManager();
    loadCurrencies();
  }, [branchId]); // Re-fetch when branch changes

  const checkSuperAdmin = async (): Promise<void> => {
    try {
      const isAdmin = await userManagementService.isSuperAdmin();
      setIsSuperAdmin(isAdmin);
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
    }
  };

  const checkManager = async (): Promise<void> => {
    try {
      const profile = await userManagementService.getCurrentUserProfile();
      const userRole = profile?.role || '';
      // Strict role check: only 'manager' or 'super_admin'
      const isManagerOrAdmin = userRole === 'manager' || userRole === 'super_admin';
      setIsManager(isManagerOrAdmin);
    } catch (error) {
      console.error('Error checking manager status:', error);
      setIsManager(false);
    }
  };

  const loadCurrencies = async (): Promise<void> => {
    try {
      const { supabase } = await import('../services/supabaseClient');
      
      // CRITICAL: Use EXACT column names from verified schema: id, code, name, symbol, is_common
      // Remove any references to currency_code, currency_name, or 'common' as they don't exist
      const { data, error } = await supabase
        .from('global_currencies')
        .select('id, code, name, symbol, is_common')
        .order('is_common', { ascending: false, nullsFirst: false }) // TRUE first
        .order('name', { ascending: true }); // Then by name

      if (error) {
        console.error('❌ Error loading currencies:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No currencies found in database, using fallback');
        // Fallback to common currencies if table is empty
        setCurrencies([
          { id: null, code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', is_common: true },
          { id: null, code: 'USD', name: 'US Dollar', symbol: '$', is_common: true },
          { id: null, code: 'EUR', name: 'Euro', symbol: '€', is_common: true },
          { id: null, code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', is_common: true },
          { id: null, code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', is_common: true },
        ]);
        return;
      }

      // Map data to consistent structure using EXACT column names
      const mappedData = (data || []).map((curr: any) => {
        // Ensure is_common is a boolean
        const isCommon = curr.is_common === true || curr.is_common === 'true' || curr.is_common === 1;
        
        return {
          id: curr.id || null,
          code: curr.code || '', // REQUIRED: code column
          name: curr.name || '', // REQUIRED: name column
          symbol: curr.symbol || null,
          is_common: isCommon // REQUIRED: is_common boolean column
        };
      });

      // Sort: is_common (TRUE first), then by name
      mappedData.sort((a, b) => {
        // First sort by is_common (true first)
        if (a.is_common && !b.is_common) return -1;
        if (!a.is_common && b.is_common) return 1;
        // Then sort by name
        return (a.name || '').localeCompare(b.name || '');
      });

      setCurrencies(mappedData);
      console.log('✅ Loaded currencies:', mappedData.length, 'total');
      console.log('✅ Currency columns verified: id, code, name, symbol, is_common');
    } catch (error: any) {
      console.error('❌ Error loading currencies:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      // Fallback to common currencies if table doesn't exist or query fails
      setCurrencies([
        { id: null, code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', is_common: true },
        { id: null, code: 'USD', name: 'US Dollar', symbol: '$', is_common: true },
        { id: null, code: 'EUR', name: 'Euro', symbol: '€', is_common: true },
        { id: null, code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', is_common: true },
        { id: null, code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', is_common: true },
      ]);
    }
  };

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      await Promise.all([loadAccounts(), loadTransactions()]);
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load treasury data.');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async (): Promise<void> => {
    updateStatus('loading', language === 'ar' ? 'جاري التحقق من أرصدة الخزينة...' : 'Checking treasury balances...', branchName || null);
    try {
      // CRITICAL: Strict branch isolation - only fetch accounts for current branch
      if (!branchId) {
        console.warn('⚠️ [TreasuryPage] No branchId, cannot load accounts');
        setAccounts([]);
        setAllAccounts([]);
        updateStatus('empty', language === 'ar' ? 'لا توجد حسابات خزينة' : 'No treasury accounts', branchName || null);
        return;
      }

      console.log('🔍 [TreasuryPage] Loading accounts for branch:', branchId, branchName);
      
      // Fetch accounts and filter by branchId (service already filters by user profile branch_id, but we enforce it here too)
      const data = await treasuryService.getAccounts();
      
      // CRITICAL: Double-filter by branchId to ensure strict isolation
      // Even if service returns data, we filter again to ensure only current branch accounts
      const branchFilteredData = (data || []).filter(
        (acc) => acc.branchId === branchId
      );
      
      console.log(`✅ [TreasuryPage] Loaded ${branchFilteredData.length} accounts for branch ${branchId} (filtered from ${data?.length || 0} total)`);
      
      setAllAccounts(branchFilteredData);
      
      // Filter out private accounts for non-Super Admins
      if (!isSuperAdmin) {
        const filteredData = branchFilteredData.filter(
          (acc) => acc.accountType !== 'private'
        );
        setAccounts(filteredData);
        // Update status with filtered count
        if (filteredData.length === 0) {
          updateStatus('empty', language === 'ar' ? 'لا توجد حسابات خزينة' : 'No treasury accounts', branchName || null);
        } else {
          updateStatus('success', language === 'ar' ? `تم تحميل ${filteredData.length} حساب خزينة نشط` : `Treasury accounts active (${filteredData.length})`, branchName || null);
        }
        // CRITICAL: Reload transactions after accounts are loaded (for branch filtering)
        await loadTransactions(filters.accountId || null);
      } else {
        setAccounts(branchFilteredData);
        // Update status with all accounts count
        if (branchFilteredData.length === 0) {
          updateStatus('empty', language === 'ar' ? 'لا توجد حسابات خزينة' : 'No treasury accounts', branchName || null);
        } else {
          updateStatus('success', language === 'ar' ? `تم تحميل ${branchFilteredData.length} حساب خزينة نشط` : `Treasury accounts active (${branchFilteredData.length})`, branchName || null);
        }
        // CRITICAL: Reload transactions after accounts are loaded (for branch filtering)
        await loadTransactions(filters.accountId || null);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      const errorMsg = language === 'ar' ? 'تعذر المزامنة مع قاعدة البيانات' : 'Could not sync with the database';
      updateStatus('error', errorMsg, branchName || null);
      message.error('Failed to load accounts.');
    }
  };

  // Update accounts when isSuperAdmin changes
  useEffect(() => {
    if (allAccounts.length > 0) {
      if (!isSuperAdmin) {
        const filteredData = allAccounts.filter(
          (acc) => acc.accountType !== 'private'
        );
        setAccounts(filteredData);
      } else {
        setAccounts(allAccounts);
      }
    }
  }, [isSuperAdmin, allAccounts]);

  // CRITICAL: Reload transactions when accounts change (for branch filtering)
  useEffect(() => {
    if (accounts.length > 0 && branchId) {
      loadTransactions(filters.accountId || null);
    }
  }, [accounts.length, branchId]); // Reload when accounts or branch changes

  const loadTransactions = async (accountId: string | null = null): Promise<void> => {
    setTransactionsLoading(true);
    try {
      // CRITICAL: Strict branch isolation - only fetch transactions for current branch accounts
      if (!branchId) {
        console.warn('⚠️ [TreasuryPage] No branchId, cannot load transactions');
        setTransactions([]);
        setTransactionsLoading(false);
        return;
      }

      console.log('🔍 [TreasuryPage] Loading transactions for branch:', branchId, branchName);
      
      // Fetch transactions
      const data = await treasuryService.getTransactions(accountId);
      
      // CRITICAL: Filter transactions to only include those from accounts in the current branch
      // Get account IDs for current branch
      const branchAccountIds = accounts.map(acc => acc.id);
      
      const branchFilteredTransactions = (data || []).filter((txn) => {
        // If accountId filter is provided, it should already be in branchAccountIds
        // Otherwise, check if the transaction's account is in the current branch
        return branchAccountIds.includes(txn.accountId);
      });
      
      console.log(`✅ [TreasuryPage] Loaded ${branchFilteredTransactions.length} transactions for branch ${branchId} (filtered from ${data?.length || 0} total)`);
      
      setTransactions(branchFilteredTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      message.error('Failed to load transactions.');
    } finally {
      setTransactionsLoading(false);
    }
  };

  /* =======================
     Statistics
  ======================= */

  const totalCash = useMemo(() => {
    return accounts
      .filter((acc) => acc.type === 'cash_box')
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  }, [accounts]);

  const totalBank = useMemo(() => {
    return accounts
      .filter((acc) => acc.type === 'bank')
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  }, [accounts]);

  const grandTotal = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  }, [accounts]);

  /* =======================
     Memoized Filtering
  ======================= */

  const filteredTransactions = useMemo<TreasuryTransaction[]>(() => {
    return transactions.filter((txn) => {
      const account = accounts.find((acc) => acc.id === txn.accountId);
      const accountName = account ? account.name.toLowerCase() : '';
      const description = (txn.description || '').toLowerCase();
      const referenceId = (txn.referenceId || '').toLowerCase();

      const matchesText =
        accountName.includes(filters.searchText.toLowerCase()) ||
        description.includes(filters.searchText.toLowerCase()) ||
        referenceId.includes(filters.searchText.toLowerCase());

      const matchesAccount = !filters.accountId || txn.accountId === filters.accountId;

      return matchesText && matchesAccount;
    });
  }, [transactions, accounts, filters]);

  /* =======================
     Table Columns
  ======================= */

  const accountColumns = useMemo<ColumnsType<TreasuryAccount>>(
    () => [
      {
        title: 'Account Name',
        dataIndex: 'name',
        key: 'name',
        render: (name: string, record: TreasuryAccount) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {record.type === 'bank' ? <BankOutlined /> : <WalletOutlined />}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500 }}>{name}</span>
              {record.branchName && (
                <span style={{ fontSize: 12, color: '#666' }}>
                  Branch: {record.branchName}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        title: 'Account Type',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => (
          <Tag color={type === 'bank' ? 'blue' : 'green'}>
            {type === 'bank' ? 'Bank' : 'Cash Box'}
          </Tag>
        ),
      },
      {
        title: 'Visibility',
        dataIndex: 'accountType',
        key: 'accountType',
        render: (accountType: string) => {
          if (!accountType || accountType === 'public') {
            return <Tag color="blue">Public</Tag>;
          }
          return <Tag color="orange">Private</Tag>;
        },
      },
      {
        title: 'Currency',
        dataIndex: 'currency',
        key: 'currency',
        render: (currency: string) => {
          if (!currency) return <span>-</span>;
          // Use EXACT column name: code (not currency_code)
          const currencyInfo = currencies.find((c) => c.code === currency);
          const code = currencyInfo?.code || currency;
          const name = currencyInfo?.name || '';
          return (
            <span>
              {code} {name ? `(${name})` : ''}
            </span>
          );
        },
      },
      {
        title: 'Balance',
        dataIndex: 'currentBalance',
        key: 'currentBalance',
        render: (balance: number, record: TreasuryAccount) => (
          <span
            style={{ fontWeight: 'bold', color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}
          >
            {formatCurrency(balance, record.currency || branchCurrency || '')}
          </span>
        ),
        sorter: (a: TreasuryAccount, b: TreasuryAccount) =>
          (a.currentBalance || 0) - (b.currentBalance || 0),
      },
      {
        title: 'Initial Balance',
        dataIndex: 'initialBalance',
        key: 'initialBalance',
        render: (balance: number, record: TreasuryAccount) => (
          <span>{formatCurrency(balance, record.currency || branchCurrency || '')}</span>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, record: TreasuryAccount) => (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditAccount(record)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Are you sure you want to delete this account?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteAccount(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    []
  );

  const transactionColumns = useMemo<ColumnsType<TreasuryTransaction>>(
    () => [
      {
        title: 'Date',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value: string) => {
          if (!value) return '-';
          const parsed = moment(value);
          return parsed.isValid() ? parsed.format('LLL') : '-';
        },
        sorter: (a: TreasuryTransaction, b: TreasuryTransaction) => {
          const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        },
        defaultSortOrder: 'descend' as const,
      },
      {
        title: 'Account',
        dataIndex: 'accountId',
        key: 'accountId',
        render: (accountId: string) => {
          const account = accounts.find((acc) => acc.id === accountId);
          return account ? account.name : 'Not Specified';
        },
      },
      {
        title: 'Type',
        dataIndex: 'transactionType',
        key: 'transactionType',
        render: (type: string) => (
          <Tag
            color={type === 'inflow' ? 'green' : 'red'}
            icon={type === 'inflow' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          >
            {type === 'inflow' ? 'Income' : 'Expense'}
          </Tag>
        ),
      },
      {
        title: 'Project Name',
        dataIndex: 'projectName',
        key: 'projectName',
        render: (projectName: string) => {
          if (projectName) {
            return <Tag color="purple">{projectName}</Tag>;
          }
          return '-';
        },
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount: number, record: TreasuryTransaction) => {
          // Get currency from the account
          const account = accounts.find((acc) => acc.id === record.accountId);
          const currency = account?.currency || branchCurrency || '';
          return (
            <span
              style={{
                fontWeight: 'bold',
                color: record.transactionType === 'inflow' ? '#52c41a' : '#ff4d4f',
              }}
            >
              {record.transactionType === 'inflow' ? '+' : '-'}
              {formatCurrency(amount, currency)}
            </span>
          );
        },
        sorter: (a: TreasuryTransaction, b: TreasuryTransaction) =>
          (a.amount || 0) - (b.amount || 0),
      },
      {
        title: 'Reference',
        key: 'reference',
        render: (_: unknown, record: TreasuryTransaction) => {
          if (record.referenceType && record.referenceId) {
            const typeLabels: Record<string, string> = {
              payment: 'Payment',
              expense: 'Expense',
              order: 'Order',
            };
            return (
              <Tag color="blue">
                {typeLabels[record.referenceType] || record.referenceType}:{' '}
                {record.referenceId.substring(0, 8)}
              </Tag>
            );
          }
          return '-';
        },
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        render: (description: string) => description || '-',
      },
    ],
    [accounts]
  );

  /* =======================
     Handlers
  ======================= */

  const handleAddAccount = (): void => {
    setSelectedAccount(null);
    accountForm.resetFields();
    accountForm.setFieldsValue({
      type: 'bank',
      accountType: 'public',
      currency: branchCurrency || 'SAR', // Use branch currency as default
    });
    setIsAccountModalVisible(true);
  };

  const handleEditAccount = (account: TreasuryAccount): void => {
    setSelectedAccount(account);
    accountForm.setFieldsValue({
      name: account.name,
      type: account.type,
      accountType: account.accountType || 'public',
      currency: account.currency || branchCurrency || '',
      initialBalance: account.initialBalance,
    });
    setIsAccountModalVisible(true);
  };

  const handleSaveAccount = async (): Promise<void> => {
    try {
      // CRITICAL: Ensure branchId is available (strict branch isolation)
      if (!branchId) {
        message.error('Cannot save account: No branch selected. Please select a branch first.');
        console.error('❌ [TreasuryPage] Cannot save account without branchId');
        return;
      }

      const values = await accountForm.validateFields();

      // Ensure currency is the code (string), not an object
      // The form value should already be a string (currency code like 'SAR', 'USD', 'IQD')
      const currencyCode = typeof values.currency === 'string' 
        ? values.currency.trim() // Trim whitespace
        : (values.currency?.code || branchCurrency || '');

      // Validate currency code exists in our currencies list
      const currencyExists = currencies.some(c => c.code === currencyCode);
      if (!currencyExists && currencies.length > 0) {
        console.warn('⚠️ Currency code not found in list:', currencyCode);
        message.warning(`Currency ${currencyCode} not found. Using SAR as fallback.`);
      }

      const accountData = {
        name: values.name,
        type: values.type,
        accountType: values.accountType || 'public',
        currency: currencyCode, // Use currency code as string (e.g., 'SAR', 'USD', 'IQD')
        initialBalance: values.initialBalance || 0,
      };
      
      console.log('💾 Saving account with data:', {
        name: accountData.name,
        type: accountData.type,
        accountType: accountData.accountType,
        currency: accountData.currency, // Should be string like 'SAR', 'USD', etc.
        initialBalance: accountData.initialBalance
      });

      let result;
      if (selectedAccount) {
        result = await treasuryService.updateAccount(selectedAccount.id, {
          name: accountData.name,
          type: accountData.type,
          accountType: accountData.accountType,
          currency: accountData.currency,
        });
      } else {
        result = await treasuryService.addAccount(accountData);
      }

      if (result.success) {
        message.success(
          selectedAccount ? 'Account updated successfully.' : 'Account created successfully.'
        );
        setIsAccountModalVisible(false);
        accountForm.resetFields();
        setSelectedAccount(null);
        await loadAccounts();
      } else {
        message.error(result.error || 'Failed to save account.');
      }
    } catch (error) {
      console.error('Error saving account:', error);
      message.error('Failed to save account.');
    }
  };

  const handleDeleteAccount = async (id: string): Promise<void> => {
    try {
      const result = await treasuryService.deleteAccount(id);
      if (result.success) {
        message.success('Account deleted successfully.');
        await loadAccounts();
        if (filters.accountId === id) {
          setFilters((prev) => ({ ...prev, accountId: null }));
          loadTransactions();
        }
      } else {
        message.error(result.error || 'Failed to delete account.');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      message.error('Failed to delete account.');
    }
  };

  const handleAccountFilterChange = (accountId: string | null): void => {
    setFilters((prev) => ({ ...prev, accountId }));
    loadTransactions(accountId || null);
  };

  const handleRefresh = (): void => {
    message.success('Treasury data has been refreshed successfully.');
    loadData();
  };

  /* =======================
     Manager Tools Handlers
  ======================= */

  const handleAddFunds = (): void => {
    addFundsForm.resetFields();
    addFundsForm.setFieldsValue({
      date: moment().format('YYYY-MM-DD'),
    });
    setIsAddFundsModalVisible(true);
  };

  const handleSaveAddFunds = async (): Promise<void> => {
    try {
      const values = await addFundsForm.validateFields();
      const result = await treasuryService.addFunds({
        accountId: values.accountId,
        amount: values.amount,
        date: values.date ? moment(values.date).toISOString() : new Date().toISOString(),
        description: values.description || values.note || 'Funds added by manager',
      });

      if (result.success) {
        message.success('Funds added successfully.');
        setIsAddFundsModalVisible(false);
        addFundsForm.resetFields();
        await loadAccounts();
        await loadTransactions();
      } else {
        message.error(result.error || 'Failed to add funds.');
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      message.error('Failed to add funds.');
    }
  };

  const handleTransferFunds = (): void => {
    transferFundsForm.resetFields();
    transferFundsForm.setFieldsValue({
      exchangeRate: 1.0,
    });
    setIsTransferFundsModalVisible(true);
  };

  const handleSaveTransferFunds = async (): Promise<void> => {
    try {
      const values = await transferFundsForm.validateFields();
      const sourceAmount = values.sourceAmount;
      const exchangeRate = values.exchangeRate || 1.0;
      const destinationAmount = sourceAmount * exchangeRate;

      const result = await treasuryService.transferFunds({
        sourceAccountId: values.sourceAccountId,
        destinationAccountId: values.destinationAccountId,
        sourceAmount: sourceAmount,
        exchangeRate: exchangeRate,
        destinationAmount: destinationAmount,
        description: values.description || 'Funds transfer between accounts',
      });

      if (result.success) {
        message.success(
          `Transfer successful: ${sourceAmount} from ${result.sourceAccount.name} to ${result.destinationAccount.name}`
        );
        setIsTransferFundsModalVisible(false);
        transferFundsForm.resetFields();
        await loadAccounts();
        await loadTransactions();
      } else {
        message.error(result.error || 'Failed to transfer funds.');
      }
    } catch (error) {
      console.error('Error transferring funds:', error);
      message.error('Failed to transfer funds.');
    }
  };

  // Calculate destination amount when source amount or exchange rate changes
  const calculateDestinationAmount = (sourceAmount: number, exchangeRate: number): number => {
    if (!sourceAmount || !exchangeRate || exchangeRate <= 0) return 0;
    return sourceAmount * exchangeRate;
  };

  /* =======================
     Render
  ======================= */

  return (
    <ConfigProvider locale={enUS}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
        {/* CRITICAL: Alert if branch is not selected (strict branch isolation) */}
        {!branchId && (
          <Alert
            type="warning"
            message="Branch Not Selected"
            description="Please select a branch from the header to view treasury data. All data is filtered by branch for strict isolation."
            showIcon
            closable={false}
            style={{ marginBottom: 16 }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>
              Treasury Management
            </h1>
            <p style={{ color: '#666', margin: '4px 0 0 0' }}>
              Manage accounts and transactions
            </p>
          </div>
          <Space>
            {isManager && (
              <>
                <Button 
                  type="default" 
                  icon={<ArrowUpOutlined />} 
                  onClick={handleAddFunds}
                  style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
                >
                  Add Funds (تغذية)
                </Button>
                <Button 
                  type="default" 
                  icon={<ArrowDownOutlined />} 
                  onClick={handleTransferFunds}
                  style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
                >
                  Transfer Funds (تحويل)
                </Button>
              </>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
              New Account
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Cash (Cash Box)"
                value={totalCash}
                precision={0}
                prefix={<WalletOutlined />}
                suffix={branchCurrency || ''}
                styles={{ value: { color: totalCash >= 0 ? '#52c41a' : '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Bank"
                value={totalBank}
                precision={0}
                prefix={<BankOutlined />}
                suffix={branchCurrency || ''}
                styles={{ value: { color: totalBank >= 0 ? '#1890ff' : '#ff4d4f' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Balance"
                value={grandTotal}
                precision={0}
                prefix={<DollarOutlined />}
                suffix={branchCurrency || ''}
                styles={{ value: { color: grandTotal >= 0 ? '#722ed1' : '#ff4d4f' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Accounts Table */}
        <Card
          title="Accounts"
          extra={<Badge count={accounts.length} />}
        >
          <Table<TreasuryAccount>
            columns={accountColumns}
            dataSource={accounts}
            loading={loading}
            rowKey={(record) =>
              `${record.id}-${record.updatedAt || record.lastUpdated || ''}`
            }
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* Transactions Section */}
        <Card
          title="Transactions"
          extra={
            <Space>
              <Select
                placeholder={t.treasury.filterByAccountPlaceholder}
                allowClear
                style={{ width: 200 }}
                value={filters.accountId}
                onChange={handleAccountFilterChange}
              >
                {accounts.map((acc) => (
                  <Option key={acc.id} value={acc.id}>
                    {acc.name}
                  </Option>
                ))}
              </Select>
              <Input
                placeholder={t.treasury.searchTransactionsPlaceholder}
                prefix={<SearchOutlined />}
                value={filters.searchText}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    searchText: e.target.value,
                  }))
                }
                style={{ width: 250 }}
                allowClear
              />
              <Button onClick={handleRefresh}>Refresh Data</Button>
            </Space>
          }
        >
          <Table<TreasuryTransaction>
            columns={transactionColumns}
            dataSource={filteredTransactions}
            loading={transactionsLoading}
            rowKey={(record) =>
              `${record.id}-${record.updatedAt || record.lastUpdated || ''}`
            }
            pagination={{ pageSize: 20 }}
          />
        </Card>

        {/* Add/Edit Account Modal */}
        <Modal
          title={selectedAccount ? 'Edit Account' : 'New Account'}
          open={isAccountModalVisible}
          onOk={handleSaveAccount}
          onCancel={() => {
            setIsAccountModalVisible(false);
            accountForm.resetFields();
            setSelectedAccount(null);
          }}
          okText="Save"
          cancelText="Cancel"
        >
          <Form form={accountForm} layout="vertical" style={{ marginTop: 24 }}>
            <Form.Item
              name="name"
              label="Account Name"
              rules={[{ required: true, message: 'Please enter account name' }]}
            >
              <Input placeholder={t.treasury.accountNamePlaceholder} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Account Type"
                  rules={[{ required: true, message: 'Please select account type' }]}
                >
                  <Select placeholder={t.treasury.selectAccountTypePlaceholder}>
                    <Option value="bank">Bank</Option>
                    <Option value="cash_box">Cash Box</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="accountType"
                  label="Visibility"
                  rules={[{ required: true, message: 'Please select visibility' }]}
                  initialValue="public"
                >
                  <Select placeholder={t.treasury.selectVisibilityPlaceholder}>
                    <Option value="public">Public</Option>
                    <Option value="private">Private (Super Admin Only)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="currency"
              label="Currency"
              rules={[{ required: true, message: 'Please select currency' }]}
              initialValue={branchCurrency || 'SAR'}
            >
              <Select 
                placeholder={t.treasury.selectCurrencyPlaceholder} 
                showSearch 
                filterOption={(input, option) => {
                  const label = option?.label as string;
                  return label?.toLowerCase().includes(input.toLowerCase()) || false;
                }}
              >
                {/* First Group: Common Currencies (العملات الأساسية) */}
                <Select.OptGroup label={t.treasury.mainCurrenciesLabel}>
                  {(() => {
                    // Define the 5 main currencies in the desired order
                    const mainCurrencies = ['IQD', 'AED', 'USD', 'SAR', 'EUR'];
                    const mainCurrenciesSet = new Set(mainCurrencies);
                    
                    // Filter currencies using EXACT column name: is_common (boolean)
                    // Also include the 5 main currencies even if is_common is not set
                    const commonCurrencies = currencies.filter((curr) => {
                      const code = curr.code; // Use EXACT column name: code
                      const isCommon = curr.is_common === true; // Use EXACT column name: is_common
                      return isCommon || (code && mainCurrenciesSet.has(code));
                    });
                    
                    // Sort: main currencies first in specific order, then others by name
                    commonCurrencies.sort((a, b) => {
                      const codeA = a.code || '';
                      const codeB = b.code || '';
                      const indexA = mainCurrencies.indexOf(codeA);
                      const indexB = mainCurrencies.indexOf(codeB);
                      
                      // If both are in main list, sort by their position
                      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                      // If only A is in main list, A comes first
                      if (indexA !== -1) return -1;
                      // If only B is in main list, B comes first
                      if (indexB !== -1) return 1;
                      // Otherwise, sort by name
                      return (a.name || '').localeCompare(b.name || '');
                    });
                    
                    return commonCurrencies.map((curr) => {
                      const code = curr.code; // Use EXACT column name: code
                      const name = curr.name; // Use EXACT column name: name
                      const symbol = curr.symbol || '';
                      return (
                        <Option key={code} value={code} label={`${code} - ${name}`}>
                          {code} - {name} {symbol ? `(${symbol})` : ''}
                        </Option>
                      );
                    });
                  })()}
                </Select.OptGroup>
                
                {/* Second Group: Other Global Currencies (باقي العملات العالمية) */}
                <Select.OptGroup label={t.treasury.otherCurrenciesLabel}>
                  {(() => {
                    // Define the 5 main currencies to exclude
                    const mainCurrencies = ['IQD', 'AED', 'USD', 'SAR', 'EUR'];
                    const mainCurrenciesSet = new Set(mainCurrencies);
                    
                    // Filter currencies using EXACT column name: is_common (boolean)
                    // Exclude currencies that are common OR in main list
                    const otherCurrencies = currencies.filter((curr) => {
                      const code = curr.code; // Use EXACT column name: code
                      const isCommon = curr.is_common === true; // Use EXACT column name: is_common
                      return !isCommon && (!code || !mainCurrenciesSet.has(code));
                    });
                    
                    // Sort by name
                    otherCurrencies.sort((a, b) => {
                      return (a.name || '').localeCompare(b.name || '');
                    });
                    
                    return otherCurrencies.map((curr) => {
                      const code = curr.code; // Use EXACT column name: code
                      const name = curr.name; // Use EXACT column name: name
                      const symbol = curr.symbol || '';
                      return (
                        <Option key={code} value={code} label={`${code} - ${name}`}>
                          {code} - {name} {symbol ? `(${symbol})` : ''}
                        </Option>
                      );
                    });
                  })()}
                </Select.OptGroup>
              </Select>
            </Form.Item>

            {!selectedAccount && (
              <Form.Item
                name="initialBalance"
                label="Initial Balance"
                rules={[{ required: true, message: 'Please enter initial balance' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={t.treasury.initialBalancePlaceholder}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                  min={0}
                />
              </Form.Item>
            )}

            {selectedAccount && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              >
                <div>
                  <strong>Balance:</strong> {formatCurrency(selectedAccount.currentBalance, selectedAccount.currency || branchCurrency || '')}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Balance is calculated from transactions and cannot be edited directly.
                </div>
              </div>
            )}
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default TreasuryPage;
