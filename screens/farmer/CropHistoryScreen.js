import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Image, TouchableOpacity, ActivityIndicator,
  RefreshControl
} from 'react-native';
import api from '../../services/api';

export default function CropHistoryScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/crop/history');
      setReports(res.data.data || []);
    } catch (error) {
      console.log('History error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getSeverityColor = (severity) => {
    if (severity === 'Severe') return '#c62828';
    if (severity === 'Moderate') return '#f57f17';
    if (severity === 'Mild') return '#f9a825';
    if (severity === 'Healthy') return '#2e7d32';
    return '#2e7d32';
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.cropImage} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.diseaseName}>{item.diseaseName || 'Unknown'}</Text>
          <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) }]}>
            <Text style={styles.badgeText}>{item.severity}</Text>
          </View>
        </View>
        <Text style={styles.cropType}>🌱 Crop: {item.cropType || 'Unknown'}</Text>
        <Text style={styles.date}>
          🕐 {new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </Text>
        {item.treatment?.organic && (
          <Text style={styles.treatment}>
            🌿 {item.treatment.organic}
          </Text>
        )}
        {item.sharedToCommunity && (
          <View style={styles.sharedBadge}>
            <Text style={styles.sharedText}>✅ Shared to community</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Scan History</Text>
        <Text style={styles.headerSub}>{reports.length} scans total</Text>
      </View>

      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌾</Text>
            <Text style={styles.emptyText}>No scans yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#2e7d32', padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#c8e6c9', marginTop: 4 },
  card: {
    backgroundColor: 'white', borderRadius: 16,
    marginBottom: 12, elevation: 3, overflow: 'hidden'
  },
  cropImage: { width: '100%', height: 160 },
  cardBody: { padding: 16 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8
  },
  diseaseName: { fontSize: 17, fontWeight: 'bold', color: '#333', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  cropType: { fontSize: 13, color: '#555', marginBottom: 4 },
  date: { fontSize: 13, color: '#888', marginBottom: 6 },
  treatment: { fontSize: 13, color: '#444', lineHeight: 18 },
  sharedBadge: {
    marginTop: 8, backgroundColor: '#e8f5e9',
    borderRadius: 8, padding: 6, alignSelf: 'flex-start'
  },
  sharedText: { fontSize: 12, color: '#2e7d32', fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' }
});