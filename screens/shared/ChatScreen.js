import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function ChatScreen({ route, navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { appointmentId, patientId, patientName, doctorName } = route.params || {};
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [healthRecords, setHealthRecords] = useState([]);
  const [familyCards, setFamilyCards] = useState([]);
  const flatListRef = useRef(null);

  const isDoctor = user?.role === 'doctor';
  const chatName = isDoctor ? patientName : doctorName;

  useEffect(() => {
    fetchChat();
    if (isDoctor && patientId) fetchPatientData();
  }, []);

  const fetchChat = async () => {
    try {
      const res = await api.get(`/chat/${appointmentId}`);
      setChat(res.data.data);
    } catch (error) {
      console.log('Chat error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      const res = await api.get(`/chat/patient/${patientId}/history`);
      setHealthRecords(res.data.data?.healthRecords || []);
      setFamilyCards(res.data.data?.familyCards || []);
    } catch (error) {
      console.log('Patient history error:', error.message);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/chat/${appointmentId}/message`, {
        text: message.trim(),
        type: 'text'
      });
      setChat(res.data.data);
      setMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      Alert.alert(t('error'), 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const shareHealthRecord = async (record) => {
    try {
      let analysis = {};
      try { analysis = JSON.parse(record.analysis || '{}'); } catch (e) {}

      await api.post(`/chat/${appointmentId}/message`, {
        text: `📋 Shared Health Record: ${record.familyMemberName}, ${record.symptoms?.join(', ')}`,
        type: 'report',
        reportData: {
          type: 'health',
          name: record.familyMemberName,
          symptoms: record.symptoms,
          severity: record.severityLevel,
          analysis: analysis.possible_conditions?.join(', ') || '',
          date: record.createdAt
        }
      });
      setShowShareModal(false);
      await fetchChat();
      Alert.alert(`${t('shared_community')} ✅`, 'Health record shared with doctor');
    } catch (e) {
      Alert.alert(t('error'), 'Could not share');
    }
  };

  const shareFamilyCard = async (card) => {
    try {
      await api.post(`/chat/${appointmentId}/message`, {
        text: `🏥 Shared Health Card: ${card.memberName}`,
        type: 'report',
        reportData: {
          type: 'card',
          name: card.memberName,
          age: card.age,
          gender: card.gender,
          bloodGroup: card.bloodGroup,
          conditions: card.conditions?.join(', '),
          medications: card.medications?.join(', ')
        }
      });
      setShowShareModal(false);
      await fetchChat();
      Alert.alert(`${t('shared_community')} ✅`, 'Health card shared with doctor');
    } catch (e) {
      Alert.alert(t('error'), 'Could not share');
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === user?._id || item.senderId === user?.id;

    return (
      <View style={[styles.messageRow, isMe && styles.myMessageRow]}>
        {!isMe && (
          <Text style={styles.senderEmoji}>
            {item.senderRole === 'doctor' ? '🩺' : '👤'}
          </Text>
        )}
        <View style={[styles.messageBubble, isMe && styles.myBubble]}>
          {!isMe && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}

          {item.type === 'report' && item.reportData ? (
            <View style={styles.reportCard}>
              <Text style={styles.reportTitle}>
                {item.reportData.type === 'health' ? `📋 ${t('health_history_title')}` : `🏥 ${t('health_cards')}`}
              </Text>
              <Text style={styles.reportName}>{item.reportData.name}</Text>
              {item.reportData.symptoms && (
                <Text style={styles.reportDetail}>
                  🤒 {Array.isArray(item.reportData.symptoms)
                    ? item.reportData.symptoms.join(', ')
                    : item.reportData.symptoms}
                </Text>
              )}
              {item.reportData.severity && (
                <Text style={styles.reportDetail}>
                  ⚠️ Severity: {item.reportData.severity}
                </Text>
              )}
              {item.reportData.bloodGroup && (
                <Text style={styles.reportDetail}>
                  🩸 Blood: {item.reportData.bloodGroup}
                </Text>
              )}
              {item.reportData.conditions && (
                <Text style={styles.reportDetail}>
                  🏥 {item.reportData.conditions}
                </Text>
              )}
              {item.reportData.medications && (
                <Text style={styles.reportDetail}>
                  💊 {item.reportData.medications}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.messageText, isMe && styles.myMessageText]}>
              {item.text}
            </Text>
          )}

          <Text style={[styles.messageTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
            {new Date(item.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {isDoctor ? '👤 ' : '🩺 '}{chatName}
          </Text>
          <Text style={styles.headerSub}>
            {isDoctor ? t('patient_name') : t('doctor')}
          </Text>
        </View>
        {isDoctor && (
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate('PatientHistory', {
              patientId,
              patientName
            })}
          >
            <Text style={styles.historyBtnText}>📋 {t('patient_history')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={chat?.messages || []}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messagesList}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>💬</Text>
            <Text style={styles.emptyChatText}>
              Start the conversation!
            </Text>
            <Text style={styles.emptyChatSub}>
              {isDoctor
                ? `${t('chat')} with your patient here`
                : `${t('chat')} with your doctor here`}
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        {!isDoctor && (
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setShowShareModal(true)}
          >
            <Text style={styles.attachBtnText}>📎</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, sending && { backgroundColor: '#aaa' }]}
          onPress={sendMessage}
          disabled={sending}
        >
          {sending
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={styles.sendBtnText}>➤</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Share Reports Modal — Villager only */}
      <Modal visible={showShareModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📎 {t('share')} with {t('doctor')}</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {healthRecords.length > 0 && (
                <>
                  <Text style={styles.shareSection}>📋 {t('health_history_title')}</Text>
                  {healthRecords.slice(0, 5).map((record, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.shareItem}
                      onPress={() => shareHealthRecord(record)}
                    >
                      <View style={styles.shareItemInfo}>
                        <Text style={styles.shareItemName}>
                          {record.familyMemberName}
                        </Text>
                        <Text style={styles.shareItemDetails}>
                          🤒 {record.symptoms?.slice(0, 3).join(', ')}
                        </Text>
                        <Text style={styles.shareItemDate}>
                          {new Date(record.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <View style={[styles.severityDot, {
                        backgroundColor:
                          record.severityLevel === 'Red' ? '#c62828' :
                          record.severityLevel === 'Yellow' ? '#f57f17' : '#2e7d32'
                      }]}>
                        <Text style={styles.severityDotText}>
                          {record.severityLevel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {familyCards.length > 0 && (
                <>
                  <Text style={styles.shareSection}>🏥 {t('health_cards')}</Text>
                  {familyCards.map((card, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.shareItem}
                      onPress={() => shareFamilyCard(card)}
                    >
                      <View style={styles.shareItemInfo}>
                        <Text style={styles.shareItemName}>{card.memberName}</Text>
                        <Text style={styles.shareItemDetails}>
                          {card.age} yrs • {card.gender} • {card.bloodGroup}
                        </Text>
                        {card.conditions?.length > 0 && (
                          <Text style={styles.shareItemDetails}>
                            🏥 {card.conditions.slice(0, 2).join(', ')}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.shareArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {healthRecords.length === 0 && familyCards.length === 0 && (
                <View style={styles.noReports}>
                  <Text style={styles.noReportsText}>
                    {t('no_records')}{'\n'}
                    {t('complete_symptom')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1565c0', padding: 16,
    paddingTop: 50, flexDirection: 'row',
    alignItems: 'center', gap: 12
  },
  backBtn: { fontSize: 24, color: 'white', padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 12, color: '#bbdefb', marginTop: 2 },
  historyBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, padding: 8
  },
  historyBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: {
    flexDirection: 'row', marginBottom: 12,
    alignItems: 'flex-end'
  },
  myMessageRow: { flexDirection: 'row-reverse' },
  senderEmoji: { fontSize: 24, marginRight: 8 },
  messageBubble: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 12, maxWidth: '75%', elevation: 1,
    borderBottomLeftRadius: 4
  },
  myBubble: {
    backgroundColor: '#1565c0',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4
  },
  senderName: {
    fontSize: 11, color: '#1565c0',
    fontWeight: 'bold', marginBottom: 4
  },
  messageText: { fontSize: 15, color: '#333', lineHeight: 20 },
  myMessageText: { color: 'white' },
  messageTime: {
    fontSize: 10, color: '#999',
    marginTop: 4, textAlign: 'right'
  },
  reportCard: {
    backgroundColor: '#f0f4ff', borderRadius: 10,
    padding: 10, minWidth: 180
  },
  reportTitle: {
    fontSize: 13, fontWeight: 'bold',
    color: '#1565c0', marginBottom: 6
  },
  reportName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  reportDetail: { fontSize: 12, color: '#555', marginTop: 3 },
  inputRow: {
    flexDirection: 'row', padding: 12,
    backgroundColor: 'white', alignItems: 'center',
    gap: 8, elevation: 4
  },
  attachBtn: {
    backgroundColor: '#e3f2fd', borderRadius: 24,
    width: 44, height: 44, alignItems: 'center',
    justifyContent: 'center'
  },
  attachBtnText: { fontSize: 20 },
  input: {
    flex: 1, backgroundColor: '#f5f5f5',
    borderRadius: 24, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15,
    maxHeight: 100
  },
  sendBtn: {
    backgroundColor: '#1565c0', borderRadius: 24,
    width: 44, height: 44, alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnText: { color: 'white', fontSize: 18 },
  emptyChat: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyChatEmoji: { fontSize: 56, marginBottom: 12 },
  emptyChatText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyChatSub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeBtn: { fontSize: 20, color: '#666' },
  shareSection: {
    fontSize: 14, fontWeight: 'bold',
    color: '#1565c0', marginBottom: 8, marginTop: 8
  },
  shareItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 12,
    padding: 12, marginBottom: 8
  },
  shareItemInfo: { flex: 1 },
  shareItemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  shareItemDetails: { fontSize: 12, color: '#666', marginTop: 2 },
  shareItemDate: { fontSize: 11, color: '#888', marginTop: 2 },
  severityDot: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  severityDotText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  shareArrow: { fontSize: 18, color: '#1565c0', fontWeight: 'bold' },
  noReports: { alignItems: 'center', padding: 24 },
  noReportsText: {
    fontSize: 14, color: '#888',
    textAlign: 'center', lineHeight: 22
  }
});