/**
 * Subscription Screen
 *
 * Admin-only screen for managing subscription and billing.
 * React Native Paper version for web-admin.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking } from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  Surface,
  ActivityIndicator,
  Divider,
  Chip,
  Portal,
  Dialog,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';

export default function SubscriptionScreen({ navigation }) {
  const [pricing, setPricing] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => {
    fetchData();
    checkUrlParams();
  }, []);

  /**
   * Check URL parameters for success/canceled messages
   */
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccessMessage('Subscription successful! Your admin access is now active.');
      // Clean up URL
      window.history.replaceState({}, '', '/subscription');
    }
    if (urlParams.get('canceled') === 'true') {
      setInfoMessage('Checkout canceled. You can subscribe anytime.');
      // Clean up URL
      window.history.replaceState({}, '', '/subscription');
    }
  }

  /**
   * Fetch both pricing and subscription data
   */
  async function fetchData() {
    await Promise.all([fetchPricing(), fetchSubscription()]);
  }

  /**
   * Fetch pricing information from backend
   */
  async function fetchPricing() {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/pricing');
      setPricing(response.data.pricing);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Failed to load pricing information. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetch current subscription status
   */
  async function fetchSubscription() {
    try {
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data.subscription);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      // Don't show error if user just doesn't have a subscription
      if (err.response?.status !== 404) {
        setError('Failed to load subscription information.');
      }
    }
  }

  /**
   * Handle subscription checkout
   * @param {string} priceId - Stripe price ID
   */
  async function handleSubscribe(priceId) {
    try {
      setSubscribing(true);
      setError(null);

      // Create checkout session
      const response = await api.post('/subscriptions/checkout', {
        priceId: priceId,
        successUrl: `${window.location.origin}/subscription?success=true`,
        cancelUrl: `${window.location.origin}/subscription?canceled=true`,
      });

      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Subscription checkout failed:', err);
      setError(err.response?.data?.message || 'Failed to start checkout. Please try again.');
      setSubscribing(false);
    }
  }

  /**
   * Handle subscription cancellation
   */
  async function handleCancel() {
    setShowCancelDialog(false);

    try {
      setCanceling(true);
      setError(null);

      const response = await api.post('/subscriptions/cancel');

      // Refresh subscription data
      await fetchSubscription();

      setSuccessMessage(`Subscription canceled. Access will continue until ${formatDate(response.data.cancelAt)}`);
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError(err.response?.data?.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  }

  /**
   * Handle subscription reactivation
   */
  async function handleReactivate() {
    setShowReactivateDialog(false);

    try {
      setReactivating(true);
      setError(null);

      await api.post('/subscriptions/reactivate');

      // Refresh subscription data
      await fetchSubscription();

      setSuccessMessage('Subscription reactivated successfully!');
    } catch (err) {
      console.error('Reactivation failed:', err);
      setError(err.response?.data?.message || 'Failed to reactivate subscription. Please try again.');
    } finally {
      setReactivating(false);
    }
  }

  /**
   * Format price for display
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code
   * @returns {string} Formatted price with $AUD prefix
   */
  function formatPrice(amount, currency) {
    const formattedAmount = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'AUD',
      minimumFractionDigits: 2,
    }).format(amount / 100);

    // Replace $ with $AUD for clarity
    return formattedAmount.replace('$', '$AUD ');
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Check if user is on free trial
   * @returns {boolean} True if on trial, false otherwise
   */
  function isOnFreeTrial() {
    if (!subscription || subscription.isSubscribed) return false;

    const now = new Date();
    const createdAt = new Date(subscription.createdAt);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 20);

    return now < trialEndDate;
  }

  /**
   * Get trial end date
   * @returns {Date|null} Trial end date or null
   */
  function getTrialEndDate() {
    if (!subscription || !subscription.createdAt) return null;

    const createdAt = new Date(subscription.createdAt);
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 20);

    return trialEndDate;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading pricing information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.pageTitle}>Subscription Management</Title>
        <Paragraph style={styles.pageSubtitle}>
          Choose the plan that best fits your needs. All plans include access to the admin features.
        </Paragraph>

        {/* Error Alert */}
        {error && (
          <Surface style={styles.alertError}>
            <Text style={styles.alertErrorText}>{error}</Text>
            <Button compact onPress={() => setError(null)}>Dismiss</Button>
          </Surface>
        )}

        {/* Success Alert */}
        {successMessage && (
          <Surface style={styles.alertSuccess}>
            <Text style={styles.alertSuccessText}>{successMessage}</Text>
            <Button compact onPress={() => setSuccessMessage(null)}>Dismiss</Button>
          </Surface>
        )}

        {/* Info Alert */}
        {infoMessage && (
          <Surface style={styles.alertInfo}>
            <Text style={styles.alertInfoText}>{infoMessage}</Text>
            <Button compact onPress={() => setInfoMessage(null)}>Dismiss</Button>
          </Surface>
        )}

        {/* Pricing Cards */}
        {pricing && (
          <View style={styles.pricingGrid}>
            {/* Admin Subscription Card */}
            <Card style={[styles.pricingCard, styles.primaryCard]}>
              <Card.Content>
                <Title style={styles.cardTitle}>{pricing.adminSubscription.name}</Title>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {formatPrice(pricing.adminSubscription.amount, pricing.adminSubscription.currency)}
                  </Text>
                  <Text style={styles.interval}>/{pricing.adminSubscription.interval}</Text>
                </View>
                <Paragraph style={styles.cardDescription}>
                  {pricing.adminSubscription.description}
                </Paragraph>

                <View style={styles.features}>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>Full admin access</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>10GB storage included</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>Audit log exports</Text>
                  </View>
                </View>
              </Card.Content>
              <Card.Actions style={styles.cardActions}>
                {subscription?.isSubscribed ? (
                  <Chip style={styles.activeChip} textStyle={styles.activeChipText}>
                    Active Subscription
                  </Chip>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => handleSubscribe(pricing.adminSubscription.priceId)}
                    loading={subscribing}
                    disabled={subscribing}
                    style={styles.subscribeButton}
                  >
                    Subscribe Now
                  </Button>
                )}
              </Card.Actions>
            </Card>

            {/* Additional Storage Card */}
            <Card style={styles.pricingCard}>
              <Card.Content>
                <Title style={styles.cardTitle}>{pricing.additionalStorage.name}</Title>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {formatPrice(pricing.additionalStorage.amount, pricing.additionalStorage.currency)}
                  </Text>
                  <Text style={styles.interval}>/{pricing.additionalStorage.interval}</Text>
                </View>
                <Paragraph style={styles.cardDescription}>
                  {pricing.additionalStorage.description}
                </Paragraph>

                <View style={styles.features}>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>Additional 2GB storage</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>Store more media files</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>Keep more audit logs</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
                    <Text style={styles.featureText}>Automatically charged as needed</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Current Subscription Status */}
        {(subscription?.isSubscribed || isOnFreeTrial()) && (
          <Card style={styles.statusCard}>
            <Card.Content>
              <Title>Current Subscription</Title>
              <Divider style={styles.divider} />

              <View style={styles.statusGrid}>
                <View style={styles.statusColumn}>
                  <Text style={styles.statusLabel}>Status</Text>
                  <Chip
                    style={[
                      styles.statusChip,
                      isOnFreeTrial() ? styles.chipInfo :
                      subscription.endDate ? styles.chipWarning : styles.chipSuccess
                    ]}
                    textStyle={styles.chipText}
                  >
                    {isOnFreeTrial() ? 'Free Trial' : subscription.endDate ? 'Canceling' : 'Active'}
                  </Chip>

                  <Text style={styles.statusLabel}>Subscription Started</Text>
                  <Text style={styles.statusValue}>{formatDate(subscription.startDate)}</Text>

                  {(subscription.stripe?.currentPeriodEnd || subscription.endDate || isOnFreeTrial()) && (
                    <>
                      <Text style={styles.statusLabel}>
                        {isOnFreeTrial() ? 'Last day of access' : subscription.endDate ? 'Last day of access' : 'Next Billing Date'}
                      </Text>
                      <Text style={styles.statusValue}>
                        {isOnFreeTrial()
                          ? formatDate(getTrialEndDate())
                          : formatDate(subscription.stripe?.currentPeriodEnd || subscription.endDate)}
                      </Text>
                    </>
                  )}
                </View>

                <View style={styles.statusColumn}>
                  <Text style={styles.statusLabel}>Storage Used</Text>
                  <Text style={styles.statusValue}>{subscription.storageUsedGb || '0.00'} GB</Text>

                  {parseFloat(subscription.storageUsedGb || 0) > 10 && (
                    <>
                      <Text style={styles.statusLabel}>Additional Storage Charges</Text>
                      <Text style={styles.statusValue}>
                        {Math.ceil((parseFloat(subscription.storageUsedGb) - 10) / 2)} × $AUD 1.00/month
                      </Text>
                      <Text style={styles.storageNote}>
                        ({(parseFloat(subscription.storageUsedGb) - 10).toFixed(2)} GB over base 10GB)
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Cancel or Reactivate Button - Hidden for trial users */}
              {!isOnFreeTrial() && (
                <View style={styles.actionSection}>
                  <Divider style={styles.divider} />
                  {subscription.endDate ? (
                    // Show Reactivate button if subscription is canceled but still active
                    <>
                      <Button
                        mode="outlined"
                        onPress={() => setShowReactivateDialog(true)}
                        loading={reactivating}
                        disabled={reactivating}
                        style={styles.reactivateButton}
                        textColor="#4caf50"
                      >
                        Reactivate Subscription
                      </Button>
                      <Text style={styles.actionNote}>
                        Keep your access active by reactivating your subscription
                      </Text>
                    </>
                  ) : (
                    // Show Cancel button if subscription is active
                    <>
                      <Button
                        mode="outlined"
                        onPress={() => setShowCancelDialog(true)}
                        loading={canceling}
                        disabled={canceling}
                        style={styles.cancelButton}
                        textColor="#d32f2f"
                      >
                        Cancel Subscription
                      </Button>
                      <Text style={styles.actionNote}>
                        Access will continue until the end of your current billing period
                      </Text>
                    </>
                  )}
                </View>
              )}

              {/* Cancellation Warning Message */}
              {subscription.endDate && (
                <Surface style={styles.alertWarning}>
                  <Text style={styles.alertWarningText}>
                    Your subscription has been canceled. Your last day of access will be {formatDate(subscription.endDate)}. You can reactivate above to keep your access.
                  </Text>
                </Surface>
              )}
            </Card.Content>
          </Card>
        )}

        {/* No Subscription Message */}
        {!subscription?.isSubscribed && !isOnFreeTrial() && !loading && (
          <Card style={styles.statusCard}>
            <Card.Content>
              <Title>Current Subscription</Title>
              <Divider style={styles.divider} />
              <Paragraph style={styles.noSubText}>
                You don't have an active subscription. Subscribe above to access admin features.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog visible={showCancelDialog} onDismiss={() => setShowCancelDialog(false)}>
          <Dialog.Title>Cancel Subscription?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to cancel your subscription? Access will continue until the end of your current billing period.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)}>No, Keep It</Button>
            <Button onPress={handleCancel} textColor="#d32f2f">Yes, Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Reactivate Dialog */}
      <Portal>
        <Dialog visible={showReactivateDialog} onDismiss={() => setShowReactivateDialog(false)}>
          <Dialog.Title>Reactivate Subscription?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Reactivate your subscription? Your access will continue without interruption.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReactivateDialog(false)}>Cancel</Button>
            <Button onPress={handleReactivate} textColor="#4caf50">Reactivate</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  alertSuccess: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertSuccessText: {
    color: '#2e7d32',
    flex: 1,
  },
  alertInfo: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertInfoText: {
    color: '#1565c0',
    flex: 1,
  },
  alertWarning: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  alertWarningText: {
    color: '#e65100',
  },
  // Pricing cards
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  pricingCard: {
    flex: 1,
    minWidth: 300,
    margin: 8,
  },
  primaryCard: {
    borderWidth: 2,
    borderColor: '#1976d2',
  },
  cardTitle: {
    fontSize: 22,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  interval: {
    fontSize: 16,
    color: '#666',
  },
  cardDescription: {
    color: '#666',
    marginBottom: 16,
  },
  features: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
  },
  cardActions: {
    padding: 16,
    justifyContent: 'center',
  },
  subscribeButton: {
    width: '100%',
  },
  activeChip: {
    backgroundColor: '#e8f5e9',
  },
  activeChipText: {
    color: '#2e7d32',
  },
  // Status card
  statusCard: {
    marginBottom: 24,
  },
  divider: {
    marginVertical: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusColumn: {
    flex: 1,
    minWidth: 200,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  chipSuccess: {
    backgroundColor: '#e8f5e9',
  },
  chipWarning: {
    backgroundColor: '#fff3e0',
  },
  chipInfo: {
    backgroundColor: '#e3f2fd',
  },
  chipText: {
    fontSize: 12,
  },
  storageNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionSection: {
    marginTop: 8,
  },
  cancelButton: {
    borderColor: '#d32f2f',
    alignSelf: 'flex-start',
  },
  reactivateButton: {
    borderColor: '#4caf50',
    alignSelf: 'flex-start',
  },
  actionNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  noSubText: {
    color: '#666',
  },
});
