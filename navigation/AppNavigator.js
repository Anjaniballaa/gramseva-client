import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Farmer screens
import FarmerHome from '../screens/farmer/FarmerHome';
import CropScanScreen from '../screens/farmer/CropScanScreen';
import CropHistoryScreen from '../screens/farmer/CropHistoryScreen';

// Villager screens
import VillagerHome from '../screens/villager/VillagerHome';
import SymptomCheckScreen from '../screens/villager/SymptomCheckScreen';
import HealthCardScreen from '../screens/villager/HealthCardScreen';

// Gram Sevak screens
import GramSevakHome from '../screens/gramsevak/GramSevakHome';
import VillageReportsScreen from '../screens/gramsevak/VillageReportsScreen';
import EpidemicAlertScreen from '../screens/gramsevak/EpidemicAlertScreen';

// Doctor screens
import DoctorHome from '../screens/doctor/DoctorHome';
import AppointmentsScreen from '../screens/doctor/AppointmentsScreen';
import PatientHistoryScreen from '../screens/doctor/PatientHistoryScreen';

// Shared screens
import WeatherScreen from '../screens/shared/WeatherScreen';
import CommunityFeedScreen from '../screens/shared/CommunityFeedScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import ConsultDoctorScreen from '../screens/shared/ConsultDoctorScreen';
import ChatScreen from '../screens/shared/ChatScreen';

import HealthHistoryScreen from '../screens/villager/HealthHistoryScreen';
import MedicineReminderScreen from '../screens/villager/MedicineReminderScreen';
import NearbyHealthCentersScreen from '../screens/shared/NearbyHealthCentersScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const tabIcon = (name) => ({ focused, color, size }) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />
);

const tabOptions = {
  tabBarActiveTintColor: '#2e7d32',
  tabBarInactiveTintColor: '#888',
  tabBarStyle: { paddingBottom: 5, height: 60 },
  headerShown: false
};

// ─── FARMER TABS ───
function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Home" component={FarmerHome}
        options={{ tabBarIcon: tabIcon('home'), tabBarLabel: 'Home' }} />
      <Tab.Screen name="Scan" component={CropScanScreen}
        options={{ tabBarIcon: tabIcon('camera'), tabBarLabel: 'Scan' }} />
      <Tab.Screen name="History" component={CropHistoryScreen}
        options={{ tabBarIcon: tabIcon('list'), tabBarLabel: 'History' }} />
      <Tab.Screen name="Weather" component={WeatherScreen}
        options={{ tabBarIcon: tabIcon('partly-sunny'), tabBarLabel: 'Weather' }} />
      <Tab.Screen name="Community" component={CommunityFeedScreen}
        options={{ tabBarIcon: tabIcon('people'), tabBarLabel: 'Community' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('person'), tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── VILLAGER TABS ───
function VillagerTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Home" component={VillagerHome}
        options={{ tabBarIcon: tabIcon('home'), tabBarLabel: 'Home' }} />
      <Tab.Screen name="Health" component={SymptomCheckScreen}
        options={{ tabBarIcon: tabIcon('medical'), tabBarLabel: 'Symptoms' }} />
      <Tab.Screen name="Family" component={HealthCardScreen}
        options={{ tabBarIcon: tabIcon('people'), tabBarLabel: 'Family' }} />
      <Tab.Screen name="Doctor" component={ConsultDoctorScreen}
        options={{ tabBarIcon: tabIcon('videocam'), tabBarLabel: 'Doctor' }} />
      <Tab.Screen name="Community" component={CommunityFeedScreen}
        options={{ tabBarIcon: tabIcon('chatbubbles'), tabBarLabel: 'Community' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('person'), tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── GRAM SEVAK TABS ───
function GramSevakTabs() {
  return (
    <Tab.Navigator screenOptions={{
      ...tabOptions,
      tabBarActiveTintColor: '#c62828'
    }}>
      <Tab.Screen name="Home" component={GramSevakHome}
        options={{ tabBarIcon: tabIcon('home'), tabBarLabel: 'Home' }} />
      <Tab.Screen name="Reports" component={VillageReportsScreen}
        options={{ tabBarIcon: tabIcon('document-text'), tabBarLabel: 'Reports' }} />
      <Tab.Screen name="Epidemic" component={EpidemicAlertScreen}
        options={{ tabBarIcon: tabIcon('warning'), tabBarLabel: 'Alerts' }} />
      <Tab.Screen name="Community" component={CommunityFeedScreen}
        options={{ tabBarIcon: tabIcon('chatbubbles'), tabBarLabel: 'Community' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('person'), tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── DOCTOR TABS ───
function DoctorTabs() {
  return (
    <Tab.Navigator screenOptions={{
      ...tabOptions,
      tabBarActiveTintColor: '#6a1b9a'
    }}>
      <Tab.Screen name="Home" component={DoctorHome}
        options={{ tabBarIcon: tabIcon('home'), tabBarLabel: 'Home' }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen}
        options={{ tabBarIcon: tabIcon('calendar'), tabBarLabel: 'Appointments' }} />
      <Tab.Screen name="Community" component={CommunityFeedScreen}
        options={{ tabBarIcon: tabIcon('chatbubbles'), tabBarLabel: 'Community' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('person'), tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── MAIN NAVIGATOR ───
export default function AppNavigator() {
  const { user } = useAuth();

  // FARMER — no chat needed
  if (user?.role === 'farmer') {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={FarmerTabs} />
      <Stack.Screen name="NearbyHealthCenters" component={NearbyHealthCentersScreen} />
    </Stack.Navigator>
  );
}

  // VILLAGER — needs Chat screen
  // VILLAGER — needs Chat + History + Reminders + Nearby
if (user?.role === 'villager') {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={VillagerTabs} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="HealthHistory" component={HealthHistoryScreen} />
      <Stack.Screen name="MedicineReminders" component={MedicineReminderScreen} />
      <Stack.Screen name="NearbyHealthCenters" component={NearbyHealthCentersScreen} />
    </Stack.Navigator>
  );
}

  // GRAM SEVAK — no chat needed
  if (user?.role === 'gramsevak') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={GramSevakTabs} />
      </Stack.Navigator>
    );
  }

  // DOCTOR — needs Chat + PatientHistory screens
  if (user?.role === 'doctor') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={DoctorTabs} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="PatientHistory" component={PatientHistoryScreen} />
      </Stack.Navigator>
    );
  }
}