import React from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ScrollView
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    emoji: '🇬🇧',
    desc: 'Continue in English'
  },
  {
    code: 'te',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    emoji: '🇮🇳',
    desc: 'తెలుగులో కొనసాగించు'
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिंदी',
    emoji: '🇮🇳',
    desc: 'हिंदी में जारी रखें'
  },
];

export default function LanguageScreen({ navigation }) {
  const { language, changeLanguage, t } = useLanguage();

  const handleSelect = async (code) => {
    await changeLanguage(code);
    navigation.navigate('RoleSelect');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🌐</Text>
        <Text style={styles.title}>GramSeva</Text>
        <Text style={styles.subtitle}>{t('select_language')}</Text>
        <Text style={styles.subtitleNative}>
          भाषा चुनें / భాష ఎంచుకోండి
        </Text>
      </View>

      <View style={styles.languageList}>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageCard,
              language === lang.code && styles.selectedCard
            ]}
            onPress={() => handleSelect(lang.code)}
          >
            <Text style={styles.langEmoji}>{lang.emoji}</Text>
            <View style={styles.langInfo}>
              <Text style={styles.langNative}>{lang.nativeLabel}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
              <Text style={styles.langDesc}>{lang.desc}</Text>
            </View>
            {language === lang.code && (
              <View style={styles.checkBadge}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#f1f8e9',
    padding: 24, justifyContent: 'center'
  },
  header: { alignItems: 'center', marginBottom: 40 },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#2e7d32' },
  subtitle: { fontSize: 18, color: '#555', marginTop: 8 },
  subtitleNative: { fontSize: 14, color: '#888', marginTop: 4, textAlign: 'center' },
  languageList: { gap: 16 },
  languageCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 20, flexDirection: 'row',
    alignItems: 'center', gap: 16,
    elevation: 3, borderWidth: 2, borderColor: '#e0e0e0'
  },
  selectedCard: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
  langEmoji: { fontSize: 36 },
  langInfo: { flex: 1 },
  langNative: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  langLabel: { fontSize: 14, color: '#666', marginTop: 2 },
  langDesc: { fontSize: 13, color: '#888', marginTop: 4 },
  checkBadge: {
    backgroundColor: '#2e7d32', borderRadius: 20,
    width: 32, height: 32, alignItems: 'center',
    justifyContent: 'center'
  },
  checkText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});