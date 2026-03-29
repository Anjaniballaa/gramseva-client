import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Modal, FlatList,
  Share, Linking
} from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

const COMMON_CONDITIONS = [
  'Diabetes (Type 1)', 'Diabetes (Type 2)',
  'High Blood Pressure', 'Low Blood Pressure',
  'Heart Disease', 'Heart Attack (Past)',
  'Asthma', 'COPD', 'Bronchitis',
  'Thyroid (Hyper)', 'Thyroid (Hypo)',
  'Kidney Disease', 'Kidney Stones',
  'Liver Disease', 'Fatty Liver',
  'Arthritis', 'Joint Pain',
  'Cancer', 'Epilepsy/Fits',
  'Stroke (Past)', 'Paralysis',
  'Anemia', 'Sickle Cell', 'Thalassemia',
  'Mental Health', 'Depression', 'Anxiety',
  'Skin Disease', 'Psoriasis', 'Eczema',
  'Eye Disease', 'Cataract', 'Glaucoma',
  'Ear Problem', 'Hearing Loss',
  'Pregnancy', 'PCOS', 'Uterus Problem',
  'Prostate Problem', 'Hernia',
  'Migraine', 'Back Pain', 'Slip Disc',
  'Obesity', 'Malnutrition',
  'HIV/AIDS', 'Tuberculosis (TB)',
  'None'
];

const VACCINES = [
  'COVID-19', 'Tetanus (TT)',
  'Hepatitis B', 'Hepatitis A',
  'Typhoid', 'Influenza',
  'Polio (OPV)', 'BCG',
  'MMR', 'Pneumococcal',
  'Chickenpox', 'Rabies',
  'Meningococcal', 'HPV',
];

const GENDERS = ['Male', 'Female', 'Other'];

const SHARE_OPTIONS = [
  { id: 'private', labelKey: 'private', label: '🔒 Private', descKey: 'only_you_see', desc: 'Only you can see' },
  { id: 'healthworker', labelKey: 'healthworker', label: '👩‍⚕️ Health Worker', descKey: 'only_hw_sees', desc: 'Only health worker sees' },
  { id: 'village', labelKey: 'village', label: '👥 Village', descKey: 'all_villagers_see', desc: 'All villagers can see' },
];

export default function HealthCardScreen() {
  const { user, getVillage } = useAuth();
  const { t } = useLanguage();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewCard, setViewCard] = useState(null);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedVaccines, setSelectedVaccines] = useState([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [form, setForm] = useState({
    memberName: '',
    age: '',
    gender: 'Female',
    bloodGroup: 'Unknown',
    medications: '',
    emergencyContact: '',
    emergencyName: '',
    notes: '',
    sharedWith: 'private'
  });
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
const [selectedCardForShare, setSelectedCardForShare] = useState(null);
const [shareVisibility, setShareVisibility] = useState('public');
  useEffect(() => { fetchCards(); }, []);

  const fetchCards = async () => {
    try {
      const res = await api.get('/health/family-cards');
      setCards(res.data.data || []);
    } catch (error) {
      console.log('Cards error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCondition = (condition) => {
    setSelectedConditions(prev =>
      prev.includes(condition)
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const toggleVaccine = (vaccine) => {
    setSelectedVaccines(prev =>
      prev.includes(vaccine)
        ? prev.filter(v => v !== vaccine)
        : [...prev, vaccine]
    );
  };

  const addCard = async () => {
    if (!form.memberName || !form.age) {
      return Alert.alert(t('error'), `${t('full_name')} and ${t('age')} are required`);
    }
    try {
      const allConditions = [...selectedConditions];
      if (otherCondition.trim()) {
        otherCondition.split(',').forEach(c => {
          if (c.trim()) allConditions.push(c.trim());
        });
      }

      await api.post('/health/family-cards', {
        memberName: form.memberName,
        age: parseInt(form.age),
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        conditions: allConditions,
        medications: form.medications
          ? form.medications.split(',').map(m => m.trim()).filter(Boolean)
          : [],
        vaccinations: selectedVaccines.map(v => ({
          name: v, done: true,
          date: new Date().toISOString().split('T')[0]
        })),
        emergencyContact: form.emergencyContact,
        emergencyName: form.emergencyName,
        notes: form.notes,
        sharedWith: form.sharedWith
      });

      setModalVisible(false);
      resetForm();
      await fetchCards();
      Alert.alert(`${t('success')} ✅`, `${t('health_cards')} saved!`);
    } catch (error) {
      Alert.alert(t('error'), 'Could not save health card');
    }
  };

  const deleteCard = (id) => {
    Alert.alert(t('delete'), 'Remove this family member?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/health/family-cards/${id}`);
            await fetchCards();
          } catch (error) {
            Alert.alert(t('error'), 'Could not delete');
          }
        }
      }
    ]);
  };

  const shareViaWhatsApp = async (card) => {
    const message = `
🏥 *Health Card — ${card.memberName}*
👤 Age: ${card.age} yrs | ${card.gender}
🩸 Blood Group: ${card.bloodGroup}
🏥 Conditions: ${card.conditions?.join(', ') || 'None'}
💊 Medications: ${card.medications?.join(', ') || 'None'}
💉 Vaccinated: ${card.vaccinations?.map(v => v.name).join(', ') || 'None'}
🚨 Emergency: ${card.emergencyName || ''} — ${card.emergencyContact || 'N/A'}
📝 Notes: ${card.notes || 'None'}

Shared via GramSeva App 🌾
    `;
    try {
      await Share.share({ message });
    } catch (e) {
      Alert.alert(t('error'), 'Could not share');
    }
  };

  const shareToCommunity = (card) => {
  setSelectedCardForShare(card);
  setCommunityModalVisible(true);
};
  const confirmShareToCommunity = async () => {
  if (!selectedCardForShare) return;

  const card = selectedCardForShare;

  try {
    await api.post('/community/post', {
  content: `🏥 Health Card: ${card.memberName} (${card.age} yrs, ${card.gender}, Blood: ${card.bloodGroup})\n🏥 Conditions: ${card.conditions?.join(', ') || 'None'}\n💊 Medications: ${card.medications?.join(', ') || 'None'}\n${card.notes ? '📝 ' + card.notes : ''}`,
  village: getVillage(),
  category: 'health',
  visibility: shareVisibility
});

setCommunityModalVisible(false);
setSelectedCardForShare(null);
setShareVisibility('public');
Alert.alert(
  `${t('shared_community')} ✅`,
  shareVisibility === 'public'
    ? t('everyone_village')
    : t('only_gramsevak')
);
  } catch (e) {
    Alert.alert(t('error'), 'Could not share');
  }
};
  const resetForm = () => {
    setForm({
      memberName: '', age: '', gender: 'Female',
      bloodGroup: 'Unknown', medications: '',
      emergencyContact: '', emergencyName: '',
      notes: '', sharedWith: 'private'
    });
    setSelectedConditions([]);
    setSelectedVaccines([]);
    setOtherCondition('');
  };

  const bloodGroupColors = {
    'A+': '#e53935', 'A-': '#e53935',
    'B+': '#1e88e5', 'B-': '#1e88e5',
    'O+': '#43a047', 'O-': '#43a047',
    'AB+': '#8e24aa', 'AB-': '#8e24aa',
    'Unknown': '#757575'
  };

  const getSharedIcon = (sharedWith) => {
    if (sharedWith === 'healthworker') return '👩‍⚕️';
    if (sharedWith === 'village') return '👥';
    return '🔒';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍👩‍👧 {t('family_health_cards')}</Text>
        <Text style={styles.headerSub}>{cards.length} members registered</Text>
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👨‍👩‍👧</Text>
            <Text style={styles.emptyText}>{t('no_cases')}</Text>
            <Text style={styles.emptySubText}>
              {t('add_family_member')} to track your family's health
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{item.memberName}</Text>
                  <Text style={styles.sharedIcon}>{getSharedIcon(item.sharedWith)}</Text>
                </View>
                <Text style={styles.memberAge}>
                  {item.age} yrs • {item.gender}
                </Text>
                {item.conditions?.length > 0 && (
                  <Text style={styles.conditions}>
                    🏥 {item.conditions.slice(0, 2).join(', ')}
                    {item.conditions.length > 2 ? ` +${item.conditions.length - 2} more` : ''}
                  </Text>
                )}
                {item.emergencyContact ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${item.emergencyContact}`)}
                  >
                    <Text style={styles.emergencyText}>
                      🚨 {item.emergencyName || 'Emergency'}: {item.emergencyContact}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {item.notes ? (
                  <Text style={styles.notesText}>📝 {item.notes}</Text>
                ) : null}
              </View>
              <View style={[styles.bloodBadge,
                { backgroundColor: bloodGroupColors[item.bloodGroup] || '#757575' }]}>
                <Text style={styles.bloodText}>{item.bloodGroup}</Text>
              </View>
            </View>

            {item.vaccinations?.length > 0 && (
              <View style={styles.vaccineRow}>
                <Text style={styles.vaccineLabel}>💉 </Text>
                <Text style={styles.vaccineText} numberOfLines={1}>
                  {item.vaccinations.map(v => v.name).join(', ')}
                </Text>
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setViewCard(item)}
              >
                <Text style={styles.actionBtnText}>👁️ View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#e8f5e9' }]}
                onPress={() => shareViaWhatsApp(item)}
              >
                <Text style={[styles.actionBtnText, { color: '#2e7d32' }]}>📤 {t('share')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#fff8e1' }]}
                onPress={() => shareToCommunity(item)}
              >
                <Text style={[styles.actionBtnText, { color: '#f57f17' }]}>👥 {t('community')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ffebee' }]}
                onPress={() => deleteCard(item._id)}
              >
                <Text style={[styles.actionBtnText, { color: '#c62828' }]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ {t('add_family_member')}</Text>
          </TouchableOpacity>
        }
      />

      {/* View Card Modal */}
      <Modal visible={!!viewCard} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{viewCard?.memberName}</Text>
                <TouchableOpacity onPress={() => setViewCard(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.bloodCardBanner,
                { backgroundColor: bloodGroupColors[viewCard?.bloodGroup] || '#757575' }]}>
                <Text style={styles.bloodCardText}>
                  {viewCard?.bloodGroup} • {viewCard?.age} yrs • {viewCard?.gender}
                </Text>
              </View>

              {[
                { label: `👤 ${t('full_name')}`, value: viewCard?.memberName },
                { label: `🎂 ${t('age')}`, value: `${viewCard?.age} years` },
                { label: `⚧ ${t('gender')}`, value: viewCard?.gender },
                { label: '🩸 Blood Group', value: viewCard?.bloodGroup },
                { label: `🔒 ${t('who_can_see')}`, value: viewCard?.sharedWith || 'private' },
              ].map((item, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              ))}

              {viewCard?.conditions?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>🏥 {t('past_history')}</Text>
                  {viewCard.conditions.map((c, i) => (
                    <Text key={i} style={styles.detailItem}>• {c}</Text>
                  ))}
                </View>
              )}

              {viewCard?.medications?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>💊 {t('current_medications')}</Text>
                  {viewCard.medications.map((m, i) => (
                    <Text key={i} style={styles.detailItem}>• {m}</Text>
                  ))}
                </View>
              )}

              {viewCard?.vaccinations?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>💉 Vaccinations Done</Text>
                  {viewCard.vaccinations.map((v, i) => (
                    <Text key={i} style={styles.detailItem}>
                      ✅ {v.name} {v.date ? `(${v.date})` : ''}
                    </Text>
                  ))}
                </View>
              )}

              {viewCard?.emergencyContact ? (
                <View style={styles.emergencySection}>
                  <Text style={styles.detailSectionTitle}>🚨 Emergency Contact</Text>
                  <Text style={styles.detailItem}>
                    👤 {viewCard.emergencyName || 'Contact Person'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${viewCard.emergencyContact}`)}
                  >
                    <Text style={[styles.detailItem, { color: '#1565c0' }]}>
                      📞 {viewCard.emergencyContact} (Tap to call)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {viewCard?.notes ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📝 {t('notes')}</Text>
                  <Text style={styles.detailItem}>{viewCard.notes}</Text>
                </View>
              ) : null}

              <View style={styles.shareRow}>
                <TouchableOpacity
                  style={styles.shareBtnGreen}
                  onPress={() => shareViaWhatsApp(viewCard)}
                >
                  <Text style={styles.shareBtnGreenText}>📤 {t('share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareBtnBlue}
                  onPress={() => shareToCommunity(viewCard)}
                >
                  <Text style={styles.shareBtnBlueText}>👥 {t('community')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>➕ {t('add_family_member')}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>👤 {t('full_name')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('enter_name')}
                value={form.memberName}
                onChangeText={v => setForm({ ...form, memberName: v })}
              />

              <Text style={styles.formLabel}>🎂 {t('age')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('age')}
                keyboardType="number-pad"
                value={form.age}
                onChangeText={v => setForm({ ...form, age: v })}
              />

              <Text style={styles.formLabel}>⚧ {t('gender')}</Text>
              <View style={styles.optionRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.optionBtn,
                      form.gender === g && styles.selectedOption]}
                    onPress={() => setForm({ ...form, gender: g })}
                  >
                    <Text style={[styles.optionText,
                      form.gender === g && styles.selectedOptionText]}>
                      {g === 'Male' ? '👨' : g === 'Female' ? '👩' : '🧑'} {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>🩸 Blood Group</Text>
              <View style={styles.bloodRow}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.bloodBtn,
                      form.bloodGroup === bg && styles.selectedBlood]}
                    onPress={() => setForm({ ...form, bloodGroup: bg })}
                  >
                    <Text style={[styles.bloodBtnText,
                      form.bloodGroup === bg && styles.selectedBloodText]}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>🏥 {t('past_history')}</Text>
              <View style={styles.conditionsGrid}>
                {COMMON_CONDITIONS.map(condition => (
                  <TouchableOpacity
                    key={condition}
                    style={[styles.conditionBtn,
                      selectedConditions.includes(condition) && styles.selectedCondition]}
                    onPress={() => toggleCondition(condition)}
                  >
                    <Text style={[styles.conditionText,
                      selectedConditions.includes(condition) && styles.selectedConditionText]}>
                      {condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>✏️ Other conditions (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Vitiligo, Lupus, other condition..."
                value={otherCondition}
                onChangeText={setOtherCondition}
              />

              <Text style={styles.formLabel}>💊 {t('current_medications')} (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                value={form.medications}
                onChangeText={v => setForm({ ...form, medications: v })}
              />

              <Text style={styles.formLabel}>💉 Vaccinations Done</Text>
              <View style={styles.conditionsGrid}>
                {VACCINES.map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.conditionBtn,
                      selectedVaccines.includes(v) && styles.selectedCondition]}
                    onPress={() => toggleVaccine(v)}
                  >
                    <Text style={[styles.conditionText,
                      selectedVaccines.includes(v) && styles.selectedConditionText]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>🚨 Emergency Contact Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact person name"
                value={form.emergencyName}
                onChangeText={v => setForm({ ...form, emergencyName: v })}
              />

              <Text style={styles.formLabel}>📞 Emergency Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Emergency phone number"
                keyboardType="phone-pad"
                value={form.emergencyContact}
                onChangeText={v => setForm({ ...form, emergencyContact: v })}
              />

              <Text style={styles.formLabel}>📝 {t('notes')}</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder={t('additional_info')}
                value={form.notes}
                onChangeText={v => setForm({ ...form, notes: v })}
                multiline
              />

              <Text style={styles.formLabel}>🔒 {t('who_can_see')}?</Text>
              {SHARE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.shareOptionBtn,
                    form.sharedWith === opt.id && styles.selectedShareOption]}
                  onPress={() => setForm({ ...form, sharedWith: opt.id })}
                >
                  <Text style={styles.shareOptionLabel}>{opt.label}</Text>
                  <Text style={styles.shareOptionDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={addCard}>
                <Text style={styles.saveBtnText}>💾 {t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Community Share Modal */}
<Modal visible={communityModalVisible} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>👥 {t('share_community')}</Text>
      <Text style={styles.shareModalSubTitle}>{t('who_can_see')}?</Text>

      {selectedCardForShare && (
        <View style={styles.shareCardPreview}>
          <Text style={styles.shareCardName}>{selectedCardForShare.memberName}</Text>
          <Text style={styles.shareCardDetails}>
            {selectedCardForShare.age} yrs • {selectedCardForShare.gender} • {selectedCardForShare.bloodGroup}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.shareVisOption,
          shareVisibility === 'public' && styles.shareVisSelectedBlue]}
        onPress={() => setShareVisibility('public')}
      >
        <Text style={styles.shareVisEmoji}>🌍</Text>
        <View style={styles.shareVisInfo}>
          <Text style={styles.shareVisTitle}>{t('public')}</Text>
          <Text style={styles.shareVisDesc}>{t('everyone_village')}</Text>
        </View>
        {shareVisibility === 'public' && (
          <Text style={styles.shareVisCheck}>✓</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.shareVisOption,
          shareVisibility === 'gramsevak_only' && styles.shareVisSelectedRed]}
        onPress={() => setShareVisibility('gramsevak_only')}
      >
        <Text style={styles.shareVisEmoji}>🔒</Text>
        <View style={styles.shareVisInfo}>
          <Text style={styles.shareVisTitle}>{t('gramsevak_only')}</Text>
          <Text style={styles.shareVisDesc}>{t('only_gramsevak')}</Text>
        </View>
        {shareVisibility === 'gramsevak_only' && (
          <Text style={[styles.shareVisCheck, { color: '#b71c1c' }]}>✓</Text>
        )}
      </TouchableOpacity>

      <View style={styles.shareVisActions}>
        <TouchableOpacity
          style={styles.shareVisCancelBtn}
          onPress={() => {
            setCommunityModalVisible(false);
            setSelectedCardForShare(null);
            setShareVisibility('public');
          }}
        >
          <Text style={styles.shareVisCancelText}>{t('cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareVisConfirmBtn}
          onPress={confirmShareToCommunity}
        >
          <Text style={styles.shareVisConfirmText}>{t('share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1565c0', padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#bbdefb', marginTop: 4 },
  card: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start'
  },
  cardInfo: { flex: 1, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sharedIcon: { fontSize: 16 },
  memberAge: { fontSize: 14, color: '#666', marginTop: 2 },
  conditions: { fontSize: 13, color: '#c62828', marginTop: 4 },
  emergencyText: {
    fontSize: 12, color: '#1565c0',
    marginTop: 4, fontWeight: '600'
  },
  notesText: {
    fontSize: 12, color: '#666',
    marginTop: 4, fontStyle: 'italic'
  },
  bloodBadge: {
    borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 6, alignItems: 'center', minWidth: 50
  },
  bloodText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  vaccineRow: {
    flexDirection: 'row', marginTop: 8, flexWrap: 'wrap'
  },
  vaccineLabel: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
  vaccineText: { fontSize: 12, color: '#555', flex: 1 },
  cardActions: {
    flexDirection: 'row', gap: 6,
    marginTop: 12, flexWrap: 'wrap'
  },
  actionBtn: {
    backgroundColor: '#e3f2fd', borderRadius: 8,
    padding: 8, paddingHorizontal: 10
  },
  actionBtnText: { color: '#1565c0', fontWeight: '600', fontSize: 12 },
  addBtn: {
    backgroundColor: '#1565c0', borderRadius: 12,
    padding: 18, alignItems: 'center',
    marginTop: 8, marginBottom: 20
  },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#333', fontWeight: 'bold' },
  emptySubText: {
    fontSize: 14, color: '#888',
    marginTop: 8, textAlign: 'center'
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '92%'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeBtn: { fontSize: 20, color: '#666', padding: 4 },
  bloodCardBanner: {
    borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 12
  },
  bloodCardText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 14, fontSize: 15, marginBottom: 10
  },
  formLabel: {
    fontSize: 14, fontWeight: 'bold',
    color: '#333', marginBottom: 8, marginTop: 8
  },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  optionBtn: {
    flex: 1, backgroundColor: '#f5f5f5',
    borderRadius: 8, padding: 10, alignItems: 'center',
    borderWidth: 2, borderColor: '#e0e0e0'
  },
  selectedOption: { backgroundColor: '#e3f2fd', borderColor: '#1565c0' },
  optionText: { fontSize: 13, color: '#333' },
  selectedOptionText: { color: '#1565c0', fontWeight: 'bold' },
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  bloodBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  selectedBlood: { backgroundColor: '#c62828', borderColor: '#c62828' },
  bloodBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  selectedBloodText: { color: 'white' },
  conditionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 10
  },
  conditionBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  selectedCondition: { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
  conditionText: { fontSize: 12, color: '#333' },
  selectedConditionText: { color: '#2e7d32', fontWeight: 'bold' },
  shareOptionBtn: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 12, marginBottom: 8,
    borderWidth: 2, borderColor: '#e0e0e0',
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectedShareOption: { borderColor: '#1565c0', backgroundColor: '#e3f2fd' },
  shareOptionLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  shareOptionDesc: { fontSize: 12, color: '#666' },
  saveBtn: {
    backgroundColor: '#1565c0', borderRadius: 12,
    padding: 16, alignItems: 'center',
    marginTop: 16, marginBottom: 8
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12, backgroundColor: '#f5f5f5',
    borderRadius: 8, marginBottom: 8
  },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  detailSection: {
    backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: 12, marginBottom: 10
  },
  emergencySection: {
    backgroundColor: '#ffebee', borderRadius: 10,
    padding: 12, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#c62828'
  },
  detailSectionTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#333', marginBottom: 8
  },
  detailItem: { fontSize: 14, color: '#444', marginBottom: 4 },
  shareRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
  shareBtnGreen: {
    flex: 1, backgroundColor: '#e8f5e9',
    borderRadius: 12, padding: 14, alignItems: 'center'
  },
  shareBtnGreenText: { color: '#2e7d32', fontWeight: 'bold' },
  shareBtnBlue: {
    flex: 1, backgroundColor: '#e3f2fd',
    borderRadius: 12, padding: 14, alignItems: 'center'
  },
  shareBtnBlueText: { color: '#1565c0', fontWeight: 'bold' },
  shareModalSubTitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  shareCardPreview: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 12, marginBottom: 16
  },
  shareCardName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  shareCardDetails: { fontSize: 13, color: '#666', marginTop: 4 },
  shareVisOption: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#e0e0e0', marginBottom: 10
  },
  shareVisSelectedBlue: { borderColor: '#1565c0', backgroundColor: '#e3f2fd' },
  shareVisSelectedRed: { borderColor: '#b71c1c', backgroundColor: '#ffebee' },
  shareVisEmoji: { fontSize: 28 },
  shareVisInfo: { flex: 1 },
  shareVisTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  shareVisDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  shareVisCheck: { fontSize: 20, fontWeight: 'bold', color: '#1565c0' },
  shareVisActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  shareVisCancelBtn: {
    flex: 1, backgroundColor: '#f5f5f5',
    borderRadius: 12, padding: 14, alignItems: 'center'
  },
  shareVisCancelText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  shareVisConfirmBtn: {
    flex: 1, backgroundColor: '#1565c0',
    borderRadius: 12, padding: 14, alignItems: 'center'
  },
  shareVisConfirmText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});