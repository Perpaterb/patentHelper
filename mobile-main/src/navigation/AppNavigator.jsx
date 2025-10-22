/**
 * App Navigator
 *
 * Main navigation configuration for the app.
 * Handles authentication state and navigation between screens.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';

const Stack = createNativeStackNavigator();

/**
 * @typedef {Object} AppNavigatorProps
 * @property {boolean} isAuthenticated - Whether user is logged in
 * @property {Function} onLoginSuccess - Callback when login succeeds
 * @property {Function} onLogout - Callback when user logs out
 */

/**
 * AppNavigator component - Main navigation configuration
 *
 * @param {AppNavigatorProps} props
 * @returns {JSX.Element}
 */
export default function AppNavigator({ isAuthenticated, onLoginSuccess, onLogout }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          // Authentication Stack
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
          >
            {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
          </Stack.Screen>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen
              name="Home"
              options={{ title: 'Parenting Helper' }}
            >
              {(props) => <HomeScreen {...props} onLogout={onLogout} />}
            </Stack.Screen>

            {/* Placeholder screens for future implementation */}
            <Stack.Screen
              name="Groups"
              component={PlaceholderScreen}
              options={{ title: 'Message Groups' }}
            />
            <Stack.Screen
              name="Calendar"
              component={PlaceholderScreen}
              options={{ title: 'Shared Calendar' }}
            />
            <Stack.Screen
              name="Finance"
              component={PlaceholderScreen}
              options={{ title: 'Finance Tracker' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * Placeholder screen for features not yet implemented
 */
function PlaceholderScreen({ navigation }) {
  const { Text, View, Button } = require('react-native');
  const styles = require('react-native').StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    text: {
      fontSize: 18,
      marginBottom: 20,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>This feature is coming soon!</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}
