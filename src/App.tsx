import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import arEG from 'antd/locale/ar_EG';
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
import QuotationsPage from './pages/QuotationsPage';
import ContractsPage from './pages/ContractsPage';
import LaborPage from './pages/LaborPage';
import GeneralExpenses from './pages/GeneralExpenses';
import AdminApprovals from './pages/AdminApprovals';
import TreasuryPage from './pages/TreasuryPage';

// Import Navigation component
import Navigation from './components/Navigation';

// Import Ant Design Layout
import { Layout } from 'antd';

// Import transaction manager for lock cleanup
import transactionManager from './services/transactionManager';

// Import Tenant Provider
import { TenantProvider, useTenant } from './contexts/TenantContext';

const { Sider, Content } = Layout;

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
          direction: 'rtl'
        }}>
          <h2>حدث خطأ في تحميل الصفحة</h2>
          <p style={{ color: '#666', marginTop: 16 }}>
            {this.state.error?.message || 'خطأ غير معروف'}
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
            إعادة تحميل الصفحة
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
  const location = useLocation();

  // Show full layout only if not on setup page and industry is set
  const isSetupPage = location.pathname === '/setup';
  const shouldShowLayout = !isSetupPage && industryType && industryType !== 'default';

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
        direction: 'rtl'
      }}>
        <div>جاري التحميل...</div>
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
        <div style={{ 
          padding: '24px 16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0, color: '#1890ff' }}>🚀 ERP System</h2>
        </div>
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
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/labor" element={<LaborPage />} />
              <Route path="/general-expenses" element={<GeneralExpenses />} />
              <Route path="/admin-approvals" element={<AdminApprovals />} />
              <Route path="/treasury" element={<TreasuryPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/setup" element={<SetupPage />} />
            </Routes>
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
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
    <ConfigProvider direction="rtl" locale={arEG}>
      <TenantProvider>
        <Router>
          <OnboardingGuard>
            <AppContent />
          </OnboardingGuard>
        </Router>
      </TenantProvider>
    </ConfigProvider>
  );
}

export default App;