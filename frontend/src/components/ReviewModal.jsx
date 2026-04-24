import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import api from '../api';
import { getCurrentUser } from '../utils/auth';
import { getReviewCriteriaForService } from '../utils/services';

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: (hover || value) >= n ? '#f59e0b' : '#334155', transition: 'color 0.15s' }}>
          <Star size={22} fill={(hover || value) >= n ? '#f59e0b' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewModal({ order, onClose, onSuccess }) {
  const user     = getCurrentUser();
  const criteria = getReviewCriteriaForService(order.serviceId);
  const [ratings,  setRatings]  = useState(Object.fromEntries(criteria.map(c => [c, 0])));
  const [overall,  setOverall]  = useState(0);
  const [comment,  setComment]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const setRating = (criterion, val) => setRatings(r => ({ ...r, [criterion]: val }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!overall) return setError('Please give an overall rating.');
    const missing = criteria.filter(c => !ratings[c]);
    if (missing.length) return setError(`Please rate: ${missing.join(', ')}`);

    setLoading(true);
    try {
      await api.post('/reviews', {
        orderId:     order._id,
        userId:      user.id,
        serviceId:   order.serviceId,
        serviceName: order.serviceName,
        ratings,
        overall,
        comment,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="auth-card animate-in" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.25rem' }}>Write a Review</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{order.serviceName} — #{order._id?.slice(-6)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          {criteria.map(criterion => (
            <div key={criterion} className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ marginBottom: '0.5rem', display: 'block' }}>{criterion}</label>
              <StarRating value={ratings[criterion]} onChange={val => setRating(criterion, val)} />
            </div>
          ))}

          <div className="form-group" style={{ marginBottom: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
            <label style={{ marginBottom: '0.5rem', display: 'block', color: '#f59e0b', fontWeight: 600 }}>Overall Rating</label>
            <StarRating value={overall} onChange={setOverall} />
          </div>

          <div className="form-group">
            <label>Comment (optional)</label>
            <textarea className="form-control" placeholder="Share your experience…" rows={3}
              value={comment} onChange={e => setComment(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? <span className="spinner" /> : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
