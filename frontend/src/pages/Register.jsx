import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import api from '../api';

export default function Register() {
  const [form,  setForm]  = useState({ name: '', email: '', password: '', role: 'USER' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.post('/users/register', form);
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-in">
        <div className="auth-logo">
          <Activity size={24} />
          Vaultrix
        </div>
        <h1 className="auth-heading">Create an account</h1>
        <p className="auth-sub">Join Vaultrix to get started</p>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" className="form-control"
              placeholder="Jane Smith" value={form.name} onChange={handle} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" className="form-control"
              placeholder="you@example.com" value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="form-control"
              placeholder="Choose a strong password" value={form.password} onChange={handle} required />
          </div>
          <div className="form-group">
            <label htmlFor="role">I want to</label>
            <select id="role" name="role" className="form-control" value={form.role} onChange={handle}>
              <option value="USER">User — request services</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>

        <Link to="/login" className="auth-link">
          Already have an account? <span>Sign in</span>
        </Link>
      </div>
    </div>
  );
}
