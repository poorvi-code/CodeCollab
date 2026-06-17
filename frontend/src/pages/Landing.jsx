import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="main-content fade-in">
      <header className="landing-hero">
        <div className="landing-tagline">Real-Time Collaboration</div>
        <h1 className="landing-title">
          Write Code Together, <span>In Real-Time</span>
        </h1>
        <p className="landing-desc">
          CodeCollab is a premium web platform for developers to create private rooms, invite peers, chat instantly, and code in sync. Built for technical interviews, pair programming, and remote hackathons
        </p>
        <div className="landing-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ padding: '0.8rem 1.8rem', fontSize: '1.05rem' }}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg" style={{ padding: '0.8rem 1.8rem', fontSize: '1.05rem' }}>
                Start Coding Now
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg" style={{ padding: '0.8rem 1.8rem', fontSize: '1.05rem' }}>
                Join Existing Room
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-features">
        <div className="card feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Live Synchronization</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Experience sub-millisecond code sync. As you type, your collaborators see edits instantly. Zero delays, conflict-free.
          </p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">💬</div>
          <h3>Integrated Chat</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Communicate through instant room messaging. Discuss algorithms, explain logic, and debug problems together.
          </p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">👤</div>
          <h3>Presence Tracking</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            See who's in the room, track active connections, and trace exactly where other users' cursors are positioned.
          </p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">🛠️</div>
          <h3>GraphQL & REST</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Fully powered by both a scalable REST API and Apollo GraphQL endpoints for robust query optimization.
          </p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">🔑</div>
          <h3>Secure Auth</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Bcrypt encrypted passwords, JWT validation state, and role-based permissions to secure room boundaries.
          </p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">🎨</div>
          <h3>Premium Aesthetics</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            A dark-themed developer workspace crafted after the CodeShare UI, designed to look visual and minimize eye fatigue.
          </p>
        </div>
      </section>

      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid var(--border)' }}>
        <p>&copy; 2026 CodeCollab. All rights reserved. Designed for optimal coding sessions.</p>
      </footer>
    </div>
  );
};

export default Landing;
