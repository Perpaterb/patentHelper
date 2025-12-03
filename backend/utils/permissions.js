/**
 * Permission utility functions
 *
 * Handles permission checks for users, including trial users who should have
 * the same access level as admins during their 20-day trial period.
 */

/**
 * Check if a group is in read-only mode
 *
 * A group is read-only when:
 * - readOnlyUntil is set AND
 * - readOnlyUntil is in the future
 *
 * This happens when all admins have unsubscribed - the group gets 30 days
 * of read-only access before being fully archived.
 *
 * @param {Object} group - The Group object
 * @param {Date|null} [group.readOnlyUntil] - The date until which the group is read-only
 * @returns {boolean} True if group is currently in read-only mode
 */
function isGroupReadOnly(group) {
  if (!group || !group.readOnlyUntil) {
    return false;
  }

  const readOnlyUntil = new Date(group.readOnlyUntil);
  const now = new Date();

  return now < readOnlyUntil;
}

/**
 * Get read-only error response for a group
 *
 * @param {Object} group - The Group object
 * @returns {Object} Error response object with status and message
 */
function getReadOnlyErrorResponse(group) {
  const readOnlyUntil = new Date(group.readOnlyUntil);
  const formattedDate = readOnlyUntil.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    error: 'Group is read-only',
    message: `This group is in read-only mode until ${formattedDate}. No new content can be added. An admin needs to resubscribe to restore full access.`,
  };
}

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
  isGroupReadOnly,
  getReadOnlyErrorResponse,
};
