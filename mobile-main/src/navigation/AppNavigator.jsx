/**
 * App Navigator
 *
 * Main navigation configuration for the app.
 * Handles authentication state and navigation between screens.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomBackButton from '../components/CustomBackButton';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MyAccountScreen from '../screens/account/MyAccountScreen';
import PersonalGiftRegistriesScreen from '../screens/account/PersonalGiftRegistriesScreen';
import PersonalItemRegistriesScreen from '../screens/account/PersonalItemRegistriesScreen';
import GroupsListScreen from '../screens/groups/GroupsListScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import EditGroupScreen from '../screens/groups/EditGroupScreen';
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
        screenOptions={({ navigation }) => ({
          headerStyle: {
            backgroundColor: '#6200ee',
            height: 60, // Reduced from default ~90px to 60px (2/3 size)
          },
          headerTintColor: '#fff', // Back button and icons are white for visibility on purple
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18, // Slightly smaller title for smaller header
            color: '#fff', // Ensure title is white
          },
          headerBackTitleVisible: false, // Hide back button text
          headerBackTitle: '', // Force empty back title on iOS
          headerLeft: navigation.canGoBack() ? () => <CustomBackButton onPress={() => navigation.goBack()} /> : undefined,
          headerShadowVisible: true, // Keep shadow for depth
        })}
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
              options={{ title: 'Groups', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="MyAccount"
              component={MyAccountScreen}
              options={{ title: 'My Account', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="PersonalGiftRegistries"
              component={PersonalGiftRegistriesScreen}
              options={{ title: 'My Gift Registries', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="PersonalItemRegistries"
              component={PersonalItemRegistriesScreen}
              options={{ title: 'My Item Registries', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="Invites"
              component={InvitesScreen}
              options={{ title: 'Group Invitations', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{ title: 'Create Group', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="EditGroup"
              component={EditGroupScreen}
              options={{ title: 'Edit Group', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="GroupDashboard"
              component={GroupDashboardScreen}
              options={{ title: 'Group Dashboard', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="GroupSettings"
              component={GroupSettingsScreen}
              options={{ title: 'Group Settings', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="InviteMember"
              component={InviteMemberScreen}
              options={{ title: 'Invite Member', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="MessageGroupsList"
              component={MessageGroupsListScreen}
              options={{ title: 'Message Groups', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="CreateMessageGroup"
              component={CreateMessageGroupScreen}
              options={{ title: 'Create Message Group', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="GroupMessages"
              component={MessagesScreen}
              options={{ title: 'Messages', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="MessageGroupSettings"
              component={MessageGroupSettingsScreen}
              options={{ title: 'Message Group Settings', headerBackTitle: '' }}
            />

            {/* Approvals */}
            <Stack.Screen
              name="ApprovalsList"
              component={ApprovalsListScreen}
              options={{ title: 'Approvals', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="AutoApproveSettings"
              component={AutoApproveSettingsScreen}
              options={{ title: 'Auto-Approve Settings', headerBackTitle: '' }}
            />

            {/* Calendar */}
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ title: 'Shared Calendar', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="CreateEvent"
              component={CreateEventScreen}
              options={{ title: 'Create Event', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="CreateChildEvent"
              component={CreateChildEventScreen}
              options={{ title: 'Create Child Event', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="EditEvent"
              component={EditEventScreen}
              options={{ title: 'Edit Event', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="EditChildEvent"
              component={EditChildEventScreen}
              options={{ title: 'Edit Child Event', headerBackTitle: '' }}
            />

            {/* Finance */}
            <Stack.Screen
              name="Finance"
              component={FinanceListScreen}
              options={{ title: 'Finance Tracker', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="CreateFinanceMatter"
              component={CreateFinanceMatterScreen}
              options={{ title: 'Create Finance Matter', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="FinanceMatterDetails"
              component={FinanceMatterDetailsScreen}
              options={{ title: 'Finance Matter Details', headerBackTitle: '' }}
            />

            {/* Gift Registry */}
            <Stack.Screen
              name="GiftRegistryList"
              component={GiftRegistryListScreen}
              options={{ title: 'Gift Registries', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="GiftRegistryDetail"
              component={GiftRegistryDetailScreen}
              options={{ title: 'Gift Registry', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="AddEditRegistry"
              component={AddEditRegistryScreen}
              options={{ title: 'Registry', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="AddEditGiftItem"
              component={AddEditGiftItemScreen}
              options={{ title: 'Gift Item', headerBackTitle: '' }}
            />

            {/* Home Screen */}
            <Stack.Screen
              name="Home"
              options={{ title: 'Parenting Helper', headerBackTitle: '' }}
            >
              {(props) => <HomeScreen {...props} onLogout={onLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
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
