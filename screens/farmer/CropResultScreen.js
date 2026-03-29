import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CropResultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌿 Crop Result</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f8e9' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32' }
});