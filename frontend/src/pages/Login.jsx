import React, { useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = () => {
    setEmail('admin@catalog.com');
    setPassword('admin123');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>CatalogIQ</h1>
        <p className="subtitle">E-Commerce Product Deduplication Platform</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <button type="button" className="btn btn-secondary" onClick={fillCredentials}>
          Fill Demo Credentials
        </button>
      </div>
    </div>
  );
}
