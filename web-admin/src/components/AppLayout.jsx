/**
 * App Layout Component
 *
 * Main layout with navigation drawer and app bar.
 * React Native Paper version.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Drawer,
  Text,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import * as SecureStore from 'expo-secure-store';

const DRAWER_WIDTH = 240;

function AppLayout({ children, navigation, currentRoute }) {
  const { logout } = useKindeAuth();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  const handleLogout = async () => {
    // Clear local storage
    await SecureStore.deleteItemAsync('accessToken');
    // Logout with Kinde
    logout();
  };

  // TODO: Get isAdmin from user context/API
  const isAdmin = true;

  const menuItems = [
    { label: 'Web App', icon: 'apps', route: 'Groups' },
    { label: 'Subscription', icon: 'credit-card', route: 'Subscription' },
    { label: 'My Account', icon: 'account-circle', route: 'WebAdminMyAccount' },
    ...(isAdmin ? [
      { label: 'Storage', icon: 'database', route: 'Storage' },
      { label: 'Audit Logs', icon: 'history', route: 'AuditLogs' },
    ] : []),
  ];

  const isActive = (route) => currentRoute === route;

  const handleNavigation = (route) => {
    navigation.navigate(route);
    setMobileMenuVisible(false);
  };

  const DrawerContent = () => (
    <View style={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Family Helper</Text>
      </View>
      <Divider />
      <ScrollView>
        {menuItems.map((item) => (
          <Drawer.Item
            key={item.route}
            label={item.label}
            icon={item.icon}
            active={isActive(item.route)}
            onPress={() => handleNavigation(item.route)}
            style={styles.drawerItem}
          />
        ))}
        <Divider style={styles.divider} />
        <Drawer.Item
          label="Logout"
          icon="logout"
          onPress={handleLogout}
          style={styles.drawerItem}
        />
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Desktop Drawer - always visible */}
      <View style={styles.desktopDrawer}>
        <DrawerContent />
      </View>

      {/* Main Content Area */}
      <View style={styles.mainArea}>
        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>

      {/* Mobile Menu Modal */}
      <Portal>
        <Modal
          visible={mobileMenuVisible}
          onDismiss={() => setMobileMenuVisible(false)}
          contentContainerStyle={styles.mobileDrawer}
        >
          <DrawerContent />
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    height: '100vh',
    overflow: 'hidden',
  },
  desktopDrawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    // Hide on mobile - show on desktop
    display: 'flex',
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: 16,
    paddingTop: 24,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  drawerItem: {
    marginHorizontal: 8,
  },
  divider: {
    marginVertical: 8,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    height: '100%',
    overflow: 'auto',
  },
  mobileDrawer: {
    backgroundColor: '#fff',
    width: DRAWER_WIDTH,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});

export default AppLayout;
