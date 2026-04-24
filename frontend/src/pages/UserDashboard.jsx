import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Wallet, ShoppingBag, LogOut, RefreshCw, CreditCard, Download, Star, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import { getCurrentUser } from '../utils/auth';
import ReviewModal from '../components/ReviewModal';

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const user     = getCurrentUser() || {};
  const logout   = () => { localStorage.clear(); navigate('/login'); };
  const links    = [
    { key: 'orders', label: 'My Orders',    icon: <ShoppingBag size={16} /> },
    { key: 'wallet', label: 'Wallet',        icon: <Wallet size={16} /> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Activity size={20} /> Vaultrix</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Menu</div>
        {links.map(l => (
          <button key={l.key} className={`sidebar-link ${active === l.key ? 'active' : ''}`} onClick={() => setActive(l.key)}>
            {l.icon}{l.label}
          </button>
        ))}
        <Link to="/services" className="sidebar-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Browse Services
        </Link>
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ marginBottom: '0.75rem' }}>
          <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{user.name || 'User'}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--primary)', fontWeight: 600 }}>Customer</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-full btn-sm" onClick={logout}><LogOut size={14} /> Sign out</button>
      </div>
    </aside>
  );
}

function StatusBadge({ status, paymentStatus }) {
  const map = { PENDING: 'warn', APPROVED: 'primary', REJECTED: 'danger', COMPLETED: 'success' };
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      <span className={`badge badge-${map[status] || 'warn'}`}>{status}</span>
      {paymentStatus && (
        <span className={`badge ${paymentStatus === 'PAID' ? 'badge-success' : 'badge-warn'}`}>{paymentStatus}</span>
      )}
    </div>
  );
}

function OrdersPanel() {
  const user = getCurrentUser();
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [paying,      setPaying]      = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewed,    setReviewed]    = useState({});
  const [msg,         setMsg]         = useState('');

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get(`/orders?userId=${user.id}`);
      const list = r.data?.orders || [];
      setOrders(list);
      // Check which orders already have reviews
      const reviewChecks = await Promise.allSettled(list.map(o => api.get(`/reviews/order/${o._id}`)));
      const rev = {};
      reviewChecks.forEach((res, i) => {
        if (res.status === 'fulfilled') rev[list[i]._id] = true;
      });
      setReviewed(rev);
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
      setOrders([]);
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const payNow = async (order) => {
    if (!user?.id) return;
    setPaying(order._id);
    setMsg('');
    try {
      await api.post('/wallet/pay', { userId: user.id, orderId: order._id });
      setMsg('✓ Payment successful! Invoice generated.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || err.response?.data?.message || 'Payment failed.');
    } finally { setPaying(null); }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const r = await api.get(`/invoices/order/${orderId}`);
      const invoiceId = r.data?.invoice?._id;
      if (!invoiceId) return alert('Invoice not found.');
      window.open(`/api/invoices/${invoiceId}/download`, '_blank');
    } catch { alert('Could not fetch invoice.'); }
  };

  const mockChart = [
    { month: 'Jan', spent: 0 },
    { month: 'Feb', spent: orders.filter(o => o.paymentStatus === 'PAID' && new Date(o.createdAt).getMonth() === 1).reduce((s, o) => s + o.amount, 0) || 1200 },
    { month: 'Mar', spent: 800 },
    { month: 'Apr', spent: orders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + o.amount, 0) || 2400 },
  ];

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>{msg}</div>}

      {/* Spending chart */}
      {orders.some(o => o.paymentStatus === 'PAID') && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', height: 260 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-light)' }}>Spending Overview (₹)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip contentStyle={{ backgroundColor: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="spent" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} activeDot={{ r: 6, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="section-header">
        <span className="section-title">My Service Requests</span>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      {orders.length === 0
        ? (
          <div className="empty-state">
            <ShoppingBag size={40} />
            <p>No requests yet.</p>
            <Link to="/services" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Services</Link>
          </div>
        )
        : orders.map(order => (
          <div key={order._id} className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.serviceName}</span>
                  <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>₹{order.amount}</span>
                  <span>📍 {order.address}</span>
                  <span>📅 {new Date(order.scheduledDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>Ref: #{order._id?.slice(-6)}</span>
                </div>
                {order.rejectionReason && <div style={{ marginTop: '0.5rem', color: '#f87171', fontSize: '0.85rem' }}>Reason: {order.rejectionReason}</div>}
              </div>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {order.status === 'APPROVED' && order.paymentStatus === 'UNPAID' && (
                  <button className="btn btn-primary btn-sm" disabled={paying === order._id} onClick={() => payNow(order)}>
                    {paying === order._id ? <span className="spinner" /> : <><CreditCard size={13} /> Pay ₹{order.amount}</>}
                  </button>
                )}
                {order.paymentStatus === 'PAID' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadInvoice(order._id)}>
                    <Download size={13} /> Invoice
                  </button>
                )}
                {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && !reviewed[order._id] && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setReviewOrder(order)}
                    style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                    <Star size={13} /> Review
                  </button>
                )}
                {reviewed[order._id] && (
                  <span className="badge badge-success">Reviewed ✓</span>
                )}
              </div>
            </div>
          </div>
        ))
      }

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSuccess={() => { setReviewOrder(null); load(); }}
        />
      )}
    </div>
  );
}

function WalletPanel() {
  const user = getCurrentUser();
  const [wallet,  setWallet]  = useState(null);
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [msg,     setMsg]     = useState('');

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try { const r = await api.get(`/wallet/${user.id}`); setWallet(r.data); }
    catch (err) { console.error('API Error:', err.response?.data || err.message); setWallet(null); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const fund = async e => {
    e.preventDefault(); setMsg('');
    if (!user?.id) return setMsg('User not found.');
    if (!amount || Number(amount) <= 0) return setMsg('Enter a valid amount.');
    setFunding(true);
    try {
      await api.post('/wallet/fund', { userId: user.id, amount: Number(amount) });
      setAmount(''); setMsg('✓ Wallet funded!'); load();
    } catch (err) { setMsg(err.response?.data?.message || err.response?.data?.error || 'Fund failed.'); }
    finally { setFunding(false); }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
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
            <input type="number" className="form-control" placeholder="500" value={amount} onChange={e => setAmount(e.target.value)} min="1" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={funding}>
            {funding ? <span className="spinner" /> : 'Add Funds'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const [active, setActive] = useState('orders');
  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <div className="top-header">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {active === 'orders' ? 'My Orders' : 'Wallet'}
          </span>
          <span className="badge badge-primary" style={{ padding: '0.5em 1em', fontSize: '0.8em' }}>Customer</span>
        </div>
        <div className="page-content">
          {active === 'orders' && <OrdersPanel />}
          {active === 'wallet' && <WalletPanel />}
        </div>
      </main>
    </div>
  );
}
