/**
 * Auth Event Emitter
 *
 * Simple event emitter for authentication events.
 * Used to trigger logout from anywhere in the app (e.g., API interceptors).
 */

class AuthEventEmitter {
  constructor() {
    this.listeners = {
      logout: [],
    };
  }

  /**
   * Subscribe to logout events
   * @param {Function} callback - Function to call when logout event is emitted
   * @returns {Function} Unsubscribe function
   */
  onLogout(callback) {
    this.listeners.logout.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.logout = this.listeners.logout.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit logout event
   * @param {string} reason - Reason for logout (e.g., 'token_expired', 'refresh_failed')
   */
  emitLogout(reason = 'unknown') {
    console.log(`[AuthEvents] Logout triggered: ${reason}`);
    this.listeners.logout.forEach(callback => callback(reason));
  }
}

// Export singleton instance
export default new AuthEventEmitter();
