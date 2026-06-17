import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from '../components/Toast.jsx';
import { roomsApi, userApi } from '../services/api.js';
import { 
  GET_ROOMS, 
  GET_DASHBOARD_STATS, 
  CREATE_ROOM_MUTATION 
} from '../services/graphql.js';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomLang, setNewRoomLang] = useState('javascript');
  
  // REST states
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);

  // GraphQL Queries
  const { 
    loading: statsLoading, 
    error: statsError, 
    data: statsData, 
    refetch: refetchStats 
  } = useQuery(GET_DASHBOARD_STATS, {
    fetchPolicy: 'network-only'
  });

  const { 
    loading: roomsLoading, 
    error: roomsError, 
    data: roomsData, 
    refetch: refetchRooms 
  } = useQuery(GET_ROOMS, {
    fetchPolicy: 'network-only'
  });

  // GraphQL Mutation
  const [createRoomMutation, { loading: createLoading }] = useMutation(CREATE_ROOM_MUTATION);

  // Load activities/notifications via REST
  const fetchNotifications = async () => {
    try {
      const data = await userApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      showToast('Room name is required', 'error');
      return;
    }

    try {
      const { data } = await createRoomMutation({
        variables: {
          roomName: newRoomName,
          description: newRoomDesc,
          language: newRoomLang
        }
      });

      showToast(`Room "${newRoomName}" created successfully!`, 'success');
      setIsModalOpen(false);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomLang('javascript');
      
      // Refetch queries
      refetchRooms();
      refetchStats();
      fetchNotifications();

      // Automatically join the newly created room
      navigate(`/room/${data.createRoom.id}`);
    } catch (err) {
      showToast(err.message || 'Failed to create room', 'error');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      // We can use REST api or GraphQL to join. Let's use REST to showcase full stack versatility!
      await roomsApi.join(roomId);
      showToast('Joined room successfully!', 'success');
      navigate(`/room/${roomId}`);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to join room', 'error');
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation(); // Stop navigation click
    if (!window.confirm('Are you sure you want to delete this room?')) return;

    try {
      await roomsApi.delete(roomId);
      showToast('Room deleted successfully!', 'success');
      refetchRooms();
      refetchStats();
      fetchNotifications();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete room', 'error');
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await userApi.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter rooms based on query
  const filteredRooms = roomsData?.rooms?.filter(room =>
    room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.language.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', color: 'white' }}>Welcome back, {user?.name}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>Collaborate on code in real time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Create New Room
        </button>
      </div>

      {/* Metrics Section */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Active Collaborations</span>
            <span className="stat-value">
              {statsLoading ? '...' : statsData?.dashboardStats?.activeCollaborators || 0}
            </span>
          </div>
          <span className="stat-icon">👥</span>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Your Created Rooms</span>
            <span className="stat-value">
              {statsLoading ? '...' : statsData?.dashboardStats?.personalRoomsCreated || 0}
            </span>
          </div>
          <span className="stat-icon">📁</span>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Your Joined Rooms</span>
            <span className="stat-value">
              {statsLoading ? '...' : statsData?.dashboardStats?.roomsJoinedCount || 0}
            </span>
          </div>
          <span className="stat-icon">🔄</span>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Global Rooms</span>
            <span className="stat-value">
              {statsLoading ? '...' : statsData?.dashboardStats?.totalRoomsCreated || 0}
            </span>
          </div>
          <span className="stat-icon">🌐</span>
        </div>
      </div>

      <div className="dashboard-sections">
        {/* Rooms Listing */}
        <div>
          <div className="rooms-list-header">
            <h2 style={{ fontSize: '1.25rem', color: 'white' }}>Available Rooms</h2>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or language..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {roomsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading rooms list...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <h3>No rooms found</h3>
              <p style={{ marginTop: '0.5rem' }}>Create a new room to begin coding together.</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {filteredRooms.map((room) => {
                const isOwner = room.createdBy?.id === user?._id;
                const isAdmin = user?.role === 'Admin';
                const isMember = room.members?.some(m => m.id === user?._id);

                return (
                  <div key={room.id} className="room-item-card">
                    <div className="room-meta">
                      <div className="room-name">{room.roomName}</div>
                      <div className="room-desc">{room.description || 'No description provided.'}</div>
                      <div className="room-pills">
                        <span className="pill pill-accent">{room.language}</span>
                        <span className="pill">Created by: {isOwner ? 'You' : room.createdBy?.name}</span>
                        <span className="pill">Members: {room.members?.length || 0}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button 
                        onClick={() => handleJoinRoom(room.id)}
                        className={`btn ${isMember ? 'btn-secondary' : 'btn-blue'}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        {isMember ? 'Enter Room' : 'Join Room'}
                      </button>

                      {(isOwner || isAdmin) && (
                        <button
                          onClick={(e) => handleDeleteRoom(room.id, e)}
                          className="btn btn-danger"
                          style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                          title="Delete Room"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications and recent activities */}
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '1rem' }}>Recent Activity</h2>
          <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '420px', overflowY: 'auto' }}>
            {notifLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading activities...</div>
            ) : notifications.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No recent activity records.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.6rem', 
                    borderRadius: '4px', 
                    background: notif.status === 'unread' ? 'rgba(255, 74, 90, 0.05)' : 'transparent',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ color: 'white' }}>{notif.notificationMessage}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {new Date(notif.timestamp).toLocaleTimeString()} - {new Date(notif.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  {notif.status === 'unread' && (
                    <button 
                      onClick={() => handleMarkNotifRead(notif._id)}
                      className="btn" 
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            <h3 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '1.5rem' }}>Create Coding Room</h3>
            
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label" htmlFor="room-name-input">Room Name *</label>
                <input
                  type="text"
                  id="room-name-input"
                  className="form-input"
                  placeholder="e.g. Technical Prep Room"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="room-desc-input">Description</label>
                <input
                  type="text"
                  id="room-desc-input"
                  className="form-input"
                  placeholder="e.g. Solving system design and array problems"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="room-lang-select">Programming Language</label>
                <select
                  id="room-lang-select"
                  className="form-select"
                  value={newRoomLang}
                  onChange={(e) => setNewRoomLang(e.target.value)}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="html">HTML / CSS</option>
                </select>
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${createLoading ? 'btn-disabled' : ''}`}
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={createLoading}
              >
                {createLoading ? 'Creating Room...' : 'Create and Enter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
