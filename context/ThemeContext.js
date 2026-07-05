import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// ============================================
// COLORS
// ============================================
const COLORS = {
  light: {
    // Backgrounds
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceSecondary: '#f9f9f9',
    card: '#ffffff',

    // Text
    text: '#1a1a1a',
    textSecondary: '#555555',
    textMuted: '#888888',
    textInverse: '#ffffff',

    // Borders
    border: '#e0e0e0',
    divider: '#f0f0f0',

    // Status
    success: '#2e7d32',
    successLight: '#e8f5e9',
    warning: '#f57f17',
    warningLight: '#fff8e1',
    error: '#c62828',
    errorLight: '#ffebee',
    info: '#1565c0',
    infoLight: '#e3f2fd',

    // Role colors
    farmer: '#2e7d32',
    farmerLight: '#e8f5e9',
    resident: '#1565c0',
    residentLight: '#e3f2fd',
    fieldOfficer: '#e65100',
    fieldOfficerLight: '#fff3e0',
    doctor: '#6a1b9a',
    doctorLight: '#f3e5f5',

    // Severity
    severityGreen: '#2e7d32',
    severityYellow: '#f57f17',
    severityRed: '#c62828',

    // Shadow
    shadow: 'rgba(0,0,0,0.1)',
    overlay: 'rgba(0,0,0,0.5)',

    // Tab bar
    tabBar: '#ffffff',
    tabBarBorder: '#e0e0e0',

    // Input
    inputBackground: '#f5f5f5',
    inputBorder: '#e0e0e0',
    placeholder: '#aaaaaa',
  },

  dark: {
    // Backgrounds
    background: '#121212',
    surface: '#1e1e1e',
    surfaceSecondary: '#2a2a2a',
    card: '#1e1e1e',

    // Text
    text: '#f0f0f0',
    textSecondary: '#bbbbbb',
    textMuted: '#888888',
    textInverse: '#1a1a1a',

    // Borders
    border: '#333333',
    divider: '#2a2a2a',

    // Status
    success: '#4caf50',
    successLight: '#1b3a1c',
    warning: '#ffa726',
    warningLight: '#3a2a00',
    error: '#ef5350',
    errorLight: '#3a1212',
    info: '#42a5f5',
    infoLight: '#0d2137',

    // Role colors
    farmer: '#4caf50',
    farmerLight: '#1b3a1c',
    resident: '#42a5f5',
    residentLight: '#0d2137',
    fieldOfficer: '#ff7043',
    fieldOfficerLight: '#3a1a00',
    doctor: '#ab47bc',
    doctorLight: '#2a0d3a',

    // Severity
    severityGreen: '#4caf50',
    severityYellow: '#ffa726',
    severityRed: '#ef5350',

    // Shadow
    shadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.7)',

    // Tab bar
    tabBar: '#1e1e1e',
    tabBarBorder: '#333333',

    // Input
    inputBackground: '#2a2a2a',
    inputBorder: '#333333',
    placeholder: '#666666',
  }
};

// ============================================
// ROLE THEME HELPER
// ============================================
export const getRoleTheme = (role, colors) => {
  const roleMap = {
    farmer: {
      primary: colors.farmer,
      light: colors.farmerLight,
      header: colors.farmer
    },
    villager: {
      primary: colors.resident,
      light: colors.residentLight,
      header: colors.resident
    },
    gramsevak: {
      primary: colors.fieldOfficer,
      light: colors.fieldOfficerLight,
      header: colors.fieldOfficer
    },
    doctor: {
      primary: colors.doctor,
      light: colors.doctorLight,
      header: colors.doctor
    }
  };
  return roleMap[role] || roleMap.farmer;
};

// ============================================
// PROVIDER
// ============================================
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved) setThemeMode(saved);
    } catch (e) {
      console.log('Load theme error:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (mode) => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
      setThemeMode(mode);
    } catch (e) {
      console.log('Save theme error:', e.message);
    }
  };

  // Determine active theme
  const activeTheme = themeMode === 'system'
    ? systemScheme === 'dark' ? 'dark' : 'light'
    : themeMode;

  const isDark = activeTheme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <ThemeContext.Provider value={{
      isDark,
      themeMode,
      setTheme,
      colors,
      activeTheme,
      isLoading
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export { COLORS };
