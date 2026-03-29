import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const role = route.params?.role || 'farmer';

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !pin) {
      return Alert.alert(t('error'), 'Please enter phone and PIN');
    }
    if (pin.length < 4) {
      return Alert.alert(t('error'), 'PIN must be 4 digits');
    }

    setLoading(true);
    try {
      const result = await login(phone, pin, role);
      if (!result.success) {
        Alert.alert('Login Failed', result.message || 'Wrong phone or PIN');
      }
    } catch (error) {
      Alert.alert(t('error'), 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = () => {
    if (role === 'farmer') return '#2e7d32';
    if (role === 'villager') return '#1565c0';
    if (role === 'gramsevak') return '#b71c1c';
    if (role === 'doctor') return '#6a1b9a';
    return '#2e7d32';
  };

  const getRoleEmoji = () => {
    if (role === 'farmer') return '🧑‍🌾';
    if (role === 'villager') return '👨‍👩‍👧';
    if (role === 'gramsevak') return '👨‍⚕️';
    if (role === 'doctor') return '🩺';
    return '👤';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{getRoleEmoji()}</Text>
      <Text style={[styles.title, { color: getRoleColor() }]}>
        {t('welcome_back')}
      </Text>
      <Text style={styles.subtitle}>
        {t('login')} — {role.toUpperCase()}
      </Text>

      <Text style={styles.label}>{t('phone_number')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enter_phone')}
        keyboardType="phone-pad"
        maxLength={10}
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={styles.label}>{t('four_digit_pin')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enter_pin')}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        value={pin}
        onChangeText={setPin}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: getRoleColor() },
          loading && { backgroundColor: '#aaa' }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={styles.buttonText}>{t('login')}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Register', { role })}
      >
        <Text style={[styles.link, { color: getRoleColor() }]}>
          {t('no_account')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f1f8e9',
    padding: 24, justifyContent: 'center'
  },
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  title: {
    fontSize: 32, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 8
  },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  label: {
    fontSize: 14, fontWeight: '600',
    color: '#444', marginBottom: 6, marginTop: 16
  },
  input: {
    backgroundColor: 'white', borderRadius: 10, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0'
  },
  button: {
    borderRadius: 12, padding: 18,
    alignItems: 'center', marginTop: 32
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  link: { textAlign: 'center', marginTop: 16, fontSize: 15 }
});