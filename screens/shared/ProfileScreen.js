import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getLiveLocation } from '../../utils/location';

export default function ProfileScreen() {
  const { user, logout, liveVillage, updateUser } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { isDark, themeMode, setTheme, colors } = useTheme();

  const [liveLocation, setLiveLocation] = useState(null);
  const [coords, setCoords] = useState(null);

  const getRoleColor = () => {
    if (user?.role === 'farmer') return colors.farmer;
    if (user?.role === 'villager') return colors.resident;
    if (user?.role === 'gramsevak') return colors.fieldOfficer;
    if (user?.role === 'doctor') return colors.doctor;
    return colors.farmer;
  };

  const roleColor = getRoleColor();

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    if (liveVillage) setLiveLocation(liveVillage);
  }, [liveVillage]);

  const detectLocation = async () => {
    try {
      const location = await getLiveLocation();
      if (location?.name && location.name !== 'Unknown') {
        setLiveLocation(location.name);
        setCoords({
          lat: location.latitude?.toFixed(4),
          lon: location.longitude?.toFixed(4)
        });
      } else if (liveVillage) {
        setLiveLocation(liveVillage);
      }
    } catch (error) {
      if (liveVillage) setLiveLocation(liveVillage);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => await logout()
        }
      ]
    );
  };

  const getRoleEmoji = (role) => {
    const emojis = {
      farmer: '🧑‍🌾',
      villager: '👨‍👩‍👧',
      gramsevak: '👨‍💼',
      doctor: '🩺'
    };
    return emojis[role] || '👤';
  };

  const getRoleLabel = (role) => {
    const labels = {
      farmer: t('farmer'),
      villager: t('resident'),
      gramsevak: t('field_officer'),
      doctor: t('doctor')
    };
    return (labels[role] || role).toUpperCase();
  };

  const currentLocation = liveLocation || liveVillage
    || user?.village || t('detecting_location');

  const themeOptions = [
    { id: 'light', label: t('light_mode'), emoji: '☀️' },
    { id: 'dark', label: t('dark_mode'), emoji: '🌙' },
    { id: 'system', label: t('system_default'), emoji: '📱' },
  ];

  const languageOptions = [
    { code: 'en', label: 'English', emoji: '🇬🇧' },
    { code: 'te', label: 'తెలుగు', emoji: '🇮🇳' },
    { code: 'hi', label: 'हिंदी', emoji: '🇮🇳' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColor }]}>
        <Text style={styles.avatar}>{getRoleEmoji(user?.role)}</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{getRoleLabel(user?.role)}</Text>
        <View style={[styles.villageBadge,
          { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Text style={styles.villageText}>📍 {currentLocation}</Text>
        </View>
      </View>

      {/* My Details */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: roleColor }]}>
          {t('my_details')}
        </Text>

        {[
          { label: t('phone'), value: user?.phone },
          { label: t('village'), value: currentLocation },
          { label: t('language'), value: language?.toUpperCase() },
          coords ? {
            label: t('coordinates'),
            value: `${coords.lat}, ${coords.lon}`
          } : null,
          user?.role === 'farmer' && user?.landSize ? {
            label: t('land_size'),
            value: user.landSize
          } : null,
          user?.role === 'doctor' && user?.specialization ? {
            label: t('specialization'),
            value: user.specialization
          } : null,
          user?.role === 'doctor' && user?.qualification ? {
            label: t('qualification'),
            value: user.qualification
          } : null,
          user?.role === 'doctor' && user?.hospitalName ? {
            label: t('hospital'),
            value: user.hospitalName
          } : null,
        ].filter(Boolean).map((item, i) => (
          <View key={i} style={[styles.infoCard, {
            backgroundColor: colors.surface,
            borderColor: colors.border
          }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Language Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: roleColor }]}>
          🌍 {t('language')}
        </Text>
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          {languageOptions.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.optionRow,
                {
                  backgroundColor: language === lang.code
                    ? roleColor + '22' : 'transparent',
                  borderColor: language === lang.code
                    ? roleColor : colors.border
                }
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={styles.optionEmoji}>{lang.emoji}</Text>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {lang.label}
              </Text>
              {language === lang.code && (
                <Text style={[styles.optionCheck, { color: roleColor }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Theme Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: roleColor }]}>
          🎨 {t('theme')}
        </Text>
        <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionRow,
                {
                  backgroundColor: themeMode === option.id
                    ? roleColor + '22' : 'transparent',
                  borderColor: themeMode === option.id
                    ? roleColor : colors.border
                }
              ]}
              onPress={() => setTheme(option.id)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {option.label}
              </Text>
              {themeMode === option.id && (
                <Text style={[styles.optionCheck, { color: roleColor }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: roleColor }]}>
          {t('about')}
        </Text>
        {[
          { label: t('app_version'), value: 'RuralMate v2.0' },
          { label: '🌐 Domain', value: 'algearithm.xyz' },
          { label: t('built_for'), value: t('rural_india') },
        ].map((item, i) => (
          <View key={i} style={[styles.infoCard, {
            backgroundColor: colors.surface,
            borderColor: colors.border
          }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.error }]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>🚪 {t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', padding: 40, paddingTop: 60 },
  avatar: { fontSize: 70, marginBottom: 12 },
  name: { fontSize: 26, fontWeight: 'bold', color: 'white' },
  role: {
    fontSize: 13, color: 'rgba(255,255,255,0.8)',
    marginTop: 4, letterSpacing: 2
  },
  villageBadge: {
    borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 6, marginTop: 10
  },
  villageText: { color: 'white', fontSize: 14 },
  section: { padding: 16, marginTop: 4 },
  sectionTitle: {
    fontSize: 14, fontWeight: 'bold',
    marginBottom: 10, textTransform: 'uppercase',
    letterSpacing: 1
  },
  infoCard: {
    borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', elevation: 1,
    borderWidth: 1
  },
  infoLabel: { fontSize: 14 },
  infoValue: {
    fontSize: 14, fontWeight: '600',
    textAlign: 'right', flex: 1, marginLeft: 8
  },
  optionCard: {
    borderRadius: 12, overflow: 'hidden',
    elevation: 1
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderWidth: 1, gap: 12
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  optionCheck: { fontSize: 18, fontWeight: 'bold' },
  logoutBtn: {
    margin: 16, borderRadius: 12,
    padding: 18, alignItems: 'center', elevation: 2
  },
  logoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
