/**
 * App Navigator
 *
 * Main navigation configuration for the app.
 * Handles authentication state and navigation between screens.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MyAccountScreen from '../screens/account/MyAccountScreen';
import PersonalGiftRegistriesScreen from '../screens/account/PersonalGiftRegistriesScreen';
import PersonalItemRegistriesScreen from '../screens/account/PersonalItemRegistriesScreen';
import AddEditPersonalGiftRegistryScreen from '../screens/account/AddEditPersonalGiftRegistryScreen';
import AddEditPersonalItemRegistryScreen from '../screens/account/AddEditPersonalItemRegistryScreen';
import PersonalGiftRegistryDetailScreen from '../screens/account/PersonalGiftRegistryDetailScreen';
import PersonalItemRegistryDetailScreen from '../screens/account/PersonalItemRegistryDetailScreen';
import AddEditPersonalGiftItemScreen from '../screens/account/AddEditPersonalGiftItemScreen';
import AddEditPersonalItemRegistryItemScreen from '../screens/account/AddEditPersonalItemRegistryItemScreen';
import GroupsListScreen from '../screens/groups/GroupsListScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDashboardScreen from '../screens/groups/GroupDashboardScreen';
import GroupSettingsScreen from '../screens/groups/GroupSettingsScreen';
import InviteMemberScreen from '../screens/groups/InviteMemberScreen';
import InvitesScreen from '../screens/groups/InvitesScreen';
import MessageGroupsListScreen from '../screens/groups/MessageGroupsListScreen';
import CreateMessageGroupScreen from '../screens/groups/CreateMessageGroupScreen';
import MessagesScreen from '../screens/groups/MessagesScreen';
import MessageGroupSettingsScreen from '../screens/groups/MessageGroupSettingsScreen';
import ApprovalsListScreen from '../screens/groups/ApprovalsListScreen';
import AutoApproveSettingsScreen from '../screens/groups/AutoApproveSettingsScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import CreateEventScreen from '../screens/calendar/CreateEventScreen';
import CreateChildEventScreen from '../screens/calendar/CreateChildEventScreen';
import EditEventScreen from '../screens/calendar/EditEventScreen';
import EditChildEventScreen from '../screens/calendar/EditChildEventScreen';
import FinanceListScreen from '../screens/groups/FinanceListScreen';
import CreateFinanceMatterScreen from '../screens/finance/CreateFinanceMatterScreen';
import FinanceMatterDetailsScreen from '../screens/finance/FinanceMatterDetailsScreen';
import GiftRegistryListScreen from '../screens/groups/GiftRegistryListScreen';
import GiftRegistryDetailScreen from '../screens/groups/GiftRegistryDetailScreen';
import AddEditRegistryScreen from '../screens/groups/AddEditRegistryScreen';
import AddEditGiftItemScreen from '../screens/groups/AddEditGiftItemScreen';
import ItemRegistryListScreen from '../screens/groups/ItemRegistryListScreen';
import ItemRegistryDetailScreen from '../screens/groups/ItemRegistryDetailScreen';
import AddEditItemRegistryScreen from '../screens/groups/AddEditItemRegistryScreen';
import AddEditItemScreen from '../screens/groups/AddEditItemScreen';
import SecretSantaListScreen from '../screens/groups/SecretSantaListScreen';
import CreateSecretSantaScreen from '../screens/groups/CreateSecretSantaScreen';
import SecretSantaDetailScreen from '../screens/groups/SecretSantaDetailScreen';
import WikiScreen from '../screens/wiki/WikiScreen';
import DocumentsScreen from '../screens/documents/DocumentsScreen';
import PhoneCallsScreen from '../screens/groups/PhoneCallsScreen';
import InitiatePhoneCallScreen from '../screens/groups/InitiatePhoneCallScreen';
import PhoneCallDetailsScreen from '../screens/groups/PhoneCallDetailsScreen';
import ActivePhoneCallScreen from '../screens/groups/ActivePhoneCallScreen';
import VideoCallsScreen from '../screens/groups/VideoCallsScreen';
import InitiateVideoCallScreen from '../screens/groups/InitiateVideoCallScreen';
import VideoCallDetailsScreen from '../screens/groups/VideoCallDetailsScreen';
import ActiveVideoCallScreen from '../screens/groups/ActiveVideoCallScreen';
import IncomingCallHandler from '../components/IncomingCallHandler';

const Stack = createNativeStackNavigator();

/**
 * @typedef {Object} AppNavigatorProps
 * @property {boolean} isAuthenticated - Whether user is logged in
 * @property {Function} onLoginSuccess - Callback when login succeeds
 * @property {Function} onLogout - Callback when user logs out
 */

/**
 * AppNavigator component - Main navigation configuration
 *
 * @param {AppNavigatorProps} props
 * @returns {JSX.Element}
 */
export default function AppNavigator({ isAuthenticated, onLoginSuccess, onLogout }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // Hide React Navigation's default header - we use custom header in screens
        }}
      >
        {!isAuthenticated ? (
          // Authentication Stack
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
          >
            {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
          </Stack.Screen>
        ) : (
          // Main App Stack
          <>
            {/* Groups Stack - Default Screen */}
            <Stack.Screen
              name="Groups"
              component={GroupsListScreen}
            />
            <Stack.Screen name="MyAccount" component={MyAccountScreen} />
            <Stack.Screen name="PersonalGiftRegistries" component={PersonalGiftRegistriesScreen} />
            <Stack.Screen name="PersonalItemRegistries" component={PersonalItemRegistriesScreen} />
            <Stack.Screen name="AddEditPersonalGiftRegistry" component={AddEditPersonalGiftRegistryScreen} />
            <Stack.Screen name="AddEditPersonalItemRegistry" component={AddEditPersonalItemRegistryScreen} />
            <Stack.Screen name="PersonalGiftRegistryDetail" component={PersonalGiftRegistryDetailScreen} />
            <Stack.Screen name="PersonalItemRegistryDetail" component={PersonalItemRegistryDetailScreen} />
            <Stack.Screen name="AddEditPersonalGiftItem" component={AddEditPersonalGiftItemScreen} />
            <Stack.Screen name="AddEditPersonalItemRegistryItem" component={AddEditPersonalItemRegistryItemScreen} />
            <Stack.Screen name="Invites" component={InvitesScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupDashboard" component={GroupDashboardScreen} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
            <Stack.Screen name="InviteMember" component={InviteMemberScreen} />
            <Stack.Screen name="MessageGroupsList" component={MessageGroupsListScreen} />
            <Stack.Screen name="CreateMessageGroup" component={CreateMessageGroupScreen} />
            <Stack.Screen name="GroupMessages" component={MessagesScreen} />
            <Stack.Screen name="MessageGroupSettings" component={MessageGroupSettingsScreen} />

            {/* Approvals */}
            <Stack.Screen name="ApprovalsList" component={ApprovalsListScreen} />
            <Stack.Screen name="AutoApproveSettings" component={AutoApproveSettingsScreen} />

            {/* Calendar */}
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="CreateChildEvent" component={CreateChildEventScreen} />
            <Stack.Screen name="EditEvent" component={EditEventScreen} />
            <Stack.Screen name="EditChildEvent" component={EditChildEventScreen} />

            {/* Finance */}
            <Stack.Screen name="Finance" component={FinanceListScreen} />
            <Stack.Screen name="CreateFinanceMatter" component={CreateFinanceMatterScreen} />
            <Stack.Screen name="FinanceMatterDetails" component={FinanceMatterDetailsScreen} />

            {/* Gift Registry */}
            <Stack.Screen name="GiftRegistryList" component={GiftRegistryListScreen} />
            <Stack.Screen name="GiftRegistryDetail" component={GiftRegistryDetailScreen} />
            <Stack.Screen name="AddEditRegistry" component={AddEditRegistryScreen} />
            <Stack.Screen name="AddEditGiftItem" component={AddEditGiftItemScreen} />

            {/* Item Registry */}
            <Stack.Screen name="ItemRegistryList" component={ItemRegistryListScreen} />
            <Stack.Screen name="ItemRegistryDetail" component={ItemRegistryDetailScreen} />
            <Stack.Screen name="AddEditItemRegistry" component={AddEditItemRegistryScreen} />
            <Stack.Screen name="AddEditItem" component={AddEditItemScreen} />

            {/* Secret Santa */}
            <Stack.Screen name="SecretSantaList" component={SecretSantaListScreen} />
            <Stack.Screen name="CreateSecretSanta" component={CreateSecretSantaScreen} />
            <Stack.Screen name="SecretSantaDetail" component={SecretSantaDetailScreen} />

            {/* Wiki */}
            <Stack.Screen name="Wiki" component={WikiScreen} />

            {/* Documents */}
            <Stack.Screen name="Documents" component={DocumentsScreen} />

            {/* Phone Calls */}
            <Stack.Screen name="PhoneCalls" component={PhoneCallsScreen} />
            <Stack.Screen name="InitiatePhoneCall" component={InitiatePhoneCallScreen} />
            <Stack.Screen name="ActivePhoneCall" component={ActivePhoneCallScreen} />
            <Stack.Screen name="PhoneCallDetails" component={PhoneCallDetailsScreen} />

            {/* Video Calls */}
            <Stack.Screen name="VideoCalls" component={VideoCallsScreen} />
            <Stack.Screen name="InitiateVideoCall" component={InitiateVideoCallScreen} />
            <Stack.Screen name="ActiveVideoCall" component={ActiveVideoCallScreen} />
            <Stack.Screen name="VideoCallDetails" component={VideoCallDetailsScreen} />

            {/* Home Screen */}
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} onLogout={onLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>

      {/* Incoming Call Handler - Shows overlay when receiving calls */}
      {isAuthenticated && <IncomingCallHandler />}
    </NavigationContainer>
  );
}

/**
 * Placeholder screen for features not yet implemented
 */
function PlaceholderScreen({ navigation }) {
  const { Text, View, Button } = require('react-native');
  const styles = require('react-native').StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    text: {
      fontSize: 18,
      marginBottom: 20,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>This feature is coming soon!</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}
