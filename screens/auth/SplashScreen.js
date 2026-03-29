import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('Language');
    }, 2500);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌾</Text>
      <Text style={styles.title}>GramSeva</Text>
      <Text style={styles.subtitle}>Your Village Companion</Text>
      <Text style={styles.tagline}>ग्राम सेवा • గ్రామ సేవ</Text>
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
  emoji: { fontSize: 80, marginBottom: 20 },
  title: {
    fontSize: 42,
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
    fontSize: 14,
    color: '#a5d6a7',
    marginTop: 12
  }
});