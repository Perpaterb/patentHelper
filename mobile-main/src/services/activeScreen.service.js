/**
 * Active Screen Service
 *
 * Tracks which screen/content the user is currently viewing.
 * Used to suppress notifications for content already being viewed.
 */

let activeMessageGroupId = null;

/**
 * Set the currently active message group ID
 * Call when entering a message group screen
 *
 * @param {string|null} messageGroupId - The message group ID or null to clear
 */
function setActiveMessageGroup(messageGroupId) {
  activeMessageGroupId = messageGroupId;
}

/**
 * Get the currently active message group ID
 *
 * @returns {string|null} The active message group ID or null
 */
function getActiveMessageGroup() {
  return activeMessageGroupId;
}

/**
 * Clear the active message group
 * Call when leaving a message group screen
 */
function clearActiveMessageGroup() {
  activeMessageGroupId = null;
}

export default {
  setActiveMessageGroup,
  getActiveMessageGroup,
  clearActiveMessageGroup,
};
