/**
 * SecretSantaViewScreen
 *
 * Main view for Secret Santa participants.
 * Shows event details, match info, and all gift registries.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  IconButton,
  Dialog,
  Portal,
  TextInput,
  List,
  Divider,
} from 'react-native-paper';
import config from '../config/env';

export default function SecretSantaViewScreen({ route, navigation }) {
  const { webToken, email, passcode } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Registry management state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', link: '', cost: '', description: '' });
  const [addingItem, setAddingItem] = useState(false);
  const [creatingRegistry, setCreatingRegistry] = useState(false);
  const [expandedRegistries, setExpandedRegistries] = useState({});

  // Fetch all Secret Santa data
  const fetchData = useCallback(async () => {
    if (!webToken || !email || !passcode) {
      setError('Missing access credentials');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${config.api.url}/secret-santa/${webToken}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passcode }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Invalid credentials - go back to passcode screen
          navigation.replace('SecretSantaPasscode', { webToken });
          return;
        }
        setError(result.message || 'Failed to load data');
        return;
      }

      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load Secret Santa data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [webToken, email, passcode, navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateRegistry = async () => {
    setCreatingRegistry(true);
    try {
      const response = await fetch(`${config.api.url}/secret-santa/${webToken}/registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passcode }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error creating registry:', err);
    } finally {
      setCreatingRegistry(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim()) return;

    setAddingItem(true);
    try {
      const registryId = data.currentParticipant.giftRegistryId;
      const response = await fetch(
        `${config.api.url}/secret-santa/${webToken}/registry/${registryId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            passcode,
            title: newItem.title.trim(),
            link: newItem.link.trim() || null,
            cost: newItem.cost ? parseFloat(newItem.cost) : null,
            description: newItem.description.trim() || null,
          }),
        }
      );

      if (response.ok) {
        setShowAddItem(false);
        setNewItem({ title: '', link: '', cost: '', description: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Error adding item:', err);
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (registryId, itemId) => {
    try {
      const response = await fetch(
        `${config.api.url}/secret-santa/${webToken}/registry/${registryId}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, passcode }),
        }
      );

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleMarkPurchased = async (registryId, itemId, isPurchased) => {
    try {
      const response = await fetch(
        `${config.api.url}/secret-santa/${webToken}/registry/${registryId}/items/${itemId}/purchase`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, passcode, isPurchased }),
        }
      );

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error marking purchased:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#c41e3a" />
        <Text style={styles.loadingText}>Loading your Secret Santa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          mode="contained"
          onPress={() => navigation.replace('SecretSantaPasscode', { webToken })}
          style={styles.retryButton}
        >
          Try Again
        </Button>
      </View>
    );
  }

  const myRegistry = data.giftRegistries.find(
    r => r.participantId === data.currentParticipant.participantId
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#f5f5f5' }}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.santaEmoji}>🎅</Text>
          <Text style={styles.title}>{data.event.name}</Text>
          <Text style={styles.welcomeText}>
            Welcome, {data.currentParticipant.name}!
          </Text>
        </View>

        {/* Event Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Event Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gift Exchange:</Text>
              <Text style={styles.infoValue}>{formatDate(data.event.exchangeDate)}</Text>
            </View>
            {data.event.priceLimit && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Budget:</Text>
                <Text style={styles.infoValue}>${parseFloat(data.event.priceLimit).toFixed(2)}</Text>
              </View>
            )}
            {data.event.occasion && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Occasion:</Text>
                <Text style={styles.infoValue}>{data.event.occasion}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Match Card - Only show if matches have been assigned */}
        {data.event.isAssigned && data.match ? (
          <Card style={[styles.card, styles.matchCard]}>
            <Card.Content>
              <Text style={styles.matchTitle}>🎁 You're buying for...</Text>
              <Text style={styles.matchName}>{data.match.name}</Text>
              {data.match.hasGiftRegistry && (
                <Text style={styles.matchHint}>
                  Check their gift registry below for ideas!
                </Text>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.waitingTitle}>🎄 Matches Coming Soon!</Text>
              <Text style={styles.waitingText}>
                The organizer hasn't assigned Secret Santa matches yet.
                Check back soon to see who you're buying for!
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* My Gift Registry Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Your Gift Ideas</Text>
              {data.currentParticipant.hasGiftRegistry && (
                <IconButton icon="plus" onPress={() => setShowAddItem(true)} />
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              Add items so others know what you'd like!
            </Text>

            {!data.currentParticipant.hasGiftRegistry ? (
              <Button
                mode="contained"
                onPress={handleCreateRegistry}
                loading={creatingRegistry}
                disabled={creatingRegistry}
                style={styles.createButton}
              >
                Create Your Gift List
              </Button>
            ) : myRegistry && myRegistry.items.length > 0 ? (
              <View style={styles.itemsList}>
                {myRegistry.items.map((item) => (
                  <View key={item.itemId} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.cost && (
                        <Text style={styles.itemCost}>${parseFloat(item.cost).toFixed(2)}</Text>
                      )}
                      {item.description && (
                        <Text style={styles.itemDescription}>{item.description}</Text>
                      )}
                      {item.link && (
                        <Text
                          style={styles.itemLink}
                          onPress={() => Linking.openURL(item.link)}
                        >
                          View Link
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteItem(myRegistry.registryId, item.itemId)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                No items yet. Add some gift ideas!
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* All Gift Registries Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Everyone's Gift Lists</Text>
            <Text style={styles.sectionSubtitle}>
              Tap a name to see their gift ideas
            </Text>

            {data.giftRegistries.filter(r => r.participantId !== data.currentParticipant.participantId).length === 0 ? (
              <Text style={styles.emptyText}>
                No one has added gift ideas yet.
              </Text>
            ) : (
              <List.Section>
                {data.giftRegistries
                  .filter(r => r.participantId !== data.currentParticipant.participantId)
                  .map((registry) => (
                    <List.Accordion
                      key={registry.registryId}
                      title={`${registry.participantName}'s List`}
                      description={`${registry.items.length} item${registry.items.length !== 1 ? 's' : ''}`}
                      left={props => <List.Icon {...props} icon="gift" />}
                      expanded={expandedRegistries[registry.registryId] || false}
                      onPress={() => setExpandedRegistries(prev => ({
                        ...prev,
                        [registry.registryId]: !prev[registry.registryId]
                      }))}
                      style={styles.accordion}
                      titleStyle={styles.accordionTitle}
                    >
                      {registry.items.length === 0 ? (
                        <Text style={styles.emptyRegistryText}>No items yet</Text>
                      ) : (
                        registry.items.map((item) => (
                          <View key={item.itemId} style={styles.otherItemRow}>
                            <View style={styles.itemInfo}>
                              <Text
                                style={[
                                  styles.itemTitle,
                                  item.isPurchased && styles.itemPurchased,
                                ]}
                              >
                                {item.title}
                                {item.isPurchased && ' ✓'}
                              </Text>
                              {item.cost && (
                                <Text style={styles.itemCost}>
                                  ${parseFloat(item.cost).toFixed(2)}
                                </Text>
                              )}
                              {item.description && (
                                <Text style={styles.itemDescription}>{item.description}</Text>
                              )}
                              {item.link && (
                                <Text
                                  style={styles.itemLink}
                                  onPress={() => Linking.openURL(item.link)}
                                >
                                  View Link
                                </Text>
                              )}
                            </View>
                            <Chip
                              mode={item.isPurchased ? 'flat' : 'outlined'}
                              onPress={() =>
                                handleMarkPurchased(
                                  registry.registryId,
                                  item.itemId,
                                  !item.isPurchased
                                )
                              }
                              style={item.isPurchased ? styles.purchasedChip : styles.markPurchasedChip}
                            >
                              {item.isPurchased ? 'Purchased' : 'Mark Purchased'}
                            </Chip>
                          </View>
                        ))
                      )}
                    </List.Accordion>
                  ))}
              </List.Section>
            )}
          </Card.Content>
        </Card>

        {/* Participants List */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Participants</Text>
            <View style={styles.participantsList}>
              {data.participants.map((p) => (
                <Chip
                  key={p.participantId}
                  style={styles.participantChip}
                  icon={p.hasGiftRegistry ? 'gift' : 'account'}
                >
                  {p.name}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="text"
          onPress={handleRefresh}
          loading={refreshing}
          style={styles.refreshButton}
        >
          Refresh Data
        </Button>

        <Text style={styles.footer}>Remember - keep it a surprise! 🤫</Text>
      </View>

      {/* Add Item Dialog */}
      <Portal>
        <Dialog visible={showAddItem} onDismiss={() => setShowAddItem(false)}>
          <Dialog.Title>Add Gift Idea</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Item Name *"
              value={newItem.title}
              onChangeText={(text) => setNewItem({ ...newItem, title: text })}
              style={styles.dialogInput}
            />
            <TextInput
              mode="outlined"
              label="Link (optional)"
              value={newItem.link}
              onChangeText={(text) => setNewItem({ ...newItem, link: text })}
              style={styles.dialogInput}
            />
            <TextInput
              mode="outlined"
              label="Price (optional)"
              value={newItem.cost}
              onChangeText={(text) => setNewItem({ ...newItem, cost: text })}
              keyboardType="numeric"
              style={styles.dialogInput}
            />
            <TextInput
              mode="outlined"
              label="Description (optional)"
              value={newItem.description}
              onChangeText={(text) => setNewItem({ ...newItem, description: text })}
              multiline
              numberOfLines={2}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddItem(false)}>Cancel</Button>
            <Button
              onPress={handleAddItem}
              loading={addingItem}
              disabled={addingItem || !newItem.title.trim()}
            >
              Add Item
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <View style={{ height: 40 }} />
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#c41e3a',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#c41e3a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#c41e3a',
    borderRadius: 16,
    marginBottom: 16,
  },
  santaEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeText: {
    fontSize: 16,
    color: '#ffcccc',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  matchCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  matchTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  matchName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
    marginVertical: 12,
  },
  matchHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#c41e3a',
    marginTop: 8,
  },
  itemsList: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  otherItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemPurchased: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemCost: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginTop: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemLink: {
    fontSize: 14,
    color: '#1976d2',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  registrySection: {
    marginTop: 16,
  },
  registryOwner: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c41e3a',
    marginBottom: 8,
  },
  emptyRegistryText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 16,
    paddingVertical: 12,
  },
  accordion: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  accordionTitle: {
    fontWeight: '600',
  },
  divider: {
    marginTop: 16,
  },
  purchasedChip: {
    backgroundColor: '#4caf50',
  },
  markPurchasedChip: {
    borderColor: '#999',
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  participantChip: {
    marginBottom: 4,
  },
  refreshButton: {
    marginTop: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 24,
    fontSize: 16,
  },
  dialogInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
});
