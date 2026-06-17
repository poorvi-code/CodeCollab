import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="navbar-brand">
        <div className="navbar-logo-box">&lt;/&gt;</div>
        Code<span>Collab</span>
      </Link>

      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', border: 'none' }}>
              Dashboard
            </Link>
            <Link to="/profile" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', border: 'none' }}>
              Profile
            </Link>
            <div className="navbar-user-section">
              <div 
                className="user-avatar" 
                style={{ backgroundColor: user.avatarColor || 'var(--accent)' }}
                title={`${user.name} (${user.role})`}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', display: 'inline-block', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              <span className="pill" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                {user.role}
              </span>
              <button onClick={handleLogout} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
              Login
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
