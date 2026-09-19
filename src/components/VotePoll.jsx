import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const VotePoll = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [message, setMessage] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  // Generate or fetch unique device Voter ID
  const getVoterID = () => {
    let voterID = localStorage.getItem('voter_device_id');
    if (!voterID) {
      voterID = 'voter_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('voter_device_id', voterID);
    }
    return voterID;
  };

  useEffect(() => {
    fetchPollDetails();

    // Check if user already voted in this browser
    const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '[]');
    if (votedPolls.includes(id)) {
      setHasVoted(true);
      setMessage('You have already submitted your vote for this poll!');
    }

    const ws = new WebSocket(`ws://localhost:8080/ws/${id}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPoll((prev) => {
        if (!prev) return prev;
        const updated = prev.options.map((opt) => 
          String(opt.id) === String(data.option_id) ? { ...opt, votes: data.votes } : opt
        );
        return { ...prev, options: updated };
      });
    };
    return () => ws.close();
  }, [id]);

  const fetchPollDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:8080/poll/${id}`);
      setPoll(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (hasVoted) return;
    if (!selectedOption) return setMessage('Select an option first!');

    const voterID = getVoterID();

    try {
      await axios.post(`http://localhost:8080/poll/${id}/vote?option_id=${selectedOption}&voter_id=${voterID}`);
      
      // Save locally to restrict duplicate votes
      const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '[]');
      votedPolls.push(id);
      localStorage.setItem('voted_polls', JSON.stringify(votedPolls));

      setHasVoted(true);
      setMessage('Vote recorded live!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setHasVoted(true);
        setMessage('You have already voted!');
      } else {
        setMessage('Voting failed.');
      }
    }
  };

  if (!poll) return <div className="container"><h2>Loading Poll...</h2></div>;

  const totalVotes = poll.options ? poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0) : 0;

  return (
    <div className="container">
      <h2>{poll.question}</h2>
      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
        Created by: <span style={{ color: '#38bdf8' }}>{poll.created_by || 'Anonymous'}</span> | Total Votes: <b>{totalVotes}</b>
      </p>

      {message && <p style={{ textAlign: 'center', color: hasVoted ? '#f87171' : '#38bdf8' }}>{message}</p>}

      <form onSubmit={handleVoteSubmit}>
        {poll.options && poll.options.map((opt) => (
          <label 
            key={opt.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.8rem 1rem', 
              background: '#0f172a', 
              margin: '0.6rem 0', 
              borderRadius: '8px', 
              border: '1px solid #475569',
              cursor: hasVoted ? 'not-allowed' : 'pointer',
              opacity: hasVoted ? 0.7 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <input 
                type="radio" 
                name="poll" 
                value={opt.id} 
                disabled={hasVoted}
                onChange={(e) => setSelectedOption(e.target.value)} 
              />
              <span style={{ color: '#fff', fontSize: '1rem' }}>{opt.text}</span>
            </div>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{opt.votes || 0} Votes</span>
          </label>
        ))}

        <button type="submit" className="btn-primary" disabled={hasVoted} style={{ opacity: hasVoted ? 0.5 : 1 }}>
          {hasVoted ? 'Already Voted' : 'Submit Vote'}
        </button>
      </form>
    </div>
  );
};

export default VotePoll;