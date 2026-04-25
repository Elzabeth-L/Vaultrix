import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  RefreshCw,
  Flag,
  BarChart2,
  Briefcase,
  PlusCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import { clearAuth } from '../utils/auth';
import {
  getServices,
  loadServices,
  createService,
  updateService,
  publishService,
  SERVICES_REGISTRY_EVENT,
  DEFAULT_SERVICE_BACKGROUND,
} from '../utils/services';

const ORDER_TABS = ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'];

function Sidebar({ active, setActive }) {
  const navigate = useNavigate();
  const logout = () => { clearAuth(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-header"><Activity size={20} /> Vaultrix</div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Admin Panel</div>
        <button className={`sidebar-link ${active === 'orders' ? 'active' : ''}`} onClick={() => setActive('orders')}>
          <CheckCircle size={16} /> Order Management
        </button>
        <button className={`sidebar-link ${active === 'services' ? 'active' : ''}`} onClick={() => setActive('services')}>
          <Briefcase size={16} /> Services
        </button>
        <button className={`sidebar-link ${active === 'stats' ? 'active' : ''}`} onClick={() => setActive('stats')}>
          <BarChart2 size={16} /> Statistics
        </button>
        <Link to="/services" className="sidebar-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ImageIcon size={16} /> Browse Catalog
        </Link>
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
  const [orders, setOrders] = useState([]);
  const [servicesById, setServicesById] = useState({});
  const [tab, setTab] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [reason, setReason] = useState('');
  const [rejectFor, setRejectFor] = useState(null);
  const [serviceEdits, setServiceEdits] = useState({});
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderResponse, serviceList] = await Promise.all([
        api.get(`/orders?status=${tab}`),
        loadServices(api).catch(() => getServices()),
      ]);
      setOrders(orderResponse.data?.orders || []);
      setServicesById(Object.fromEntries((serviceList || []).map((service) => [service.id, service])));
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
      setOrders([]);
      setServicesById(Object.fromEntries(getServices().map((service) => [service.id, service])));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const getServiceMeta = (order) => servicesById[order.serviceId] || null;

  const getDraftForOrder = (order) => {
    const service = getServiceMeta(order);
    return serviceEdits[order.serviceId] || {
      name: service?.name || order.serviceName,
      description: service?.description || order.description,
      backgroundImage: service?.backgroundImage && service.backgroundImage !== DEFAULT_SERVICE_BACKGROUND ? service.backgroundImage : '',
      priceFrom: String(service?.priceFrom || order.amount || ''),
      category: service?.category || 'Custom',
      reviewCriteria: Array.isArray(service?.reviewCriteria) ? service.reviewCriteria.join(', ') : '',
    };
  };

  const updateDraft = (order, field, value) => {
    const service = getServiceMeta(order);
    setServiceEdits((current) => ({
      ...current,
      [order.serviceId]: {
        ...(current[order.serviceId] || {
          name: service?.name || order.serviceName,
          description: service?.description || order.description,
          backgroundImage: service?.backgroundImage && service.backgroundImage !== DEFAULT_SERVICE_BACKGROUND ? service.backgroundImage : '',
          priceFrom: String(service?.priceFrom || order.amount || ''),
          category: service?.category || 'Custom',
          reviewCriteria: Array.isArray(service?.reviewCriteria) ? service.reviewCriteria.join(', ') : '',
        }),
        [field]: value,
      },
    }));
  };

  const syncCustomService = async (order, publish = false) => {
    const draft = getDraftForOrder(order);
    const payload = {
      name: draft.name,
      description: draft.description,
      backgroundImage: draft.backgroundImage,
      priceFrom: Number(draft.priceFrom) > 0 ? Number(draft.priceFrom) : Number(order.amount),
      category: draft.category || 'Custom',
      reviewCriteria: draft.reviewCriteria,
    };

    if (publish) {
      await publishService(api, order.serviceId, payload);
    } else {
      await updateService(api, order.serviceId, payload);
    }

    const refreshedServices = await loadServices(api).catch(() => getServices());
    setServicesById(Object.fromEntries((refreshedServices || []).map((service) => [service.id, service])));
  };

  const doAction = async (orderId, action, body = {}) => {
    if (action === 'reject' && !String(body.reason || '').trim()) {
      setMsg({ type: 'error', text: 'Please enter a rejection reason so the apology email can be drafted properly.' });
      return;
    }

    setActing(orderId + action);
    setMsg(null);

    try {
      const response = await api.patch(`/orders/${orderId}/${action}`, body);
      const notification = response.data?.notification;
      const backendMessage = response.data?.message;

      setMsg({
        type: notification?.success === false ? 'error' : 'success',
        text: backendMessage || `Order ${action}d successfully.`,
      });

      setRejectFor(null);
      setReason('');
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || `Failed to ${action} order.` });
    } finally {
      setActing(null);
    }
  };

  const approveCustomOrder = async (order) => {
    setActing(order._id + 'approve');
    setMsg(null);

    try {
      await syncCustomService(order, false);
      const response = await api.patch(`/orders/${order._id}/approve`);
      const notification = response.data?.notification;
      setMsg({
        type: notification?.success === false ? 'error' : 'success',
        text: response.data?.message || 'Custom service approved successfully.',
      });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to approve the custom service request.' });
    } finally {
      setActing(null);
    }
  };

  const publishCompletedService = async (order) => {
    setActing(order._id + 'publish');
    setMsg(null);

    try {
      await syncCustomService(order, true);
      setMsg({ type: 'success', text: `${order.serviceName} is now published for everyone.` });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to publish this service.' });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="animate-in">
      {msg && <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {ORDER_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
            {t}
          </button>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={load} style={{ marginLeft: 'auto' }}><RefreshCw size={13} /></button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state"><Clock size={40} /><p>No {tab.toLowerCase()} orders.</p></div>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
            {(() => {
              const service = getServiceMeta(order);
              const draft = getDraftForOrder(order);
              const canPublish = order.isCustomService && service?.visibility !== 'PUBLIC' && order.status === 'COMPLETED' && order.paymentStatus === 'PAID';
              return (
                <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.serviceName}</span>
                  <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                  {order.isCustomService && (
                    <span className="badge badge-primary">{service?.visibility === 'PUBLIC' ? 'PUBLISHED' : 'CUSTOM'}</span>
                  )}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.83rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>${order.amount}</span>
                  <span>User: {order.userName || order.userId?.slice(-6)}</span>
                  {order.userEmail && <span>Email: {order.userEmail}</span>}
                  <span>{order.address}</span>
                  <span>{new Date(order.scheduledDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: '0.35rem' }}>
                  {order.description}
                </div>
                {order.rejectionReason && (
                  <div style={{ marginTop: '0.5rem', color: '#f87171', fontSize: '0.83rem' }}>Rejection reason: {order.rejectionReason}</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {order.status === 'PENDING' && (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      disabled={acting === order._id + 'approve'}
                      onClick={() => (order.isCustomService ? approveCustomOrder(order) : doAction(order._id, 'approve'))}
                    >
                      {acting === order._id + 'approve' ? <span className="spinner" /> : <><CheckCircle size={13} /> Approve</>}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setRejectFor(order._id); setMsg(null); }}>
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
                {canPublish && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={acting === order._id + 'publish'}
                    onClick={() => publishCompletedService(order)}
                    style={{ borderColor: '#22c55e', color: '#86efac' }}
                  >
                    {acting === order._id + 'publish' ? <span className="spinner" /> : <><PlusCircle size={13} /> Publish</>}
                  </button>
                )}
              </div>
            </div>

            {rejectFor === order._id && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="form-control" placeholder="Required: e.g. the requested date is unavailable" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: 1, minWidth: 260 }} />
                <button className="btn btn-danger btn-sm" disabled={acting === order._id + 'reject'} onClick={() => doAction(order._id, 'reject', { reason })}>
                  {acting === order._id + 'reject' ? <span className="spinner" /> : 'Send Rejection'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setRejectFor(null); setReason(''); }}>Cancel</button>
              </div>
            )}

            {order.isCustomService && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '0.85rem' }}>
                <div style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>
                  {service?.visibility === 'PUBLIC'
                    ? 'Published custom service details'
                    : 'Admin service details for this private custom request'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Service name</label>
                    <input className="form-control" value={draft.name} onChange={(e) => updateDraft(order, 'name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Category</label>
                    <input className="form-control" value={draft.category} onChange={(e) => updateDraft(order, 'category', e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Description for user</label>
                  <textarea className="form-control" rows={3} value={draft.description} onChange={(e) => updateDraft(order, 'description', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Background image URL</label>
                    <input className="form-control" placeholder="https://example.com/image.jpg" value={draft.backgroundImage} onChange={(e) => updateDraft(order, 'backgroundImage', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Publish price from ($)</label>
                    <input className="form-control" type="number" min="1" value={draft.priceFrom} onChange={(e) => updateDraft(order, 'priceFrom', e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Review criteria</label>
                  <input className="form-control" placeholder="Quality, Communication, Value for Money" value={draft.reviewCriteria} onChange={(e) => updateDraft(order, 'reviewCriteria', e.target.value)} />
                </div>
              </div>
            )}
                </>
              );
            })()}
          </div>
        ))
      )}
    </div>
  );
}

function ServicesManagement() {
  const [services, setServices] = useState(() => getServices());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({
    name: '',
    id: '',
    icon: '',
    description: '',
    priceFrom: '',
    category: '',
    backgroundImage: '',
    reviewCriteria: '',
  });

  const syncServicesFromCache = useCallback(() => setServices(getServices()), []);

  const loadServicesFromApi = useCallback(async () => {
    try {
      const nextServices = await loadServices(api);
      setServices(nextServices);
    } catch (error) {
      console.error('Failed to load services:', error.message);
      setServices(getServices());
    }
  }, []);

  useEffect(() => {
    const syncServices = () => syncServicesFromCache();
    window.addEventListener(SERVICES_REGISTRY_EVENT, syncServices);
    window.addEventListener('storage', syncServices);
    loadServicesFromApi();
    return () => {
      window.removeEventListener(SERVICES_REGISTRY_EVENT, syncServices);
      window.removeEventListener('storage', syncServices);
    };
  }, [syncServicesFromCache, loadServicesFromApi]);

  const handle = (e) => setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!form.name.trim() || !form.description.trim() || !form.priceFrom || Number(form.priceFrom) <= 0) {
      setMsg({ type: 'error', text: 'Name, description, and a valid price are required.' });
      return;
    }

    setSaving(true);
    try {
      const service = await createService(api, {
        id: form.id,
        name: form.name,
        icon: form.icon,
        description: form.description,
        priceFrom: form.priceFrom,
        category: form.category,
        backgroundImage: form.backgroundImage,
        reviewCriteria: form.reviewCriteria,
      });

      setMsg({ type: 'success', text: `${service.name} was added to the catalog.` });
      setForm({
        name: '',
        id: '',
        icon: '',
        description: '',
        priceFrom: '',
        category: '',
        backgroundImage: '',
        reviewCriteria: '',
      });
      loadServicesFromApi();
    } catch (error) {
      setMsg({ type: 'error', text: error.response?.data?.message || error.message || 'Could not save service.' });
    } finally {
      setSaving(false);
    }
  };

  const previewImage = form.backgroundImage.trim() || DEFAULT_SERVICE_BACKGROUND;
  const previewIcon = form.icon.trim() || '\u{1F6E0}\uFE0F';
  const previewName = form.name.trim() || 'New Service';
  const previewCategory = form.category.trim() || 'General';
  const previewDescription = form.description.trim() || 'Describe the service so customers know exactly what they are booking.';
  const previewPrice = Number(form.priceFrom) > 0 ? Number(form.priceFrom) : 0;

  return (
    <div className="animate-in">
      {msg && <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      <div className="section-header">
        <span className="section-title">Existing Services</span>
        <button className="btn btn-secondary btn-sm" onClick={loadServicesFromApi}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {services.map((service) => (
          <div
            key={service.id}
            className="card"
            style={{
              minHeight: 230,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundImage: `linear-gradient(180deg, rgba(11,12,18,0.18) 0%, rgba(11,12,18,0.74) 48%, rgba(11,12,18,0.95) 100%), url('${service.backgroundImage || DEFAULT_SERVICE_BACKGROUND}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ fontSize: '2rem' }}>{service.icon}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                  <span className={`badge ${service.isCustom ? 'badge-success' : 'badge-primary'}`}>{service.isCustom ? 'CUSTOM' : 'BUILT-IN'}</span>
                  <span className={`badge ${service.visibility === 'PRIVATE' ? 'badge-warn' : 'badge-primary'}`}>{service.visibility || 'PUBLIC'}</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{service.name}</h3>
                <div style={{ color: '#dbe4f0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{service.category}</div>
                {service.ownerUserName && (
                  <div style={{ color: '#cbd5e1', fontSize: '0.78rem', marginBottom: '0.45rem' }}>
                    Owner: {service.ownerUserName}
                  </div>
                )}
                <p style={{ color: '#dbe4f0', fontSize: '0.88rem', lineHeight: 1.6 }}>{service.description}</p>
              </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <span style={{ color: '#6ee7b7', fontWeight: 700 }}>From ${service.priceFrom}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>ID: {service.id}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PlusCircle size={18} />
            <h2 style={{ margin: 0 }}>Add Service</h2>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Service name</label>
              <input name="name" className="form-control" placeholder="Gardening" value={form.name} onChange={handle} required />
            </div>
            <div className="form-group">
              <label>Service ID (optional)</label>
              <input name="id" className="form-control" placeholder="gardening-service" value={form.id} onChange={handle} />
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Leave blank to auto-generate from the name.
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Icon</label>
                <input name="icon" className="form-control" placeholder="🧰" value={form.icon} onChange={handle} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input name="category" className="form-control" placeholder="Home" value={form.category} onChange={handle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Price from ($)</label>
                <input name="priceFrom" type="number" min="1" className="form-control" placeholder="699" value={form.priceFrom} onChange={handle} required />
              </div>
              <div className="form-group">
                <label>Background image URL</label>
                <input name="backgroundImage" className="form-control" placeholder="https://example.com/image.jpg" value={form.backgroundImage} onChange={handle} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" className="form-control" rows={3} placeholder="Explain what this service includes." value={form.description} onChange={handle} required style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label>Review criteria</label>
              <input name="reviewCriteria" className="form-control" placeholder="Quality, Timeliness, Professionalism" value={form.reviewCriteria} onChange={handle} />
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Optional. Separate criteria with commas.
              </span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : <><PlusCircle size={15} /> Add Service</>}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ImageIcon size={18} />
            <h2 style={{ margin: 0 }}>Live Preview</h2>
          </div>
          <div
            style={{
              minHeight: 320,
              borderRadius: '1rem',
              overflow: 'hidden',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundImage: `linear-gradient(180deg, rgba(11,12,18,0.18) 0%, rgba(11,12,18,0.74) 48%, rgba(11,12,18,0.95) 100%), url('${previewImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontSize: '2.4rem' }}>{previewIcon}</div>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>{previewCategory}</span>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{previewName}</h3>
              <p style={{ color: '#dbe4f0', fontSize: '0.9rem', lineHeight: 1.6 }}>{previewDescription}</p>
            </div>
            <div style={{ color: '#6ee7b7', fontWeight: 700 }}>From ${previewPrice}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Statistics() {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } catch {
        setAllOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>;

  const counts = ORDER_TABS.map((t) => ({ status: t, count: allOrders.filter((o) => o.status === t).length }));
  const revenue = allOrders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + (o.amount || 0), 0);
  const pending = allOrders.filter((o) => o.paymentStatus === 'UNPAID' && o.status === 'APPROVED').reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="animate-in">
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card"><div className="stat-icon indigo"><CheckCircle size={18} /></div><div className="card-title">Total Orders</div><div className="card-value">{allOrders.length}</div></div>
        <div className="stat-card"><div className="stat-icon green"><CheckCircle size={18} /></div><div className="card-title">Revenue Collected</div><div className="card-value">${revenue.toFixed(0)}</div></div>
        <div className="stat-card"><div className="stat-icon cyan"><Clock size={18} /></div><div className="card-title">Pending Payment</div><div className="card-value">${pending.toFixed(0)}</div></div>
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
            {active === 'orders' ? 'Order Management' : active === 'services' ? 'Services' : 'Statistics'}
          </span>
          <span className="badge badge-warn" style={{ padding: '0.5em 1em', fontSize: '0.8em' }}>Administrator</span>
        </div>
        <div className="page-content">
          {active === 'orders' && <OrderManagement />}
          {active === 'services' && <ServicesManagement />}
          {active === 'stats' && <Statistics />}
        </div>
      </main>
    </div>
  );
}
