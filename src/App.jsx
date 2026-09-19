import React, { useState, useEffect, useCallback } from "react";
import "./index.css";

export default function App() {
  const [view, setView] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);

  // Track if accessed directly via public share URL link (?pollId=...)
  const [isPublicLinkView, setIsPublicLinkView] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");

  // Selected Option state for voting
  const [selectedOptions, setSelectedOptions] = useState({});

  // Create Poll Form States
  const [question, setQuestion] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [options, setOptions] = useState(["", ""]);

  // Track voted polls locally
  const [votedPolls, setVotedPolls] = useState([]);

  const API_URL = "http://10.131.237.135:8080";
  const currentUser = localStorage.getItem("username") || "";

  useEffect(() => {
    const savedVotes = JSON.parse(localStorage.getItem("voted_polls") || "[]");
    setVotedPolls(savedVotes);
  }, []);

  // Fetch Polls & Handle Realtime Updates
  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/polls`);
      const data = await res.json();
      if (res.ok) {
        const pollsData = data || [];
        setPolls(pollsData);

        // Handle direct share link visit (e.g. ?pollId=123)
        const queryParams = new URLSearchParams(window.location.search);
        const sharedPollId = queryParams.get("pollId");

        if (sharedPollId && !selectedPoll) {
          const matchedPoll = pollsData.find(
            (p) => String(p._id || p.id) === String(sharedPollId)
          );
          if (matchedPoll) {
            setSelectedPoll(matchedPoll);
            setIsPublicLinkView(true);
            setView("poll-detail");
            return;
          }
        }

        // Live updating selectedPoll state dynamically
        setSelectedPoll((prevSelected) => {
          if (!prevSelected) return null;
          const currentId = prevSelected._id || prevSelected.id;
          const updated = pollsData.find((p) => String(p._id || p.id) === String(currentId));
          return updated ? { ...updated } : prevSelected;
        });
      }
    } catch (err) {
      console.error("Error fetching polls:", err);
    }
  }, [API_URL, selectedPoll]);

  // Initial Fetch + Dynamic Realtime WebSocket Integration
  useEffect(() => {
    fetchPolls();

    const socket = new WebSocket("ws://10.131.237.135:8080/ws");

    socket.onopen = () => {
      console.log("WebSocket Connection Established");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "VOTE_UPDATED" || data.poll) {
          // Immediately trigger full polls refetch
          fetchPolls();
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket Connection Closed");
    };

    return () => {
      socket.close();
    };
  }, [fetchPolls]);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("username", data.username || username);
        setView("dashboard");
      } else {
        alert(data.error || "Login Failed");
      }
    } catch (err) {
      alert("Backend server connection failed!");
    }
  };

  // Register Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Registration Successful! Please login.");
        setView("login");
      } else {
        alert(data.error || "Registration Failed");
      }
    } catch (err) {
      alert("Backend server connection failed!");
    }
  };

  // Create New Poll Handler
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      alert("Please enter a question!");
      return;
    }

    const filteredOptions = options.filter((opt) => opt.trim() !== "");
    if (filteredOptions.length < 2) {
      alert("Please provide at least 2 non-empty options!");
      return;
    }

    const formattedOptions = filteredOptions.map((optText, index) => ({
      id: String(index + 1),
      text: optText.trim(),
      votes: 0,
    }));

    const authorDisplay = creatorName.trim()
      ? creatorName.trim()
      : currentUser || "Anonymous";

    try {
      const res = await fetch(`${API_URL}/api/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          created_by: authorDisplay,
          owner: currentUser,
          options: formattedOptions,
        }),
      });

      if (res.ok) {
        alert("New Poll Created Successfully!");
        setQuestion("");
        setCreatorName("");
        setOptions(["", ""]);
        fetchPolls();
      } else {
        alert("Failed to create poll");
      }
    } catch (err) {
      alert("Error creating poll");
    }
  };

  // Strictly check if current logged-in user is owner
  const checkIsOwner = (poll) => {
    if (isPublicLinkView) return false;
    if (!currentUser || !poll) return false;
    
    if (poll.owner) {
      return poll.owner === currentUser;
    }
    return poll.created_by === currentUser;
  };

  const handleOptionChange = (value, idx) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) {
      alert("A poll must have at least two options!");
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  // Delete Poll Handler
  const handleDeletePoll = async (pollId) => {
    if (!pollId) return;
    if (!window.confirm("Are you sure you want to delete this poll?")) return;

    try {
      const res = await fetch(`${API_URL}/api/poll/${pollId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        alert("Poll deleted successfully!");
        if (
          selectedPoll &&
          (selectedPoll._id === pollId || selectedPoll.id === pollId)
        ) {
          setSelectedPoll(null);
          setView(currentUser ? "dashboard" : "login");
        }
        fetchPolls();
      } else {
        alert("Failed to delete poll!");
      }
    } catch (err) {
      alert("Error deleting poll");
    }
  };

  const handleSelectOption = (pollId, optionId) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  // Vote Handler - Live update state instantly
  const handleVoteSubmit = async (pollId) => {
    if (votedPolls.includes(pollId)) {
      alert("You have already voted on this poll!");
      return;
    }

    const selectedOptId = selectedOptions[pollId];
    if (!selectedOptId) {
      alert("Please select an option before voting!");
      return;
    }

    const voterId = currentUser || "guest-public-user";

    try {
      const res = await fetch(
        `${API_URL}/poll/${pollId}/vote?option_id=${selectedOptId}&voter_id=${voterId}`,
        { method: "POST" }
      );
      const data = await res.json();

      if (res.ok) {
        alert("Your vote has been recorded!");
        const updatedVotedList = [...votedPolls, pollId];
        setVotedPolls(updatedVotedList);
        localStorage.setItem("voted_polls", JSON.stringify(updatedVotedList));
        
        // Immediate fetch to trigger UI re-render without reload
        fetchPolls();
      } else {
        alert(data.error || "Already voted!");
      }
    } catch (err) {
      alert("Error casting vote");
    }
  };

  // Share Poll Link
  const handleSharePoll = (pollId) => {
    if (!pollId) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?pollId=${pollId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(
        () => alert(`Poll link copied to clipboard!\n\n${shareUrl}`),
        () => prompt("Copy this poll link:", shareUrl)
      );
    } else {
      prompt("Copy this poll link:", shareUrl);
    }
  };

  const calculatePercentage = (votes, total) => {
    if (!total || total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const filteredPolls = polls.filter(
    (poll) =>
      poll.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (poll.created_by &&
        poll.created_by.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-wrapper">
      {/* LOGIN VIEW */}
      {view === "login" && (
        <div className="auth-container">
          <h2 style={{ marginBottom: "15px", color: "#fff" }}>Login to LivePoll</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username / Email</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <button type="submit" className="btn-primary">
              Login
            </button>
          </form>
          <p
            style={{
              marginTop: "15px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            Don't have an account?{" "}
            <span className="footer-link" onClick={() => setView("register")}>
              Register
            </span>
          </p>
        </div>
      )}

      {/* REGISTER VIEW */}
      {view === "register" && (
        <div className="auth-container">
          <h2 style={{ marginBottom: "15px", color: "#fff" }}>Register Account</h2>
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
              />
            </div>
            <button type="submit" className="btn-primary">
              Register
            </button>
          </form>
          <p
            style={{
              marginTop: "15px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "0.9rem",
            }}
          >
            Already have an account?{" "}
            <span className="footer-link" onClick={() => setView("login")}>
              Login
            </span>
          </p>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {view === "dashboard" && (
        <div className="dashboard-container">
          <div className="header-bar">
            <div>
              <h2>LivePoll Dashboard</h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                Logged in as: <strong>{currentUser || "Guest"}</strong>
              </p>
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                localStorage.removeItem("username");
                setView("login");
              }}
            >
              Logout
            </button>
          </div>

          <div className="create-poll-card">
            <h3 style={{ color: "#38bdf8", marginBottom: "12px" }}>
              Create a New Poll
            </h3>
            <form onSubmit={handleCreatePoll}>
              <div className="form-group">
                <label>Poll Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., What is your preferred food?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Created By (Author Name - Optional)</label>
                <input
                  type="text"
                  placeholder="Enter custom author name"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Options</label>
                {options.map((opt, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(e.target.value, idx)}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleRemoveOption(idx)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-add"
                  onClick={() => setOptions([...options, ""])}
                >
                  + Add Option
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ marginTop: 0, width: "auto" }}
                >
                  Publish Poll
                </button>
              </div>
            </form>
          </div>

          <div style={{ marginTop: "30px" }}>
            <h3 style={{ color: "#fff", marginBottom: "15px" }}>Poll Management</h3>
            <div
              className="create-poll-card"
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #3b82f6",
              }}
              onClick={() => {
                setIsPublicLinkView(false);
                setView("polls-list");
              }}
            >
              <div>
                <h3 style={{ color: "#38bdf8", marginBottom: "5px" }}>
                  📊 Available Vote Polls
                </h3>
                <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.95rem" }}>
                  Click here to view all active voting polls and cast your vote.
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="poll-count-badge" style={{ fontSize: "1rem", padding: "8px 16px" }}>
                  Total Polls: {polls.length}
                </span>
                <p style={{ color: "#38bdf8", marginTop: "8px", fontSize: "0.9rem", fontWeight: "bold" }}>
                  View All →
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POLLS LIST VIEW */}
      {view === "polls-list" && (
        <div className="dashboard-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <button className="btn-secondary" onClick={() => setView("dashboard")}>
              ← Back to Dashboard
            </button>
            <span className="poll-count-badge">Total Polls: {polls.length}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", marginBottom: "25px" }}>
            <h2 style={{ color: "#fff" }}>Available Vote Polls</h2>
            <input
              type="text"
              placeholder="🔍 Search polls or creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "10px 15px",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#0f172a",
                color: "#fff",
                width: "100%",
                maxWidth: "350px",
                outline: "none",
              }}
            />
          </div>

          <div className="grid-layout">
            {filteredPolls.length === 0 ? (
              <p style={{ color: "#94a3b8", gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>
                No polls found matching "{searchTerm}"
              </p>
            ) : (
              filteredPolls.map((poll) => {
                const currentId = poll._id || poll.id;
                const hasVoted = votedPolls.includes(currentId);
                const isOwner = checkIsOwner(poll);
                const totalVotes = poll.options
                  ? poll.options.reduce((acc, curr) => acc + curr.votes, 0)
                  : 0;

                return (
                  <div key={currentId} className="poll-card">
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <h4 style={{ color: "#fff", fontSize: "1.1rem" }}>{poll.question}</h4>
                          <p className="poll-author">Created by: {poll.created_by || "Anonymous"}</p>
                        </div>
                        {isOwner && (
                          <button className="btn-delete" onClick={() => handleDeletePoll(currentId)}>
                            🗑️ Delete
                          </button>
                        )}
                      </div>

                      <div style={{ margin: "15px 0" }}>
                        {poll.options &&
                          poll.options.map((opt) => (
                            <label
                              key={opt.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px",
                                borderRadius: "8px",
                                backgroundColor: selectedOptions[currentId] === opt.id ? "#1e293b" : "#0f172a",
                                border: selectedOptions[currentId] === opt.id ? "1px solid #38bdf8" : "1px solid #334155",
                                marginBottom: "8px",
                                cursor: hasVoted ? "not-allowed" : "pointer",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                                {!hasVoted && (
                                  <input
                                    type="radio"
                                    name={`poll_${currentId}`}
                                    value={opt.id}
                                    checked={selectedOptions[currentId] === opt.id}
                                    onChange={() => handleSelectOption(currentId, opt.id)}
                                    style={{ width: "18px", height: "18px", accentColor: "#38bdf8" }}
                                  />
                                )}
                                <span style={{ color: "#fff", fontWeight: "500" }}>{opt.text}</span>
                              </div>
                              <span className="vote-badge">{opt.votes} votes</span>
                            </label>
                          ))}
                      </div>

                      {!hasVoted ? (
                        <button
                          className="btn-primary"
                          style={{ marginTop: "5px", marginBottom: "15px", padding: "10px" }}
                          onClick={() => handleVoteSubmit(currentId)}
                        >
                          Cast Vote
                        </button>
                      ) : (
                        <div className="already-voted-tag" style={{ marginBottom: "15px" }}>
                          ✓ Already Voted
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                          Total Votes: <strong>{totalVotes}</strong>
                        </p>

                        <div style={{ display: "flex", gap: "8px" }}>
                          {isOwner && (
                            <button className="btn-share" onClick={() => handleSharePoll(currentId)}>
                              🔗 Share
                            </button>
                          )}
                          <button
                            className="btn-view"
                            onClick={() => {
                              setSelectedPoll(poll);
                              setIsPublicLinkView(false);
                              setView("poll-detail");
                            }}
                          >
                            Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* POLL DETAIL / DIRECT PUBLIC SHARE VIEW */}
      {view === "poll-detail" && selectedPoll && (
        <div className="dashboard-container" style={{ maxWidth: "700px" }}>
          {(() => {
            const selectedId = selectedPoll._id || selectedPoll.id;
            const totalVotes = selectedPoll.options
              ? selectedPoll.options.reduce((acc, curr) => acc + curr.votes, 0)
              : 0;
            const hasVoted = votedPolls.includes(selectedId);
            const isOwner = checkIsOwner(selectedPoll);

            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      window.history.pushState({}, document.title, window.location.pathname);
                      setIsPublicLinkView(false);
                      setView(currentUser ? "polls-list" : "login");
                    }}
                  >
                    ← Back
                  </button>

                  {isOwner && (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button className="btn-delete" onClick={() => handleDeletePoll(selectedId)}>
                        🗑️ Delete Poll
                      </button>
                      <button className="btn-share" onClick={() => handleSharePoll(selectedId)}>
                        🔗 Share Link
                      </button>
                    </div>
                  )}
                </div>

                <h2 style={{ color: "#fff", fontSize: "1.6rem" }}>{selectedPoll.question}</h2>
                <p className="poll-author" style={{ fontSize: "0.95rem", marginBottom: "20px" }}>
                  Created by: <strong>{selectedPoll.created_by || "Anonymous"}</strong>
                </p>

                <div>
                  <div
                    style={{
                      backgroundColor: "#0f172a",
                      padding: "15px",
                      borderRadius: "8px",
                      marginBottom: "20px",
                      border: "1px solid #334155",
                    }}
                  >
                    <p style={{ color: "#38bdf8", fontWeight: "bold", margin: 0 }}>
                      Total Overall Votes: {totalVotes}
                    </p>
                    {hasVoted && (
                      <div className="already-voted-tag" style={{ marginTop: "8px" }}>
                        ✓ You have already voted on this poll
                      </div>
                    )}
                  </div>

                  <h3 style={{ color: "#f8fafc", marginBottom: "15px" }}>Select Option & Vote:</h3>

                  {selectedPoll.options &&
                    selectedPoll.options.map((opt) => {
                      const percentage = calculatePercentage(opt.votes, totalVotes);
                      const isSelected = selectedOptions[selectedId] === opt.id;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (!hasVoted) handleSelectOption(selectedId, opt.id);
                          }}
                          style={{
                            backgroundColor: isSelected ? "#1e293b" : "#0f172a",
                            border: isSelected ? "2px solid #38bdf8" : "1px solid #334155",
                            borderRadius: "8px",
                            padding: "15px",
                            marginBottom: "12px",
                            cursor: hasVoted ? "default" : "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#fff", fontWeight: "bold" }}>
                              {!hasVoted && (
                                <input
                                  type="radio"
                                  name={`poll_detail_${selectedId}`}
                                  value={opt.id}
                                  checked={isSelected}
                                  onChange={() => handleSelectOption(selectedId, opt.id)}
                                  style={{ marginRight: "10px", accentColor: "#38bdf8" }}
                                />
                              )}
                              {opt.text}
                            </span>
                            <span style={{ color: "#38bdf8", fontWeight: "bold" }}>
                              {opt.votes} votes ({percentage}%)
                            </span>
                          </div>

                          <div
                            style={{
                              width: "100%",
                              backgroundColor: "#334155",
                              borderRadius: "4px",
                              height: "10px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: "#38bdf8",
                                height: "100%",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                  {!hasVoted && (
                    <button className="btn-primary" style={{ marginTop: "15px" }} onClick={() => handleVoteSubmit(selectedId)}>
                      Submit Vote
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}