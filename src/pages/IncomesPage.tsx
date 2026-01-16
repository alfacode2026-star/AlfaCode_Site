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
  Alert,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import 'moment/locale/en-gb';
import enUS from 'antd/es/locale/en_US';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTenant } from '../contexts/TenantContext';
import { useBranch } from '../contexts/BranchContext';
import incomesService from '../services/incomesService';
import projectsService from '../services/projectsService';
import treasuryService from '../services/treasuryService';
import { formatCurrencyWithSymbol, formatCurrencyLabel, getCurrencySymbol } from '../utils/currencyUtils';

const { Option } = Select;

/* =======================
   Types & Interfaces
======================= */

export interface Income {
  id: string;
  projectId?: string | null;
  projectName?: string;
  date: string;
  amount: number;
  incomeType: IncomeType;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string;
  description?: string;
  referenceNumber?: string;
  workScope?: string | null;
  completionPercentage?: number | null;
  paymentNumber?: string;
  updatedAt?: string;
  lastUpdated?: string;
}

export type IncomeType = 'down_payment' | 'milestone' | 'advance';

interface FilterState {
  searchText: string;
  incomeType: IncomeType | 'All';
}

interface TreasuryAccount {
  id: string;
  name: string;
  type: 'bank' | 'cash_box';
  currency?: string;
  currentBalance?: number;
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

/* =======================
   Component
======================= */

const IncomesPage: FC = () => {
  const { setLanguage } = useLanguage();
  const { industryType } = useTenant();
  const { branchCurrency } = useBranch(); // Get branch currency from context

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    incomeType: 'All',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [form] = Form.useForm();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hasExistingIncomes, setHasExistingIncomes] = useState<boolean>(false);
  const [loadingProjectIncomes, setLoadingProjectIncomes] = useState<boolean>(false);
  const [availableWorkScopes, setAvailableWorkScopes] = useState<string[]>([]);
  
  // Use branch currency as the single source of truth
  const displayCurrency = branchCurrency || 'SAR';

  const isEngineering = industryType === 'engineering';

  /* =======================
     Language & Locale Sync
  ======================= */

  useEffect(() => {
    setLanguage('en');
    moment.locale('en');
  }, [setLanguage]);

  /* =======================
     Data Loading
  ======================= */

  useEffect(() => {
    loadIncomes();
    if (isEngineering) {
      loadProjects();
    }
    loadTreasuryAccounts();
  }, [industryType]);

  const loadIncomes = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await incomesService.getIncomes();
      setIncomes(data || []);
    } catch (error) {
      console.error('Error loading incomes:', error);
      message.error('Failed to load incomes data.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (): Promise<void> => {
    try {
      const data = await projectsService.getProjects();
      setProjects(data || []);

      // Extract unique work scopes from all projects
      const scopes = new Set<string>();
      data.forEach((project: any) => {
        if (project.workScopes && Array.isArray(project.workScopes)) {
          project.workScopes.forEach((scope: string) => scopes.add(scope));
        }
      });
      setAvailableWorkScopes(Array.from(scopes));
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTreasuryAccounts = async (): Promise<void> => {
    try {
      const accounts = await treasuryService.getAccounts();
      setTreasuryAccounts(accounts || []);
    } catch (error) {
      console.error('Error loading treasury accounts:', error);
      setTreasuryAccounts([]);
    }
  };

  /* =======================
     Memoized Filtering
  ======================= */

  const filteredIncomes = useMemo<Income[]>(() => {
    return incomes.filter((income) => {
      const matchesText =
        income.projectName?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        income.description?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        income.paymentNumber?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        income.referenceNumber?.toLowerCase().includes(filters.searchText.toLowerCase());

      const matchesType =
        filters.incomeType === 'All' || income.incomeType === filters.incomeType;

      return matchesText && matchesType;
    });
  }, [incomes, filters]);

  /* =======================
     Table Columns
  ======================= */

  const columns = useMemo<ColumnsType<Income>>(
    () => {
      // Get currency from treasury accounts for display
      return [
      {
        title: 'Project Name',
        dataIndex: 'projectName',
        key: 'projectName',
        render: (name: string) => name || 'Not Specified',
      },
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        render: (value: string) => moment(value).format('LL'),
        sorter: (a: Income, b: Income) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        },
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: number, record: Income) => {
          // Use branch currency as single source of truth
          const currency = branchCurrency || 'SAR';
          return (
            <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
              {formatCurrencyWithSymbol(value, currency)}
            </span>
          );
        },
        align: 'right',
        sorter: (a: Income, b: Income) => (a.amount || 0) - (b.amount || 0),
      },
      {
        title: 'Income Type',
        dataIndex: 'incomeType',
        key: 'incomeType',
        render: (type: IncomeType) => {
          const labels: Record<IncomeType, string> = {
            down_payment: 'Down Payment',
            milestone: 'Milestone',
            advance: 'Milestone Advance',
          };
          const colors: Record<IncomeType, string> = {
            down_payment: 'blue',
            milestone: 'blue',
            advance: 'orange',
          };
          return (
            <Tag color={colors[type] || 'default'}>
              {labels[type] || type}
            </Tag>
          );
        },
      },
      {
        title: 'Treasury Account',
        dataIndex: 'treasuryAccountName',
        key: 'treasuryAccountName',
        render: (name: string) => name || '-',
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (desc: string) => desc || '-',
      },
      {
        title: 'Reference Number',
        dataIndex: 'referenceNumber',
        key: 'referenceNumber',
        render: (ref: string) => ref || '-',
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, record: Income) => (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Are you sure you want to delete this income?"
              onConfirm={() => handleDelete(record.id)}
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
    ];
    },
    [treasuryAccounts]
  );

  /* =======================
     Handlers
  ======================= */

  const handleAdd = (): void => {
    setEditingIncome(null);
    setSelectedProjectId(null);
    setHasExistingIncomes(false);
    form.resetFields();
    form.setFieldsValue({ 
      incomeType: 'down_payment', 
      date: moment().format('YYYY-MM-DD'), // Use string format for native date input
    });
    setIsModalVisible(true);
  };

  const handleProjectChange = async (projectId: string | null): Promise<void> => {
    setSelectedProjectId(projectId);
    if (!projectId) {
      setHasExistingIncomes(false);
      form.setFieldsValue({ incomeType: 'down_payment' });
      return;
    }

    setLoadingProjectIncomes(true);
    try {
      const hasIncomes = await incomesService.hasExistingIncomes(projectId);
      setHasExistingIncomes(hasIncomes);

      if (hasIncomes) {
        form.setFieldsValue({ incomeType: 'advance' });
      } else {
        form.setFieldsValue({ incomeType: 'down_payment' });
      }
    } catch (error) {
      console.error('Error checking existing incomes:', error);
      setHasExistingIncomes(false);
    } finally {
      setLoadingProjectIncomes(false);
    }
  };

  const handleEdit = async (income: Income): Promise<void> => {
    setEditingIncome(income);
    setSelectedProjectId(income.projectId || null);

    if (income.projectId) {
      setLoadingProjectIncomes(true);
      try {
        const allIncomes = await incomesService.getIncomes();
        const projectIncomes = allIncomes.filter(
          (inc: Income) => inc.projectId === income.projectId && inc.id !== income.id
        );
        setHasExistingIncomes(projectIncomes.length > 0);
      } catch (error) {
        console.error('Error checking existing incomes:', error);
        setHasExistingIncomes(false);
      } finally {
        setLoadingProjectIncomes(false);
      }
    }

    // Note: Currency is now fixed to branch currency, no syncing needed

    form.setFieldsValue({
      projectId: income.projectId,
      date: income.date ? moment(income.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'), // Use string format for native date input
      amount: income.amount,
      incomeType: income.incomeType === 'advance' ? 'advance' : 'down_payment',
      treasuryAccountId: income.treasuryAccountId,
      // Currency is now fixed to branch currency, no need to set it
      description: income.description,
      referenceNumber: income.referenceNumber,
      workScope: income.workScope,
      completionPercentage: income.completionPercentage || null,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const result = await incomesService.deleteIncome(id);
      if (result.success) {
        message.success('Income deleted successfully.');
        loadIncomes();
        loadTreasuryAccounts();
      } else {
        message.error(result.error || 'Failed to delete income.');
      }
    } catch (error) {
      console.error('Error deleting income:', error);
      message.error('Failed to delete income.');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const selectedProject = projects.find((p: any) => p.id === values.projectId);

      // CRITICAL: Use branch currency as the single source of truth (no treasury-based currency)
      const currency = branchCurrency || 'SAR';

      // Safely format date - handle both string and moment/dayjs objects
      let formattedDate: string;
      if (!values.date) {
        formattedDate = moment().format('YYYY-MM-DD');
      } else if (typeof values.date === 'string') {
        // Already a string, validate and use as-is
        formattedDate = moment(values.date).isValid() 
          ? moment(values.date).format('YYYY-MM-DD')
          : moment().format('YYYY-MM-DD');
      } else if (values.date && typeof values.date.format === 'function') {
        // Moment or Dayjs object
        formattedDate = values.date.format('YYYY-MM-DD');
      } else {
        // Fallback to current date
        formattedDate = moment().format('YYYY-MM-DD');
      }

      const incomeData = {
        projectId: values.projectId,
        projectName: selectedProject?.name || '',
        date: formattedDate, // Safely formatted date (YYYY-MM-DD string)
        amount: values.amount,
        incomeType: values.incomeType || 'down_payment',
        treasuryAccountId: values.treasuryAccountId,
        currency: currency, // Include currency from treasury account
        description: values.description,
        referenceNumber: values.referenceNumber,
        workScope: values.workScope || null,
        completionPercentage:
          values.incomeType === 'advance' ? values.completionPercentage : null,
      };

      console.log('💾 Saving income with currency:', currency);

      let result;
      if (editingIncome) {
        result = await incomesService.updateIncome(editingIncome.id, incomeData);
      } else {
        result = await incomesService.createIncome(incomeData);
      }

      if (result.success) {
        if (
          values.incomeType === 'advance' &&
          values.completionPercentage !== null &&
          values.completionPercentage !== undefined &&
          values.projectId
        ) {
          try {
            await projectsService.updateProject(values.projectId, {
              completionPercentage: values.completionPercentage,
            });
          } catch (error) {
            console.error('Error updating project completion percentage:', error);
          }
        }

        message.success(
          editingIncome ? 'Income updated successfully.' : 'Income added successfully.'
        );
        setIsModalVisible(false);
        form.resetFields();
        setEditingIncome(null);
        setSelectedProjectId(null);
        setHasExistingIncomes(false);
        loadIncomes();
        loadTreasuryAccounts();
      } else {
        message.error(result.error || 'Failed to save income.');
      }
    } catch (error) {
      console.error('Error saving income:', error);
      message.error('Failed to save income.');
    }
  };

  const handleRefresh = (): void => {
    message.success('Incomes data has been refreshed successfully.');
    loadIncomes();
  };

  /* =======================
     Statistics
  ======================= */

  const totalAmount = useMemo(() => {
    return filteredIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
  }, [filteredIncomes]);

  /* =======================
     Render
  ======================= */

  return (
    <ConfigProvider locale={enUS}>
      <Card
        title="Incomes & Advances Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Income/Advance
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search by project name, description, or reference number"
            prefix={<SearchOutlined />}
            value={filters.searchText}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                searchText: e.target.value,
              }))
            }
            style={{ width: 350 }}
            allowClear
          />

          <Select
            value={filters.incomeType}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                incomeType: value,
              }))
            }
            style={{ width: 200 }}
          >
            <Option value="All">All Types</Option>
            <Option value="down_payment">Down Payment</Option>
            <Option value="advance">Milestone Advance</Option>
          </Select>

          <Button icon={<DollarOutlined />} onClick={handleRefresh}>
            Refresh Data
          </Button>
        </Space>

        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title={formatCurrencyLabel('Total Incomes', displayCurrency)}
                value={totalAmount}
                prefix={<DollarOutlined />}
                suffix={getCurrencySymbol(displayCurrency)}
                styles={{ value: { color: '#52c41a' } }}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Records"
                value={filteredIncomes.length}
                prefix="Record"
              />
            </Card>
          </Col>
        </Row>

        <Table<Income>
          loading={loading}
          dataSource={filteredIncomes}
          columns={columns}
          rowKey={(record) =>
            `${record.id}-${record.updatedAt || record.lastUpdated || ''}`
          }
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No incomes found' }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingIncome ? 'Edit Income/Advance' : 'Add New Income/Advance'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingIncome(null);
          setSelectedProjectId(null);
          setHasExistingIncomes(false);
        }}
        okText="Save"
        cancelText="Cancel"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          {isEngineering && (
            <Form.Item
              name="projectId"
              label="Project"
              rules={[{ required: true, message: 'Please select a project' }]}
            >
              <Select
                placeholder="Select Project"
                showSearch
                loading={loadingProjectIncomes}
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
                onChange={handleProjectChange}
              >
                {projects.map((project: any) => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {isEngineering && availableWorkScopes.length > 0 && (
            <Form.Item name="workScope" label="Work Scope (Optional)">
              <Select
                placeholder="Select Work Scope"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableWorkScopes.map((scope) => (
                  <Option key={scope} value={scope}>
                    {scope}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select a date' }]}
                initialValue={moment().format('YYYY-MM-DD')}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  onChange={(e) => {
                    if (e.target.value) {
                      form.setFieldsValue({ date: e.target.value })
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label={formatCurrencyLabel('Amount', displayCurrency)}
                rules={[{ required: true, message: 'Please enter the amount' }]}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber
                    min={0}
                    style={{ flex: 1 }}
                    placeholder="0"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                  />
                  <Input
                    readOnly
                    value={getCurrencySymbol(displayCurrency)}
                    style={{
                      width: '60px',
                      textAlign: 'center',
                      backgroundColor: '#fafafa',
                      cursor: 'default',
                    }}
                  />
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="incomeType"
                label="Income Type"
                rules={[{ required: true, message: 'Please select income type' }]}
                initialValue="down_payment"
              >
                <Select
                  placeholder="Select Income Type"
                  disabled={selectedProjectId ? (hasExistingIncomes ? false : true) : false}
                  onChange={(value) => {
                    if (value !== 'advance') {
                      form.setFieldsValue({ completionPercentage: undefined });
                    }
                  }}
                >
                  <Option value="down_payment" disabled={selectedProjectId && hasExistingIncomes}>
                    Down Payment
                    {selectedProjectId && hasExistingIncomes && ' (Not Available)'}
                  </Option>
                  <Option value="advance" disabled={selectedProjectId && !hasExistingIncomes}>
                    Milestone Advance
                    {selectedProjectId && !hasExistingIncomes && ' (Not Available)'}
                  </Option>
                </Select>
              </Form.Item>
              {selectedProjectId && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: -16, marginBottom: 8 }}>
                  {hasExistingIncomes
                    ? 'Previous incomes exist - Must select "Milestone Advance"'
                    : 'No previous incomes - Must select "Down Payment"'}
                </div>
              )}
            </Col>
            <Col span={12}>
              <Form.Item name="referenceNumber" label="Reference Number (Optional)">
                <Input placeholder="Reference number or receipt number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.incomeType !== currentValues.incomeType ||
              prevValues.projectId !== currentValues.projectId
            }
          >
            {({ getFieldValue }) => {
              const incomeType = getFieldValue('incomeType');
              const projectId = getFieldValue('projectId');

              if (incomeType === 'advance' && projectId) {
                return (
                  <Form.Item
                    name="completionPercentage"
                    label="Previous Completion Percentage (%)"
                    rules={[
                      { required: true, message: 'Please enter previous completion percentage' },
                      {
                        type: 'number',
                        min: 0,
                        max: 100,
                        message: 'Percentage must be between 0 and 100',
                      },
                    ]}
                    tooltip="Previous completion percentage of the project before receiving this advance"
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: '100%' }}
                      placeholder="0"
                      formatter={(value) => `${value}%`}
                      parser={(value) => value!.replace('%', '')}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          {treasuryAccounts.length === 0 && (
            <Alert
              type="error"
              message="Warning: No treasury accounts found. Please create an account in the Treasury page first"
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <Form.Item
            name="treasuryAccountId"
            label="Treasury Account"
            rules={[{ required: true, message: 'Please select a treasury account' }]}
            tooltip="Select the account where the amount will be deposited"
          >
            <Select
              placeholder="Select Treasury Account"
              disabled={treasuryAccounts.length === 0}
              notFoundContent={
                treasuryAccounts.length === 0 ? 'No treasury accounts found' : null
              }
              onChange={(accountId) => {
                // Note: Currency is now fixed to branch currency, no syncing needed
                console.log('✅ Treasury account selected:', { accountId, branchCurrency: displayCurrency });
              }}
            >
              {treasuryAccounts.map((acc) => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                  {acc.currency && acc.currency !== 'SAR' ? ` - ${acc.currency}` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Currency Display - Static label showing branch currency */}
          <Form.Item
            label={`Currency (${displayCurrency})`}
            tooltip="Currency is set at the branch level and cannot be changed per transaction"
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
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={3} placeholder="Description of income/advance" />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default IncomesPage;