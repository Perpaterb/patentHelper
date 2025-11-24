/**
 * Mobile Groups Page
 *
 * Wraps the mobile GroupsListScreen in a PhoneFrame for web display.
 * Uses React Native Web to render the exact mobile app experience.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Provider as PaperProvider, Portal } from 'react-native-paper';
import PhoneFrame from '../../components/layout/PhoneFrame';
import { createNavigationBridge, createRouteBridge } from '../../utils/navigationBridge';

// Import directly from mobile-main
import GroupsListScreen from '@mobile/screens/groups/GroupsListScreen';

function MobileGroups() {
  const navigate = useNavigate();

  // Create navigation bridge that maps RN navigation to React Router
  const navigation = createNavigationBridge(navigate);
  const route = createRouteBridge({});

  return (
    <PaperProvider>
      <Portal.Host>
        <PhoneFrame>
          <GroupsListScreen navigation={navigation} route={route} />
        </PhoneFrame>
      </Portal.Host>
    </PaperProvider>
  );
}

export default MobileGroups;
