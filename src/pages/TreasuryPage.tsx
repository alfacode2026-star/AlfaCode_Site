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
import treasuryService from '../services/treasuryService';

const { Option } = Select;

/* =======================
   Types & Interfaces
======================= */

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'bank' | 'cash_box';
  initialBalance: number;
  currentBalance: number;
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

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
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

  useEffect(() => {
    loadData();
  }, []);

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
    try {
      const data = await treasuryService.getAccounts();
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      message.error('Failed to load accounts.');
    }
  };

  const loadTransactions = async (accountId: string | null = null): Promise<void> => {
    setTransactionsLoading(true);
    try {
      const data = await treasuryService.getTransactions(accountId);
      setTransactions(data || []);
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
            <span style={{ fontWeight: 500 }}>{name}</span>
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
        title: 'Balance',
        dataIndex: 'currentBalance',
        key: 'currentBalance',
        render: (balance: number) => (
          <span
            style={{ fontWeight: 'bold', color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}
          >
            {formatCurrency(balance)}
          </span>
        ),
        sorter: (a: TreasuryAccount, b: TreasuryAccount) =>
          (a.currentBalance || 0) - (b.currentBalance || 0),
      },
      {
        title: 'Initial Balance',
        dataIndex: 'initialBalance',
        key: 'initialBalance',
        render: (balance: number) => <span>{formatCurrency(balance)}</span>,
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
        render: (amount: number, record: TreasuryTransaction) => (
          <span
            style={{
              fontWeight: 'bold',
              color: record.transactionType === 'inflow' ? '#52c41a' : '#ff4d4f',
            }}
          >
            {record.transactionType === 'inflow' ? '+' : '-'}
            {formatCurrency(amount)}
          </span>
        ),
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
    accountForm.setFieldsValue({ type: 'bank' });
    setIsAccountModalVisible(true);
  };

  const handleEditAccount = (account: TreasuryAccount): void => {
    setSelectedAccount(account);
    accountForm.setFieldsValue({
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
    });
    setIsAccountModalVisible(true);
  };

  const handleSaveAccount = async (): Promise<void> => {
    try {
      const values = await accountForm.validateFields();

      const accountData = {
        name: values.name,
        type: values.type,
        initialBalance: values.initialBalance || 0,
      };

      let result;
      if (selectedAccount) {
        result = await treasuryService.updateAccount(selectedAccount.id, {
          name: accountData.name,
          type: accountData.type,
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
     Render
  ======================= */

  return (
    <ConfigProvider locale={enUS}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>
              Treasury Management
            </h1>
            <p style={{ color: '#666', margin: '4px 0 0 0' }}>
              Manage accounts and transactions
            </p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
            New Account
          </Button>
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
                suffix="SAR"
                valueStyle={{ color: totalCash >= 0 ? '#52c41a' : '#ff4d4f' }}
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
                suffix="SAR"
                valueStyle={{ color: totalBank >= 0 ? '#1890ff' : '#ff4d4f' }}
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
                suffix="SAR"
                valueStyle={{ color: grandTotal >= 0 ? '#722ed1' : '#ff4d4f' }}
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
                placeholder="Filter by account"
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
                placeholder="Search transactions"
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
              <Input placeholder="Account name" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Account Type"
              rules={[{ required: true, message: 'Please select account type' }]}
            >
              <Select>
                <Option value="bank">Bank</Option>
                <Option value="cash_box">Cash Box</Option>
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
                  placeholder="0"
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
                  <strong>Balance:</strong> {formatCurrency(selectedAccount.currentBalance)}
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
