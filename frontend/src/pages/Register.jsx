import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/register', { name, email, password, role });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Activity size={28} /> Vaultrix
        </h1>
        <h2 className="subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>Create a new account</h2>
        
        {error && <div className="badge badge-success" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', width: '100%', textAlign: 'center', marginBottom: '1rem', padding: '0.5rem' }}>{error}</div>}
        
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-control" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="Choose a password"
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Register</button>
        </form>
        
        <Link to="/login" className="auth-link">Already have an account? Sign in</Link>
      </div>
    </div>
  );
}
