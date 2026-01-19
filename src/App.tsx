import React, { useEffect, Component, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ConfigProvider, Select, Space, Badge, message } from 'antd'; // Added Select, Space, Badge
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import arEG from 'antd/locale/ar_EG';
import enUS from 'antd/locale/en_US';
import moment from 'moment';
import './App.css';
import { EnvironmentOutlined } from '@ant-design/icons'; // Added Icon

// Import your pages
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import SetupPage from './pages/SetupPage';
import SetupWizard from './pages/SetupWizard';
import QuotationsPage from './pages/QuotationsPage';
import QuotationBuilder from './pages/QuotationBuilder';
import ContractsPage from './pages/ContractsPage';
import LaborPage from './pages/LaborPage';
import GeneralExpenses from './pages/GeneralExpenses';
import AdminApprovals from './pages/AdminApprovals';
import TreasuryPage from './pages/TreasuryPage';
import IncomesPage from './pages/IncomesPage';
import AuditLogsPage from './pages/AuditLogsPage';
import RequireSetup from './components/RequireSetup';
import BranchesSettings from './pages/settings/BranchesSettings';
import AuthPage from './pages/AuthPage';

// Import Navigation component
import Navigation from './components/Navigation';

// Import Ant Design Layout
import { Layout, Alert, Spin } from 'antd';

// Import transaction manager for lock cleanup
import transactionManager from './services/transactionManager';

// Import Tenant Provider
import { TenantProvider, useTenant } from './contexts/TenantContext';

// Import Branch Provider
import { BranchProvider, useBranch } from './contexts/BranchContext';

// Import Language Provider
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'

// Import Sync Status Provider
import { SyncStatusProvider, useSyncStatus } from './contexts/SyncStatusContext'
import LanguageSelection from './components/LanguageSelection';

// Import company settings service
import companySettingsService from './services/companySettingsService';
// Import supabase for direct tenant data access (fallback)
import { supabase } from './services/supabaseClient';
// Import user management service for role checking
import userManagementService from './services/userManagementService';

const { Sider, Content } = Layout;
const { Option } = Select;

// App Header Component - displays company name, logo AND BRANCH SWITCHER
function AppHeader() {
  const { currentTenantId } = useTenant();
  const { branchId, setBranch } = useBranch(); // Use branch context
  const { language } = useLanguage();
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // 1. Fetch Company Data (Existing Logic)
  useEffect(() => {
    const loadCompanyData = async () => {
      if (currentTenantId) {
        try {
          const { data: tenantData, error } = await supabase
            .from('tenants')
            .select('name, logo_url')
            .eq('id', currentTenantId)
            .single();
          
          if (error) {
            console.error('❌ Header: Error fetching tenant data:', error);
            const settings = await companySettingsService.getCompanySettings();
            setCompanySettings(settings);
          } else if (tenantData) {
            setCompanySettings({
              companyName: tenantData.name || null,
              tenantName: tenantData.name || null,
              logoUrl: tenantData.logo_url || null
            });
          } else {
            setCompanySettings(null);
          }
        } catch (error) {
          console.error('❌ Header: Error loading company data:', error);
          setCompanySettings(null);
        }
      }
    };
    loadCompanyData();
  }, [currentTenantId]);

  // 2. Fetch Branches for the Switcher - REFACTORED for reliability
  useEffect(() => {
    const fetchBranches = async () => {
      if (!currentTenantId) {
        return;
      }
      setLoadingBranches(true);
      
      try {
        // Check if user is super_admin or admin (both can see all branches)
        const profile = await userManagementService.getCurrentUserProfile();
        const userRole = profile?.role || null;
        const isSuperAdminUser = userRole === 'super_admin';
        const isAdminUser = userRole === 'admin';
        const canSeeAllBranches = isSuperAdminUser || isAdminUser;
        
        let query = supabase
          .from('branches')
          .select('*') // Get all fields
          .eq('tenant_id', currentTenantId); // Filter by tenant_id
        
        // If user is manager (not super_admin or admin), filter by their branch_id
        if (!canSeeAllBranches) {
          if (profile?.branch_id) {
            // For managers, only show their assigned branch
            query = query.eq('id', profile.branch_id);
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ [AppHeader] Error fetching branches:', error);
          throw error;
        }


        // Sort: Main branch first, then by name
        const sortedBranches = (data || []).sort((a, b) => {
          if (a.is_main && !b.is_main) return -1;
          if (!a.is_main && b.is_main) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });

        // GUARD: Only update state if data is different (prevent render loops)
        const currentBranchesStr = JSON.stringify(branches.map(b => ({ id: b.id, name: b.name, currency: b.currency, is_main: b.is_main })));
        const newBranchesStr = JSON.stringify(sortedBranches.map(b => ({ id: b.id, name: b.name, currency: b.currency, is_main: b.is_main })));
        
        if (currentBranchesStr !== newBranchesStr) {
          setBranches(sortedBranches);
        }
      } catch (err) {
        console.error('❌ [AppHeader] Critical error fetching branches:', err);
        setBranches([]); // Reset to empty array on error
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, [currentTenantId]);

  // 3. Handle Branch Switch
  const handleBranchChange = async (branchId: string) => {
    const selectedBranch = branches.find(b => b.id === branchId);
    
    if (selectedBranch) {
        // Update Context using the new setBranch function
        // This will save to localStorage and update the context
        await setBranch({
          id: selectedBranch.id,
          name: selectedBranch.name || '',
          currency: selectedBranch.currency || '',
          is_main: selectedBranch.is_main || false
        });
        
        // CRITICAL: Reload page to ensure TOTAL ISOLATION
        // This forces all pages (Dashboard, Treasury, etc.) to re-fetch data 
        // using the new branch ID and Currency.
        window.location.reload(); 
    } else {
        console.error('❌ [AppHeader] Branch not found in branches array:', branchId);
    }
  };

  const companyName = companySettings?.companyName || companySettings?.tenantName || null;
  const logoUrl = companySettings?.logoUrl;

  return (
    <div style={{ 
      padding: '20px 16px', 
      textAlign: 'center',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      background: '#fff'
    }}>
      {/* Logo Section */}
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={companyName}
          style={{ maxWidth: '100%', maxHeight: '50px', objectFit: 'contain' }} 
        />
      ) : (
        <div style={{ fontSize: '32px' }}>🏢</div>
      )}
      
      {/* Company Name */}
      <h2 style={{ margin: 0, color: '#001529', fontSize: '16px', fontWeight: 'bold' }}>
        {companyName || 'Loading...'}
      </h2>

      {/* BRANCH SWITCHER - The "Room Key" 🔑 */}
      {currentTenantId && (
        <div style={{ width: '100%' }}>
            <div style={{ 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: '4px', 
                textAlign: language === 'ar' ? 'right' : 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <EnvironmentOutlined /> 
                {language === 'ar' ? 'الفرع الحالي:' : 'Current Branch:'}
            </div>
            <Select
                value={branchId} // Currently active branch ID
                style={{ width: '100%' }}
                onChange={handleBranchChange}
                loading={loadingBranches}
                disabled={branches.length <= 1} // Disable if only one branch (manager scenario)
                placeholder={loadingBranches 
                  ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
                  : (language === 'ar' ? 'اختر الفرع' : 'Select Branch')
                }
                optionLabelProp="label"
                notFoundContent={loadingBranches ? 'Loading...' : 'No branches found'}
            >
                {branches.map(b => {
                  const branchName = b.name || `Branch ${b.id?.substring(0, 8)}`;
                  const branchCurrency = b.currency || 'N/A';
                  
                  return (
                    <Option key={b.id} value={b.id} label={branchName}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          width: '100%'
                        }}>
                            <span style={{ flex: 1 }}>{branchName}</span>
                            {b.is_main && (
                              <span style={{ 
                                fontSize: '10px', 
                                color: '#1890ff', 
                                marginRight: '8px',
                                fontWeight: 'bold'
                              }}>
                                MAIN
                              </span>
                            )}
                            <Badge 
                                count={branchCurrency} 
                                style={{ backgroundColor: '#52c41a' }} 
                            />
                        </div>
                    </Option>
                  );
                })}
            </Select>
            {branches.length === 0 && !loadingBranches && (
              <div style={{ 
                fontSize: '11px', 
                color: '#ff4d4f', 
                marginTop: '4px',
                textAlign: 'center'
              }}>
                {language === 'ar' ? '⚠️ لم يتم العثور على فروع' : '⚠️ No branches found'}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', direction: 'ltr' }}>
          <h2>Error Loading Page</h2>
          <p style={{ color: '#666', marginTop: 16 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component to handle onboarding redirect logic
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { industryType, currentTenantId } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (currentTenantId && location.pathname !== '/setup') {
      if (!industryType || industryType === 'default') {
        navigate('/setup', { replace: true });
      }
    }
  }, [industryType, currentTenantId, location.pathname, navigate]);

  return <>{children}</>;
}

function AppContent() {
  const { industryType } = useTenant();
  const { language } = useLanguage();
  const { error: branchError, branchId, branchName } = useBranch();
  const { updateStatus } = useSyncStatus();
  const location = useLocation();
  
  // SIMPLE AUTH GUARD: Standard Supabase session state
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // SIMPLE AUTH CHECK: Standard Supabase flow
  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(initialSession);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('❌ [AppContent] Error getting session:', error);
        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    // Get initial session
    getInitialSession();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  // CRITICAL: Reset sync status when route or branch changes
  // This ensures the sidebar widget doesn't show stale status from previous page
  useEffect(() => {
    // Reset to idle state immediately when navigating or switching branches
    updateStatus('idle', language === 'ar' ? 'جاهز' : 'Ready', branchName || null);
  }, [location.pathname, branchId, updateStatus, language, branchName]);

  const isSetupPage = location.pathname === '/setup';
  const isSetupWizard = location.pathname === '/setup-wizard';

  // SIMPLE RENDER LOGIC: No complex flags, just loading and session
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        direction: language === 'ar' ? 'rtl' : 'ltr',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div style={{ color: '#666' }}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Allow setup pages without authentication
  if (isSetupWizard) return <SetupWizard />;
  if (isSetupPage) return <SetupPage />;

  // If no session, show login page
  if (!session) {
    return <AuthPage />;
  }

  // Session exists - show main layout
  const shouldShowLayout = industryType && industryType !== 'default';

  if (!shouldShowLayout) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        direction: language === 'ar' ? 'rtl' : 'ltr'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {branchError && (
        <Alert
          type="error"
          banner
          message="CRITICAL: Could not load Branch Settings"
          description={branchError}
          style={{ position: 'sticky', top: '50px', zIndex: 10000, margin: 0 }}
          closable={false}
        />
      )}
      
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          width={260} // Increased slightly to fit the dropdown better
          theme="light"
          style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.1)', zIndex: 1000 }}
        >
          <AppHeader />
          <Navigation />
        </Sider>
        
        <Layout>
          <Content>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/quotations" element={<QuotationsPage />} />
                <Route path="/quotation-builder" element={<QuotationBuilder />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />
                <Route path="/labor" element={<LaborPage />} />
                <Route path="/general-expenses" element={<GeneralExpenses />} />
                <Route path="/admin-approvals" element={<AdminApprovals />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/treasury" element={<TreasuryPage />} />
                <Route path="/incomes" element={<IncomesPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/branches" element={<BranchesSettings />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/setup-wizard" element={<SetupWizard />} />
              </Routes>
            </ErrorBoundary>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}

function AppWrapper() {
  const { language } = useLanguage();
  
  const storedLanguage = localStorage.getItem('language');
  const hasLanguage = storedLanguage === 'en' || storedLanguage === 'ar';
  
  if (!hasLanguage) {
    moment.locale('en');
    return (
      <ConfigProvider direction="ltr" locale={enUS}>
        <LanguageSelection />
      </ConfigProvider>
    );
  }
  
  useEffect(() => {
    if (language === 'en') {
      moment.locale('en');
    } else {
      moment.locale('ar');
    }
  }, [language]);

  const locale = language === 'en' ? enUS : arEG;
  const direction = language === 'en' ? 'ltr' : 'rtl';

  return (
    <ConfigProvider direction={direction} locale={locale}>
      <TenantProvider>
        <BranchProvider>
          <SyncStatusProvider>
            <Router>
              <RequireSetup>
                <OnboardingGuard>
                  <AppContent />
                </OnboardingGuard>
              </RequireSetup>
            </Router>
          </SyncStatusProvider>
        </BranchProvider>
      </TenantProvider>
    </ConfigProvider>
  );
}

function App() {
  useEffect(() => {
    transactionManager.cleanupExpiredLocks()
    const cleanupInterval = setInterval(() => {
      transactionManager.cleanupExpiredLocks()
    }, 10000)
    
    const handleBeforeUnload = () => {
      transactionManager.cleanupExpiredLocks()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      clearInterval(cleanupInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <LanguageProvider>
      <AppWrapper />
    </LanguageProvider>
  );
}

export default App;