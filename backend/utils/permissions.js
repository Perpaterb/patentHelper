/**
 * Permission utility functions
 *
 * Handles permission checks for users, including trial users who should have
 * the same access level as admins during their 20-day trial period.
 */

/**
 * Check if a user has admin-level permissions
 *
 * This includes:
 * - Members with role === 'admin'
 * - Users on 20-day trial (account created within last 20 days and not subscribed)
 *
 * @param {Object} groupMember - The GroupMember object
 * @param {string} groupMember.role - The member's role in the group
 * @param {Object} [groupMember.user] - The linked User object (optional)
 * @param {boolean} [groupMember.user.isSubscribed] - User's subscription status
 * @param {Date} [groupMember.user.createdAt] - User's account creation date
 * @returns {boolean} True if user has admin-level permissions
 */
function hasAdminPermissions(groupMember) {
  if (!groupMember) {
    return false;
  }

  // Check if they're an admin
  if (groupMember.role === 'admin') {
    return true;
  }

  // Check if they're on trial (account created within last 20 days and not subscribed)
  if (groupMember.user && !groupMember.user.isSubscribed) {
    const daysSinceCreation = (Date.now() - new Date(groupMember.user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation <= 20) {
      return true;
    }
  }

  return false;
}

module.exports = {
  hasAdminPermissions,
};
