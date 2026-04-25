import React, { useState } from 'react';
import { X, Calendar, MapPin, FileText, DollarSign, Sparkles, Type } from 'lucide-react';
import api from '../api';
import { getCurrentUser } from '../utils/auth';
import { createCustomService, DEFAULT_SERVICE_BACKGROUND } from '../utils/services';

const getLocalDateTimeMin = () => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
};

export default function CreateCustomServiceModal({ onClose, onSuccess }) {
  const user = getCurrentUser();
  const [form, setForm] = useState({
    name: '',
    description: '',
    budget: '',
    address: '',
    scheduledDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!user?.id || !user?.name || !user?.email) {
      setError('Please log in again before creating a custom service request.');
      return;
    }

    if (!form.name.trim() || !form.description.trim() || !form.address.trim() || !form.scheduledDate || Number(form.budget) <= 0) {
      setError('Name, description, budget, address, and preferred date are required.');
      return;
    }

    setLoading(true);
    try {
      const service = await createCustomService(api, {
        name: form.name,
        description: form.description,
        budget: Number(form.budget),
        userName: user.name,
        userEmail: user.email,
      });

      await api.post('/orders', {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        serviceId: service.id,
        serviceName: service.name,
        description: form.description,
        address: form.address,
        scheduledDate: form.scheduledDate,
        amount: Number(form.budget),
        isCustomService: true,
        serviceVisibility: service.visibility,
        serviceOwnerUserId: user.id,
      });

      onSuccess?.(service);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the custom service request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="auth-card animate-in" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            padding: '1.25rem',
            borderRadius: '1rem',
            backgroundImage: `linear-gradient(135deg, rgba(8,10,15,0.28) 0%, rgba(8,10,15,0.82) 55%, rgba(8,10,15,0.95) 100%), url('${DEFAULT_SERVICE_BACKGROUND}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}><Sparkles size={26} /></div>
            <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Create a Customized Service</h2>
            <p style={{ color: '#d7e3f0', fontSize: '0.875rem', maxWidth: 360 }}>
              Tell us exactly what you need and your budget. It will stay private to your account unless admin later publishes it for everyone.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label><Type size={14} style={{ marginRight: '0.4rem' }} />Service name</label>
            <input
              name="name"
              className="form-control"
              placeholder="Custom event setup"
              value={form.name}
              onChange={handle}
              required
            />
          </div>

          <div className="form-group">
            <label><FileText size={14} style={{ marginRight: '0.4rem' }} />Describe what you need</label>
            <textarea
              name="description"
              className="form-control"
              placeholder="Share the scope, expectations, and any special details..."
              rows={4}
              value={form.description}
              onChange={handle}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label><DollarSign size={14} style={{ marginRight: '0.4rem' }} />Budget you can afford ($)</label>
            <input
              name="budget"
              type="number"
              className="form-control"
              placeholder="1500"
              min="1"
              value={form.budget}
              onChange={handle}
              required
            />
          </div>

          <div className="form-group">
            <label><MapPin size={14} style={{ marginRight: '0.4rem' }} />Address</label>
            <input
              name="address"
              className="form-control"
              placeholder="Full service address"
              value={form.address}
              onChange={handle}
              required
            />
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
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? <span className="spinner" /> : 'Create & Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
