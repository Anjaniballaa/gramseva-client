import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import AuthNavigator from './navigation/AuthNavigator';
import AppNavigator from './navigation/AppNavigator';

// ── NOTIFICATION HANDLER ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── ROOT NAVIGATOR ──
function RootNavigator() {
  const { user, loading } = useAuth();
  const { isDark, colors } = useTheme();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background
      }}>
        <ActivityIndicator size="large" color={colors.farmer} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <AppNavigator /> : <AuthNavigator />}
    </>
  );
}

// ── NAVIGATION THEME ──
function ThemedNavigationContainer({ children }) {
  const { isDark, colors } = useTheme();

  const navTheme = {
    dark: isDark,
    colors: {
      primary: colors.farmer,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error
    }
  };

  return (
    <NavigationContainer theme={navTheme}>
      {children}
    </NavigationContainer>
  );
}

// ── MAIN APP ──
export default function App() {
  useEffect(() => {
    // Handle notification tap — navigate to correct screen
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data?.type, data?.screen);
      // Navigation handled by AppNavigator based on data.screen
    });

    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:',
        notification.request.content.title);
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <ThemedNavigationContainer>
            <RootNavigator />
          </ThemedNavigationContainer>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
