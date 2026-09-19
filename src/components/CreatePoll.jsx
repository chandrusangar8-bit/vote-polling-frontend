import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreatePoll = () => {
  const [question, setQuestion] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [createdPollId, setCreatedPollId] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedOptions = options.map((opt, i) => ({ id: `${i + 1}`, text: opt, votes: 0 }));
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        'http://localhost:8080/api/poll', 
        { 
          question, 
          options: formattedOptions,
          created_by: createdBy.trim() || 'Anonymous' 
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );

      setCreatedPollId(res.data.id);
    } catch (err) {
      console.error('Create Poll Error:', err);
    }
  };

  const copyLink = () => {
    const shareUrl = `${window.location.origin}/poll/${createdPollId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      <h2>Create a Live Poll</h2>

      {!createdPollId ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Chandru (Default: Anonymous)" 
              value={createdBy} 
              onChange={(e) => setCreatedBy(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Poll Question</label>
            <input 
              type="text" 
              placeholder="Enter your poll question"
              value={question} 
              onChange={(e) => setQuestion(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Options</label>
            {options.map((opt, index) => (
              <input
                key={index}
                type="text"
                value={opt}
                placeholder={`Option ${index + 1}`}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                style={{ marginBottom: '0.5rem' }}
                required
              />
            ))}
            <button type="button" onClick={addOption} className="btn-secondary">+ Add Option</button>
          </div>

          <button type="submit" className="btn-primary">Create Poll</button>
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#38bdf8' }}>🎉 Poll Created Successfully!</h3>
          <p style={{ color: '#94a3b8' }}>Share this link with your audience:</p>
          <input 
            type="text" 
            readOnly 
            value={`${window.location.origin}/poll/${createdPollId}`} 
            style={{ textAlign: 'center', marginBottom: '1rem' }}
          />
          <button onClick={copyLink} className="btn-primary">
            {copied ? '✓ Link Copied!' : 'Copy Poll Link'}
          </button>
          <button 
            onClick={() => navigate(`/poll/${createdPollId}`)} 
            className="btn-secondary" 
            style={{ marginTop: '0.8rem' }}
          >
            Go to Vote Page
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatePoll;