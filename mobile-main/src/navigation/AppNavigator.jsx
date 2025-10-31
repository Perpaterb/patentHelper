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
import FinanceListScreen from '../screens/groups/FinanceListScreen';
import CreateFinanceMatterScreen from '../screens/finance/CreateFinanceMatterScreen';
import FinanceMatterDetailsScreen from '../screens/finance/FinanceMatterDetailsScreen';

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
          headerShadowVisible: true, // Keep shadow for depth
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
              options={{ title: 'Groups' }}
            />
            <Stack.Screen
              name="MyAccount"
              component={MyAccountScreen}
              options={{ title: 'My Account' }}
            />
            <Stack.Screen
              name="Invites"
              component={InvitesScreen}
              options={{ title: 'Group Invitations' }}
            />
            <Stack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{ title: 'Create Group' }}
            />
            <Stack.Screen
              name="EditGroup"
              component={EditGroupScreen}
              options={{ title: 'Edit Group' }}
            />
            <Stack.Screen
              name="GroupDashboard"
              component={GroupDashboardScreen}
              options={{ title: 'Group Dashboard' }}
            />
            <Stack.Screen
              name="GroupSettings"
              component={GroupSettingsScreen}
              options={{ title: 'Group Settings' }}
            />
            <Stack.Screen
              name="InviteMember"
              component={InviteMemberScreen}
              options={{ title: 'Invite Member' }}
            />
            <Stack.Screen
              name="MessageGroupsList"
              component={MessageGroupsListScreen}
              options={{ title: 'Message Groups' }}
            />
            <Stack.Screen
              name="CreateMessageGroup"
              component={CreateMessageGroupScreen}
              options={{ title: 'Create Message Group' }}
            />
            <Stack.Screen
              name="GroupMessages"
              component={MessagesScreen}
              options={{ title: 'Messages' }}
            />
            <Stack.Screen
              name="MessageGroupSettings"
              component={MessageGroupSettingsScreen}
              options={{ title: 'Message Group Settings' }}
            />

            {/* Approvals */}
            <Stack.Screen
              name="ApprovalsList"
              component={ApprovalsListScreen}
              options={{ title: 'Approvals' }}
            />
            <Stack.Screen
              name="AutoApproveSettings"
              component={AutoApproveSettingsScreen}
              options={{ title: 'Auto-Approve Settings' }}
            />

            {/* Calendar */}
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ title: 'Shared Calendar' }}
            />
            <Stack.Screen
              name="CreateEvent"
              component={CreateEventScreen}
              options={{ title: 'Create Event' }}
            />

            {/* Finance */}
            <Stack.Screen
              name="Finance"
              component={FinanceListScreen}
              options={{ title: 'Finance Tracker' }}
            />
            <Stack.Screen
              name="CreateFinanceMatter"
              component={CreateFinanceMatterScreen}
              options={{ title: 'Create Finance Matter' }}
            />
            <Stack.Screen
              name="FinanceMatterDetails"
              component={FinanceMatterDetailsScreen}
              options={{ title: 'Finance Matter Details' }}
            />

            {/* Home Screen */}
            <Stack.Screen
              name="Home"
              options={{ title: 'Parenting Helper' }}
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
