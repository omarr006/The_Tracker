import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../services/supabase';

export default function DashboardScreen({ navigation }: any) {
  // State for user email
  const [email, setEmail] = useState('');

  // On mount, check if user is logged in
  useEffect(() => {
    checkUser();
  }, []);

  // Fetch current user from Supabase
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
    } else {
      // If not logged in, redirect to Login
      navigation.replace('Login');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏋️ Dashboard</Text>
      <Text style={styles.email}>{email}</Text>
      
      {/* Add workout button */}
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => navigation.navigate('WorkoutEntry')}
      >
        <Text style={styles.addButtonText}>+ Add Workout</Text>
      </TouchableOpacity>

      {/* Placeholder for workout list */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Your workouts will appear here...</Text>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#64ffda',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#64ffda',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#0a0e27',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 18,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
