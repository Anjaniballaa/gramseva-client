import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export default function RoleSelectScreen({ navigation }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [selected, setSelected] = useState(null);

  const roles = [
    {
      code: 'farmer',
      emoji: '🧑‍🌾',
      label: t('farmer'),
      desc: t('farmer_desc'),
      color: colors.farmer,
      bg: colors.farmerLight
    },
    {
      code: 'villager',
      emoji: '👨‍👩‍👧',
      label: t('resident'),
      desc: t('villager_desc'),
      color: colors.resident,
      bg: colors.residentLight
    },
    {
      code: 'gramsevak',
      emoji: '👨‍💼',
      label: t('field_officer'),
      desc: t('gramsevak_desc'),
      color: colors.fieldOfficer,
      bg: colors.fieldOfficerLight
    },
    {
      code: 'doctor',
      emoji: '🩺',
      label: t('doctor'),
      desc: t('doctor_desc'),
      color: colors.doctor,
      bg: colors.doctorLight
    },
  ];

  const selectedRole = roles.find(r => r.code === selected);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.farmer }]}>
        🌾 {t('app_name')}
      </Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('select_role')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('choose_role')}
      </Text>

      {roles.map(role => (
        <TouchableOpacity
          key={role.code}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: selected === role.code ? role.color : colors.border
            },
            selected === role.code && { backgroundColor: role.bg }
          ]}
          onPress={() => setSelected(role.code)}
          activeOpacity={0.8}
        >
          <View style={[
            styles.emojiContainer,
            {
              backgroundColor: selected === role.code
                ? role.color : colors.surfaceSecondary
            }
          ]}>
            <Text style={styles.emoji}>{role.emoji}</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={[
              styles.roleLabel,
              { color: selected === role.code ? role.color : colors.text }
            ]}>
              {role.label}
            </Text>
            <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
              {role.desc}
            </Text>
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
            {
              borderColor: selectedRole?.color || colors.border,
              backgroundColor: colors.surface
            },
            !selected && { borderColor: colors.border }
          ]}
          onPress={() => selected && navigation.navigate('Login', { role: selected })}
          disabled={!selected}
        >
          <Text style={[
            styles.loginBtnText,
            { color: selectedRole?.color || colors.textMuted }
          ]}>
            {t('login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: selectedRole?.color || colors.border
            }
          ]}
          onPress={() => selected && navigation.navigate('Register', { role: selected })}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>{t('register')}</Text>
        </TouchableOpacity>
      </View>

      {selected && (
        <Text style={[styles.selectedHint, { color: colors.textMuted }]}>
          {selectedRole?.emoji} {selectedRole?.label} {t('selected') || 'selected'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, minHeight: '100%' },
  title: {
    fontSize: 28, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 4, marginTop: 40
  },
  sectionTitle: {
    fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 8, marginTop: 8
  },
  subtitle: {
    fontSize: 15, textAlign: 'center', marginBottom: 24
  },
  card: {
    borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row',
    alignItems: 'center', borderWidth: 2, elevation: 2
  },
  emojiContainer: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginRight: 14
  },
  emoji: { fontSize: 28 },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 17, fontWeight: 'bold' },
  roleDesc: { fontSize: 13, marginTop: 4 },
  checkmark: { fontSize: 22, fontWeight: 'bold', marginLeft: 8 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    flex: 1, borderRadius: 12,
    padding: 18, alignItems: 'center'
  },
  loginBtn: { borderWidth: 2 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loginBtnText: { fontSize: 18, fontWeight: 'bold' },
  selectedHint: {
    textAlign: 'center', fontSize: 14, marginTop: 12
  }
});
