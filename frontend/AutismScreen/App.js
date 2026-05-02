import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import HomeScreen          from './screens/HomeScreen';
import RecordVideoScreen   from './screens/RecordVideoScreen';
import AgeInputScreen      from './screens/AgeInputScreen';
import QuestionnaireScreen from './screens/QuestionnaireScreen';
import ResultsScreen       from './screens/ResultsScreen';
import HistoryScreen       from './screens/HistoryScreen';
import LoginScreen         from './screens/LoginScreen';

const Stack = createStackNavigator();

// Main app navigator — only shown when user is logged in
function MainNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle     : { backgroundColor: '#1a56db' },
        headerTintColor : '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home"          component={HomeScreen}          options={{ title: 'Autism Screening' }} />
      <Stack.Screen name="RecordVideo"   component={RecordVideoScreen}   options={{ title: 'Record Video' }} />
      <Stack.Screen name="AgeInput"      component={AgeInputScreen}      options={{ title: 'Child\'s Age' }} />
      <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} options={{ title: 'Questionnaire' }} />
      <Stack.Screen name="Results"       component={ResultsScreen}       options={{ title: 'Screening Results' }} />
      <Stack.Screen name="History"       component={HistoryScreen}       options={{ title: 'History' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for login/logout events
    // When user logs in → user object is set → MainNavigator shows
    // When user logs out → user is null → LoginScreen shows
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe; // cleanup listener on unmount
  }, []);

  // Show spinner while Firebase checks if user is already logged in
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4ff' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  // Show login if not authenticated, main app if authenticated
  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}