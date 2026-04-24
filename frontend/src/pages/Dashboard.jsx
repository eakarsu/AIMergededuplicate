import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, FolderTree, Copy, Sparkles, Upload, DollarSign, ShieldCheck, ScrollText, GitMerge, Search, BarChart3 } from 'lucide-react';
import { api } from '../services/api';

const features = [
  { path: '/products', icon: '📦', color: '#6366f1', title: 'Product Catalog', desc: 'Manage your entire product catalog with search, filter, and CRUD operations' },
  { path: '/vendors', icon: '🏢', color: '#0ea5e9', title: 'Vendor Management', desc: 'Track vendors, reliability scores, and product assignments' },
  { path: '/categories', icon: '📂', color: '#10b981', title: 'Category Management', desc: 'Organize products with hierarchical category structure' },
  { path: '/duplicates', icon: '🔍', color: '#f59e0b', title: 'Duplicate Detection', desc: 'AI-powered duplicate detection and resolution workflow' },
  { path: '/merge-history', icon: '🔗', color: '#8b5cf6', title: 'Merge History', desc: 'Track all product merges with full audit trail' },
  { path: '/ai-tools', icon: '🤖', color: '#ec4899', title: 'AI Tools', desc: 'Description generation, category suggestion, price optimization, quality analysis' },
  { path: '/imports', icon: '📥', color: '#14b8a6', title: 'Bulk Imports', desc: 'Import product data from vendor CSV files with duplicate detection' },
  { path: '/price-analysis', icon: '💰', color: '#f97316', title: 'Price Analysis', desc: 'Track price history and AI-powered price optimization' },
  { path: '/quality-reports', icon: '📊', color: '#06b6d4', title: 'Data Quality Reports', desc: 'Monitor catalog completeness, consistency, and accuracy' },
  { path: '/audit-log', icon: '📋', color: '#64748b', title: 'Audit Log', desc: 'Complete audit trail of all system actions and changes' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getDashboard().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome to CatalogIQ - Your E-Commerce Catalog Deduplication Platform</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card" onClick={() => navigate('/products')}>
          <div className="stat-card-icon purple"><Package size={22} /></div>
          <h4>Total Products</h4>
          <div className="stat-value">{stats?.products?.total || '-'}</div>
          <div className="stat-detail">{stats?.products?.active || 0} active, {stats?.products?.merged || 0} merged</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/duplicates')}>
          <div className="stat-card-icon orange"><Copy size={22} /></div>
          <h4>Duplicate Groups</h4>
          <div className="stat-value">{stats?.duplicates?.total || '-'}</div>
          <div className="stat-detail">{stats?.duplicates?.pending || 0} pending review</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/vendors')}>
          <div className="stat-card-icon blue"><Users size={22} /></div>
          <h4>Active Vendors</h4>
          <div className="stat-value">{stats?.vendors?.active || '-'}</div>
          <div className="stat-detail">{stats?.vendors?.total || 0} total vendors</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/quality-reports')}>
          <div className="stat-card-icon green"><ShieldCheck size={22} /></div>
          <h4>Avg Quality Score</h4>
          <div className="stat-value">{stats?.products?.avg_quality ? parseFloat(stats.products.avg_quality).toFixed(1) : '-'}</div>
          <div className="stat-detail">out of 5.0</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/imports')}>
          <div className="stat-card-icon red"><Upload size={22} /></div>
          <h4>Bulk Imports</h4>
          <div className="stat-value">{stats?.imports?.total || '-'}</div>
          <div className="stat-detail">{stats?.imports?.total_duplicates_found || 0} duplicates found</div>
        </div>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>Features</h3>
      <div className="feature-grid">
        {features.map((f) => (
          <div key={f.path} className="feature-card" onClick={() => navigate(f.path)}>
            <div className="feature-card-icon" style={{ background: `${f.color}15` }}>{f.icon}</div>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/audit-log')}>View All</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Action</th><th>Entity</th><th>ID</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {stats.recent_activity.slice(0, 5).map((a) => (
                    <tr key={a.id}>
                      <td><span className={`badge badge-${a.action === 'CREATE' ? 'success' : a.action === 'DELETE' ? 'danger' : a.action === 'MERGE' ? 'purple' : 'info'}`}>{a.action}</span></td>
                      <td>{a.entity_type}</td>
                      <td>#{a.entity_id}</td>
                      <td>{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
