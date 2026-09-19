import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8080/api/register', { username, password });
      setMsg('Account created successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMsg('Registration failed.');
    }
  };

  return (
    <div className="container">
      <h2 style={{ textAlign: 'center' }}>Create Account</h2>
      {msg && <p style={{ color: '#38bdf8', textAlign: 'center' }}>{msg}</p>}
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary">Register</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', color: '#94a3b8' }}>
        Already have an account? <Link to="/login" style={{ color: '#38bdf8' }}>Login</Link>
      </p>
    </div>
  );
};

export default Register;