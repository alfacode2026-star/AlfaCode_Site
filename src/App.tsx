import React, { useEffect, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import arEG from 'antd/locale/ar_EG';
import enUS from 'antd/locale/en_US';
import moment from 'moment';
import './App.css';

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
import RequireSetup from './components/RequireSetup';

// Import Navigation component
import Navigation from './components/Navigation';

// Import Ant Design Layout
import { Layout } from 'antd';

// Import transaction manager for lock cleanup
import transactionManager from './services/transactionManager';

// Import Tenant Provider
import { TenantProvider, useTenant } from './contexts/TenantContext';

// Import Language Provider
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import LanguageSelection from './components/LanguageSelection';

// Import company settings service
import companySettingsService from './services/companySettingsService';

const { Sider, Content } = Layout;

// App Header Component - displays company name and logo
function AppHeader() {
  const { currentTenantId } = useTenant();
  const [companySettings, setCompanySettings] = React.useState<any>(null);

  React.useEffect(() => {
    const loadCompanySettings = async () => {
      if (currentTenantId) {
        try {
          const settings = await companySettingsService.getCompanySettings();
          setCompanySettings(settings);
        } catch (error) {
          console.error('Error loading company settings for header:', error);
        }
      }
    };
    loadCompanySettings();
  }, [currentTenantId]);

  const companyName = companySettings?.companyName || 'ERP System';
  const logoUrl = companySettings?.logoUrl;

  return (
    <div style={{ 
      padding: '24px 16px', 
      textAlign: 'center',
      borderBottom: '1px solid #f0f0f0',
      minHeight: '80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={companyName}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '50px', 
            marginBottom: '8px',
            objectFit: 'contain'
          }} 
        />
      ) : (
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
      )}
      <h2 style={{ margin: 0, color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}>
        {companyName}
      </h2>
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
        <div style={{ 
          padding: 24, 
          textAlign: 'center',
          direction: 'ltr'
        }}>
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
    // Only check if we have a tenant selected and we're not already on the setup page
    if (currentTenantId && location.pathname !== '/setup') {
      // Redirect to setup if industry_type is null, undefined, or 'default'
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
  const location = useLocation();

  // Show full layout only if not on setup page and industry is set
  const isSetupPage = location.pathname === '/setup';
  const isSetupWizard = location.pathname === '/setup-wizard';
  const shouldShowLayout = !isSetupPage && !isSetupWizard && industryType && industryType !== 'default';

  if (isSetupWizard) {
    return <SetupWizard />;
  }

  if (isSetupPage) {
    return <SetupPage />;
  }

  if (!shouldShowLayout) {
    // Show loading or minimal layout while checking
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
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <Sider 
        width={250} 
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}
      >
        <AppHeader />
        <Navigation />
      </Sider>
      
      {/* Main Content */}
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
              <Route path="/treasury" element={<TreasuryPage />} />
              <Route path="/incomes" element={<IncomesPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/setup-wizard" element={<SetupWizard />} />
            </Routes>
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}

function AppWrapper() {
  // Must call hooks unconditionally (Rules of Hooks)
  const { language } = useLanguage();
  
  // CRITICAL: Force Language Selection Gate on Boot
  // Check localStorage directly to prevent flash - must check before rendering routes
  const storedLanguage = localStorage.getItem('language');
  const hasLanguage = storedLanguage === 'en' || storedLanguage === 'ar';
  
  // If language is not set, show ONLY LanguageSelection component
  // Do NOT mount the Sidebar, Navbar, or any Routes until language is set
  if (!hasLanguage) {
    // Force English locale and LTR for language selection screen
    moment.locale('en');
    return (
      <ConfigProvider direction="ltr" locale={enUS}>
        <LanguageSelection />
      </ConfigProvider>
    );
  }
  
  // ENGLISH-FIRST BOOT: Set moment locale based on language
  // CRITICAL: When English is selected, MUST use 'en' locale globally
  useEffect(() => {
    if (language === 'en') {
      moment.locale('en');
    } else {
      moment.locale('ar');
    }
  }, [language]);

  // ENGLISH CLEAN ROOM: When English is active, MUST use LTR and en_US locale
  // CRITICAL: Force LTR and en_US when language is English
  const locale = language === 'en' ? enUS : arEG;
  const direction = language === 'en' ? 'ltr' : 'rtl';

  return (
    <ConfigProvider direction={direction} locale={locale}>
      <TenantProvider>
        <Router>
          <RequireSetup>
            <OnboardingGuard>
              <AppContent />
            </OnboardingGuard>
          </RequireSetup>
        </Router>
      </TenantProvider>
    </ConfigProvider>
  );
}

function App() {
  // Cleanup expired locks on app startup
  useEffect(() => {
    // Cleanup on mount
    transactionManager.cleanupExpiredLocks()
    
    // Set up periodic cleanup (every 10 seconds)
    const cleanupInterval = setInterval(() => {
      transactionManager.cleanupExpiredLocks()
    }, 10000)
    
    // Cleanup on page unload
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