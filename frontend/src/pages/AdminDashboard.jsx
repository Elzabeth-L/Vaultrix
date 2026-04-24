import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CheckCircle, XCircle, Clock, LogOut, RefreshCw, Flag, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import { getCurrentUser } from '../utils/auth';

const TABS = ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'];

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const logout   = () => { localStorage.clear(); navigate('/login'); };
  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Activity size={20} /> Vaultrix</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Admin Panel</div>
        <button className={`sidebar-link ${active === 'orders' ? 'active' : ''}`} onClick={() => setActive('orders')}>
          <CheckCircle size={16} /> Order Management
        </button>
        <button className={`sidebar-link ${active === 'stats' ? 'active' : ''}`} onClick={() => setActive('stats')}>
          <BarChart2 size={16} /> Statistics
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ marginBottom: '0.75rem' }}>
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}>A</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>Vaultrix Admin</div>
            <div style={{ fontSize: '.75rem', color: '#f59e0b', fontWeight: 600 }}>Administrator</div>
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
      {paymentStatus && <span className={`badge ${paymentStatus === 'PAID' ? 'badge-success' : 'badge-warn'}`}>{paymentStatus}</span>}
    </div>
  );
}

function OrderManagement() {
  const [orders,    setOrders]    = useState([]);
  const [tab,       setTab]       = useState('PENDING');
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState(null);
  const [reason,    setReason]    = useState('');
  const [rejectFor, setRejectFor] = useState(null);
  const [msg,       setMsg]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/orders?status=${tab}`);
      setOrders(r.data?.orders || []);
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
      setOrders([]);
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (orderId, action, body = {}) => {
    setActing(orderId + action);
    setMsg('');
    try {
      await api.patch(`/orders/${orderId}/${action}`, body);
      setMsg(`✓ Order ${action}d successfully.`);
      setRejectFor(null);
      setReason('');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || `Failed to ${action} order.`);
    } finally { setActing(null); }
  };

  return (
    <div className="animate-in">
      {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>{msg}</div>}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
            {t}
          </button>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginLeft: 'auto' }}><RefreshCw size={13} /></button>
      </div>

      {loading
        ? <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
        : orders.length === 0
          ? <div className="empty-state"><Clock size={40} /><p>No {tab.toLowerCase()} orders.</p></div>
          : orders.map(order => (
            <div key={order._id} className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.serviceName}</span>
                    <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.83rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <span>₹{order.amount}</span>
                    <span>👤 User: {order.userId?.slice(-6)}</span>
                    <span>📍 {order.address}</span>
                    <span>📅 {new Date(order.scheduledDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: '0.35rem' }}>
                    📝 {order.description}
                  </div>
                  {order.rejectionReason && (
                    <div style={{ marginTop: '0.5rem', color: '#f87171', fontSize: '0.83rem' }}>Rejection reason: {order.rejectionReason}</div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {order.status === 'PENDING' && (
                    <>
                      <button className="btn btn-success btn-sm" disabled={acting === order._id + 'approve'} onClick={() => doAction(order._id, 'approve')}>
                        {acting === order._id + 'approve' ? <span className="spinner" /> : <><CheckCircle size={13} /> Approve</>}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setRejectFor(order._id)}>
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  )}
                  {order.status === 'APPROVED' && order.paymentStatus === 'PAID' && (
                    <button className="btn btn-primary btn-sm" disabled={acting === order._id + 'complete'} onClick={() => doAction(order._id, 'complete')}>
                      {acting === order._id + 'complete' ? <span className="spinner" /> : <><Flag size={13} /> Mark Complete</>}
                    </button>
                  )}
                  {order.status === 'APPROVED' && order.paymentStatus === 'UNPAID' && (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} /> Awaiting payment
                    </span>
                  )}
                </div>
              </div>

              {/* Rejection reason input */}
              {rejectFor === order._id && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input className="form-control" placeholder="Rejection reason (optional)" value={reason}
                    onChange={e => setReason(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                  <button className="btn btn-danger btn-sm" disabled={acting === order._id + 'reject'}
                    onClick={() => doAction(order._id, 'reject', { reason })}>
                    {acting === order._id + 'reject' ? <span className="spinner" /> : 'Confirm Reject'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setRejectFor(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))
      }
    </div>
  );
}

function Statistics() {
  const [allOrders, setAllOrders] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, a, c, r] = await Promise.all([
          api.get('/orders?status=PENDING'),
          api.get('/orders?status=APPROVED'),
          api.get('/orders?status=COMPLETED'),
          api.get('/orders?status=REJECTED'),
        ]);
        const all = [
          ...(p.data?.orders || []),
          ...(a.data?.orders || []),
          ...(c.data?.orders || []),
          ...(r.data?.orders || []),
        ];
        setAllOrders(all);
      } catch { setAllOrders([]); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  const counts = TABS.map(t => ({ status: t, count: allOrders.filter(o => o.status === t).length }));
  const revenue = allOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + (o.amount || 0), 0);
  const pending = allOrders.filter(o => o.paymentStatus === 'UNPAID' && o.status === 'APPROVED').reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="animate-in">
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card"><div className="stat-icon indigo"><CheckCircle size={18} /></div><div className="card-title">Total Orders</div><div className="card-value">{allOrders.length}</div></div>
        <div className="stat-card"><div className="stat-icon green"><CheckCircle size={18} /></div><div className="card-title">Revenue Collected</div><div className="card-value">₹{revenue.toFixed(0)}</div></div>
        <div className="stat-card"><div className="stat-icon cyan"><Clock size={18} /></div><div className="card-title">Pending Payment</div><div className="card-value">₹{pending.toFixed(0)}</div></div>
      </div>

      <div className="card" style={{ padding: '1.5rem', height: 300 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Orders by Status</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={counts}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="status" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState('orders');
  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <div className="top-header">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '.9rem' }}>
            {active === 'orders' ? 'Order Management' : 'Statistics'}
          </span>
          <span className="badge badge-warn" style={{ padding: '0.5em 1em', fontSize: '0.8em' }}>Administrator</span>
        </div>
        <div className="page-content">
          {active === 'orders' && <OrderManagement />}
          {active === 'stats'  && <Statistics />}
        </div>
      </main>
    </div>
  );
}
