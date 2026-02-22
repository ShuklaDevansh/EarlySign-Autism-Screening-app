// App.js
// This is the entry point of the entire React Native app.
// It sets up navigation - the system that lets users move between screens.

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import all 5 screens we created
import HomeScreen from './screens/HomeScreen';
import RecordVideoScreen from './screens/RecordVideoScreen';
import QuestionnaireScreen from './screens/QuestionnaireScreen';
import ResultsScreen from './screens/ResultsScreen';
import HistoryScreen from './screens/HistoryScreen';

// createStackNavigator creates a "stack" of screens
// Think of it like a deck of cards - you put screens on top of each other
// and the user can go back by removing the top card
const Stack = createStackNavigator();

export default function App() {
  return (
    // NavigationContainer wraps everything - it manages the navigation state
    <NavigationContainer>
      {/* Stack.Navigator defines the list of all screens */}
      <Stack.Navigator
        initialRouteName="Home"  // Start on HomeScreen
        screenOptions={{
          // These styles apply to the header bar at the top of every screen
          headerStyle: {
            backgroundColor: '#1a56db',  // Blue header
          },
          headerTintColor: '#ffffff',     // White text in header
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Each Stack.Screen defines one screen in the app */}
        {/* 'name' is what you use with navigation.navigate('Name') */}
        {/* 'component' is the screen component to show */}
        
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Autism Screening' }}
        />
        <Stack.Screen 
          name="RecordVideo" 
          component={RecordVideoScreen} 
          options={{ title: 'Record Video' }}
        />
        <Stack.Screen 
          name="Questionnaire" 
          component={QuestionnaireScreen} 
          options={{ title: 'M-CHAT-R Questionnaire' }}
        />
        <Stack.Screen 
          name="Results" 
          component={ResultsScreen} 
          options={{ title: 'Screening Results' }}
        />
        <Stack.Screen 
          name="History" 
          component={HistoryScreen} 
          options={{ title: 'History' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
