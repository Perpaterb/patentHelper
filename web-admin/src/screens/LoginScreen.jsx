/**
 * Login Screen
 *
 * Simple login screen that triggers Kinde authentication.
 * React Native version for web-admin.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface, ActivityIndicator } from 'react-native-paper';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export default function LoginScreen({ navigation }) {
  const { login, isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigation.navigate('Groups');
    }
  }, [isAuthenticated, isLoading, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.card}>
        <Text style={styles.logo}>Family Helper</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to manage your family groups
        </Text>
        <Button
          mode="contained"
          onPress={() => login()}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Sign In
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Landing')}
          style={styles.backButton}
        >
          Back to Home
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
  buttonLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
  backButton: {
    marginTop: 8,
  },
});
