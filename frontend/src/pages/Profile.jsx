import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { userApi } from '../services/api.js';
import { showToast } from '../components/Toast.jsx';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Collaboration history state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const data = await userApi.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching collaboration history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    fetchHistory();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      showToast('Name and Email are required', 'error');
      return;
    }

    if (password && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const updateData = { name, email };
      if (password) {
        updateData.password = password;
      }
      await updateProfile(updateData);
      showToast('Profile updated successfully!', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container fade-in">
      <h1 style={{ fontSize: '2rem', color: 'white', marginBottom: '2rem' }}>Account Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        {/* Profile Details and Update Form */}
        <div>
          <div className="card profile-card">
            <div className="profile-avatar-row">
              <div 
                className="big-avatar"
                style={{ backgroundColor: user?.avatarColor || 'var(--accent)' }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: 'white' }}>{user?.name}</h2>
                <span className="pill" style={{ textTransform: 'capitalize', display: 'inline-block', marginTop: '0.3rem' }}>
                  {user?.role}
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  type="text"
                  id="profile-name"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Email Address</label>
                <input
                  type="email"
                  id="profile-email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-password">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  id="profile-password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {password && (
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-confirm-password">Confirm New Password</label>
                  <input
                    type="password"
                    id="profile-confirm-password"
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Collaboration History */}
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '1rem' }}>Collaboration History</h2>
          
          {historyLoading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div className="card" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
              <h3>No coding sessions yet</h3>
              <p style={{ fontSize: '0.88rem', marginTop: '0.5rem' }}>Create or join rooms from the dashboard to log your sessions.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map((room) => {
                const isCreator = room.createdBy?._id === user?._id;
                return (
                  <div key={room._id} className="card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'white' }}>{room.roomName}</span>
                      <span className="pill pill-accent">{room.language}</span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{room.description || 'No description'}</p>
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span>Created by: {isCreator ? 'You' : room.createdBy?.name}</span>
                      <span>•</span>
                      <span>Collaborators: {room.members?.length || 0}</span>
                      <span>•</span>
                      <span>Date: {new Date(room.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
