import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  TextInput, Linking
} from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const SYMPTOMS = [
  { id: 'fever', label: 'Fever', emoji: '🌡️', category: 'common' },
  { id: 'high fever', label: 'High Fever', emoji: '🔥', category: 'serious' },
  { id: 'cough', label: 'Cough', emoji: '😷', category: 'common' },
  { id: 'cold', label: 'Cold/Runny Nose', emoji: '🤧', category: 'common' },
  { id: 'headache', label: 'Headache', emoji: '🤕', category: 'common' },
  { id: 'body pain', label: 'Body Pain', emoji: '😣', category: 'common' },
  { id: 'vomiting', label: 'Vomiting', emoji: '🤢', category: 'common' },
  { id: 'diarrhea', label: 'Diarrhea', emoji: '🚽', category: 'common' },
  { id: 'weakness', label: 'Weakness', emoji: '😔', category: 'common' },
  { id: 'dizziness', label: 'Dizziness', emoji: '💫', category: 'common' },
  { id: 'chest pain', label: 'Chest Pain', emoji: '💔', category: 'serious' },
  { id: 'difficulty breathing', label: 'Breathing Issues', emoji: '😮‍💨', category: 'serious' },
  { id: 'rash', label: 'Skin Rash', emoji: '🩹', category: 'common' },
  { id: 'stomach pain', label: 'Stomach Pain', emoji: '🤰', category: 'common' },
  { id: 'joint pain', label: 'Joint Pain', emoji: '🦴', category: 'common' },
  { id: 'sore throat', label: 'Sore Throat', emoji: '🗣️', category: 'common' },
  { id: 'loss of appetite', label: 'No Appetite', emoji: '🍽️', category: 'common' },
  { id: 'eye irritation', label: 'Eye Problem', emoji: '👁️', category: 'common' },
  { id: 'ear pain', label: 'Ear Pain', emoji: '👂', category: 'common' },
  { id: 'swelling', label: 'Swelling', emoji: '🦶', category: 'common' },
  { id: 'unconscious', label: 'Unconscious', emoji: '😵', category: 'serious' },
  { id: 'seizure', label: 'Seizure/Fits', emoji: '⚡', category: 'serious' },
  { id: 'severe bleeding', label: 'Bleeding', emoji: '🩸', category: 'serious' },
];

const DURATIONS = [
  { id: 'today', label: 'Today', emoji: '📅' },
  { id: '2-3days', label: '2-3 Days', emoji: '📆' },
  { id: '1week+', label: '1 Week+', emoji: '🗓️' },
];

const GENDERS = [
  { id: 'male', label: 'Male', emoji: '👨' },
  { id: 'female', label: 'Female', emoji: '👩' },
  { id: 'other', label: 'Other', emoji: '🧑' },
];

const AGE_GROUPS = [
  { id: 'child', label: 'Child (0-12)', emoji: '👶' },
  { id: 'adult', label: 'Adult (13-60)', emoji: '🧑' },
  { id: 'elderly', label: 'Elderly (60+)', emoji: '👴' },
];

export default function SymptomCheckScreen() {
  const { user, getVillage } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [duration, setDuration] = useState('today');
  const [ageGroup, setAgeGroup] = useState('adult');
  const [gender, setGender] = useState('male');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [currentMedication, setCurrentMedication] = useState('');
  const [pastHistory, setPastHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSymptom = (id) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const hasSerious = selectedSymptoms.some(s =>
    SYMPTOMS.find(sym => sym.id === s)?.category === 'serious'
  );

  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0) {
      return Alert.alert(t('error'), 'Please select at least one symptom');
    }
    if (!patientName.trim()) {
      return Alert.alert(t('error'), 'Please enter patient name');
    }

    setLoading(true);
    try {
      const response = await api.post('/health/symptom-check', {
        familyMemberName: patientName,
        age: parseInt(age) || 25,
        ageGroup,
        gender,
        symptoms: selectedSymptoms,
        duration,
        village: getVillage(),
        additionalInfo: `Gender: ${gender}. Current medications: ${currentMedication || 'None'}. Past history: ${pastHistory || 'None'}. Allergies: ${allergies || 'None'}. ${additionalInfo}`
      });

      if (response.data.success) {
        setResult(response.data.data);
        setStep(3);
      }
    } catch (error) {
      Alert.alert(t('error'), 'Could not analyze symptoms. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedSymptoms([]);
    setDuration('today');
    setAgeGroup('adult');
    setGender('male');
    setPatientName('');
    setAge('');
    setCurrentMedication('');
    setPastHistory('');
    setAllergies('');
    setAdditionalInfo('');
    setResult(null);
  };

  const getSeverityColor = (level) => {
    if (level === 'Red') return '#c62828';
    if (level === 'Yellow') return '#f57f17';
    return '#2e7d32';
  };

  const getSeverityEmoji = (level) => {
    if (level === 'Red') return '🚨';
    if (level === 'Yellow') return '⚠️';
    return '✅';
  };

  const getSeverityMessage = (level) => {
    if (level === 'Red') return 'Emergency! Go to hospital immediately!';
    if (level === 'Yellow') return 'Visit health center today';
    return 'Can be managed at home';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('symptom_checker')}</Text>
        <Text style={styles.headerSub}>{t('ai_health_analysis')}</Text>
        <View style={styles.stepRow}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]}>
              <Text style={styles.stepDotText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* STEP 1 */}
      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('patient_details')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('patient_name')}
            value={patientName}
            onChangeText={setPatientName}
          />

          <TextInput
            style={styles.input}
            placeholder={t('age')}
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
          />

          <Text style={styles.sectionTitle}>{t('gender')}</Text>
          <View style={styles.optionRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.optionBtn, gender === g.id && styles.selectedOption]}
                onPress={() => setGender(g.id)}
              >
                <Text style={styles.optionEmoji}>{g.emoji}</Text>
                <Text style={[styles.optionLabel, gender === g.id && styles.selectedOptionLabel]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('age_group')}</Text>
          <View style={styles.optionRow}>
            {AGE_GROUPS.map(ag => (
              <TouchableOpacity
                key={ag.id}
                style={[styles.optionBtn, ageGroup === ag.id && styles.selectedOption]}
                onPress={() => setAgeGroup(ag.id)}
              >
                <Text style={styles.optionEmoji}>{ag.emoji}</Text>
                <Text style={[styles.optionLabel, ageGroup === ag.id && styles.selectedOptionLabel]}>
                  {ag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('current_medications')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Any medicines currently taking... (or 'None')"
            value={currentMedication}
            onChangeText={setCurrentMedication}
          />

          <Text style={styles.sectionTitle}>{t('past_history')}</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="Diabetes, BP, Heart disease, Surgery... (or 'None')"
            value={pastHistory}
            onChangeText={setPastHistory}
            multiline
          />

          <Text style={styles.sectionTitle}>{t('allergies')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Any known allergies to medicines or food..."
            value={allergies}
            onChangeText={setAllergies}
          />

          <Text style={styles.sectionTitle}>{t('select_symptoms')}</Text>

          {hasSerious && (
            <View style={styles.urgentBanner}>
              <Text style={styles.urgentText}>
                ⚠️ Serious symptoms selected — call 108 immediately!
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('tel:108')}>
                <Text style={styles.callBtn}>📞 108</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.symptomsGrid}>
            {SYMPTOMS.map(symptom => (
              <TouchableOpacity
                key={symptom.id}
                style={[
                  styles.symptomCard,
                  selectedSymptoms.includes(symptom.id) && styles.selectedSymptom,
                  symptom.category === 'serious' && styles.seriousSymptom,
                  selectedSymptoms.includes(symptom.id) &&
                    symptom.category === 'serious' && styles.selectedSeriousSymptom
                ]}
                onPress={() => toggleSymptom(symptom.id)}
              >
                <Text style={styles.symptomEmoji}>{symptom.emoji}</Text>
                <Text style={[
                  styles.symptomLabel,
                  selectedSymptoms.includes(symptom.id) && styles.selectedSymptomLabel
                ]}>
                  {symptom.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('how_long')}</Text>
          <View style={styles.optionRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.optionBtn, duration === d.id && styles.selectedOption]}
                onPress={() => setDuration(d.id)}
              >
                <Text style={styles.optionEmoji}>{d.emoji}</Text>
                <Text style={[styles.optionLabel, duration === d.id && styles.selectedOptionLabel]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('additional_info')}</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Any other details... (e.g. pregnant, recent travel)"
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
            multiline
          />

          <TouchableOpacity
            style={[styles.nextBtn,
              selectedSymptoms.length === 0 && { backgroundColor: '#aaa' }]}
            onPress={() => selectedSymptoms.length > 0 && setStep(2)}
            disabled={selectedSymptoms.length === 0}
          >
            <Text style={styles.nextBtnText}>
              {t('next')} → {selectedSymptoms.length} symptoms selected
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('review')}</Text>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Patient</Text>
            <Text style={styles.reviewValue}>{patientName}, {age} yrs</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{t('gender')}</Text>
            <Text style={styles.reviewValue}>{gender}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{t('age_group')}</Text>
            <Text style={styles.reviewValue}>{ageGroup}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{t('how_long')}</Text>
            <Text style={styles.reviewValue}>{duration}</Text>
          </View>
          {currentMedication ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Medications</Text>
              <Text style={styles.reviewValue}>{currentMedication}</Text>
            </View>
          ) : null}
          {pastHistory ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Past History</Text>
              <Text style={styles.reviewValue}>{pastHistory}</Text>
            </View>
          ) : null}
          {allergies ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>{t('allergies')}</Text>
              <Text style={styles.reviewValue}>{allergies}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>{t('select_symptoms')}:</Text>
          <View style={styles.tagRow}>
            {selectedSymptoms.map(s => {
              const sym = SYMPTOMS.find(x => x.id === s);
              return (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{sym?.emoji} {sym?.label}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, loading && { backgroundColor: '#aaa' }]}
            onPress={analyzeSymptoms}
            disabled={loading}
          >
            {loading
              ? <>
                  <ActivityIndicator color="white" />
                  <Text style={styles.nextBtnText}> {t('ai_analyzing')}</Text>
                </>
              : <Text style={styles.nextBtnText}>{t('analyze_now')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
            <Text style={styles.backBtnText}>← {t('back')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3 */}
      {step === 3 && result && (
        <View style={styles.section}>
          <View style={[styles.severityCard,
            { backgroundColor: getSeverityColor(result.severityLevel) }]}>
            <Text style={styles.severityEmoji}>
              {getSeverityEmoji(result.severityLevel)}
            </Text>
            <Text style={styles.severityLevel}>{result.severityLevel} Alert</Text>
            <Text style={styles.severityMessage}>
              {getSeverityMessage(result.severityLevel)}
            </Text>
          </View>

          {result.severityLevel === 'Red' && (
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyTitle}>{t('emergency_actions')}</Text>
              <TouchableOpacity
                style={styles.emergencyBtn}
                onPress={() => Linking.openURL('tel:108')}
              >
                <Text style={styles.emergencyBtnText}>{t('call_ambulance')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emergencyBtn, { backgroundColor: '#1565c0' }]}
                onPress={() => Linking.openURL('tel:104')}
              >
                <Text style={styles.emergencyBtnText}>{t('health_helpline')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {result.analysis && (() => {
            try {
              const analysis = typeof result.analysis === 'string'
                ? JSON.parse(result.analysis) : result.analysis;
              return (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>🤖 AI Analysis</Text>

                  {analysis.immediate_action && (
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>⚡ Immediate Action:</Text>
                      <Text style={styles.analysisText}>{analysis.immediate_action}</Text>
                    </View>
                  )}
                  {analysis.possible_conditions?.length > 0 && (
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>{t('possible_conditions')}:</Text>
                      {analysis.possible_conditions.map((c, i) => (
                        <Text key={i} style={styles.analysisText}>• {c}</Text>
                      ))}
                    </View>
                  )}
                  {analysis.home_remedies?.length > 0 && (
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>🌿 Home Remedies:</Text>
                      {analysis.home_remedies.map((r, i) => (
                        <Text key={i} style={styles.analysisText}>• {r}</Text>
                      ))}
                    </View>
                  )}
                  {analysis.medicines_otc?.length > 0 && (
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>💊 Safe OTC Medicines:</Text>
                      {analysis.medicines_otc.map((m, i) => (
                        <Text key={i} style={styles.analysisText}>• {m}</Text>
                      ))}
                    </View>
                  )}
                  {analysis.diet_advice && (
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>🥗 Diet Advice:</Text>
                      <Text style={styles.analysisText}>{analysis.diet_advice}</Text>
                    </View>
                  )}
                  {analysis.warning_signs?.length > 0 && (
                    <View style={[styles.analysisItem, styles.warningItem]}>
                      <Text style={styles.analysisLabel}>⚠️ Warning Signs:</Text>
                      {analysis.warning_signs.map((w, i) => (
                        <Text key={i} style={[styles.analysisText, { color: '#c62828' }]}>
                          • {w}
                        </Text>
                      ))}
                    </View>
                  )}
                  {analysis.advice && (
                    <View style={[styles.analysisItem, { backgroundColor: '#e8f5e9' }]}>
                      <Text style={styles.analysisLabel}>💬 Overall Advice:</Text>
                      <Text style={styles.analysisText}>{analysis.advice}</Text>
                    </View>
                  )}
                </View>
              );
            } catch (e) { return null; }
          })()}

          <View style={styles.workerCard}>
            <Text style={styles.workerTitle}>👩‍⚕️ Nearby Health Support</Text>
            <Text style={styles.workerText}>• Visit nearest PHC (Primary Health Center)</Text>
            <Text style={styles.workerText}>• Contact your ASHA worker</Text>
            <Text style={styles.workerText}>• National Health Helpline: 104</Text>
            <TouchableOpacity
              style={styles.helplineBtn}
              onPress={() => Linking.openURL('tel:104')}
            >
              <Text style={styles.helplineBtnText}>📞 Call Health Helpline 104</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={reset}>
            <Text style={styles.nextBtnText}>{t('check_again')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  header: {
    backgroundColor: '#c62828', padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#ffcdd2', marginTop: 4 },
  stepRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center'
  },
  stepDotActive: { backgroundColor: 'white' },
  stepDotText: { fontSize: 14, fontWeight: 'bold', color: '#c62828' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#333', marginBottom: 10, marginTop: 16
  },
  input: {
    backgroundColor: 'white', borderRadius: 10,
    padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 10
  },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  optionBtn: {
    flex: 1, backgroundColor: 'white',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 2, borderColor: '#e0e0e0'
  },
  selectedOption: { borderColor: '#c62828', backgroundColor: '#ffebee' },
  optionEmoji: { fontSize: 20, marginBottom: 4 },
  optionLabel: { fontSize: 11, color: '#333', textAlign: 'center' },
  selectedOptionLabel: { color: '#c62828', fontWeight: 'bold' },
  urgentBanner: {
    backgroundColor: '#ffebee', borderRadius: 10,
    padding: 12, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#c62828',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  urgentText: { fontSize: 13, color: '#c62828', flex: 1 },
  callBtn: {
    backgroundColor: '#c62828', color: 'white',
    padding: 8, borderRadius: 8, fontWeight: 'bold',
    fontSize: 13, overflow: 'hidden'
  },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  symptomCard: {
    width: '30%', backgroundColor: 'white',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 2, borderColor: '#e0e0e0', elevation: 1
  },
  selectedSymptom: { borderColor: '#c62828', backgroundColor: '#ffebee' },
  seriousSymptom: { borderColor: '#ff8f00' },
  selectedSeriousSymptom: { borderColor: '#c62828', backgroundColor: '#ffebee' },
  symptomEmoji: { fontSize: 22, marginBottom: 4 },
  symptomLabel: { fontSize: 10, color: '#333', textAlign: 'center' },
  selectedSymptomLabel: { color: '#c62828', fontWeight: 'bold' },
  nextBtn: {
    backgroundColor: '#c62828', borderRadius: 12,
    padding: 16, alignItems: 'center',
    marginTop: 16, flexDirection: 'row', justifyContent: 'center'
  },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  backBtn: { padding: 16, alignItems: 'center' },
  backBtnText: { color: '#666', fontSize: 15 },
  reviewCard: {
    backgroundColor: 'white', borderRadius: 10,
    padding: 12, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  reviewLabel: { fontSize: 14, color: '#666' },
  reviewValue: {
    fontSize: 14, fontWeight: 'bold', color: '#333',
    flex: 1, textAlign: 'right', marginLeft: 8
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: {
    backgroundColor: '#ffebee', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6
  },
  tagText: { color: '#c62828', fontWeight: '600', fontSize: 13 },
  severityCard: {
    borderRadius: 20, padding: 32,
    alignItems: 'center', marginBottom: 16
  },
  severityEmoji: { fontSize: 56, marginBottom: 8 },
  severityLevel: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  severityMessage: { fontSize: 16, color: 'white', textAlign: 'center', marginTop: 8 },
  emergencyCard: {
    backgroundColor: '#ffebee', borderRadius: 16,
    padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#c62828'
  },
  emergencyTitle: { fontSize: 16, fontWeight: 'bold', color: '#c62828', marginBottom: 12 },
  emergencyBtn: {
    backgroundColor: '#c62828', borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 8
  },
  emergencyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  analysisCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 16, elevation: 2
  },
  analysisTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  analysisItem: {
    backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: 12, marginBottom: 10
  },
  warningItem: { backgroundColor: '#fff8e1' },
  analysisLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  analysisText: { fontSize: 14, color: '#444', lineHeight: 20 },
  workerCard: {
    backgroundColor: '#e8f5e9', borderRadius: 16,
    padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#2e7d32'
  },
  workerTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 8 },
  workerText: { fontSize: 14, color: '#333', marginBottom: 6 },
  helplineBtn: {
    backgroundColor: '#2e7d32', borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 8
  },
  helplineBtnText: { color: 'white', fontWeight: 'bold' }
});