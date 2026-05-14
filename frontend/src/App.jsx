import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Vendors from './pages/Vendors';
import Categories from './pages/Categories';
import Duplicates from './pages/Duplicates';
import AiTools from './pages/AiTools';
import AiAdvancedTools from './pages/AiAdvancedTools';
import BulkImports from './pages/BulkImports';
import PriceAnalysis from './pages/PriceAnalysis';
import QualityReports from './pages/QualityReports';
import AuditLog from './pages/AuditLog';
import MergeHistory from './pages/MergeHistory';
import Layout from './components/Layout';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/duplicates" element={<Duplicates />} />
          <Route path="/ai-tools" element={<AiTools />} />
          <Route path="/ai-advanced" element={<AiAdvancedTools />} />
          <Route path="/imports" element={<BulkImports />} />
          <Route path="/price-analysis" element={<PriceAnalysis />} />
          <Route path="/quality-reports" element={<QualityReports />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/merge-history" element={<MergeHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
