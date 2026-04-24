import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Search, Star, ArrowRight, LogOut } from 'lucide-react';
import { getServices, SERVICES_REGISTRY_EVENT } from '../utils/services';
import RequestServiceModal from '../components/RequestServiceModal';
import { clearAuth, getCurrentUser } from '../utils/auth';

export default function ServiceCatalog() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [services, setServices] = useState(() => getServices());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const syncServices = () => setServices(getServices());
    window.addEventListener(SERVICES_REGISTRY_EVENT, syncServices);
    window.addEventListener('storage', syncServices);
    return () => {
      window.removeEventListener(SERVICES_REGISTRY_EVENT, syncServices);
      window.removeEventListener('storage', syncServices);
    };
  }, []);

  const categories = useMemo(() => ['All', ...new Set(services.map((s) => s.category))], [services]);
  const filtered = services.filter((s) =>
    (category === 'All' || s.category === category) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f8fafc' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,13,26,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.2rem', color: '#8b5cf6' }}>
          <Activity size={22} /> Vaultrix
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/dashboard/user" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Dashboard</Link>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={logout}><LogOut size={14} /> Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{ textAlign: 'center', padding: '4rem 2rem 2rem', background: 'linear-gradient(180deg, rgba(139,92,246,0.1) 0%, transparent 100%)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Browse Services
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: 500, margin: '0 auto 2rem' }}>
          Find the right professional for any task. Secure, fast, and reliable.
        </p>
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-control"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '3rem', fontSize: '1rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', padding: '1rem 2rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`btn ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {filtered.map((service) => (
          <div
            key={service.id}
            className="stat-card"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              cursor: 'default',
              transition: 'transform 0.2s',
              minHeight: 360,
              justifyContent: 'space-between',
              backgroundImage: `linear-gradient(180deg, rgba(11,12,18,0.18) 0%, rgba(11,12,18,0.74) 48%, rgba(11,12,18,0.95) 100%), url('${service.backgroundImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', width: 60, height: 60, display: 'grid', placeItems: 'center', borderRadius: 18, background: 'rgba(8, 10, 15, 0.42)', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>{service.icon}</div>
              <span style={{ fontSize: '0.75rem', color: '#e9d5ff', background: 'rgba(76, 29, 149, 0.35)', padding: '0.35em 0.8em', borderRadius: '9999px', border: '1px solid rgba(196,181,253,0.25)', backdropFilter: 'blur(6px)' }}>{service.category}</span>
            </div>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.35rem', fontSize: '1.1rem', color: '#f8fafc' }}>{service.name}</h3>
              <p style={{ color: '#dbe4f0', fontSize: '0.92rem', lineHeight: 1.6 }}>{service.description}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', gap: '1rem' }}>
              <span style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1rem' }}>From ${service.priceFrom}</span>
              <button
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                onClick={() => {
                  if (!user) return navigate('/login');
                  setSelected(service);
                }}
              >
                Request <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <Star size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No services match your search.</p>
          </div>
        )}
      </div>

      {selected && (
        <RequestServiceModal
          service={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); navigate('/dashboard/user'); }}
        />
      )}
    </div>
  );
}
