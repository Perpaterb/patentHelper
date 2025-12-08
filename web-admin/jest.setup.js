/**
 * Jest Setup File
 *
 * Configures the testing environment for web-admin React Native (Expo) app.
 */

// Mock @expo/vector-icons to prevent font loading issues in tests
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createIconMock = (name) => {
    const IconMock = (props) => React.createElement(Text, { testID: `icon-${name}` }, props.name || '');
    IconMock.displayName = name;
    return IconMock;
  };

  return {
    MaterialCommunityIcons: createIconMock('MaterialCommunityIcons'),
    MaterialIcons: createIconMock('MaterialIcons'),
    Ionicons: createIconMock('Ionicons'),
    FontAwesome: createIconMock('FontAwesome'),
    FontAwesome5: createIconMock('FontAwesome5'),
    Feather: createIconMock('Feather'),
    AntDesign: createIconMock('AntDesign'),
    Entypo: createIconMock('Entypo'),
    createIconSet: () => createIconMock('CustomIcon'),
  };
});

// Mock expo-font to prevent font loading issues
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
}));

// Mock expo-asset to prevent asset registry issues
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({ downloadAsync: jest.fn() })),
    loadAsync: jest.fn(() => Promise.resolve()),
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @kinde-oss/kinde-auth-react
jest.mock('@kinde-oss/kinde-auth-react', () => ({
  useKindeAuth: jest.fn(() => ({
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
    user: null,
    getToken: jest.fn(() => Promise.resolve('mock-token')),
  })),
  KindeProvider: ({ children }) => children,
}));

// Mock react-native-paper Portal
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    Portal: ({ children }) => children,
  };
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('Animated') ||
    args[0]?.includes?.('useNativeDriver') ||
    args[0]?.includes?.('shadow*') ||
    args[0]?.includes?.('pointerEvents') ||
    args[0]?.includes?.('deprecated')
  ) {
    return;
  }
  originalWarn(...args);
};

// Suppress console errors for known issues during tests
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes?.('react-test-renderer is deprecated') ||
    args[0]?.includes?.('not wrapped in act')
  ) {
    return;
  }
  originalError(...args);
};
