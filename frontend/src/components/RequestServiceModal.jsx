import React, { useState } from 'react';
import { X, Calendar, MapPin, FileText, DollarSign } from 'lucide-react';
import api from '../api';
import { getCurrentUser } from '../utils/auth';
import { DEFAULT_SERVICE_BACKGROUND } from '../utils/services';

const getLocalDateTimeMin = () => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
};

export default function RequestServiceModal({ service, onClose, onSuccess }) {
  const user = getCurrentUser();
  const fixedAmount = Number(service.priceFrom) || 0;
  const [form, setForm] = useState({ description: '', address: '', scheduledDate: '', amount: fixedAmount });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user?.id || !user?.email || !user?.name) return setError('Please log in again before placing a request.');
    if (!form.description || !form.address || !form.scheduledDate)
      return setError('All fields are required.');

    setLoading(true);
    try {
      await api.post('/orders', {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        serviceId: service.id,
        serviceName: service.name,
        description: form.description,
        address: form.address,
        scheduledDate: form.scheduledDate,
        amount: fixedAmount,
        isCustomService: Boolean(service.isCustom),
        serviceVisibility: service.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
        serviceOwnerUserId: service.ownerUserId || user.id,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="auth-card animate-in" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            padding: '1.25rem',
            borderRadius: '1rem',
            backgroundImage: `linear-gradient(135deg, rgba(8,10,15,0.2) 0%, rgba(8,10,15,0.82) 55%, rgba(8,10,15,0.95) 100%), url('${service.backgroundImage || DEFAULT_SERVICE_BACKGROUND}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{service.icon}</div>
            <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Request {service.name}</h2>
            <p style={{ color: '#d7e3f0', fontSize: '0.875rem', maxWidth: 340 }}>{service.description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label><FileText size={14} style={{ marginRight: '0.4rem' }} />Describe what you need</label>
            <textarea
              name="description"
              className="form-control"
              placeholder="Be specific about your requirements..."
              rows={3}
              value={form.description}
              onChange={handle}
              required
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label><MapPin size={14} style={{ marginRight: '0.4rem' }} />Address</label>
            <input name="address" className="form-control" placeholder="Full service address" value={form.address} onChange={handle} required />
          </div>
          <div className="form-group">
            <label><Calendar size={14} style={{ marginRight: '0.4rem' }} />Preferred date & time</label>
            <input
              name="scheduledDate"
              type="datetime-local"
              className="form-control"
              value={form.scheduledDate}
              onChange={handle}
              min={getLocalDateTimeMin()}
              step="60"
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', display: 'block' }}>
              Choose both a date and time. Past times are not allowed.
            </span>
          </div>
          <div className="form-group">
            <label><DollarSign size={14} style={{ marginRight: '0.4rem' }} />Fixed service amount ($)</label>
            <input
              name="amount"
              type="text"
              className="form-control"
              value={`$${fixedAmount}`}
              readOnly
              aria-readonly="true"
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', display: 'block' }}>
              This amount is set by the service and cannot be edited.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? <span className="spinner" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
