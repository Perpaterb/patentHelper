/**
 * Storage Screen
 *
 * Admin-only screen for viewing and managing storage usage.
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
  ProgressBar,
  Divider,
} from 'react-native-paper';
import api from '../services/api';

export default function StorageScreen({ navigation }) {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStorage();
  }, []);

  async function fetchStorage() {
    try {
      const response = await api.get('/storage/usage');
      setStorage(response.data.storage);
    } catch (err) {
      console.error('Failed to fetch storage:', err);
      setError('Failed to load storage information');
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getUsageColor(percentage) {
    if (percentage >= 90) return '#d32f2f';
    if (percentage >= 70) return '#ff9800';
    return '#4caf50';
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const usagePercentage = storage
    ? (storage.usedBytes / storage.totalBytes) * 100
    : 0;

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
        <Title style={styles.headerTitle}>Storage</Title>
        <View style={{ width: 80 }} />
      </View>

      {error ? (
        <Surface style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchStorage}>
            Retry
          </Button>
        </Surface>
      ) : storage ? (
        <>
          {/* Usage Overview */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Storage Usage</Title>
              <Divider style={styles.divider} />
              <View style={styles.usageContainer}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageText}>
                    {formatBytes(storage.usedBytes)} of {formatBytes(storage.totalBytes)} used
                  </Text>
                  <Text style={[styles.usagePercent, { color: getUsageColor(usagePercentage) }]}>
                    {usagePercentage.toFixed(1)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={usagePercentage / 100}
                  color={getUsageColor(usagePercentage)}
                  style={styles.progressBar}
                />
              </View>
              {usagePercentage >= 80 && (
                <Surface style={styles.warningBanner}>
                  <Text style={styles.warningText}>
                    {usagePercentage >= 90
                      ? 'Storage almost full! Consider upgrading or removing files.'
                      : 'Storage is getting full. Consider upgrading soon.'}
                  </Text>
                </Surface>
              )}
            </Card.Content>
          </Card>

          {/* Breakdown by Type */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Breakdown</Title>
              <Divider style={styles.divider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Images</Text>
                <Text style={styles.breakdownValue}>
                  {formatBytes(storage.breakdown?.images || 0)}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Videos</Text>
                <Text style={styles.breakdownValue}>
                  {formatBytes(storage.breakdown?.videos || 0)}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Documents</Text>
                <Text style={styles.breakdownValue}>
                  {formatBytes(storage.breakdown?.documents || 0)}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Audit Logs</Text>
                <Text style={styles.breakdownValue}>
                  {formatBytes(storage.breakdown?.logs || 0)}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Storage by Group */}
          {storage.groups?.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Title>By Group</Title>
                <Divider style={styles.divider} />
                {storage.groups.map((group, index) => (
                  <View key={index} style={styles.groupRow}>
                    <Text style={styles.groupName} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.groupUsage}>
                      {formatBytes(group.usedBytes)}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Upgrade Storage */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Need More Storage?</Title>
              <Divider style={styles.divider} />
              <Paragraph>
                Additional storage is available at $2 per 2GB per month.
                Storage is automatically added when you exceed your limit.
              </Paragraph>
              <Button mode="contained" style={styles.button}>
                Manage Storage Plan
              </Button>
            </Card.Content>
          </Card>
        </>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Title>No Storage Data</Title>
            <Paragraph>
              Unable to load storage information at this time.
            </Paragraph>
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
  usageContainer: {
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageText: {
    fontSize: 14,
  },
  usagePercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  warningBanner: {
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 4,
  },
  warningText: {
    color: '#e65100',
    fontSize: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  breakdownLabel: {
    color: '#666',
  },
  breakdownValue: {
    fontWeight: '500',
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupName: {
    flex: 1,
    marginRight: 16,
  },
  groupUsage: {
    fontWeight: '500',
  },
  button: {
    marginTop: 16,
  },
});
