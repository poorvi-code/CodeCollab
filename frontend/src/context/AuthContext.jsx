import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set auth header for all axios requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Load user details on startup
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Token expired or invalid
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    const { token: receivedToken, ...userData } = response.data;
    setToken(receivedToken);
    setUser(userData);
    return response.data;
  };

  const register = async (name, email, password, role) => {
    const response = await axios.post('/api/auth/register', { name, email, password, role });
    const { token: receivedToken, ...userData } = response.data;
    setToken(receivedToken);
    setUser(userData);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const response = await axios.put('/api/users/profile', profileData);
    setUser(prev => ({ ...prev, ...response.data }));
    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
