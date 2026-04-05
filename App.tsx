import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutEntryScreen from './src/screens/WorkoutEntryScreen';

// Create stack navigator for screen routing
const Stack = createNativeStackNavigator();

export default function App() {
  // Main app entry: sets up navigation
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth, Dashboard, and Workout Entry screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="WorkoutEntry" component={WorkoutEntryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
