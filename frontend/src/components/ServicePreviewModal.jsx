import React from 'react';
import { X, ArrowRight, Star } from 'lucide-react';
import { DEFAULT_SERVICE_BACKGROUND } from '../utils/services';

export default function ServicePreviewModal({
  service,
  reviewSummary,
  loading = false,
  onClose,
  onRequest,
}) {
  if (!service) return null;

  const reviews = Array.isArray(reviewSummary?.reviews) ? reviewSummary.reviews : [];
  const totalReviews = Number(reviewSummary?.total) || 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="card animate-in"
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 0,
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#0b1120',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            minHeight: 320,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
            backgroundImage: `linear-gradient(180deg, rgba(5,7,10,0.16) 0%, rgba(5,7,10,0.62) 35%, rgba(5,7,10,0.95) 100%), url('${service.backgroundImage || DEFAULT_SERVICE_BACKGROUND}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 20,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '2rem',
                  background: 'rgba(8, 10, 15, 0.45)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {service.icon}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{service.category}</span>
                {service.visibility === 'PRIVATE' && <span className="badge badge-success">Only You</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(8, 10, 15, 0.42)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                cursor: 'pointer',
                borderRadius: 12,
                padding: '0.5rem',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ maxWidth: 620 }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#f8fafc' }}>{service.name}</h2>
            <p style={{ color: '#dbe4f0', lineHeight: 1.7, fontSize: '0.98rem', marginBottom: 0 }}>{service.description}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1.15rem' }}>
              From ${service.priceFrom}
            </div>
            <button className="btn btn-primary" onClick={onRequest}>
              Request Service <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <span className="spinner" />
            </div>
          )}

          {!loading && totalReviews > 0 && (
            <div
              style={{
                display: 'grid',
                gap: '0.85rem',
                padding: '1.1rem',
                borderRadius: '1rem',
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700 }}>
                <Star size={16} fill="#fbbf24" />
                <span>{reviewSummary.avgOverall}★ average</span>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>({totalReviews} reviews)</span>
              </div>
              {reviews.map((review) => (
                <div
                  key={review._id}
                  style={{
                    padding: '0.95rem 1rem',
                    borderRadius: '0.9rem',
                    background: 'rgba(8, 10, 15, 0.46)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#dbe4f0',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: '0.3rem' }}>{review.overall}★</div>
                  <div>{review.comment || 'Shared a positive experience with this service.'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
