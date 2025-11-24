/**
 * Web Admin App
 *
 * React Native Web app that shares code with mobile-main.
 * Uses React Navigation and React Native Paper.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { KindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import * as SecureStore from 'expo-secure-store';
import config from './src/config/env';

// Import screens from mobile-main (single source of truth)
import GroupsListScreen from '../mobile-main/src/screens/groups/GroupsListScreen';
import GroupDashboardScreen from '../mobile-main/src/screens/groups/GroupDashboardScreen';
import GroupSettingsScreen from '../mobile-main/src/screens/groups/GroupSettingsScreen';
import CreateGroupScreen from '../mobile-main/src/screens/groups/CreateGroupScreen';
import InvitesScreen from '../mobile-main/src/screens/groups/InvitesScreen';
import InviteMemberScreen from '../mobile-main/src/screens/groups/InviteMemberScreen';
import MessageGroupsListScreen from '../mobile-main/src/screens/groups/MessageGroupsListScreen';
import MessagesScreen from '../mobile-main/src/screens/groups/MessagesScreen';
import CreateMessageGroupScreen from '../mobile-main/src/screens/groups/CreateMessageGroupScreen';
import MessageGroupSettingsScreen from '../mobile-main/src/screens/groups/MessageGroupSettingsScreen';
import MyAccountScreen from '../mobile-main/src/screens/account/MyAccountScreen';

// Import calendar screens
import CalendarScreen from '../mobile-main/src/screens/calendar/CalendarScreen';
import CreateEventScreen from '../mobile-main/src/screens/calendar/CreateEventScreen';
import EditEventScreen from '../mobile-main/src/screens/calendar/EditEventScreen';

// Import finance screens
import FinanceListScreen from '../mobile-main/src/screens/groups/FinanceListScreen';

// Import registry screens
import GiftRegistryListScreen from '../mobile-main/src/screens/groups/GiftRegistryListScreen';
import GiftRegistryDetailScreen from '../mobile-main/src/screens/groups/GiftRegistryDetailScreen';
import ItemRegistryListScreen from '../mobile-main/src/screens/groups/ItemRegistryListScreen';
import ItemRegistryDetailScreen from '../mobile-main/src/screens/groups/ItemRegistryDetailScreen';
import SecretSantaListScreen from '../mobile-main/src/screens/groups/SecretSantaListScreen';
import SecretSantaDetailScreen from '../mobile-main/src/screens/groups/SecretSantaDetailScreen';
import CreateSecretSantaScreen from '../mobile-main/src/screens/groups/CreateSecretSantaScreen';

// Import approval screens
import ApprovalsListScreen from '../mobile-main/src/screens/groups/ApprovalsListScreen';
import AutoApproveSettingsScreen from '../mobile-main/src/screens/groups/AutoApproveSettingsScreen';

// Web-only screens (admin features)
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import StorageScreen from './src/screens/StorageScreen';
import AuditLogsScreen from './src/screens/AuditLogsScreen';

const Stack = createStackNavigator();

// Linking configuration for web URLs
const linking = {
  prefixes: ['http://localhost:3001', 'https://familyhelper.app'],
  config: {
    screens: {
      // Public/Admin pages
      Landing: '',
      Login: 'login',
      Subscription: 'subscription',
      Storage: 'storage',
      AuditLogs: 'audit-logs',
      // Mobile app screens with unique URLs
      Groups: 'web-app',
      GroupDashboard: 'web-app/group/:groupId',
      GroupSettings: 'web-app/group/:groupId/settings',
      CreateGroup: 'web-app/create-group',
      Invites: 'web-app/invites',
      InviteMember: 'web-app/group/:groupId/invite',
      MessageGroupsList: 'web-app/group/:groupId/messages',
      Messages: 'web-app/group/:groupId/messages/:messageGroupId',
      CreateMessageGroup: 'web-app/group/:groupId/messages/create',
      MessageGroupSettings: 'web-app/group/:groupId/messages/:messageGroupId/settings',
      Calendar: 'web-app/group/:groupId/calendar',
      CreateEvent: 'web-app/group/:groupId/calendar/create',
      EditEvent: 'web-app/group/:groupId/calendar/:eventId/edit',
      Finance: 'web-app/group/:groupId/finance',
      GiftRegistryList: 'web-app/group/:groupId/gift-registry',
      GiftRegistryDetail: 'web-app/group/:groupId/gift-registry/:registryId',
      ItemRegistryList: 'web-app/group/:groupId/item-registry',
      ItemRegistryDetail: 'web-app/group/:groupId/item-registry/:registryId',
      SecretSantaList: 'web-app/group/:groupId/secret-santa',
      SecretSantaDetail: 'web-app/group/:groupId/secret-santa/:eventId',
      CreateSecretSanta: 'web-app/group/:groupId/secret-santa/create',
      ApprovalsList: 'web-app/group/:groupId/approvals',
      AutoApproveSettings: 'web-app/group/:groupId/approvals/auto-approve',
      MyAccount: 'web-app/my-account',
    },
  },
};

function AppNavigator() {
  const { isAuthenticated, isLoading, getToken, user } = useKindeAuth();
  const [tokenExchanged, setTokenExchanged] = useState(false);

  // Handle token exchange when Kinde authentication completes
  useEffect(() => {
    async function exchangeToken() {
      if (isLoading || !isAuthenticated || tokenExchanged) {
        return;
      }

      try {
        const kindeToken = await getToken();
        if (!kindeToken || !user || !user.email) {
          return;
        }

        const exchangePayload = {
          kindeToken,
          kindeUser: {
            id: user.id,
            email: user.email,
            given_name: user.givenName,
            family_name: user.familyName,
          },
        };

        const response = await fetch(`${config.api.url}/auth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(exchangePayload),
        });

        if (!response.ok) {
          throw new Error('Token exchange failed');
        }

        const data = await response.json();
        if (data.accessToken) {
          await SecureStore.setItemAsync('accessToken', data.accessToken);
          setTokenExchanged(true);
        }
      } catch (error) {
        console.error('Token exchange failed:', error.message);
      }
    }

    exchangeToken();
  }, [isAuthenticated, isLoading, getToken, user, tokenExchanged]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          // Authenticated screens
          <>
            {/* Groups */}
            <Stack.Screen name="Groups" component={GroupsListScreen} />
            <Stack.Screen name="GroupDashboard" component={GroupDashboardScreen} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="Invites" component={InvitesScreen} />
            <Stack.Screen name="InviteMember" component={InviteMemberScreen} />

            {/* Messages */}
            <Stack.Screen name="MessageGroupsList" component={MessageGroupsListScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="CreateMessageGroup" component={CreateMessageGroupScreen} />
            <Stack.Screen name="MessageGroupSettings" component={MessageGroupSettingsScreen} />

            {/* Calendar */}
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="EditEvent" component={EditEventScreen} />

            {/* Finance */}
            <Stack.Screen name="Finance" component={FinanceListScreen} />

            {/* Registries */}
            <Stack.Screen name="GiftRegistryList" component={GiftRegistryListScreen} />
            <Stack.Screen name="GiftRegistryDetail" component={GiftRegistryDetailScreen} />
            <Stack.Screen name="ItemRegistryList" component={ItemRegistryListScreen} />
            <Stack.Screen name="ItemRegistryDetail" component={ItemRegistryDetailScreen} />
            <Stack.Screen name="SecretSantaList" component={SecretSantaListScreen} />
            <Stack.Screen name="SecretSantaDetail" component={SecretSantaDetailScreen} />
            <Stack.Screen name="CreateSecretSanta" component={CreateSecretSantaScreen} />

            {/* Approvals */}
            <Stack.Screen name="ApprovalsList" component={ApprovalsListScreen} />
            <Stack.Screen name="AutoApproveSettings" component={AutoApproveSettingsScreen} />

            {/* Account */}
            <Stack.Screen name="MyAccount" component={MyAccountScreen} />

            {/* Admin-only (web) */}
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="Storage" component={StorageScreen} />
            <Stack.Screen name="AuditLogs" component={AuditLogsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <KindeProvider
      clientId={config.kinde.clientId}
      domain={config.kinde.domain}
      redirectUri={config.kinde.redirectUri}
      logoutUri={config.kinde.logoutRedirectUri}
    >
      <PaperProvider>
        <AppNavigator />
      </PaperProvider>
    </KindeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
