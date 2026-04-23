import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, FileText, CreditCard, RefreshCw } from 'lucide-react';
import './index.css';

const API_GATEWAY = 'http://localhost:3000';

function App() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  useEffect(() => {
    fetchUsers();
    fetchOrders();
  }, []);

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
      // Create if not found
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
      // Refresh all wallets & ledgers
      users.forEach(u => { fetchWallet(u._id); fetchLedger(u._id); });
    } catch (e) { 
        alert(e.response?.data?.error || 'Error executing transaction'); 
    }
  };

  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <a href="#" className="navbar-brand">
          <Activity size={28} /> Vaultrix
        </a>
        <div className="nav-links">
          <button className={`btn ${activeTab==='dashboard'?'btn-primary':''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`btn ${activeTab==='users'?'btn-primary':''}`} onClick={() => setActiveTab('users')}>Users & Wallets</button>
          <button className={`btn ${activeTab==='orders'?'btn-primary':''}`} onClick={() => setActiveTab('orders')}>Work Orders</button>
        </div>
      </nav>

      <div className="container">
        
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
    </div>
  );
}

export default App;
