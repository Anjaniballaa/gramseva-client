import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function SplashScreen({ navigation }) {
  const { isDark } = useTheme();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();

    // Navigate after delay
    const timer = setTimeout(() => {
      navigation.replace('Language');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.content,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}>
        <Text style={styles.emoji}>🌾</Text>
        <Text style={styles.title}>RuralMate</Text>
        <Text style={styles.subtitle}>Your Village Companion</Text>
        <Text style={styles.tagline}>
          ग्राम सहायक • గ్రామ సహాయకుడు
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Serving Rural India 🇮🇳
        </Text>
        <Text style={styles.domain}>algearithm.xyz</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  emoji: {
    fontSize: 90,
    marginBottom: 16
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2
  },
  subtitle: {
    fontSize: 18,
    color: '#c8e6c9',
    marginTop: 8
  },
  tagline: {
    fontSize: 13,
    color: '#a5d6a7',
    marginTop: 12,
    textAlign: 'center'
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 13,
    color: '#a5d6a7'
  },
  domain: {
    fontSize: 12,
    color: '#81c784',
    marginTop: 4
  }
});
