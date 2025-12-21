/**
 * Jest Setup File
 *
 * Configures global mocks and test utilities for React Native testing.
 */

// Import Jest Native matchers
import '@testing-library/jest-native/extend-expect';

// Use fake timers to control all async timer operations
// This prevents "Jest environment torn down" errors from lingering timers
// advanceTimers option tells waitFor to advance timers automatically
jest.useFakeTimers({
  // Allow promises to resolve between timer ticks
  advanceTimers: true,
});

// Configure React Testing Library
import { configure } from '@testing-library/react-native';

configure({
  // Increase async utilities timeout
  asyncUtilTimeout: 10000,
});

// Silence console.warn and console.error in tests unless explicitly needed
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
    TouchableOpacity: View,
    TouchableHighlight: View,
    TouchableWithoutFeedback: View,
  };
});

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  copyAsync: jest.fn(),
  moveAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(),
    },
  },
  Video: require('react-native').View,
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// Mock rn-emoji-keyboard (used in MessagesScreen)
jest.mock('rn-emoji-keyboard', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ open, onClose, onEmojiSelected }) => (open ? <View testID="emoji-keyboard" /> : null),
  };
});

// Mock emoji-picker-react (web platform) - virtual because it's not installed
jest.mock('emoji-picker-react', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="web-emoji-picker" />,
  };
}, { virtual: true });

// Mock CustomAlert component
jest.mock('./src/components/CustomAlert', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    CustomAlert: {
      alert: jest.fn(),
    },
    CustomAlertProvider: ({ children }) => children,
    useCustomAlert: () => ({
      showAlert: jest.fn(),
    }),
  };
});

// Mock AudioRecorder component
jest.mock('./src/components/AudioRecorder', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="audio-recorder" />,
  };
});

// Mock AudioPlayer component
jest.mock('./src/components/AudioPlayer', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="audio-player" />,
  };
});

// Mock shared components used by MessagesScreen
jest.mock('./src/components/shared/MediaPicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => <View testID="media-picker" ref={ref} />),
  };
});

jest.mock('./src/components/shared/ImageViewer', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="image-viewer" /> : null),
  };
});

jest.mock('./src/components/shared/VideoPlayer', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }) => (visible ? <View testID="video-player" /> : null),
  };
});

jest.mock('./src/components/shared/UserAvatar', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="user-avatar" />,
  };
});

jest.mock('./src/components/CustomNavigationHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }) => <View testID="custom-nav-header"><Text>{title}</Text></View>,
  };
});

// Mock React Navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(),
  setParams: jest.fn(),
  getId: jest.fn(),
};

const mockRoute = {
  key: 'test-key',
  name: 'TestScreen',
  params: {},
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    useFocusEffect: (callback) => {
      // Use useEffect to run the callback after component mounts
      // Call the callback and capture cleanup function, run it on unmount
      React.useEffect(() => {
        const cleanup = callback();
        return () => {
          if (typeof cleanup === 'function') {
            cleanup();
          }
        };
      }, []);
    },
    useIsFocused: () => true,
  };
});

// Mock API service
jest.mock('./src/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock upload service
jest.mock('./src/services/upload.service', () => ({
  uploadFile: jest.fn(),
  uploadMultipleFiles: jest.fn(),
  getFileUrl: jest.fn((fileId) => `https://mock-url.com/${fileId}`),
}));

// Mock color utilities
jest.mock('./src/utils/colorUtils', () => ({
  getContrastTextColor: jest.fn(() => '#000000'),
}));

// Mock Kinde SDK - uses __mocks__/@kinde-oss/react-native-sdk-0-7x.js

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native Paper Provider components
jest.mock('react-native-paper', () => {
  const RN = require('react-native');
  const actualPaper = jest.requireActual('react-native-paper');

  const MockCard = ({ children, onPress, testID, style }) => (
    <RN.TouchableOpacity onPress={onPress} testID={testID} style={style}>
      {children}
    </RN.TouchableOpacity>
  );
  MockCard.Content = ({ children, style }) => <RN.View style={style}>{children}</RN.View>;

  return {
    ...actualPaper,
    Portal: ({ children }) => children,
    Modal: ({ children, visible }) => (visible ? children : null),
    Provider: ({ children }) => children,
    TextInput: ({ value, onChangeText, placeholder, mode, style, multiline, maxLength, disabled, label, numberOfLines }) => (
      <RN.TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        maxLength={maxLength}
        editable={!disabled}
        style={style}
      />
    ),
    IconButton: ({ onPress, icon, testID, disabled, ...props }) => (
      <RN.TouchableOpacity onPress={onPress} testID={testID || icon} disabled={disabled} accessibilityState={{ disabled }} {...props}>
        <RN.Text>{icon}</RN.Text>
      </RN.TouchableOpacity>
    ),
    FAB: ({ onPress, icon, label, testID, ...props }) => (
      <RN.TouchableOpacity onPress={onPress} testID={testID || label} {...props}>
        <RN.Text>{label}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Card: MockCard,
    Chip: ({ children, textStyle, icon, mode, style }) => <RN.Text style={textStyle}>{children}</RN.Text>,
    Searchbar: ({ onChangeText, value, placeholder, testID, style }) => (
      <RN.TextInput
        onChangeText={onChangeText}
        value={value}
        placeholder={placeholder}
        testID={testID || 'searchbar'}
        style={style}
      />
    ),
    Badge: ({ children, size, style }) => <RN.Text style={style}>{children}</RN.Text>,
    Avatar: {
      Text: ({ label, size, style, color }) => <RN.Text style={style}>{label}</RN.Text>,
      Image: RN.Image,
    },
    Text: RN.Text,
    Title: ({ children, style }) => <RN.Text style={style}>{children}</RN.Text>,
    Button: ({ children, onPress, testID, disabled, loading, mode, style }) => (
      <RN.TouchableOpacity onPress={onPress} testID={testID} disabled={disabled || loading} style={style}>
        <RN.Text>{children}</RN.Text>
      </RN.TouchableOpacity>
    ),
    Divider: RN.View,
    Menu: Object.assign(
      ({ children, visible, onDismiss, anchor }) => (
        <RN.View>
          {anchor}
          {visible && children}
        </RN.View>
      ),
      {
        Item: ({ title, onPress, leadingIcon }) => (
          <RN.TouchableOpacity onPress={onPress}>
            <RN.Text>{title}</RN.Text>
          </RN.TouchableOpacity>
        ),
      }
    ),
  };
});

// Global test helpers
global.mockNavigation = mockNavigation;
global.mockRoute = mockRoute;

// Reset mocks and timers before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Clean up after each test
afterEach(() => {
  // Clear all pending timers to prevent leaks
  jest.clearAllTimers();
  jest.clearAllMocks();
});
