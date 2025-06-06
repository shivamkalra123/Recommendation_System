import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Recommendation.css";

export default function RecommendationPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [prompt, setPrompt] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    fetchInferredRecommendations();
    fetchUserPrompts();
  }, [userId]);

  async function fetchUserPrompts() {
    try {
      const res = await fetch(`http://localhost:8000/user/${userId}/prompts`);
      if (res.ok) {
        const data = await res.json();
        setRecentPrompts(data);
        localStorage.setItem("recentPrompts", JSON.stringify(data)); // optional: for fallback
      } else {
        console.warn("Failed to fetch user prompts from backend.");
      }
    } catch (err) {
      console.error("Error fetching prompts:", err);
    }
  }

  async function fetchInferredRecommendations() {
    setLoading(true);
    setPrompt("");
    try {
      const res = await fetch(`http://localhost:8000/recommend/inferred?user_id=${userId}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setRecommendations(data);
        setMessage(
          data.length
            ? "Based on your preferences, you might like these spots:"
            : "Tell me what you like, and I’ll find cool places!"
        );
      } else {
        setRecommendations([]);
        setMessage("Hmm, something unexpected happened.");
      }
    } catch {
      setRecommendations([]);
      setMessage("Oops, something went wrong. Try refreshing?");
    }
    setLoading(false);
  }

  async function fetchRecommendations() {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/recommend?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        setRecommendations(data);
        setMessage("Here’s what I found for you:");
      } else {
        setRecommendations([]);
        setMessage("No luck with those keywords. Try something else!");
      }
    } catch {
      setRecommendations([]);
      setMessage("Oops, network error. Try again later.");
    }

    setLoading(false);
    setShowSuggestions(false);

    // Refresh prompts from backend (new one got added there)
    fetchUserPrompts();
  }

  function handleRecommendationClick(place) {
    if (place.sno) {
      navigate(`/place/${place.sno}`, { state: { place } });
    } else {
      alert("No ID found for this place!");
    }
  }

  function handleLogout() {
    localStorage.removeItem("userId");
    setUserId(null);
    navigate("/");
  }

  const filteredSuggestions = prompt
  ? recentPrompts.filter((p) => p.toLowerCase().includes(prompt.toLowerCase())).slice().reverse()
  : recentPrompts.slice().reverse();

  return (
    <div className="BodyBack">
      <div className="container" role="main" aria-label="Recommendation page">
        <header className="header">
          <h1
            className="title"
            tabIndex={0}
            role="button"
            onClick={fetchInferredRecommendations}
            onKeyDown={(e) => (e.key === "Enter" ? fetchInferredRecommendations() : null)}
            aria-label="Refresh recommendations"
          >
            WanderMind 🌍
          </h1>
          <button className="logout-button" onClick={handleLogout} aria-label="Logout">
            Logout
          </button>
        </header>

        <div className="input-group">
          <input
            type="text"
            className="prompt-input"
            placeholder="What kind of places do you want to explore?"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
            disabled={loading}
            aria-label="Search preferences"
          />
          <button
            className="recommend-button"
            onClick={fetchRecommendations}
            disabled={loading || !prompt.trim()}
            aria-label="Get recommendations"
          >
            {loading ? "Finding..." : "Explore"}
          </button>

          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="recent-prompts-dropdown">
              {filteredSuggestions.map((p, idx) => (
                <li
                  key={idx}
                  className="recent-prompt-item"
                  onMouseDown={() => {
                    setPrompt(p);
                    fetchRecommendations();
                  }}
                >
                  <span className="history-icon">🕘</span> {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="message" aria-live="polite" aria-atomic="true">
          {message}
        </p>

        <ul className="recommendations-list" tabIndex={0} aria-label="List of recommendations">
          {recommendations.length > 0 ? (
            recommendations.map((r, i) => (
              <li
                key={r.sno || i}
                className="recommendation-item"
                onClick={() => handleRecommendationClick(r)}
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" || e.key === " " ? handleRecommendationClick(r) : null
                }
                role="button"
                aria-label={`${r.name}, located in ${r.city}, ${r.state}. Rating: ${r.rating}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <h2 className="recommendation-name-text">{r.name}</h2>
                <p className="italic">
                  {r.city}, {r.state}
                </p>
                <p>{r.description}</p>
                <p>
                  <strong>Rating:</strong> {r.rating}
                </p>
              </li>
            ))
          ) : (
            <p style={{ textAlign: "center", color: "#ccc" }}>
              No recommendations to show yet.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
