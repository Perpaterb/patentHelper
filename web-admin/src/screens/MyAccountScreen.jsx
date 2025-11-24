/**
 * My Account Screen
 *
 * Admin-only screen for viewing account info and storage details.
 * React Native Paper version for web-admin.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  Surface,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import api from '../services/api';

export default function MyAccountScreen({ navigation }) {
  const { user } = useKindeAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      if (err.response?.status !== 404) {
        setError('Failed to load account information.');
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calculate additional storage charges
   */
  function calculateAdditionalCharges() {
    if (!subscription || parseFloat(subscription.storageUsedGb) <= 10) {
      return { units: 0, cost: 0, overageGb: 0 };
    }

    const overageGb = parseFloat(subscription.storageUsedGb) - 10;
    const units = Math.ceil(overageGb / 2);
    const cost = units * 1.0;

    return { units, cost, overageGb };
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading account information...</Text>
      </View>
    );
  }

  const additionalCharges = calculateAdditionalCharges();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.pageTitle}>My Account</Title>
        <Paragraph style={styles.pageSubtitle}>
          Manage your account settings and view storage details
        </Paragraph>

        {/* Error Alert */}
        {error && (
          <Surface style={styles.alertError}>
            <Text style={styles.alertErrorText}>{error}</Text>
            <Button compact onPress={() => setError(null)}>Dismiss</Button>
          </Surface>
        )}

        <View style={styles.cardsGrid}>
          {/* Account Information Card */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="account" size={32} color="#1976d2" />
                <Title style={styles.cardTitle}>Account Information</Title>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <MaterialCommunityIcons name="email" size={20} color="#666" />
                  <Text style={styles.labelText}>Email</Text>
                </View>
                <Text style={styles.infoValue}>{user?.email || 'Not available'}</Text>
              </View>

              <Surface style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  Authentication is managed by Kinde with passwordless login. To update your email or
                  security settings, please contact support.
                </Text>
              </Surface>
            </Card.Content>
          </Card>

          {/* Storage Details Card */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="database" size={32} color="#1976d2" />
                <Title style={styles.cardTitle}>Storage Details</Title>
              </View>

              {subscription ? (
                <>
                  <View style={styles.storageDisplay}>
                    <Text style={styles.storageLabel}>Storage Used</Text>
                    <Text style={styles.storageValue}>{subscription.storageUsedGb} GB</Text>
                  </View>

                  {additionalCharges.overageGb > 0 ? (
                    <Surface style={styles.warningBox}>
                      <Text style={styles.warningTitle}>Additional Storage Charges</Text>
                      <Text style={styles.warningText}>
                        {additionalCharges.overageGb.toFixed(2)} GB over base 10GB
                      </Text>
                      <Text style={styles.warningText}>
                        {additionalCharges.units} × $AUD 1.00 = $AUD {additionalCharges.cost.toFixed(2)}/month
                      </Text>
                    </Surface>
                  ) : (
                    <Surface style={styles.successBox}>
                      <Text style={styles.successText}>
                        You're using {subscription.storageUsedGb} GB of your base 10GB storage allocation.
                      </Text>
                    </Surface>
                  )}

                  <Text style={styles.storageNote}>
                    Storage includes audit logs, images, and videos from all groups where you are an
                    admin. Additional storage is automatically charged at $AUD 1.00 per 2GB per month.
                  </Text>
                </>
              ) : (
                <Text style={styles.loadingText}>Loading storage information...</Text>
              )}
            </Card.Content>
          </Card>
        </View>

        {/* Need Help Card */}
        <Card style={styles.helpCard}>
          <Card.Content>
            <Title>Need Help?</Title>
            <Paragraph style={styles.helpText}>
              For account support, subscription changes, or technical issues, please contact our support team.
            </Paragraph>
            <Button mode="outlined" style={styles.supportButton}>
              Contact Support
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  pageTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  pageSubtitle: {
    color: '#666',
    marginBottom: 24,
  },
  // Alert styles
  alertError: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertErrorText: {
    color: '#c62828',
    flex: 1,
  },
  // Cards grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    minWidth: 300,
    margin: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    marginLeft: 8,
  },
  // Account info
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoBoxText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  // Storage display
  storageDisplay: {
    marginBottom: 24,
  },
  storageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  storageValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  warningText: {
    marginBottom: 4,
  },
  successBox: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#2e7d32',
  },
  storageNote: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  // Help card
  helpCard: {
    marginBottom: 24,
  },
  helpText: {
    color: '#666',
    marginBottom: 16,
  },
  supportButton: {
    alignSelf: 'flex-start',
  },
});
