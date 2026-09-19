import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem('username');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllPolls();
  }, []);

  const fetchAllPolls = async () => {
    try {
      // 1. Try fetching from my-polls
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8080/api/my-polls', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.length > 0) {
        setPolls(res.data);
      } else {
        // 2. Fallback to public polls route if empty
        const allRes = await axios.get('http://localhost:8080/polls');
        setPolls(allRes.data || []);
      }
    } catch (err) {
      console.log('Fetching public polls...');
      try {
        const allRes = await axios.get('http://localhost:8080/polls');
        setPolls(allRes.data || []);
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <button onClick={handleLogout} className="btn-secondary" style={{ width: 'auto', marginTop: 0 }}>Logout</button>
      </div>
      <p style={{ color: '#94a3b8' }}>Welcome back, <b>{username || 'User'}</b></p>
      
      <Link to="/create-poll"><button className="btn-primary">+ Create New Poll</button></Link>

      <h3 style={{ marginTop: '2rem' }}>Your Active Polls & Results</h3>
      
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading polls...</p>
      ) : polls.length === 0 ? (
        <p style={{ color: '#64748b' }}>No polls created yet.</p>
      ) : (
        polls.map((p) => {
          const totalVotes = p.options ? p.options.reduce((acc, curr) => acc + (curr.votes || 0), 0) : 0;
          return (
            <div key={p.id || p._id} className="poll-card" style={{ backgroundColor: '#0f172a', padding: '1.2rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{p.question}</h4>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{totalVotes} Total Votes</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.4rem 0 0.8rem' }}>
                Created by: {p.created_by || 'Anonymous'}
              </p>
              <Link to={`/poll/${p.id || p._id}`} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600' }}>
                View & Vote Live ➔
              </Link>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Dashboard;