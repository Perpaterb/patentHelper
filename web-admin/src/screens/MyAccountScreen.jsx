/**
 * My Account Screen
 *
 * Admin-only screen for viewing account info and storage details.
 * React Native Paper version for web-admin.
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  Surface,
} from 'react-native-paper';
// Note: Button, Paragraph kept for potential future use with error handling
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export default function MyAccountScreen({ navigation }) {
  const { user } = useKindeAuth();
  const [error, setError] = useState(null);

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
  card: {
    marginBottom: 24,
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
});
