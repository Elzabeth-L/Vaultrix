import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Wallet, ShoppingBag, LogOut, RefreshCw, CreditCard, Download, Star, Plus, User as UserIcon, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { buildApiUrl } from '../api';
import ReviewModal from '../components/ReviewModal';
import { clearAuth, getCurrentUser, setCurrentUser } from '../utils/auth';
import { getServiceById, loadServices } from '../utils/services';

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const user = getCurrentUser() || {};
  const logout = () => { clearAuth(); navigate('/login'); };
  const links = [
    { key: 'orders', label: 'My Orders', icon: <ShoppingBag size={16} /> },
    { key: 'wallet', label: 'Wallet', icon: <Wallet size={16} /> },
    { key: 'profile', label: 'Profile', icon: <UserIcon size={16} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Activity size={20} /> Vaultrix</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Menu</div>
        {links.map((l) => (
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewed, setReviewed] = useState({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get(`/orders?userId=${user.id}`);
      const list = r.data?.orders || [];
      setOrders(list);

      const reviewChecks = await Promise.allSettled(list.map((o) => api.get(`/reviews/order/${o._id}`)));
      const rev = {};
      reviewChecks.forEach((res, i) => {
        if (res.status === 'fulfilled') rev[list[i]._id] = true;
      });
      setReviewed(rev);
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const payNow = async (order) => {
    if (!user?.id) return;
    setPaying(order._id);
    setMsg('');
    try {
      const response = await api.post('/wallet/pay', { userId: user.id, orderId: order._id });
      setMsg(response.data?.invoiceError || response.data?.message || 'Payment successful. Invoice generated.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || err.response?.data?.message || 'Payment failed.');
    } finally {
      setPaying(null);
    }
  };

  const downloadInvoice = async (orderId) => {
    setDownloadingInvoice(orderId);
    setMsg('');
    try {
      await api.get(`/invoices/order/${orderId}`);
      window.open(buildApiUrl(`/invoices/order/${orderId}/download`), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not fetch invoice.');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const chartData = [
    { month: 'Jan', spent: 0 },
    { month: 'Feb', spent: orders.filter((o) => o.paymentStatus === 'PAID' && new Date(o.createdAt).getMonth() === 1).reduce((s, o) => s + o.amount, 0) || 1200 },
    { month: 'Mar', spent: 800 },
    { month: 'Apr', spent: orders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + o.amount, 0) || 2400 },
  ];

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      {msg && <div className={`alert ${msg.toLowerCase().includes('successful') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>{msg}</div>}

      {orders.some((o) => o.paymentStatus === 'PAID') && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', height: 260 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-light)' }}>Spending Overview ($)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
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

      {orders.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={40} />
          <p>No requests yet.</p>
          <Link to="/services" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Services</Link>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
            {(() => {
              const service = getServiceById(order.serviceId);
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{service?.name || order.serviceName}</span>
                  <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                  {order.isCustomService && <span className="badge badge-primary">{service?.visibility === 'PUBLIC' ? 'Published Service' : 'Custom Service'}</span>}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>${order.amount}</span>
                  <span>{order.address}</span>
                  <span>{new Date(order.scheduledDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>Ref: #{order._id?.slice(-6)}</span>
                </div>
                {service?.description && service.description !== order.description && (
                  <div style={{ marginTop: '0.5rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
                    Admin update: {service.description}
                  </div>
                )}
                {order.rejectionReason && <div style={{ marginTop: '0.5rem', color: '#f87171', fontSize: '0.85rem' }}>Reason: {order.rejectionReason}</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {order.status === 'APPROVED' && order.paymentStatus === 'UNPAID' && (
                  <button className="btn btn-primary btn-sm" disabled={paying === order._id} onClick={() => payNow(order)}>
                    {paying === order._id ? <span className="spinner" /> : <><CreditCard size={13} /> Pay ${order.amount}</>}
                  </button>
                )}
                {order.paymentStatus === 'PAID' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => downloadInvoice(order._id)}
                    disabled={downloadingInvoice === order._id}
                  >
                    {downloadingInvoice === order._id ? <span className="spinner" /> : <><Download size={13} /> Invoice</>}
                  </button>
                )}
                {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && !reviewed[order._id] && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setReviewOrder(order)} style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                    <Star size={13} /> Review
                  </button>
                )}
                {reviewed[order._id] && (
                  <span className="badge badge-success">Reviewed</span>
                )}
              </div>
                </div>
              );
            })()}
          </div>
        ))
      )}

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
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get(`/wallet/${user.id}`);
      setWallet(r.data);
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const fund = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!user?.id) return setMsg('User not found.');
    if (!amount || Number(amount) <= 0) return setMsg('Enter a valid amount.');
    setFunding(true);
    try {
      await api.post('/wallet/fund', { userId: user.id, amount: Number(amount) });
      setAmount('');
      setMsg('Wallet funded successfully.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || err.response?.data?.error || 'Fund failed.');
    } finally {
      setFunding(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
        <div className="stat-card" style={{ marginBottom: 0 }}>
          <div className="stat-icon indigo"><Wallet size={20} /></div>
          <div className="card-title">Wallet Balance</div>
          <div className="card-value">${wallet?.balance?.toFixed(2) ?? '0.00'}</div>
          <div className="card-sub">Available to spend</div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <h2 style={{ marginBottom: '1.25rem' }}>Add Funds</h2>
          {msg && <div className={`alert ${msg.toLowerCase().includes('successfully') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
          <form onSubmit={fund}>
            <div className="form-group">
              <label>Amount ($)</label>
              <input type="number" className="form-control" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={funding}>
              {funding ? <span className="spinner" /> : 'Add Funds'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [profile, setProfile] = useState(currentUser);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.id) { setLoading(false); return; }
    setLoading(true);
    setMsg('');
    try {
      const response = await api.get(`/users/${currentUser.id}`);
      const nextUser = response.data?.user;
      setProfile(nextUser);
      if (nextUser) setCurrentUser(nextUser);
    } catch (error) {
      setMsg(error.response?.data?.message || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);

  const deleteAccount = async () => {
    if (!currentUser?.id) return;
    const confirmed = window.confirm('Delete your account permanently? This cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    setMsg('');
    try {
      await api.delete(`/users/${currentUser.id}`);
      clearAuth();
      navigate('/register');
    } catch (error) {
      setMsg(error.response?.data?.message || 'Could not delete your account.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  return (
    <div className="animate-in">
      {msg && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{msg}</div>}

      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>My Profile</h2>
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '.8rem', color: '#94a3b8', marginBottom: '.35rem' }}>Full name</div>
            <div className="form-control" style={{ display: 'flex', alignItems: 'center' }}>{profile?.name || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '.8rem', color: '#94a3b8', marginBottom: '.35rem' }}>Email</div>
            <div className="form-control" style={{ display: 'flex', alignItems: 'center' }}>{profile?.email || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '.8rem', color: '#94a3b8', marginBottom: '.35rem' }}>Role</div>
            <div className="form-control" style={{ display: 'flex', alignItems: 'center' }}>{profile?.role || 'USER'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: '1.5rem', borderColor: 'rgba(248,113,113,0.35)' }}>
        <h3 style={{ marginTop: 0, color: '#fca5a5' }}>Danger Zone</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          Delete your account and remove your login access from Vaultrix.
        </p>
        <button className="btn btn-danger" onClick={deleteAccount} disabled={deleting}>
          {deleting ? <span className="spinner" /> : <><Trash2 size={14} /> Delete Account</>}
        </button>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const [active, setActive] = useState('orders');

  useEffect(() => {
    loadServices(api).catch(() => {});
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <div className="top-header">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {active === 'orders' ? 'My Orders' : active === 'wallet' ? 'Wallet' : 'Profile'}
          </span>
          <span className="badge badge-primary" style={{ padding: '0.5em 1em', fontSize: '0.8em' }}>Customer</span>
        </div>
        <div className="page-content">
          {active === 'orders' && <OrdersPanel />}
          {active === 'wallet' && <WalletPanel />}
          {active === 'profile' && <ProfilePanel />}
        </div>
      </main>
    </div>
  );
}
