import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, FileText, CreditCard, RefreshCw, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_GATEWAY = 'http://localhost:3000';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Forms state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('client');
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderDesc, setNewOrderDesc] = useState('');
  const [newOrderAmount, setNewOrderAmount] = useState('');
  const [newOrderClient, setNewOrderClient] = useState('');
  const [fundUserId, setFundUserId] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  const [wallets, setWallets] = useState({});
  const [ledgers, setLedgers] = useState({});
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchUsers();
    fetchOrders();
  }, [navigate, token]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_GATEWAY}/users/profile`, authHeaders);
      setCurrentUser(res.data);
    } catch (e) {
      console.error(e);
      if (e.response?.status === 401 || e.response?.status === 403) {
        handleLogout();
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_GATEWAY}/users`);
      setUsers(res.data);
      res.data.forEach(u => {
        fetchWallet(u._id);
        fetchLedger(u._id);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_GATEWAY}/orders`);
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWallet = async (userId) => {
    try {
      const res = await axios.get(`${API_GATEWAY}/wallet/${userId}`);
      setWallets(prev => ({ ...prev, [userId]: res.data.balance }));
    } catch (e) {
      if (e.response && e.response.status === 404) {
        try {
            await axios.post(`${API_GATEWAY}/wallet/create`, { userId });
            setWallets(prev => ({ ...prev, [userId]: 0 }));
        } catch(err) { console.error('Failed to create wallet', err); }
      }
    }
  };

  const fetchLedger = async (userId) => {
    try {
      const res = await axios.get(`${API_GATEWAY}/ledger/${userId}`);
      setLedgers(prev => ({ ...prev, [userId]: res.data }));
    } catch (e) {
      console.error(e);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_GATEWAY}/users`, { name: newUserName, email: newUserEmail, role: newUserRole });
      setNewUserName('');
      setNewUserEmail('');
      fetchUsers();
    } catch (e) { alert('Error creating user'); }
  };

  const createOrder = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_GATEWAY}/orders`, { 
        title: newOrderTitle, description: newOrderDesc, amount: Number(newOrderAmount), clientId: newOrderClient 
      });
      setNewOrderTitle('');
      setNewOrderDesc('');
      setNewOrderAmount('');
      fetchOrders();
    } catch (e) { alert('Error creating order'); }
  };

  const fundWallet = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_GATEWAY}/wallet/fund`, { userId: fundUserId, amount: Number(fundAmount) });
      setFundAmount('');
      fetchWallet(fundUserId);
      fetchLedger(fundUserId);
    } catch (e) { alert('Error funding wallet'); }
  };

  const assignOrder = async (orderId, providerId) => {
    if(!providerId) return;
    try {
      await axios.patch(`${API_GATEWAY}/orders/${orderId}/assign`, { providerId });
      fetchOrders();
    } catch (e) { alert('Error assigning order'); }
  };

  const completeOrder = async (orderId) => {
    try {
      await axios.patch(`${API_GATEWAY}/orders/${orderId}/complete`);
      fetchOrders();
    } catch (e) { alert('Error completing order'); }
  };

  const executeTransaction = async (orderId) => {
    try {
      await axios.post(`${API_GATEWAY}/transactions/execute`, { orderId });
      fetchOrders();
      users.forEach(u => { fetchWallet(u._id); fetchLedger(u._id); });
    } catch (e) { 
        alert(e.response?.data?.error || 'Error executing transaction'); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!currentUser) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Activity size={28} /> Vaultrix
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Activity size={20} /> Dashboard
          </button>
          <button className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={20} /> Users & Wallets
          </button>
          <button className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <FileText size={20} /> Work Orders
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={handleLogout} style={{width: '100%', color: 'var(--danger)'}}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="user-profile-badge">
            <UserIcon size={18} color="var(--primary)"/>
            <span style={{fontWeight: 500}}>{currentUser.name} ({currentUser.role})</span>
          </div>
        </header>
        
        <div className="container" style={{flex: 1}}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <h1 className="title">Platform Overview</h1>
              <div className="grid" style={{ marginBottom: '2rem' }}>
                <div className="card">
                  <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <Users size={32} color="var(--primary)" />
                    <div>
                      <h3 className="subtitle" style={{margin:0}}>Total Users</h3>
                      <p style={{fontSize:'2rem', fontWeight:'bold'}}>{users.length}</p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <FileText size={32} color="var(--success)" />
                    <div>
                      <h3 className="subtitle" style={{margin:0}}>Total Orders</h3>
                      <p style={{fontSize:'2rem', fontWeight:'bold'}}>{orders.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid">
                 <div className="card">
                    <h2 className="title">Recent Activity Ledger</h2>
                    <button className="btn" onClick={() => users.forEach(u => fetchLedger(u._id))} style={{marginBottom: '1rem'}}>
                      <RefreshCw size={16} style={{marginRight: '8px'}}/> Refresh Ledger
                    </button>
                    <div style={{maxHeight:'400px', overflowY:'auto'}}>
                      {users.flatMap(u => ledgers[u._id] || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10).map((l, i) => (
                        <div key={i} style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>
                          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{new Date(l.createdAt).toLocaleString()} - User: {users.find(u=>u._id===l.userId)?.name || l.userId}</p>
                          <p style={{fontWeight:'500'}}>
                            <span className={`badge ${l.type === 'CREDIT' ? 'badge-success' : ''}`} style={{marginRight: '8px'}}>
                               {l.type} ₹{l.amount}
                            </span>
                            {l.description}
                          </p>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Users & Wallets Tab */}
          {activeTab === 'users' && (
            <div className="grid">
              <div className="card">
                <h2 className="title">Create User</h2>
                <form onSubmit={createUser}>
                  <div className="form-group">
                    <label>Name</label>
                    <input className="form-control" value={newUserName} onChange={e=>setNewUserName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-control" type="email" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select className="form-control" value={newUserRole} onChange={e=>setNewUserRole(e.target.value)}>
                      <option value="client">Client</option>
                      <option value="provider">Provider</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Create User</button>
                </form>
              </div>

              <div className="card">
                <h2 className="title">Fund Wallet</h2>
                <form onSubmit={fundWallet}>
                  <div className="form-group">
                    <label>Select User</label>
                    <select className="form-control" value={fundUserId} onChange={e=>setFundUserId(e.target.value)} required>
                      <option value="">--Select User--</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input className="form-control" type="number" value={fundAmount} onChange={e=>setFundAmount(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-success"><CreditCard size={16} style={{marginRight:'8px'}}/> Deposit Funds</button>
                </form>
              </div>

              <div className="card" style={{gridColumn: '1 / -1'}}>
                <h2 className="title">Users List</h2>
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Wallet Balance</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className="badge">{u.role}</span></td>
                        <td style={{fontWeight:'bold'}}>₹{wallets[u._id] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Work Orders Tab */}
          {activeTab === 'orders' && (
            <div className="grid">
              <div className="card">
                <h2 className="title">Create Work Order</h2>
                <form onSubmit={createOrder}>
                  <div className="form-group">
                    <label>Title</label>
                    <input className="form-control" value={newOrderTitle} onChange={e=>setNewOrderTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input className="form-control" value={newOrderDesc} onChange={e=>setNewOrderDesc(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input className="form-control" type="number" value={newOrderAmount} onChange={e=>setNewOrderAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Client</label>
                    <select className="form-control" value={newOrderClient} onChange={e=>setNewOrderClient(e.target.value)} required>
                      <option value="">--Select Client--</option>
                      {users.filter(u=>u.role==='client').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Create Order</button>
                </form>
              </div>

              <div className="card" style={{gridColumn: '1 / -1'}}>
                <h2 className="title">Work Orders</h2>
                <table>
                  <thead><tr><th>Title</th><th>Client</th><th>Provider</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o._id}>
                        <td>{o.title}</td>
                        <td>{users.find(u=>u._id===o.clientId)?.name || o.clientId}</td>
                        <td>
                          {o.providerId ? (users.find(u=>u._id===o.providerId)?.name || o.providerId) : 'Unassigned'}
                        </td>
                        <td style={{fontWeight:'bold'}}>₹{o.amount}</td>
                        <td><span className={`badge ${o.status==='SETTLED'?'badge-success':''}`}>{o.status}</span></td>
                        <td>
                          {o.status === 'CREATED' && (
                            <select className="form-control" style={{width:'auto', display:'inline-block'}} onChange={e => assignOrder(o._id, e.target.value)} defaultValue="">
                              <option value="" disabled>Assign Provider</option>
                              {users.filter(u=>u.role==='provider').map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                          )}
                          {o.status === 'ASSIGNED' && (
                            <button className="btn btn-primary" style={{padding:'0.25rem 0.75rem', fontSize:'0.85rem'}} onClick={()=>completeOrder(o._id)}>Complete</button>
                          )}
                          {o.status === 'COMPLETED' && (
                            <button className="btn btn-success" style={{padding:'0.25rem 0.75rem', fontSize:'0.85rem'}} onClick={()=>executeTransaction(o._id)}>Settle (Pay)</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
