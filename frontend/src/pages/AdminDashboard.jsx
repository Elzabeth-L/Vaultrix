import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Users, CreditCard, Shield,
  LogOut, RefreshCw, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import api from '../api';

const SERVICES = [
  { name: 'API Gateway',       path: '/health', via: '' },
  { name: 'User Service',      path: '/users/health' },
  { name: 'Wallet Service',    path: '/wallet/health' },
  { name: 'Order Service',     path: '/orders/health' },
  { name: 'Transaction Svc',   path: '/transactions/health' },
  { name: 'Ledger Service',    path: '/ledger/health' },
  { name: 'Booking Service',   path: '/bookings/health' },
  { name: 'Marketplace Svc',   path: '/marketplace/health' },
];

const adminUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const logout = () => { localStorage.clear(); navigate('/login'); };
  const links = [
    { key: 'users',   label: 'All Users',     icon: <Users size={16} /> },
    { key: 'txns',    label: 'Transactions',  icon: <CreditCard size={16} /> },
    { key: 'health',  label: 'System Health', icon: <Activity size={16} /> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Shield size={18} /> Vaultrix Admin</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Administration</div>
        {links.map(l => (
          <button key={l.key}
            className={`sidebar-link ${active === l.key ? 'active' : ''}`}
            onClick={() => setActive(l.key)}>
            {l.icon}{l.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ marginBottom: '.75rem' }}>
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg,#dc2626,#7c3aed)' }}>
            {adminUser.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{adminUser.name}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Administrator</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-full btn-sm" onClick={logout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

/* ── Users panel ──────────────────────────────────────────────────────────── */
function UsersPanel() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/users')
      .then(r => setUsers(r.data.users || r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async id => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeleting(id);
    try { await api.delete(`/users/${id}`); load(); }
    catch (e) { alert(e.response?.data?.message || 'Delete failed.'); }
    finally { setDeleting(null); }
  };

  const roleBadge = role =>
    role === 'admin'    ? 'badge-danger' :
    role === 'provider' ? 'badge-warn'   : 'badge-primary';

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon indigo"><Users size={20} /></div>
          <div className="card-title">Total Users</div>
          <div className="card-value">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={20} /></div>
          <div className="card-title">Customers</div>
          <div className="card-value">{users.filter(u => u.role === 'customer').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Activity size={20} /></div>
          <div className="card-title">Providers</div>
          <div className="card-value">{users.filter(u => u.role === 'provider').length}</div>
        </div>
      </div>

      <div className="section-header">
        <span className="section-title">User Accounts</span>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                <td><span className={`badge ${roleBadge(u.role)}`}>{u.role}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  {u.role !== 'admin' && (
                    <button className="btn btn-danger btn-sm" disabled={deleting === u._id}
                      onClick={() => deleteUser(u._id)}>
                      {deleting === u._id ? <span className="spinner" /> : <><Trash2 size={13} /> Delete</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Transactions panel ───────────────────────────────────────────────────── */
function TransactionsPanel() {
  const [txns,    setTxns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/transactions')
      .then(r => setTxns(Array.isArray(r.data) ? r.data : r.data.transactions || []))
      .catch(e => setError(e.response?.data?.message || 'Could not load transactions.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="section-title" style={{ marginBottom: '1rem' }}>All Transactions</div>
      {txns.length === 0
        ? <div className="empty-state"><CreditCard size={40} /><p>No transactions yet.</p></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>From</th><th>To</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                      {String(t._id).slice(-8)}
                    </td>
                    <td>{t.fromUserId || t.userId || '—'}</td>
                    <td>{t.toUserId || '—'}</td>
                    <td style={{ fontWeight: 500 }}>₹{t.amount ?? '—'}</td>
                    <td>
                      <span className={`badge badge-${
                        t.status === 'completed' || t.status === 'success' ? 'success' :
                        t.status === 'failed'   ? 'danger' : 'warn'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

/* ── Health panel ─────────────────────────────────────────────────────────── */
function HealthPanel() {
  const [statuses, setStatuses] = useState({});
  const [loading,  setLoading]  = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled(
      SERVICES.map(s =>
        api.get(s.path).then(r => ({ name: s.name, ok: r.data.status === 'ok', ts: r.data.timestamp }))
                       .catch(() => ({ name: s.name, ok: false, ts: null }))
      )
    );
    const map = {};
    results.forEach(r => { if (r.status === 'fulfilled') map[r.value.name] = r.value; });
    setStatuses(map);
    setLoading(false);
  }, []);

  useEffect(() => { check(); }, [check]);

  const allOk = Object.values(statuses).every(s => s.ok);

  return (
    <div className="animate-in">
      <div className="section-header">
        <span className="section-title">
          System Health &nbsp;
          <span className={`badge ${allOk ? 'badge-success' : 'badge-danger'}`}>
            {loading ? 'Checking…' : allOk ? 'All Systems Operational' : 'Degraded'}
          </span>
        </span>
        <button className="btn btn-secondary btn-sm" onClick={check} disabled={loading}>
          <RefreshCw size={13} /> {loading ? 'Checking…' : 'Recheck'}
        </button>
      </div>

      <div className="grid" style={{ marginTop: '1rem' }}>
        {SERVICES.map(s => {
          const st = statuses[s.name];
          return (
            <div className="stat-card" key={s.name}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
              <span className={`health-dot ${!st ? '' : st.ok ? 'ok' : 'down'}`} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{s.name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                  {!st ? 'Checking…' : st.ok ? 'Online' : 'Unreachable'}
                </div>
              </div>
              {st?.ok && (
                <span className="badge badge-success" style={{ marginLeft: 'auto' }}>OK</span>
              )}
              {st && !st.ok && (
                <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>Down</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [active, setActive] = useState('users');
  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <div className="top-header">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {active === 'users' ? 'User Management' : active === 'txns' ? 'Transactions' : 'System Health'}
          </span>
          <span className="badge badge-danger">Admin</span>
        </div>
        <div className="page-content">
          {active === 'users'  && <UsersPanel />}
          {active === 'txns'   && <TransactionsPanel />}
          {active === 'health' && <HealthPanel />}
        </div>
      </main>
    </div>
  );
}
