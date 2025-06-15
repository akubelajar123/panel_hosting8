import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import FileManager from './components/FileManager';
import SSLManager from './components/SSLManager';
import NginxManager from './components/NginxManager';
import PHPManager from './components/PHPManager';
import DatabaseManager from './components/DatabaseManager';
import DNSManager from './components/DNSManager';
import DomainManager from './components/DomainManager';
import Email from './pages/Email';
import Terminal from './pages/Terminal';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
}

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/files" element={
          <ProtectedRoute>
            <FileManager />
          </ProtectedRoute>
        } />
        <Route path="/ssl" element={
          <ProtectedRoute>
            <SSLManager />
          </ProtectedRoute>
        } />
        <Route path="/nginx" element={
          <ProtectedRoute>
            <NginxManager />
          </ProtectedRoute>
        } />
        <Route path="/php" element={
          <ProtectedRoute>
            <PHPManager />
          </ProtectedRoute>
        } />
        <Route path="/database" element={
          <ProtectedRoute>
            <DatabaseManager />
          </ProtectedRoute>
        } />
        <Route path="/dns" element={
          <ProtectedRoute>
            <DNSManager />
          </ProtectedRoute>
        } />
        <Route path="/domains" element={
          <ProtectedRoute>
            <DomainManager />
          </ProtectedRoute>
        } />
        <Route path="/email" element={
          <ProtectedRoute>
            <Email />
          </ProtectedRoute>
        } />
        <Route path="/terminal" element={
          <ProtectedRoute>
            <Terminal />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

