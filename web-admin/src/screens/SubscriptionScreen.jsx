/**
 * Subscription Screen
 *
 * Admin-only screen for managing subscription and billing.
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
import api from '../services/api';

export default function SubscriptionScreen({ navigation }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatPrice(amount, currency) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'AUD',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          icon="arrow-left"
        >
          Back
        </Button>
        <Title style={styles.headerTitle}>Subscription</Title>
        <View style={{ width: 80 }} />
      </View>

      {error ? (
        <Surface style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchSubscription}>
            Retry
          </Button>
        </Surface>
      ) : subscription ? (
        <>
          {/* Current Plan */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Current Plan</Title>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Plan:</Text>
                <Text style={styles.value}>{subscription.planName || 'Admin Subscription'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <Text style={[styles.value, styles.statusActive]}>
                  {subscription.status || 'Active'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Amount:</Text>
                <Text style={styles.value}>
                  {formatPrice(subscription.amount || 999, subscription.currency || 'aud')} / {subscription.interval || 'month'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Next Billing:</Text>
                <Text style={styles.value}>
                  {formatDate(subscription.currentPeriodEnd)}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Payment Method */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Payment Method</Title>
              <Divider style={styles.divider} />
              {subscription.paymentMethod ? (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>Card:</Text>
                    <Text style={styles.value}>
                      **** **** **** {subscription.paymentMethod.last4}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Expires:</Text>
                    <Text style={styles.value}>
                      {subscription.paymentMethod.expMonth}/{subscription.paymentMethod.expYear}
                    </Text>
                  </View>
                </>
              ) : (
                <Paragraph>No payment method on file</Paragraph>
              )}
              <Button mode="outlined" style={styles.button}>
                Update Payment Method
              </Button>
            </Card.Content>
          </Card>

          {/* Billing History */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Billing History</Title>
              <Divider style={styles.divider} />
              {subscription.invoices?.length > 0 ? (
                subscription.invoices.map((invoice, index) => (
                  <View key={index} style={styles.invoiceRow}>
                    <Text>{formatDate(invoice.date)}</Text>
                    <Text>{formatPrice(invoice.amount, invoice.currency)}</Text>
                    <Text style={styles.invoiceStatus}>{invoice.status}</Text>
                  </View>
                ))
              ) : (
                <Paragraph>No billing history available</Paragraph>
              )}
            </Card.Content>
          </Card>

          {/* Cancel Subscription */}
          <Card style={[styles.card, styles.dangerCard]}>
            <Card.Content>
              <Title>Cancel Subscription</Title>
              <Divider style={styles.divider} />
              <Paragraph style={styles.warningText}>
                Canceling your subscription will remove admin access at the end of your current billing period.
                Your groups and data will be preserved but you won't be able to manage them.
              </Paragraph>
              <Button mode="outlined" textColor="#d32f2f" style={styles.dangerButton}>
                Cancel Subscription
              </Button>
            </Card.Content>
          </Card>
        </>
      ) : (
        /* No Subscription */
        <Card style={styles.card}>
          <Card.Content>
            <Title>No Active Subscription</Title>
            <Paragraph>
              You need an active subscription to manage groups as an admin.
            </Paragraph>
            <Button mode="contained" style={styles.button}>
              Subscribe Now
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  errorCard: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '500',
  },
  statusActive: {
    color: '#4caf50',
  },
  button: {
    marginTop: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  invoiceStatus: {
    textTransform: 'capitalize',
  },
  dangerCard: {
    marginBottom: 32,
  },
  warningText: {
    color: '#666',
    marginBottom: 16,
  },
  dangerButton: {
    borderColor: '#d32f2f',
  },
});
