import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

export default function RoleSelectScreen({ navigation }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);

  const roles = [
    {
      code: 'farmer',
      emoji: '🧑‍🌾',
      label: t('farmer'),
      desc: t('farmer_desc'),
      color: '#2e7d32',
      bg: '#e8f5e9'
    },
    {
      code: 'villager',
      emoji: '👨‍👩‍👧',
      label: t('villager'),
      desc: t('villager_desc'),
      color: '#1565c0',
      bg: '#e3f2fd'
    },
    {
      code: 'gramsevak',
      emoji: '👨‍⚕️',
      label: t('gramsevak'),
      desc: t('gramsevak_desc'),
      color: '#bf360c',
      bg: '#fff3e0'
    },
    {
      code: 'doctor',
      emoji: '🩺',
      label: t('doctor'),
      desc: t('doctor_desc'),
      color: '#6a1b9a',
      bg: '#f3e5f5'
    },
  ];

  const selectedRole = roles.find(r => r.code === selected);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>{t('select_role')}</Text>
      <Text style={styles.subtitle}>{t('choose_role')}</Text>

      {roles.map(role => (
        <TouchableOpacity
          key={role.code}
          style={[
            styles.card,
            selected === role.code && {
              borderColor: role.color,
              backgroundColor: role.bg
            }
          ]}
          onPress={() => setSelected(role.code)}
          activeOpacity={0.8}
        >
          <View style={[styles.emojiContainer,
            selected === role.code && { backgroundColor: role.color }]}>
            <Text style={styles.emoji}>{role.emoji}</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleLabel,
              selected === role.code && { color: role.color }]}>
              {role.label}
            </Text>
            <Text style={styles.roleDesc}>{role.desc}</Text>
          </View>
          {selected === role.code && (
            <Text style={[styles.checkmark, { color: role.color }]}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.loginBtn,
            !selected && styles.disabledBtn,
            selected && { borderColor: selectedRole?.color }
          ]}
          onPress={() => navigation.navigate('Login', { role: selected })}
          disabled={!selected}
        >
          <Text style={[styles.loginBtnText,
            selected && { color: selectedRole?.color }]}>
            {t('login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            !selected && styles.disabledBtn,
            selected && { backgroundColor: selectedRole?.color }
          ]}
          onPress={() => navigation.navigate('Register', { role: selected })}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>{t('register')}</Text>
        </TouchableOpacity>
      </View>

      {selected && (
        <Text style={styles.selectedHint}>
          {selectedRole?.emoji} {selectedRole?.label}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  content: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  title: {
    fontSize: 28, fontWeight: 'bold',
    color: '#2e7d32', textAlign: 'center', marginBottom: 8
  },
  subtitle: {
    fontSize: 16, color: '#666',
    textAlign: 'center', marginBottom: 32
  },
  card: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#e0e0e0', elevation: 3
  },
  emojiContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f5f5f5', alignItems: 'center',
    justifyContent: 'center', marginRight: 14
  },
  emoji: { fontSize: 28 },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  roleDesc: { fontSize: 13, color: '#888', marginTop: 4 },
  checkmark: { fontSize: 22, fontWeight: 'bold', marginLeft: 8 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    flex: 1, backgroundColor: '#2e7d32',
    borderRadius: 12, padding: 18, alignItems: 'center'
  },
  loginBtn: {
    backgroundColor: 'white',
    borderWidth: 2, borderColor: '#2e7d32'
  },
  disabledBtn: { backgroundColor: '#ccc', borderColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loginBtnText: { color: '#2e7d32', fontSize: 18, fontWeight: 'bold' },
  selectedHint: {
    textAlign: 'center', color: '#666',
    fontSize: 14, marginTop: 12
  }
});