import { registerRootComponent } from 'expo';

import App from './App';

// Suppress React Native Paper web warnings about unknown DOM props
// These are internal RN Paper props that get passed through on web but are harmless
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      message.includes('React does not recognize') &&
      (message.includes('borderRadiusStyles') ||
        message.includes('elevationStyle') ||
        message.includes('pointerEvents'))
    ) {
      return; // Suppress these specific warnings
    }
    originalError.apply(console, args);
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
