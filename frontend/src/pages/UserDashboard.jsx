import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Wallet, ShoppingBag, LogOut, Plus, RefreshCw } from 'lucide-react';
import api from '../api';

const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const logout = () => { localStorage.clear(); navigate('/login'); };
  const links = [
    { key: 'wallet',   label: 'Wallet',   icon: <Wallet size={16} /> },
    { key: 'requests', label: 'My Requests', icon: <ShoppingBag size={16} /> },
    { key: 'new',      label: 'New Request',  icon: <Plus size={16} /> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Activity size={20} /> Vaultrix</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        {links.map(l => (
          <button key={l.key} className={`sidebar-link ${active === l.key ? 'active' : ''}`}
            onClick={() => setActive(l.key)}>
            {l.icon}{l.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ marginBottom: '0.75rem' }}>
          <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{user.name}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>User</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-full btn-sm" onClick={logout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function WalletPanel() {
  const [wallet,  setWallet]  = useState(null);
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [msg,     setMsg]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`/wallet/${user.id}`); setWallet(r.data); }
    catch { setWallet(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fund = async e => {
    e.preventDefault(); setMsg('');
    if (!amount || Number(amount) <= 0) return setMsg('Enter a valid amount.');
    setFunding(true);
    try {
      await api.post('/wallet/fund', { userId: user.id, amount: Number(amount) });
      setAmount(''); setMsg('✓ Wallet funded successfully!'); load();
    } catch (err) { setMsg(err.response?.data?.message || 'Fund failed.'); }
    finally { setFunding(false); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon indigo"><Wallet size={20} /></div>
          <div className="card-title">Wallet Balance</div>
          <div className="card-value">₹{wallet?.balance?.toFixed(2) ?? '0.00'}</div>
          <div className="card-sub">Available to spend</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 400 }}>
        <h2 style={{ marginBottom: '1.25rem' }}>Add Funds</h2>
        {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
        <form onSubmit={fund}>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" className="form-control" placeholder="500"
              value={amount} onChange={e => setAmount(e.target.value)} min="1" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={funding}>
            {funding ? <span className="spinner" /> : 'Add Funds'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequestsPanel() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders?userId=${user.id}`)
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="section-header">
        <span className="section-title">My Service Requests</span>
        <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      {orders.length === 0
        ? <div className="empty-state"><ShoppingBag size={40} /><p>No requests yet. Create your first one!</p></div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Service</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td>{o.service || o.description || '—'}</td>
                    <td>₹{o.amount ?? '—'}</td>
                    <td><span className={`badge badge-${o.status === 'completed' ? 'success' : o.status === 'rejected' ? 'danger' : 'warn'}`}>{o.status}</span></td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function NewRequestPanel({ onCreated }) {
  const [form, setForm]   = useState({ service: '', description: '', amount: '' });
  const [msg,  setMsg]    = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setMsg('');
    setLoading(true);
    try {
      await api.post('/orders', { ...form, amount: Number(form.amount), userId: user.id, status: 'pending' });
      setMsg('✓ Request submitted!');
      setForm({ service: '', description: '', amount: '' });
      onCreated?.();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed to submit.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-in">
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ marginBottom: '1.5rem' }}>New Service Request</h2>
        {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Service type</label>
            <input className="form-control" placeholder="e.g. Plumbing, Tutoring, Design…"
              value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input className="form-control" placeholder="Describe what you need"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Budget (₹)</label>
            <input type="number" className="form-control" placeholder="1000"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="1" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <><Plus size={16} /> Submit Request</>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const [active, setActive] = useState('wallet');
  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <div className="top-header">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {active === 'wallet' ? 'Wallet' : active === 'requests' ? 'My Requests' : 'New Request'}
          </span>
          <span className="badge badge-primary">User</span>
        </div>
        <div className="page-content">
          {active === 'wallet'   && <WalletPanel />}
          {active === 'requests' && <RequestsPanel />}
          {active === 'new'      && <NewRequestPanel onCreated={() => setActive('requests')} />}
        </div>
      </main>
    </div>
  );
}
