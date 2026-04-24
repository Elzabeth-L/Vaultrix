import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Briefcase, Wallet, CheckCircle, XCircle, LogOut, RefreshCw } from 'lucide-react';
import api from '../api';

const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const logout = () => { localStorage.clear(); navigate('/login'); };
  const links = [
    { key: 'jobs',     label: 'Available Jobs', icon: <Briefcase size={16} /> },
    { key: 'myjobs',   label: 'My Jobs',        icon: <CheckCircle size={16} /> },
    { key: 'earnings', label: 'Earnings',        icon: <Wallet size={16} /> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Activity size={20} /> Vaultrix</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Provider</div>
        {links.map(l => (
          <button key={l.key} className={`sidebar-link ${active === l.key ? 'active' : ''}`}
            onClick={() => setActive(l.key)}>
            {l.icon}{l.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ marginBottom: '0.75rem' }}>
          <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'P'}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{user.name}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Provider</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-full btn-sm" onClick={logout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function AvailableJobs({ onAccept }) {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/orders?status=pending')
      .then(r => setJobs(Array.isArray(r.data) ? r.data : r.data.orders || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id, status) => {
    setActing(id);
    try {
      await api.patch(`/orders/${id}`, { status, providerId: user.id });
      load(); onAccept?.();
    } catch { /* ignore */ }
    finally { setActing(null); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="section-header">
        <span className="section-title">Open Service Requests</span>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      {jobs.length === 0
        ? <div className="empty-state"><Briefcase size={40} /><p>No open jobs right now. Check back soon!</p></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Service</th><th>Description</th><th>Budget</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j._id}>
                    <td style={{ fontWeight: 500 }}>{j.service || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 220 }}>{j.description || '—'}</td>
                    <td>₹{j.amount ?? '—'}</td>
                    <td style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="btn btn-success btn-sm" disabled={acting === j._id}
                        onClick={() => act(j._id, 'accepted')}>
                        {acting === j._id ? <span className="spinner" /> : <><CheckCircle size={13} /> Accept</>}
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={acting === j._id}
                        onClick={() => act(j._id, 'rejected')}>
                        <XCircle size={13} /> Reject
                      </button>
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

function MyJobs() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/orders?providerId=${user.id}`)
      .then(r => setJobs(Array.isArray(r.data) ? r.data : r.data.orders || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const complete = async id => {
    setActing(id);
    try { await api.patch(`/orders/${id}`, { status: 'completed' }); load(); }
    catch { /* ignore */ }
    finally { setActing(null); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="section-header">
        <span className="section-title">Jobs I've Accepted</span>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      {jobs.length === 0
        ? <div className="empty-state"><CheckCircle size={40} /><p>No accepted jobs yet.</p></div>
        : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Service</th><th>Budget</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j._id}>
                    <td style={{ fontWeight: 500 }}>{j.service || '—'}</td>
                    <td>₹{j.amount ?? '—'}</td>
                    <td><span className={`badge badge-${j.status === 'completed' ? 'success' : j.status === 'rejected' ? 'danger' : 'warn'}`}>{j.status}</span></td>
                    <td>
                      {j.status === 'accepted' && (
                        <button className="btn btn-success btn-sm" disabled={acting === j._id}
                          onClick={() => complete(j._id)}>
                          {acting === j._id ? <span className="spinner" /> : 'Mark Complete'}
                        </button>
                      )}
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

function EarningsPanel() {
  const [wallet,  setWallet]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/wallet/${user.id}`)
      .then(r => setWallet(r.data))
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><Wallet size={20} /></div>
          <div className="card-title">Total Earnings</div>
          <div className="card-value">₹{wallet?.balance?.toFixed(2) ?? '0.00'}</div>
          <div className="card-sub">Wallet balance</div>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 480, marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '.5rem' }}>Payout Information</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
          Earnings are credited to your wallet when a customer's job is marked as completed.
          Withdrawals and payout integration coming soon.
        </p>
      </div>
    </div>
  );
}

export default function ProviderDashboard() {
  const [active, setActive] = useState('jobs');
  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <div className="top-header">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {active === 'jobs' ? 'Available Jobs' : active === 'myjobs' ? 'My Jobs' : 'Earnings'}
          </span>
          <span className="badge badge-success">Provider</span>
        </div>
        <div className="page-content">
          {active === 'jobs'     && <AvailableJobs onAccept={() => setActive('myjobs')} />}
          {active === 'myjobs'   && <MyJobs />}
          {active === 'earnings' && <EarningsPanel />}
        </div>
      </main>
    </div>
  );
}
