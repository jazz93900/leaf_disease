import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Camera,
  CloudSun,
  ClipboardList,
  Headphones,
} from 'lucide-react-native';

import { AppProvider } from './src/context/AppContext';
import DiagnoseScreen from './src/screens/DiagnoseScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import SupportScreen from './src/screens/SupportScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#f8fafc" />
          <Tab.Navigator
            initialRouteName="Diagnose"
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: '#059669',
              tabBarInactiveTintColor: '#64748b',
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#e2e8f0',
                borderTopWidth: 1,
                paddingBottom: 6,
                paddingTop: 6,
                height: 60,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '700',
              },
              tabBarIcon: ({ color, size, focused }) => {
                const iconSize = focused ? 22 : 20;
                if (route.name === 'Diagnose') {
                  return <Camera size={iconSize} color={color} />;
                } else if (route.name === 'Weather') {
                  return <CloudSun size={iconSize} color={color} />;
                } else if (route.name === 'Questionnaire') {
                  return <ClipboardList size={iconSize} color={color} />;
                } else if (route.name === 'Support') {
                  return <Headphones size={iconSize} color={color} />;
                }
                return null;
              },
            })}
          >
            <Tab.Screen
              name="Diagnose"
              component={DiagnoseScreen}
              options={{ tabBarLabel: 'Scanner' }}
            />
            <Tab.Screen
              name="Weather"
              component={WeatherScreen}
              options={{ tabBarLabel: 'Weather & Risk' }}
            />
            <Tab.Screen
              name="Questionnaire"
              component={QuestionnaireScreen}
              options={{ tabBarLabel: 'Triage Survey' }}
            />
            <Tab.Screen
              name="Support"
              component={SupportScreen}
              options={{ tabBarLabel: 'Help & Support' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
