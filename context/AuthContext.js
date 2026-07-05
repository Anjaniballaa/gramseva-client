import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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

  // ── DETECT LIVE VILLAGE ──
  const detectLiveVillage = async () => {
    try {
      const location = await getLiveLocation();
      if (location?.name && location.name !== 'Unknown') {
        console.log('📍 Live village:', location.name);
        setLiveVillage(location.name);
        return location.name;
      }
    } catch (error) {
      console.log('detectLiveVillage error:', error.message);
    }
    return null;
  };

  // ── REGISTER PUSH TOKEN ──
  const registerPushToken = async () => {
    try {
      if (!Device.isDevice) return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = pushTokenData.data;

      if (pushToken) {
        console.log('📲 Push token obtained:', pushToken.slice(0, 30) + '...');

        // Save to backend
        await api.post('/users/push-token', { pushToken });
        console.log('✅ Push token saved to server');
      }
    } catch (error) {
      console.log('Push token registration error:', error.message);
    }
  };

  // ── LOAD SAVED USER ──
  const loadUser = async () => {
    try {
      const [savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user')
      ]);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        // Background tasks — don't block loading
        detectLiveVillage();
        setTimeout(() => registerPushToken(), 3000);
      }
    } catch (error) {
      console.log('Load user error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN ──
  const login = async (phone, pin, role) => {
    try {
      const res = await api.post('/auth/login', { phone, pin, role });

      if (res.data.success) {
        const { token, user } = res.data;

        await Promise.all([
          AsyncStorage.setItem('token', token),
          AsyncStorage.setItem('user', JSON.stringify(user))
        ]);

        setToken(token);
        setUser(user);

        // Background tasks after login
        detectLiveVillage();
        setTimeout(() => registerPushToken(), 2000);

        return { success: true };
      }

      return {
        success: false,
        message: res.data.message || 'Login failed'
      };

    } catch (error) {
      console.log('Login error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Check your credentials.'
      };
    }
  };

  // ── REGISTER ──
  const register = async (data) => {
    try {
      const res = await api.post('/auth/register', data);
      if (res.data.success) {
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    }
  };

  // ── LOGOUT ──
  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('token'),
        AsyncStorage.removeItem('user')
      ]);
    } catch (e) {
      console.log('Logout error:', e.message);
    }
    setToken(null);
    setUser(null);
    setLiveVillage(null);
  };

  // ── UPDATE USER LOCALLY ──
  const updateUser = async (updatedData) => {
    try {
      const updatedUser = { ...user, ...updatedData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (e) {
      console.log('Update user error:', e.message);
    }
  };

  // ── GET VILLAGE — prefers live location ──
  const getVillage = () => {
    return liveVillage || user?.village || 'Unknown';
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      liveVillage,
      getVillage,
      login,
      register,
      logout,
      updateUser,
      detectLiveVillage,
      registerPushToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
