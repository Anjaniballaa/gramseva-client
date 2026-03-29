import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const BLUE = '#1565c0';

export default function HealthHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/health/history');
      setRecords(res.data.data || []);
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

  const getSeverityColor = (level) => {
    if (level === 'Red') return '#c62828';
    if (level === 'Yellow') return '#f57f17';
    return '#2e7d32';
  };

  const generatePDF = async (record) => {
    setGenerating(record._id);
    try {
      let analysis = {};
      try { analysis = JSON.parse(record.analysis || '{}'); } catch (e) {}

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
    .header { background: #1565c0; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
    .section { background: #f5f5f5; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .section h3 { margin: 0 0 10px; color: #1565c0; font-size: 16px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .label { color: #666; font-size: 13px; }
    .value { font-weight: bold; font-size: 13px; }
    .severity { 
      display: inline-block; padding: 4px 12px; border-radius: 20px; 
      color: white; font-weight: bold; font-size: 13px;
      background: ${getSeverityColor(record.severityLevel)};
    }
    .symptom-tag { 
      display: inline-block; background: #e3f2fd; color: #1565c0;
      padding: 4px 10px; border-radius: 20px; margin: 3px;
      font-size: 12px; font-weight: bold;
    }
    .condition { 
      background: #fff3e0; padding: 8px 12px; 
      border-radius: 6px; margin-bottom: 6px; font-size: 13px;
    }
    .remedy { 
      background: #e8f5e9; padding: 8px 12px; 
      border-radius: 6px; margin-bottom: 6px; font-size: 13px;
    }
    .medicine { 
      background: #f3e5f5; padding: 8px 12px; 
      border-radius: 6px; margin-bottom: 6px; font-size: 13px;
    }
    .warning { 
      background: #ffebee; padding: 8px 12px; 
      border-radius: 6px; margin-bottom: 6px; 
      font-size: 13px; color: #c62828;
    }
    .footer { 
      text-align: center; margin-top: 30px; 
      color: #888; font-size: 12px;
      border-top: 1px solid #ddd; padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 GramSeva Health Report</h1>
    <p>Patient: ${record.familyMemberName} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
  </div>

  <div class="section">
    <h3>👤 Patient Details</h3>
    <div class="row">
      <span class="label">Name</span>
      <span class="value">${record.familyMemberName}</span>
    </div>
    <div class="row">
      <span class="label">Age Group</span>
      <span class="value">${record.ageGroup || 'N/A'}</span>
    </div>
    <div class="row">
      <span class="label">Gender</span>
      <span class="value">${record.gender || 'N/A'}</span>
    </div>
    <div class="row">
      <span class="label">Date</span>
      <span class="value">${new Date(record.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      })}</span>
    </div>
    <div class="row">
      <span class="label">Severity</span>
      <span class="severity">${record.severityLevel} Alert</span>
    </div>
  </div>

  <div class="section">
    <h3>🤒 Symptoms</h3>
    <div>
      ${record.symptoms?.map(s => `<span class="symptom-tag">${s}</span>`).join('') || 'None'}
    </div>
    <div class="row" style="margin-top: 10px;">
      <span class="label">Duration</span>
      <span class="value">${record.duration || 'N/A'}</span>
    </div>
  </div>

  ${analysis.possible_conditions?.length > 0 ? `
  <div class="section">
    <h3>🔍 Possible Conditions</h3>
    ${analysis.possible_conditions.map(c => `<div class="condition">• ${c}</div>`).join('')}
  </div>` : ''}

  ${analysis.immediate_action ? `
  <div class="section">
    <h3>⚡ Immediate Action</h3>
    <div class="condition">${analysis.immediate_action}</div>
  </div>` : ''}

  ${analysis.home_remedies?.length > 0 ? `
  <div class="section">
    <h3>🌿 Home Remedies</h3>
    ${analysis.home_remedies.map(r => `<div class="remedy">• ${r}</div>`).join('')}
  </div>` : ''}

  ${analysis.medicines_otc?.length > 0 ? `
  <div class="section">
    <h3>💊 OTC Medicines</h3>
    ${analysis.medicines_otc.map(m => `<div class="medicine">• ${m}</div>`).join('')}
  </div>` : ''}

  ${analysis.diet_advice ? `
  <div class="section">
    <h3>🥗 Diet Advice</h3>
    <div class="remedy">${analysis.diet_advice}</div>
  </div>` : ''}

  ${analysis.warning_signs?.length > 0 ? `
  <div class="section">
    <h3>⚠️ Warning Signs</h3>
    ${analysis.warning_signs.map(w => `<div class="warning">• ${w}</div>`).join('')}
  </div>` : ''}

  ${record.workerNote ? `
  <div class="section">
    <h3>👨‍⚕️ Gram Sevak Note</h3>
    <div class="remedy">${record.workerNote}</div>
  </div>` : ''}

  <div class="footer">
    <p>Generated by GramSeva App 🌾 | AI-Powered Rural Health Companion</p>
    <p>⚠️ This report is for reference only. Always consult a doctor for proper diagnosis.</p>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Health Report',
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      Alert.alert(t('error'), 'Could not generate PDF: ' + error.message);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📋 {t('health_history_title')}</Text>
          <Text style={styles.headerSub}>{records.length} {t('records_found')}</Text>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>{t('no_records')}</Text>
            <Text style={styles.emptySub}>
              {t('complete_symptom')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          let analysis = {};
          try { analysis = JSON.parse(item.analysis || '{}'); } catch (e) {}

          return (
            <View style={styles.recordCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.patientName}>{item.familyMemberName}</Text>
                  <Text style={styles.date}>
                    🕐 {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={[styles.severityBadge,
                  { backgroundColor: getSeverityColor(item.severityLevel) }]}>
                  <Text style={styles.severityText}>{item.severityLevel}</Text>
                </View>
              </View>

              <View style={styles.symptomsRow}>
                {item.symptoms?.slice(0, 4).map((s, i) => (
                  <View key={i} style={styles.symptomTag}>
                    <Text style={styles.symptomTagText}>{s}</Text>
                  </View>
                ))}
                {item.symptoms?.length > 4 && (
                  <View style={styles.symptomTag}>
                    <Text style={styles.symptomTagText}>+{item.symptoms.length - 4}</Text>
                  </View>
                )}
              </View>

              {analysis.possible_conditions?.length > 0 && (
                <Text style={styles.conditions}>
                  🔍 {analysis.possible_conditions.slice(0, 2).join(', ')}
                </Text>
              )}

              {analysis.immediate_action && (
                <Text style={styles.action}>⚡ {analysis.immediate_action}</Text>
              )}

              {item.workerNote ? (
                <Text style={styles.workerNote}>👨‍⚕️ {item.workerNote}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.pdfBtn, generating === item._id && { backgroundColor: '#aaa' }]}
                onPress={() => generatePDF(item)}
                disabled={generating === item._id}
              >
                {generating === item._id
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.pdfBtnText}>📄 {t('download_pdf')}</Text>
                }
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: BLUE, padding: 16,
    paddingTop: 50, flexDirection: 'row',
    alignItems: 'center', gap: 12
  },
  backBtn: { fontSize: 24, color: 'white', padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#bbdefb', marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8 },
  recordCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: BLUE
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10
  },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
  severityBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  symptomTag: {
    backgroundColor: '#e3f2fd', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4
  },
  symptomTagText: { color: BLUE, fontSize: 11, fontWeight: '600' },
  conditions: { fontSize: 13, color: '#555', marginBottom: 4 },
  action: { fontSize: 13, color: BLUE, marginBottom: 4, fontStyle: 'italic' },
  workerNote: {
    fontSize: 13, color: '#2e7d32',
    marginBottom: 8, fontStyle: 'italic'
  },
  pdfBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 8,
    flexDirection: 'row', justifyContent: 'center'
  },
  pdfBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});