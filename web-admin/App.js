/**
 * Web Admin App
 *
 * React Native Web app that shares code with mobile-main.
 * Uses React Navigation and React Native Paper.
 */

// CRITICAL: Patch Dimensions.get() BEFORE importing any screens
import './src/utils/patchDimensions';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { KindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';
import * as SecureStore from 'expo-secure-store';
import config from './src/config/env';

// Layout components
import AppLayout from './src/components/AppLayout';
import PhoneFrame from './src/components/PhoneFrame';
import { CustomAlertProvider, setGlobalAlertHandler, useCustomAlert } from './src/components/CustomAlert';
// Also import from mobile-main's CustomAlert to set its global handler
import { setGlobalAlertHandler as setMobileGlobalAlertHandler } from '../mobile-main/src/components/CustomAlert';

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
// Mobile app My Account (in phone frame)
import MobileMyAccountScreen from '../mobile-main/src/screens/account/MyAccountScreen';
// Web-admin My Account (different from mobile)
import WebAdminMyAccountScreen from './src/screens/MyAccountScreen';

// Import calendar screens
import CalendarScreen from '../mobile-main/src/screens/calendar/CalendarScreen';
import CreateEventScreen from '../mobile-main/src/screens/calendar/CreateEventScreen';
import CreateChildEventScreen from '../mobile-main/src/screens/calendar/CreateChildEventScreen';
import EditEventScreen from '../mobile-main/src/screens/calendar/EditEventScreen';
import EditChildEventScreen from '../mobile-main/src/screens/calendar/EditChildEventScreen';

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

// Import wiki and documents screens
import WikiScreen from '../mobile-main/src/screens/wiki/WikiScreen';
import DocumentsScreen from '../mobile-main/src/screens/documents/DocumentsScreen';

// Web-only screens (admin features)
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import StorageScreen from './src/screens/StorageScreen';
import AuditLogsScreen from './src/screens/AuditLogsScreen';

const Stack = createStackNavigator();

/**
 * Component to initialize the global alert handler
 * Sets handler on BOTH web-admin and mobile-main's CustomAlert modules
 * since mobile-main screens import their own CustomAlert
 */
function AlertHandlerInitializer() {
  const { showAlert } = useCustomAlert();

  useEffect(() => {
    // Set handler on web-admin's CustomAlert
    setGlobalAlertHandler(showAlert);
    // Also set handler on mobile-main's CustomAlert (used by imported screens)
    setMobileGlobalAlertHandler(showAlert);
  }, [showAlert]);

  return null;
}

// Wrapper to add PhoneFrame around mobile screens
function withPhoneFrame(ScreenComponent) {
  return function WrappedScreen(props) {
    return (
      <PhoneFrame>
        <ScreenComponent {...props} />
      </PhoneFrame>
    );
  };
}

// Wrapper to add AppLayout around admin screens
function withAppLayout(ScreenComponent, routeName) {
  return function WrappedScreen(props) {
    return (
      <AppLayout navigation={props.navigation} currentRoute={routeName}>
        <ScreenComponent {...props} />
      </AppLayout>
    );
  };
}

// Wrapper for mobile screens: AppLayout + PhoneFrame
function withAppLayoutAndPhoneFrame(ScreenComponent, routeName) {
  return function WrappedScreen(props) {
    return (
      <AppLayout navigation={props.navigation} currentRoute={routeName}>
        <PhoneFrame>
          <ScreenComponent {...props} />
        </PhoneFrame>
      </AppLayout>
    );
  };
}

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
      WebAdminMyAccount: 'web-admin-my-account',
      // Mobile app screens with unique URLs
      Groups: 'web-app',
      GroupDashboard: 'web-app/group/:groupId',
      GroupSettings: 'web-app/group/:groupId/settings',
      CreateGroup: 'web-app/create-group',
      Invites: 'web-app/invites',
      InviteMember: 'web-app/group/:groupId/invite',
      MessageGroupsList: 'web-app/group/:groupId/messages',
      GroupMessages: 'web-app/group/:groupId/messages/:messageGroupId',
      CreateMessageGroup: 'web-app/group/:groupId/messages/create',
      MessageGroupSettings: 'web-app/group/:groupId/messages/:messageGroupId/settings',
      Calendar: 'web-app/group/:groupId/calendar',
      CreateEvent: 'web-app/group/:groupId/calendar/create',
      CreateChildEvent: 'web-app/group/:groupId/calendar/create-child',
      EditEvent: 'web-app/group/:groupId/calendar/:eventId/edit',
      EditChildEvent: 'web-app/group/:groupId/calendar/:eventId/edit-child',
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
      Wiki: 'web-app/group/:groupId/wiki',
      Documents: 'web-app/group/:groupId/documents',
      MyAccount: 'my-account',
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
          // Also store refresh token for imported mobile screens that use localStorage-based token storage
          if (data.refreshToken) {
            await SecureStore.setItemAsync('refreshToken', data.refreshToken);
          }
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
          // Auth screens (no layout)
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          // Authenticated screens (with AppLayout)
          <>
            {/* Mobile app screens - AppLayout + PhoneFrame */}
            <Stack.Screen name="Groups" component={withAppLayoutAndPhoneFrame(GroupsListScreen, 'Groups')} />
            <Stack.Screen name="GroupDashboard" component={withAppLayoutAndPhoneFrame(GroupDashboardScreen, 'Groups')} />
            <Stack.Screen name="GroupSettings" component={withAppLayoutAndPhoneFrame(GroupSettingsScreen, 'Groups')} />
            <Stack.Screen name="CreateGroup" component={withAppLayoutAndPhoneFrame(CreateGroupScreen, 'Groups')} />
            <Stack.Screen name="Invites" component={withAppLayoutAndPhoneFrame(InvitesScreen, 'Groups')} />
            <Stack.Screen name="InviteMember" component={withAppLayoutAndPhoneFrame(InviteMemberScreen, 'Groups')} />

            {/* Messages */}
            <Stack.Screen name="MessageGroupsList" component={withAppLayoutAndPhoneFrame(MessageGroupsListScreen, 'Groups')} />
            <Stack.Screen name="GroupMessages" component={withAppLayoutAndPhoneFrame(MessagesScreen, 'Groups')} />
            <Stack.Screen name="CreateMessageGroup" component={withAppLayoutAndPhoneFrame(CreateMessageGroupScreen, 'Groups')} />
            <Stack.Screen name="MessageGroupSettings" component={withAppLayoutAndPhoneFrame(MessageGroupSettingsScreen, 'Groups')} />

            {/* Calendar */}
            <Stack.Screen name="Calendar" component={withAppLayoutAndPhoneFrame(CalendarScreen, 'Groups')} />
            <Stack.Screen name="CreateEvent" component={withAppLayoutAndPhoneFrame(CreateEventScreen, 'Groups')} />
            <Stack.Screen name="CreateChildEvent" component={withAppLayoutAndPhoneFrame(CreateChildEventScreen, 'Groups')} />
            <Stack.Screen name="EditEvent" component={withAppLayoutAndPhoneFrame(EditEventScreen, 'Groups')} />
            <Stack.Screen name="EditChildEvent" component={withAppLayoutAndPhoneFrame(EditChildEventScreen, 'Groups')} />

            {/* Finance */}
            <Stack.Screen name="Finance" component={withAppLayoutAndPhoneFrame(FinanceListScreen, 'Groups')} />

            {/* Registries */}
            <Stack.Screen name="GiftRegistryList" component={withAppLayoutAndPhoneFrame(GiftRegistryListScreen, 'Groups')} />
            <Stack.Screen name="GiftRegistryDetail" component={withAppLayoutAndPhoneFrame(GiftRegistryDetailScreen, 'Groups')} />
            <Stack.Screen name="ItemRegistryList" component={withAppLayoutAndPhoneFrame(ItemRegistryListScreen, 'Groups')} />
            <Stack.Screen name="ItemRegistryDetail" component={withAppLayoutAndPhoneFrame(ItemRegistryDetailScreen, 'Groups')} />
            <Stack.Screen name="SecretSantaList" component={withAppLayoutAndPhoneFrame(SecretSantaListScreen, 'Groups')} />
            <Stack.Screen name="SecretSantaDetail" component={withAppLayoutAndPhoneFrame(SecretSantaDetailScreen, 'Groups')} />
            <Stack.Screen name="CreateSecretSanta" component={withAppLayoutAndPhoneFrame(CreateSecretSantaScreen, 'Groups')} />

            {/* Approvals */}
            <Stack.Screen name="ApprovalsList" component={withAppLayoutAndPhoneFrame(ApprovalsListScreen, 'Groups')} />
            <Stack.Screen name="AutoApproveSettings" component={withAppLayoutAndPhoneFrame(AutoApproveSettingsScreen, 'Groups')} />

            {/* Wiki and Documents */}
            <Stack.Screen name="Wiki" component={withAppLayoutAndPhoneFrame(WikiScreen, 'Groups')} />
            <Stack.Screen name="Documents" component={withAppLayoutAndPhoneFrame(DocumentsScreen, 'Groups')} />

            {/* Mobile app My Account - in phone frame */}
            <Stack.Screen name="MyAccount" component={withAppLayoutAndPhoneFrame(MobileMyAccountScreen, 'Groups')} />

            {/* Web-admin My Account - no phone frame */}
            <Stack.Screen name="WebAdminMyAccount" component={withAppLayout(WebAdminMyAccountScreen, 'MyAccount')} />

            {/* Admin-only screens - AppLayout only (no phone frame) */}
            <Stack.Screen name="Subscription" component={withAppLayout(SubscriptionScreen, 'Subscription')} />
            <Stack.Screen name="Storage" component={withAppLayout(StorageScreen, 'Storage')} />
            <Stack.Screen name="AuditLogs" component={withAppLayout(AuditLogsScreen, 'AuditLogs')} />
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
        <CustomAlertProvider>
          <AlertHandlerInitializer />
          <AppNavigator />
        </CustomAlertProvider>
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
