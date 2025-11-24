/**
 * Navigation Bridge
 *
 * Bridges React Router (web) to React Navigation (mobile) interface.
 * This allows mobile screens to use navigation.navigate() which maps to router.
 */

/**
 * Creates a navigation object compatible with React Navigation API
 * @param {Function} navigate - React Router navigate function
 * @param {string} groupId - Current group ID for nested routes
 * @returns {Object} Navigation object with navigate, goBack, etc.
 */
export function createNavigationBridge(navigate, groupId = null) {
  return {
    navigate: (screenName, params = {}) => {
      // Map mobile screen names to web routes
      const routeMap = {
        // Group screens
        'GroupDashboard': `/groups/${params.groupId || groupId}`,
        'GroupSettings': `/groups/${params.groupId || groupId}/settings`,
        'CreateGroup': '/groups/create',
        'EditGroup': `/groups/${params.groupId || groupId}/edit`,
        'InviteMember': `/groups/${params.groupId || groupId}/invite`,
        'Invites': '/invites',

        // Message screens
        'MessageGroupsList': `/groups/${params.groupId || groupId}/messages`,
        'Messages': `/groups/${params.groupId || groupId}/messages/${params.messageGroupId}`,
        'CreateMessageGroup': `/groups/${params.groupId || groupId}/messages/create`,
        'MessageGroupSettings': `/groups/${params.groupId || groupId}/messages/${params.messageGroupId}/settings`,

        // Calendar screens
        'Calendar': `/groups/${params.groupId || groupId}/calendar`,
        'CreateEvent': `/groups/${params.groupId || groupId}/calendar/create`,
        'EditEvent': `/groups/${params.groupId || groupId}/calendar/${params.eventId}/edit`,

        // Finance screens
        'Finance': `/groups/${params.groupId || groupId}/finance`,
        'CreateFinanceMatter': `/groups/${params.groupId || groupId}/finance/create`,
        'FinanceMatterDetails': `/groups/${params.groupId || groupId}/finance/${params.financeMatterId}`,

        // Gift Registry screens
        'GiftRegistryList': `/groups/${params.groupId || groupId}/gift-registry`,
        'GiftRegistryDetail': `/groups/${params.groupId || groupId}/gift-registry/${params.registryId}`,

        // Secret Santa screens
        'SecretSantaList': `/groups/${params.groupId || groupId}/secret-santa`,
        'SecretSantaDetail': `/groups/${params.groupId || groupId}/secret-santa/${params.eventId}`,
        'CreateSecretSanta': `/groups/${params.groupId || groupId}/secret-santa/create`,

        // Item Registry screens
        'ItemRegistryList': `/groups/${params.groupId || groupId}/item-registry`,
        'ItemRegistryDetail': `/groups/${params.groupId || groupId}/item-registry/${params.registryId}`,

        // Other screens
        'Wiki': `/groups/${params.groupId || groupId}/wiki`,
        'Documents': `/groups/${params.groupId || groupId}/documents`,
        'ApprovalsList': `/groups/${params.groupId || groupId}/approvals`,
        'AutoApproveSettings': `/groups/${params.groupId || groupId}/approvals/auto-approve`,

        // Account screens
        'MyAccount': '/account',
      };

      const route = routeMap[screenName];
      if (route) {
        navigate(route);
      } else {
        console.warn(`Unknown screen: ${screenName}`);
      }
    },

    goBack: () => {
      navigate(-1);
    },

    setOptions: () => {
      // No-op for web - header is handled differently
    },

    addListener: () => {
      // Return unsubscribe function
      return () => {};
    },
  };
}

/**
 * Creates a route object compatible with React Navigation API
 * @param {Object} params - Route parameters
 * @returns {Object} Route object with params
 */
export function createRouteBridge(params = {}) {
  return {
    params,
    name: 'WebScreen',
  };
}
