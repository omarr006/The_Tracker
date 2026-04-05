import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';

export default function WorkoutEntryScreen({ navigation }: any) {
  // Input state
  const [workoutText, setWorkoutText] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  // Call Edge Function to parse workout text
  const handleParse = async () => {
    if (!workoutText.trim()) {
      Alert.alert('Error', 'Enter workout text');
      return;
    }

    setLoading(true);
    try {
      // Invoke Supabase Edge Function 'process-workout'
      const res = await supabase.functions.invoke('process-workout', {
        body: JSON.stringify({ raw_text: workoutText, workout_date: workoutDate })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'AI parse failed');
      }

      // Expect validated JSON from function
      setParsedData(json);
    } catch (error: any) {
      Alert.alert('Parse Error', error.message || 'Failed to parse workout');
    } finally {
      setLoading(false);
    }
  };

  // Save confirmed workout to database
  const handleConfirm = async () => {
    if (!parsedData) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: parsedData.workout_date,
          workout_type: parsedData.workout_type,
          duration_minutes: parsedData.duration_minutes,
          raw_input_data: { raw_text: workoutText },
          ai_processed: true,
          ai_summary: parsedData.ai_summary
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Insert exercises
      const exercisesData = parsedData.exercises.map((ex: any) => ({
        workout_id: workout.id,
        exercise_name: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        weight_lbs: ex.weight_lbs
      }));

      const { error: exercisesError } = await supabase
        .from('exercises')
        .insert(exercisesData);

      if (exercisesError) throw exercisesError;

      Alert.alert('Success', 'Workout saved!', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
    } catch (error: any) {
      Alert.alert('Save Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to input mode
  const handleEdit = () => {
    setParsedData(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Log Workout</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      {!parsedData ? (
        // Input mode
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Describe your workout:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 3x10 squats at 135lbs, 4x8 bench at 185lbs"
            placeholderTextColor="#666"
            value={workoutText}
            onChangeText={setWorkoutText}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Date:</Text>
          <TextInput
            style={styles.dateInput}
            value={workoutDate}
            onChangeText={setWorkoutDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleParse}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e27" />
            ) : (
              <Text style={styles.buttonText}>Parse with AI</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Preview mode
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Parsed Workout</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date:</Text>
            <Text style={styles.metaValue}>{parsedData.workout_date}</Text>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Type:</Text>
            <Text style={styles.metaValue}>{parsedData.workout_type}</Text>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Duration:</Text>
            <Text style={styles.metaValue}>{parsedData.duration_minutes} min</Text>
          </View>

          <Text style={styles.sectionTitle}>Exercises</Text>
          {parsedData.exercises.map((ex: any, idx: number) => (
            <View key={idx} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
              <Text style={styles.exerciseDetails}>
                {ex.sets} sets × {ex.reps.join(', ')} reps @ {ex.weight_lbs.join(', ')} lbs
              </Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>AI Summary</Text>
          <Text style={styles.aiSummary}>{parsedData.ai_summary}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleEdit}
            >
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0a0e27" />
              ) : (
                <Text style={styles.buttonText}>Confirm & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    color: '#64ffda',
    fontSize: 16,
  },
  inputContainer: {
    marginTop: 10,
  },
  label: {
    color: '#64ffda',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#2a2f4a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 150,
  },
  dateInput: {
    backgroundColor: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#2a2f4a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#64ffda',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#0a0e27',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#64ffda',
    flex: 1,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#64ffda',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewContainer: {
    marginTop: 10,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#64ffda',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#666',
    fontSize: 16,
    width: 100,
  },
  metaValue: {
    color: '#fff',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64ffda',
    marginTop: 24,
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: '#1a1f3a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseDetails: {
    color: '#aaa',
    fontSize: 14,
  },
  aiSummary: {
    backgroundColor: '#1a1f3a',
    padding: 12,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
});
