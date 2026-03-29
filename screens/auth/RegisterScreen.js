import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { getLiveLocation } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

export default function RegisterScreen({ navigation, route }) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const preselectedRole = route.params?.role || 'farmer';

  const [form, setForm] = useState({
    name: '',
    phone: '',
    pin: '',
    confirmPin: '',
    role: preselectedRole,
    village: '',
    language: 'en',
    landSize: '',
    specialization: '',
    qualification: '',
    hospitalName: '',
    employeeId: ''
  });

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    autoDetectLocation();
  }, []);

  const autoDetectLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getLiveLocation();
      if (location?.name && location.name !== 'Unknown') {
        setForm(prev => ({ ...prev, village: location.name }));
        console.log('Registration location:', location.name);
      }
    } catch (error) {
      console.log('Auto location failed:', error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.pin || !form.village) {
      return Alert.alert(t('error'), 'Please fill all required fields');
    }
    if (form.pin !== form.confirmPin) {
      return Alert.alert(t('error'), 'PINs do not match');
    }
    if (form.pin.length !== 4) {
      return Alert.alert(t('error'), 'PIN must be 4 digits');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: form.name,
        phone: form.phone,
        pin: form.pin,
        role: form.role,
        village: form.village,
        language: form.language,
        landSize: form.landSize,
        specialization: form.specialization || '',
        qualification: form.qualification || '',
        hospitalName: form.hospitalName || '',
        employeeId: form.employeeId || ''
      });

      if (response.data.success) {
        const result = await login(form.phone, form.pin, form.role);
        if (!result.success) {
          Alert.alert(t('error'), result.message || 'Login after register failed');
        }
      }
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = () => {
    if (form.role === 'farmer') return '#2e7d32';
    if (form.role === 'villager') return '#1565c0';
    if (form.role === 'gramsevak') return '#b71c1c';
    if (form.role === 'doctor') return '#6a1b9a';
    return '#2e7d32';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🌾 GramSeva</Text>
      <Text style={[styles.subtitle, { color: getRoleColor() }]}>
        {t('register')} — {form.role.toUpperCase()}
      </Text>

      <Text style={styles.label}>{t('full_name')} *</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enter_name')}
        value={form.name}
        onChangeText={v => setForm({ ...form, name: v })}
      />

      <Text style={styles.label}>{t('phone_number')} *</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enter_phone')}
        keyboardType="phone-pad"
        maxLength={10}
        value={form.phone}
        onChangeText={v => setForm({ ...form, phone: v })}
      />

      <Text style={styles.label}>{t('village')} *</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder={locationLoading ? t('detecting_location') : t('village')}
          value={form.village}
          onChangeText={v => setForm({ ...form, village: v })}
        />
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={autoDetectLocation}
          disabled={locationLoading}
        >
          {locationLoading
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={styles.locationBtnText}>📍 Auto</Text>
          }
        </TouchableOpacity>
      </View>

      {form.role === 'farmer' && (
        <>
          <Text style={styles.label}>{t('land_size')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2 acres"
            value={form.landSize}
            onChangeText={v => setForm({ ...form, landSize: v })}
          />
        </>
      )}

      {form.role === 'doctor' && (
        <>
          <Text style={styles.label}>{t('specialization')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. General Physician"
            value={form.specialization}
            onChangeText={v => setForm({ ...form, specialization: v })}
          />
          <Text style={styles.label}>{t('qualification')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MBBS, MD"
            value={form.qualification}
            onChangeText={v => setForm({ ...form, qualification: v })}
          />
          <Text style={styles.label}>{t('hospital')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Hospital/Clinic Name"
            value={form.hospitalName}
            onChangeText={v => setForm({ ...form, hospitalName: v })}
          />
        </>
      )}

      {form.role === 'gramsevak' && (
        <>
          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Employee ID (optional)"
            value={form.employeeId}
            onChangeText={v => setForm({ ...form, employeeId: v })}
          />
        </>
      )}

      <Text style={styles.label}>{t('four_digit_pin')} *</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enter_pin')}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        value={form.pin}
        onChangeText={v => setForm({ ...form, pin: v })}
      />

      <Text style={styles.label}>Confirm PIN *</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter your PIN"
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        value={form.confirmPin}
        onChangeText={v => setForm({ ...form, confirmPin: v })}
      />

      <TouchableOpacity
        style={[styles.button,
          { backgroundColor: getRoleColor() },
          loading && { backgroundColor: '#aaa' }]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={styles.buttonText}>{t('register')}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login', { role: form.role })}
      >
        <Text style={[styles.link, { color: getRoleColor() }]}>
          {t('already_account')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  content: { padding: 24, paddingBottom: 40 },
  title: {
    fontSize: 28, fontWeight: 'bold', color: '#2e7d32',
    textAlign: 'center', marginBottom: 4, marginTop: 40
  },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, fontWeight: '600' },
  label: {
    fontSize: 14, fontWeight: '600',
    color: '#444', marginBottom: 6, marginTop: 12
  },
  input: {
    backgroundColor: 'white', borderRadius: 10, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 4
  },
  locationRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationBtn: {
    backgroundColor: '#2e7d32', borderRadius: 10,
    padding: 14, alignItems: 'center', justifyContent: 'center'
  },
  locationBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  button: {
    borderRadius: 12, padding: 18,
    alignItems: 'center', marginTop: 24
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  link: { textAlign: 'center', marginTop: 16, fontSize: 15 }
});