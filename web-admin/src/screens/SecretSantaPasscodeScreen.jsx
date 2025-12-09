/**
 * SecretSantaPasscodeScreen
 *
 * Public screen for entering Secret Santa passcode.
 * No authentication required - anyone with a passcode can access.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import config from '../config/env';

export default function SecretSantaPasscodeScreen({ route, navigation }) {
  const { webToken } = route.params || {};
  const theme = useTheme();

  const [eventInfo, setEventInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [verifyError, setVerifyError] = useState(null);

  // Fetch basic event info
  useEffect(() => {
    async function fetchEventInfo() {
      if (!webToken) {
        setError('No Secret Santa event specified');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${config.api.url}/secret-santa/${webToken}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Event not found');
        } else {
          setEventInfo(data);
        }
      } catch (err) {
        console.error('Error fetching event info:', err);
        setError('Failed to load event information');
      } finally {
        setLoading(false);
      }
    }

    fetchEventInfo();
  }, [webToken]);

  const handleVerify = async () => {
    if (!email.trim() || !passcode.trim()) {
      setVerifyError('Please enter both email and access code');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const response = await fetch(`${config.api.url}/secret-santa/${webToken}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), passcode: passcode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerifyError(data.message || 'Invalid email or access code');
        return;
      }

      // Navigate to the main Secret Santa view with credentials
      navigation.replace('SecretSantaView', {
        webToken,
        email: email.trim(),
        passcode: passcode.trim().toUpperCase(),
      });
    } catch (err) {
      console.error('Verification error:', err);
      setVerifyError('Failed to verify access. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Secret Santa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.santaEmoji}>🎅</Text>
          <Text style={styles.title}>{eventInfo?.eventName || 'Secret Santa'}</Text>
          {eventInfo?.occasion && (
            <Text style={styles.occasion}>{eventInfo.occasion}</Text>
          )}
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            {eventInfo?.exchangeDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gift Exchange:</Text>
                <Text style={styles.infoValue}>{formatDate(eventInfo.exchangeDate)}</Text>
              </View>
            )}
            {eventInfo?.priceLimit && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Budget:</Text>
                <Text style={styles.infoValue}>${parseFloat(eventInfo.priceLimit).toFixed(2)}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.loginCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Enter Your Details</Text>
            <Text style={styles.cardSubtitle}>
              Use the email and access code from your invitation
            </Text>

            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Access Code"
              value={passcode}
              onChangeText={(text) => setPasscode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              style={styles.input}
            />

            {verifyError && (
              <Text style={styles.verifyError}>{verifyError}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={verifying}
              disabled={verifying || !email.trim() || !passcode.trim()}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              View Secret Santa
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.footer}>
          Remember - keep it a surprise! 🤫
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#c41e3a', // Christmas red
  },
  content: {
    flex: 1,
    padding: 20,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#c41e3a',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  santaEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  occasion: {
    fontSize: 18,
    color: '#ffcccc',
    marginTop: 8,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  loginCard: {
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  verifyError: {
    color: '#c41e3a',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#c41e3a',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontStyle: 'italic',
  },
});
