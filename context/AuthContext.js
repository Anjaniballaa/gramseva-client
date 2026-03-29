import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getLiveLocation } from '../utils/location';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveVillage, setLiveVillage] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);


const detectLiveVillage = async () => {
  try {
    const location = await getLiveLocation();
    if (location && location.name && location.name !== 'Unknown') {
      console.log('Live village from Geoapify:', location.name);
      setLiveVillage(location.name);
      return location.name;
    }
  } catch (error) {
    console.log('detectLiveVillage error:', error.message);
  }
  return null;
};

  const loadUser = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Detect location in background — don't await
        detectLiveVillage();
      }
    } catch (error) {
      console.log('Load user error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, pin, role) => {
    try {
      const res = await api.post('/auth/login', { phone, pin, role });
      if (res.data.success) {
        const { token, user } = res.data;
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setToken(token);
        setUser(user);
        // Detect location in background — don't block login
        detectLiveVillage();
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (error) {
      console.log('Login error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Check your credentials.'
      };
    }
  };

  const register = async (data) => {
    try {
      const res = await api.post('/auth/register', { ...data });
      if (res.data.success) {
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (error) {
      console.log('Register error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (e) {
      console.log('Logout error:', e.message);
    }
    setToken(null);
    setUser(null);
    setLiveVillage(null);
  };

  // Always prefer live location, fallback to DB village
  const getVillage = () => {
    return liveVillage || user?.village || 'Unknown';
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      liveVillage, getVillage,
      login, register, logout,
      detectLiveVillage
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);