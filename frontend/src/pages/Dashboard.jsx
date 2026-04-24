import React, { useState, useEffect } from 'react';
import api from '../api';
import { Activity, Users, FileText, CreditCard, RefreshCw, LogOut, User as UserIcon, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers]             = useState([]);
  const [orders, setOrders]           = useState([]);
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [loading, setLoading]         = useState(true);

  // Create User form
  const [newUserName,  setNewUserName]  = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole,  setNewUserRole]  = useState('user');

  // Create Order form
  const [newOrderTitle,  setNewOrderTitle]  = useState('');
  const [newOrderDesc,   setNewOrderDesc]   = useState('');
  const [newOrderAmount, setNewOrderAmount] = useState('');
  const [newOrderClient, setNewOrderClient] = useState('');

  // Fund Wallet form
  const [fundUserId, setFundUserId] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  const [wallets, setWallets] = useState({});
  const [ledgers, setLedgers] = useState({});

  const navigate = useNavigate();

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setCurrentUser(res.data);
    } catch (e) {
      console.error('Profile fetch failed', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
      res.data.forEach(u => {
        fetchWallet(u._id);
        fetchLedger(u._id);
      });
    } catch (e) {
      console.error('Users fetch failed', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (e) {
      console.error('Orders fetch failed', e);
    }
  };

  const fetchWallet = async (userId) => {
    try {
      const res = await api.get(`/wallet/${userId}`);
      setWallets(prev => ({ ...prev, [userId]: res.data.balance }));
    } catch (e) {
      if (e.response?.status === 404) {
        try {
          await api.post('/wallet/create', { userId });
          setWallets(prev => ({ ...prev, [userId]: 0 }));
        } catch (err) {
          console.error('Wallet create failed', err);
        }
      }
    }
  };

  const fetchLedger = async (userId) => {
    try {
      const res = await api.get(`/ledger/${userId}`);
      setLedgers(prev => ({ ...prev, [userId]: res.data }));
    } catch (e) {
      console.error('Ledger fetch failed', e);
    }
  };

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      await Promise.all([fetchProfile(), fetchUsers(), fetchOrders()]);
      setLoading(false);
    })();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { name: newUserName, email: newUserEmail, role: newUserRole });
      setNewUserName(''); setNewUserEmail('');
      fetchUsers();
    } catch (e) { alert(e.response?.data?.error || 'Error creating user'); }
  };

  const createOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        title: newOrderTitle, description: newOrderDesc,
        amount: Number(newOrderAmount), clientId: newOrderClient,
      });
      setNewOrderTitle(''); setNewOrderDesc(''); setNewOrderAmount('');
      fetchOrders();
    } catch (e) { alert(e.response?.data?.error || 'Error creating order'); }
  };

  const fundWallet = async (e) => {
    e.preventDefault();
    try {
      await api.post('/wallet/fund', { userId: fundUserId, amount: Number(fundAmount) });
      setFundAmount('');
      fetchWallet(fundUserId);
      fetchLedger(fundUserId);
    } catch (e) { alert(e.response?.data?.error || 'Error funding wallet'); }
  };

  const assignOrder = async (orderId, providerId) => {
    if (!providerId) return;
    try {
      await api.patch(`/orders/${orderId}/assign`, { providerId });
      fetchOrders();
    } catch (e) { alert(e.response?.data?.error || 'Error assigning order'); }
  };

  const completeOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/complete`);
      fetchOrders();
    } catch (e) { alert(e.response?.data?.error || 'Error completing order'); }
  };

  const executeTransaction = async (orderId) => {
    try {
      await api.post('/transactions/execute', { orderId });
      fetchOrders();
      users.forEach(u => { fetchWallet(u._id); fetchLedger(u._id); });
    } catch (e) {
      alert(e.response?.data?.error || 'Error executing transaction');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Activity size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading Vaultrix...</span>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',      icon: <Activity size={18} /> },
    { id: 'users',     label: 'Users & Wallets', icon: <Users size={18} /> },
    { id: 'orders',    label: 'Work Orders',      icon: <FileText size={18} /> },
    { id: 'profile',   label: 'My Profile',       icon: <UserIcon size={18} /> },
  ];

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Activity size={24} /> Vaultrix
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', color: 'var(--danger)' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button
            className="user-profile-badge"
            style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer' }}
            onClick={() => setActiveTab('profile')}
          >
            <UserIcon size={16} color="var(--primary)" />
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
              {currentUser?.name} <span style={{ color: 'var(--text-muted)' }}>({currentUser?.role})</span>
            </span>
          </button>
        </header>

        <div className="container" style={{ flex: 1 }}>

          {/* ── Dashboard Overview ── */}
          {activeTab === 'dashboard' && (
            <div>
              <h1 className="title">Platform Overview</h1>
              <div className="grid" style={{ marginBottom: '2rem' }}>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Users size={36} color="var(--primary)" />
                    <div>
                      <p className="subtitle" style={{ margin: 0 }}>Total Users</p>
                      <p style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{users.length}</p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={36} color="var(--success)" />
                    <div>
                      <p className="subtitle" style={{ margin: 0 }}>Total Orders</p>
                      <p style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{orders.length}</p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <CreditCard size={36} color="#f59e0b" />
                    <div>
                      <p className="subtitle" style={{ margin: 0 }}>Settled Orders</p>
                      <p style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>
                        {orders.filter(o => o.status === 'SETTLED').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="title" style={{ margin: 0 }}>Recent Ledger Activity</h2>
                  <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => users.forEach(u => fetchLedger(u._id))}>
                    <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh
                  </button>
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {users.flatMap(u => ledgers[u._id] || [])
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 15)
                    .map((l, i) => (
                      <div key={i} style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 500 }}>{users.find(u => u._id === l.userId)?.name || l.userId}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.description}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${l.type === 'CREDIT' ? 'badge-success' : 'badge-danger'}`}>
                            {l.type === 'CREDIT' ? '+' : '-'}₹{l.amount}
                          </span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(l.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  {users.flatMap(u => ledgers[u._id] || []).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No ledger entries yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Users & Wallets ── */}
          {activeTab === 'users' && (
            <div>
              <h1 className="title">Users & Wallets</h1>
              <div className="grid" style={{ marginBottom: '2rem' }}>
                <div className="card">
                  <h2 className="title">Create User</h2>
                  <form onSubmit={createUser}>
                    <div className="form-group">
                      <label>Name</label>
                      <input className="form-control" value={newUserName} onChange={e => setNewUserName(e.target.value)} required placeholder="Full name" />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input className="form-control" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required placeholder="email@example.com" />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select className="form-control" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create User</button>
                  </form>
                </div>

                <div className="card">
                  <h2 className="title">Fund Wallet</h2>
                  <form onSubmit={fundWallet}>
                    <div className="form-group">
                      <label>Select User</label>
                      <select className="form-control" value={fundUserId} onChange={e => setFundUserId(e.target.value)} required>
                        <option value="">-- Select User --</option>
                        {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Amount (₹)</label>
                      <input className="form-control" type="number" min="1" value={fundAmount} onChange={e => setFundAmount(e.target.value)} required placeholder="Enter amount" />
                    </div>
                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                      <CreditCard size={16} style={{ marginRight: '8px' }} /> Deposit Funds
                    </button>
                  </form>
                </div>
              </div>

              <div className="card">
                <h2 className="title">All Users</h2>
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Wallet Balance</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                        <td><span className="badge">{u.role}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{wallets[u._id] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Work Orders ── */}
          {activeTab === 'orders' && (
            <div>
              <h1 className="title">Work Orders</h1>
              <div className="grid" style={{ marginBottom: '2rem' }}>
                <div className="card">
                  <h2 className="title">Create Order</h2>
                  <form onSubmit={createOrder}>
                    <div className="form-group">
                      <label>Title</label>
                      <input className="form-control" value={newOrderTitle} onChange={e => setNewOrderTitle(e.target.value)} required placeholder="Order title" />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <input className="form-control" value={newOrderDesc} onChange={e => setNewOrderDesc(e.target.value)} required placeholder="Brief description" />
                    </div>
                    <div className="form-group">
                      <label>Amount (₹)</label>
                      <input className="form-control" type="number" min="1" value={newOrderAmount} onChange={e => setNewOrderAmount(e.target.value)} required placeholder="Amount" />
                    </div>
                    <div className="form-group">
                      <label>Client</label>
                      <select className="form-control" value={newOrderClient} onChange={e => setNewOrderClient(e.target.value)} required>
                        <option value="">-- Select Client --</option>
                        {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Order</button>
                  </form>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="title" style={{ margin: 0 }}>All Orders</h2>
                  <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={fetchOrders}>
                    <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh
                  </button>
                </div>
                <table>
                  <thead><tr><th>Title</th><th>Client</th><th>Provider</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 500 }}>{o.title}</td>
                        <td>{users.find(u => u._id === o.clientId)?.name || '—'}</td>
                        <td>{o.providerId ? (users.find(u => u._id === o.providerId)?.name || o.providerId) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                        <td style={{ fontWeight: 700 }}>₹{o.amount}</td>
                        <td>
                          <span className={`badge ${o.status === 'SETTLED' ? 'badge-success' : o.status === 'COMPLETED' ? 'badge-warn' : ''}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          {o.status === 'CREATED' && (
                            <select className="form-control" style={{ width: 'auto', display: 'inline-block', padding: '0.3rem 0.6rem' }}
                              onChange={e => assignOrder(o._id, e.target.value)} defaultValue="">
                              <option value="" disabled>Assign Provider</option>
                              {users.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                          )}
                          {o.status === 'ASSIGNED' && (
                            <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => completeOrder(o._id)}>Complete</button>
                          )}
                          {o.status === 'COMPLETED' && (
                            <button className="btn btn-success" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => executeTransaction(o._id)}>Settle (Pay)</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No orders yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Profile ── */}
          {activeTab === 'profile' && currentUser && (
            <div style={{ maxWidth: '500px' }}>
              <h1 className="title">My Profile</h1>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 700,
                  }}>
                    {currentUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentUser.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{currentUser.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'User ID', value: currentUser._id },
                    { label: 'Role', value: currentUser.role },
                    { label: 'Joined', value: new Date(currentUser.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <button className="btn" onClick={handleLogout} style={{ width: '100%', marginTop: '2rem', color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent' }}>
                  <LogOut size={16} style={{ marginRight: '8px' }} /> Sign Out
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
