import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import Layout from './components/Layout';

// Code-split Module Pages via React.lazy
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveMonitor = lazy(() => import('./pages/LiveMonitor'));
const GISMap = lazy(() => import('./pages/GISMap'));
const AlertsIncidents = lazy(() => import('./pages/AlertsIncidents'));
const SheltersEvacuation = lazy(() => import('./pages/SheltersEvacuation'));
const CitizenPortal = lazy(() => import('./pages/CitizenPortal'));
const RiskTrends = lazy(() => import('./pages/RiskTrends'));
const ModelIntelligence = lazy(() => import('./pages/ModelIntelligence'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const Login = lazy(() => import('./pages/Login'));

// Sleek loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      <span className="text-xs text-slate-400 font-mono">Loading FloodGuard AI Module...</span>
    </div>
  </div>
);

// Protected Route Wrapper for Admin Portal
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main App content wrapping Auth
const AppContent = () => {
  const [alerts, setAlerts] = useState([]);

  const fetchRecentAlerts = async () => {
    try {
      const res = await api.getActiveAlerts();
      setAlerts(res.data);
    } catch (err) {
      console.error("Error fetching header alerts", err);
    }
  };

  useEffect(() => {
    fetchRecentAlerts();
    const interval = setInterval(fetchRecentAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* COMMAND SECTION */}
          <Route
            path="/"
            element={
              <Layout alertList={alerts}>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/monitor"
            element={
              <Layout alertList={alerts}>
                <LiveMonitor />
              </Layout>
            }
          />
          <Route
            path="/map"
            element={
              <Layout alertList={alerts}>
                <GISMap />
              </Layout>
            }
          />

          {/* RESPONSE SECTION */}
          <Route
            path="/incidents"
            element={
              <Layout alertList={alerts}>
                <AlertsIncidents />
              </Layout>
            }
          />
          <Route
            path="/shelters"
            element={
              <Layout alertList={alerts}>
                <SheltersEvacuation />
              </Layout>
            }
          />
          <Route
            path="/citizen"
            element={
              <Layout alertList={alerts}>
                <CitizenPortal />
              </Layout>
            }
          />

          {/* INTELLIGENCE SECTION */}
          <Route
            path="/trends"
            element={
              <Layout alertList={alerts}>
                <RiskTrends />
              </Layout>
            }
          />
          <Route
            path="/model-intelligence"
            element={
              <Layout alertList={alerts}>
                <ModelIntelligence />
              </Layout>
            }
          />

          {/* SYSTEM SECTION (Protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout alertList={alerts}>
                  <AdminPortal />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
