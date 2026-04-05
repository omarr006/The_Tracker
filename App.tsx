import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from './src/services/supabase';

export default function App() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');

  const testConnection = async () => {
    setTesting(true);
    setResult('');
    
    try {
      const { data, error } = await supabase.from('_health').select('*').limit(1);
      
      if (error) {
        setResult('❌ Not connected');
      } else {
        setResult('✅ Connected!');
      }
    } catch (e) {
      setResult('❌ No config');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏋️ The Tracker</Text>
      <Text style={styles.subtitle}>AI Workout Coach</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={testConnection}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#0a0e27" />
        ) : (
          <Text style={styles.buttonText}>Ping Backend</Text>
        )}
      </TouchableOpacity>
      
      {result ? <Text style={styles.result}>{result}</Text> : null}
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64ffda',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#64ffda',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  result: {
    marginTop: 20,
    fontSize: 18,
    color: '#fff',
  },
});
