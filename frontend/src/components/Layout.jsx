import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Package, Users, FolderTree, Copy, Sparkles, Upload, DollarSign, ShieldCheck, ScrollText, GitMerge, LayoutDashboard, LogOut, Network } from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'Catalog', items: [
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/vendors', icon: Users, label: 'Vendors' },
    { path: '/categories', icon: FolderTree, label: 'Categories' },
  ]},
  { section: 'Deduplication', items: [
    { path: '/duplicates', icon: Copy, label: 'Duplicates', badge: true },
    { path: '/merge-history', icon: GitMerge, label: 'Merge History' },
  ]},
  { section: 'AI & Analytics', items: [
    { path: '/ai-tools', icon: Sparkles, label: 'AI Tools' },
    { path: '/ai-advanced', icon: Copy, label: 'AI Dedup & Merge' },
    { path: '/price-analysis', icon: DollarSign, label: 'Price Analysis' },
    { path: '/quality-reports', icon: ShieldCheck, label: 'Data Quality' },
    { path: '/custom-views', icon: Network, label: 'Dedupe Analytics' },
  ]},
  { section: 'System', items: [
    { path: '/imports', icon: Upload, label: 'Bulk Imports' },
    { path: '/audit-log', icon: ScrollText, label: 'Audit Log' },
  ]},
];

export default function Layout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>CatalogIQ</h1>
          <p>Product Deduplication</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => (
                <button
                  key={item.path}
                  className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon />
                  {item.label}
                  {item.badge && <span className="sidebar-badge">12</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user.name?.[0] || 'A'}</div>
          <div className="sidebar-user-info">
            <div className="name">{user.name}</div>
            <div className="role">{user.role}</div>
          </div>
          <button className="sidebar-link" style={{ width: 'auto', padding: 6 }} onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
