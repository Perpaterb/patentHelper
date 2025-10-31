/**
 * Groups Controller
 *
 * Handles group operations.
 */

const { prisma } = require('../config/database');

/**
 * Generate icon letters from name or email
 * @param {string} nameOrEmail - Display name or email
 * @returns {string} Two-letter icon string
 */
function generateIconLetters(nameOrEmail) {
  if (!nameOrEmail) return 'U';

  // If it's an email, use first two letters before @
  if (nameOrEmail.includes('@')) {
    const username = nameOrEmail.split('@')[0];
    return username.substring(0, 2).toUpperCase();
  }

  // If it has spaces, use first letter of first two words
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Otherwise, use first two letters
  return nameOrEmail.substring(0, 2).toUpperCase();
}

/**
 * Clean up pending approvals when an admin leaves a group
 *
 * When an admin is removed from a group, this function:
 * 1. Deletes their pending votes from all approvals
 * 2. Recalculates approval thresholds based on remaining admins
 * 3. Auto-approves/rejects approvals if threshold is now met
 *
 * @param {string} groupId - The group ID
 * @param {string} removedAdminId - The groupMemberId of the removed admin
 */
async function cleanupAdminApprovals(groupId, removedAdminId) {
  try {
    console.log(`[cleanupAdminApprovals] Cleaning up approvals for admin ${removedAdminId} in group ${groupId}`);

    // Delete all pending votes by this admin
    const deletedVotes = await prisma.approvalVote.deleteMany({
      where: {
        adminId: removedAdminId,
        approval: {
          groupId: groupId,
          status: 'pending',
        },
      },
    });

    console.log(`[cleanupAdminApprovals] Deleted ${deletedVotes.count} pending votes`);

    // Get all pending approvals in this group
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        groupId: groupId,
        status: 'pending',
      },
      include: {
        votes: true,
      },
    });

    // Get current admin count (after removal)
    const currentAdmins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
      },
    });

    const totalAdmins = currentAdmins.length;

    console.log(`[cleanupAdminApprovals] Found ${pendingApprovals.length} pending approvals, ${totalAdmins} remaining admins`);

    // Recalculate each pending approval
    for (const approval of pendingApprovals) {
      const approveVotes = approval.votes.filter(v => v.vote === 'approve').length;
      const rejectVotes = approval.votes.filter(v => v.vote === 'reject').length;

      let newStatus = 'pending';

      // Check if approval threshold is met
      if (approval.requiresAllAdmins) {
        // Requires 100% approval
        if (approveVotes >= totalAdmins) {
          newStatus = 'approved';
        } else if (rejectVotes > 0) {
          // Any rejection means the approval fails
          newStatus = 'rejected';
        }
      } else {
        // Requires percentage (default 50%)
        const requiredPercentage = parseFloat(approval.requiredApprovalPercentage);
        const approvePercentage = totalAdmins > 0 ? (approveVotes / totalAdmins) * 100 : 0;
        const rejectPercentage = totalAdmins > 0 ? (rejectVotes / totalAdmins) * 100 : 0;

        if (approvePercentage >= requiredPercentage) {
          newStatus = 'approved';
        } else if (rejectPercentage > (100 - requiredPercentage)) {
          // If rejection percentage exceeds what's needed to block, reject
          newStatus = 'rejected';
        }
      }

      // Update approval status if it changed
      if (newStatus !== 'pending') {
        await prisma.approval.update({
          where: { approvalId: approval.approvalId },
          data: {
            status: newStatus,
            completedAt: new Date(),
          },
        });

        console.log(`[cleanupAdminApprovals] Approval ${approval.approvalId} updated to ${newStatus} after admin removal`);

        // Create audit log
        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            action: newStatus === 'approved' ? 'auto_approve_action' : 'auto_reject_action',
            performedBy: null,
            performedByName: 'System',
            performedByEmail: 'system',
            actionLocation: 'approvals',
            messageContent: `Approval ${approval.approvalType} automatically ${newStatus} after admin removal (${approveVotes}/${totalAdmins} votes)`,
          },
        });

        // TODO: Execute the approved action (this will be implemented per approval type)
      }
    }

    console.log(`[cleanupAdminApprovals] Cleanup complete`);
  } catch (error) {
    console.error('[cleanupAdminApprovals] Error cleaning up approvals:', error);
    // Don't throw - this is a cleanup operation that shouldn't block member removal
  }
}

/**
 * Get all groups where user is a member
 * GET /groups
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroups(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get all groups where user is a member
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId: userId },
      include: {
        group: {
          select: {
            groupId: true,
            name: true,
            icon: true,
            backgroundColor: true,
            backgroundImageUrl: true,
            createdAt: true,
            isHidden: true,
          },
        },
      },
    });

    // Transform to include role in group object, filter out hidden groups and pending invitations, and sort by pin status
    const groups = await Promise.all(
      groupMemberships
        .filter(membership => !membership.group.isHidden && membership.isRegistered === true) // Filter out hidden/deleted groups and pending invitations
        .map(async membership => {
          // Calculate badge counts from message groups
          // If group is muted, don't show any badges
          let unreadMessagesCount = 0;
          let unreadMentionsCount = 0;
          let pendingApprovalsCount = 0;
          let pendingFinanceCount = 0;

          // Only calculate badge counts if group is NOT muted
          if (!membership.isMuted) {
            // Get all message groups for this group
            const messageGroups = await prisma.messageGroup.findMany({
              where: {
                groupId: membership.group.groupId,
                isHidden: false,
              },
              include: {
                members: {
                  where: {
                    groupMemberId: membership.groupMemberId,
                  },
                  select: {
                    isMuted: true,
                    lastReadAt: true,
                  },
                },
              },
            });

            // Aggregate badge counts from non-muted message groups
            for (const messageGroup of messageGroups) {
              const userMembership = messageGroup.members[0];

              // Skip if user is not a member or has muted this message group
              if (!userMembership || userMembership.isMuted) {
                continue;
              }

              // Count unread messages
              const unreadCount = await prisma.message.count({
                where: {
                  messageGroupId: messageGroup.messageGroupId,
                  isHidden: false,
                  senderId: { not: membership.groupMemberId },
                  createdAt: {
                    gt: userMembership.lastReadAt || new Date(0),
                  },
                },
              });

              // Count unread mentions
              const unreadMentionsCountForGroup = await prisma.message.count({
                where: {
                  messageGroupId: messageGroup.messageGroupId,
                  isHidden: false,
                  senderId: { not: membership.groupMemberId },
                  mentions: {
                    has: membership.groupMemberId,
                  },
                  createdAt: {
                    gt: userMembership.lastReadAt || new Date(0),
                  },
                },
              });

              unreadMessagesCount += unreadCount;
              unreadMentionsCount += unreadMentionsCountForGroup;
            }

            // Calculate pending approvals count (only for admins)
            if (membership.role === 'admin') {
              // Get all approvals for this group
              const approvals = await prisma.approval.findMany({
                where: {
                  groupId: membership.group.groupId,
                  status: 'pending',
                },
                include: {
                  votes: {
                    where: {
                      adminId: membership.groupMemberId,
                    },
                  },
                },
              });

              // Count approvals that are awaiting user's action (pending and user hasn't voted)
              pendingApprovalsCount = approvals.filter(
                approval => approval.votes.length === 0
              ).length;
            }

            // Calculate pending finance matters count
            const financeMatters = await prisma.financeMatter.findMany({
              where: {
                groupId: membership.group.groupId,
                isSettled: false,
                isCanceled: false,
              },
              include: {
                members: {
                  where: {
                    groupMemberId: membership.groupMemberId,
                  },
                  select: {
                    paidAmount: true,
                    expectedAmount: true,
                  },
                },
              },
            });

            // Count finance matters where user owes money
            pendingFinanceCount = financeMatters.filter(fm => {
              const userMember = fm.members[0];
              if (!userMember) return false;

              const paidAmount = parseFloat(userMember.paidAmount) || 0;
              const expectedAmount = parseFloat(userMember.expectedAmount) || 0;

              return paidAmount < expectedAmount;
            }).length;
          }

          return {
            groupId: membership.group.groupId,
            name: membership.group.name,
            icon: membership.group.icon,
            backgroundColor: membership.group.backgroundColor,
            backgroundImageUrl: membership.group.backgroundImageUrl,
            createdAt: membership.group.createdAt,
            isHidden: membership.group.isHidden,
            role: membership.role,
            displayName: membership.displayName,
            isMuted: membership.isMuted,
            isPinned: membership.isPinned,
            pinnedOrder: membership.pinnedOrder,
            unreadMessagesCount,
            unreadMentionsCount,
            pendingApprovalsCount,
            pendingFinanceCount,
          };
        })
    );

    // Sort groups by pin status and creation date
    groups.sort((a, b) => {
      // Pinned groups come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Among pinned groups, sort by pinnedOrder
      if (a.isPinned && b.isPinned) {
        return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
      }

      // Among unpinned groups, sort by createdAt (most recent first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      success: true,
      groups: groups,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      error: 'Failed to get groups',
      message: error.message,
    });
  }
}

/**
 * Get single group details with members
 * GET /groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getGroupById(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      include: {
        user: {
          select: {
            isSubscribed: true,
            createdAt: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Get group details with all members (include user profile data) and settings
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
      include: {
        members: {
          select: {
            groupMemberId: true, // IMPORTANT: Include this for member selection in message groups
            userId: true,
            role: true,
            displayName: true,
            isMuted: true,
            joinedAt: true,
            email: true,
            iconLetters: true,
            iconColor: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        settings: {
          select: {
            financeVisibleToParents: true,
            financeCreatableByParents: true,
            financeVisibleToCaregivers: true,
            financeCreatableByCaregivers: true,
            financeVisibleToChildren: true,
            financeCreatableByChildren: true,
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found',
      });
    }

    // Merge user profile data with group member data
    // Use latest User profile data if available, fall back to GroupMember data
    const membersWithLatestProfile = group.members.map(member => {
      // If user profile exists and has data, use it
      if (member.user) {
        return {
          groupMemberId: member.groupMemberId, // IMPORTANT: Include for message group member selection
          userId: member.userId,
          role: member.role,
          displayName: member.user.displayName || member.displayName,
          isMuted: member.isMuted,
          joinedAt: member.joinedAt,
          email: member.email,
          iconLetters: member.user.memberIcon || member.iconLetters,
          iconColor: member.user.iconColor || member.iconColor,
        };
      }
      // Otherwise use GroupMember data
      return {
        groupMemberId: member.groupMemberId, // IMPORTANT: Include for message group member selection
        userId: member.userId,
        role: member.role,
        displayName: member.displayName,
        isMuted: member.isMuted,
        joinedAt: member.joinedAt,
        email: member.email,
        iconLetters: member.iconLetters,
        iconColor: member.iconColor,
      };
    });

    // Trial users get admin-level permissions (20-day trial)
    const daysSinceCreation = membership.user ? (Date.now() - new Date(membership.user.createdAt).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
    const isOnTrial = membership.user && !membership.user.isSubscribed && daysSinceCreation <= 20;
    const effectiveRole = isOnTrial ? 'admin' : membership.role;

    res.status(200).json({
      success: true,
      group: {
        ...group,
        members: membersWithLatestProfile,
        memberCount: membersWithLatestProfile.length, // Add member count for dashboard display
        userRole: effectiveRole,
        currentUserId: userId, // Include current user ID so frontend can prevent self-management
        currentUserMember: {
          groupMemberId: membership.groupMemberId,
          role: effectiveRole,
          displayName: membership.displayName,
        },
      },
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      error: 'Failed to get group',
      message: error.message,
    });
  }
}

/**
 * Create a new group
 * POST /groups
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { name, icon, backgroundColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Group name is required',
      });
    }

    // Check if user has active subscription or is on trial (required to be admin)
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        isSubscribed: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User account not found',
      });
    }

    // Calculate if user is on trial (account created within last 20 days and not subscribed)
    const daysSinceCreation = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const isOnTrial = !user.isSubscribed && daysSinceCreation <= 20;

    const hasAccess = user.isSubscribed || isOnTrial;
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Subscription Required',
        message: 'Active subscription or trial required to create groups',
      });
    }

    // Generate display name and icon letters
    const displayName = req.user.given_name || req.user.email;
    const iconLetters = generateIconLetters(displayName);

    // Create group with creator as admin
    const group = await prisma.group.create({
      data: {
        name: name,
        icon: icon || null,
        backgroundColor: backgroundColor || '#6200ee',
        createdByUserId: userId,
        createdByTrialUser: false, // TODO: Implement trial status tracking
        members: {
          create: {
            userId: userId,
            role: 'admin',
            displayName: displayName,
            iconLetters: iconLetters,
            iconColor: '#6200ee', // Default purple color
            email: req.user.email,
            isRegistered: true,
          },
        },
      },
      include: {
        members: {
          select: {
            groupMemberId: true,
            userId: true,
            role: true,
            displayName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: group.groupId,
        action: 'create_group',
        performedBy: group.members[0].groupMemberId, // Use groupMemberId, not userId
        performedByName: displayName,
        performedByEmail: req.user.email,
        actionLocation: 'create_group',
        messageContent: `Created group "${name}"`,
      },
    });

    res.status(201).json({
      success: true,
      group: group,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      error: 'Failed to create group',
      message: error.message,
    });
  }
}

/**
 * Invite a member to a group
 * POST /groups/:groupId/members/invite
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function inviteMember(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { email, role, displayName: providedDisplayName, memberIcon, iconColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and role are required',
      });
    }

    // Validate role
    const validRoles = ['admin', 'parent', 'child', 'caregiver', 'supervisor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid email format',
      });
    }

    // Check if the requesting user is a member of this group
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!requesterMembership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Check if the requesting user is an admin
    if (requesterMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can invite members',
      });
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found',
      });
    }

    // Check if a user with this email already exists
    let targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // VALIDATION: Cannot add admin role unless user is registered with active subscription/trial
    if (role === 'admin') {
      if (!targetUser) {
        return res.status(400).json({
          error: 'Invalid Role',
          message: 'Cannot add non-registered users as admin. Admins must have an account with active subscription.',
        });
      }

      // Check if user has active subscription or trial
      const daysSinceCreation = (Date.now() - new Date(targetUser.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const isOnTrial = !targetUser.isSubscribed && daysSinceCreation <= 20;
      const hasActiveSubscription = targetUser.isSubscribed || isOnTrial;

      if (!hasActiveSubscription) {
        return res.status(400).json({
          error: 'Subscription Required',
          message: 'User must have an active subscription or trial to be added as admin.',
        });
      }
    }

    // Check if user/email is already a member
    if (targetUser) {
      // Check by userId for registered users
      const existingMembership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: targetUser.userId,
          },
        },
      });

      if (existingMembership) {
        return res.status(400).json({
          error: 'Already Member',
          message: 'User is already a member of this group',
        });
      }
    } else {
      // Check by email for unregistered members
      const existingMembership = await prisma.groupMember.findFirst({
        where: {
          groupId: groupId,
          email: email.toLowerCase(),
          userId: null, // Only check unregistered members
        },
      });

      if (existingMembership) {
        return res.status(400).json({
          error: 'Already Invited',
          message: 'This email has already been invited to the group',
        });
      }
    }

    // Use provided display name and icon, or generate them
    const displayName = providedDisplayName || (targetUser
      ? targetUser.givenName || email
      : email.split('@')[0]);
    const iconLetters = memberIcon || generateIconLetters(displayName);

    // Count current admins in the group
    const adminCount = await prisma.groupMember.count({
      where: {
        groupId: groupId,
        role: 'admin',
      },
    });

    // Check if ALL other admins have granted this admin auto-approve permission for adding people
    let canAutoApprove = false;
    let autoApproveVotes = [];

    if (adminCount >= 2) {
      // Get all other admins in the group
      const otherAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
          groupMemberId: {
            not: requesterMembership.groupMemberId,
          },
        },
        select: {
          groupMemberId: true,
          displayName: true,
        },
      });

      // Check if enough other admins have granted auto-approve permission (>50%)
      const autoApprovePermissions = await prisma.adminPermission.findMany({
        where: {
          groupId: groupId,
          receivingAdminId: requesterMembership.groupMemberId,
          autoApproveAddPeople: true,
        },
        select: {
          grantingAdminId: true,
        },
      });

      const grantorIds = new Set(autoApprovePermissions.map(p => p.grantingAdminId));

      // Count votes: requester (1) + auto-approvers
      const requesterVote = 1;
      const autoApproveVoteCount = otherAdmins.filter(admin => grantorIds.has(admin.groupMemberId)).length;
      const totalVotes = requesterVote + autoApproveVoteCount;
      const totalAdmins = adminCount;
      const approvalPercentage = (totalVotes / totalAdmins) * 100;

      // Need >50% approval
      canAutoApprove = approvalPercentage > 50;

      // If can auto-approve, prepare the votes
      if (canAutoApprove) {
        autoApproveVotes = otherAdmins
          .filter(admin => grantorIds.has(admin.groupMemberId))
          .map(admin => ({
            groupMemberId: admin.groupMemberId,
            displayName: admin.displayName,
          }));
      }
    }

    // Determine status: auto-approve if only 1 admin OR if >50% admins granted permission
    const shouldAutoApprove = adminCount < 2 || canAutoApprove;

    // Get ALL current admins for snapshot in time
    const allCurrentAdmins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
      },
      select: {
        groupMemberId: true,
      },
    });

    const allAdminIds = allCurrentAdmins.map(a => a.groupMemberId);

    if (shouldAutoApprove) {
      // Add member immediately - approval is auto-approved
      // Add member to group with different logic based on registration status:
      //
      // REGISTERED USERS (targetUser exists):
      //   - Create pending invitation (isRegistered: false)
      //   - User must accept via InvitesScreen to join group
      //   - Links to userId immediately but not active member until accepted
      //
      // PLACEHOLDER MEMBERS (targetUser does not exist):
      //   - Create immediate member (isRegistered: true, userId: null)
      //   - Used for people who will never log in (e.g., Granny for calendar/finance tracking)
      //   - Appears immediately in group, no invitation needed
      //   - When/if they register later, invitation system handles linking
      const newMembership = await prisma.groupMember.create({
        data: {
          groupId: groupId,
          userId: targetUser ? targetUser.userId : null,
          role: role,
          displayName: displayName,
          iconLetters: iconLetters,
          iconColor: iconColor || '#6200ee',
          email: email.toLowerCase(),
          isRegistered: targetUser ? false : true, // Registered users get invitation, placeholders are immediate members
        },
      });

      // Create approval record for audit trail (auto-approved)
      const approval = await prisma.approval.create({
        data: {
          groupId: groupId,
          requestedBy: requesterMembership.groupMemberId,
          approvalType: 'add_member',
          requiresAllAdmins: false,
          requiredApprovalPercentage: '50.00',
          status: 'approved',
          approvalData: JSON.stringify({
            targetEmail: email.toLowerCase(),
            targetDisplayName: displayName,
            targetRole: role,
            targetUserId: targetUser?.userId || null,
            allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
          }),
        },
      });

      // Create requester's vote
      await prisma.approvalVote.create({
        data: {
          approvalId: approval.approvalId,
          adminId: requesterMembership.groupMemberId,
          vote: 'approve',
          isAutoApproved: false,
        },
      });

      // If auto-approved, create votes for other admins who granted permission
      if (adminCount >= 2 && canAutoApprove) {
        for (const voter of autoApproveVotes) {
          await prisma.approvalVote.create({
            data: {
              approvalId: approval.approvalId,
              adminId: voter.groupMemberId,
              vote: 'approve',
              isAutoApproved: true,
            },
          });
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'add_member',
          performedBy: requesterMembership.groupMemberId,
          performedByName: requesterMembership.displayName,
          performedByEmail: requesterMembership.email || 'N/A',
          actionLocation: 'group_settings',
          messageContent: adminCount < 2
            ? `Added ${email} as ${role} (solo admin, auto-approved)`
            : `Added ${email} as ${role} (auto-approved by ${autoApproveVotes.length} admin${autoApproveVotes.length !== 1 ? 's' : ''})`,
        },
      });

      // TODO: Send invitation email to the user

      res.status(201).json({
        success: true,
        message: `Successfully invited ${email} to the group`,
        member: {
          groupMemberId: newMembership.groupMemberId,
          userId: newMembership.userId, // null if unregistered
          role: newMembership.role,
          displayName: newMembership.displayName,
          email: newMembership.email,
          isRegistered: newMembership.isRegistered,
        },
      });
    } else {
      // Create approval request - needs votes from other admins
      const approval = await prisma.approval.create({
        data: {
          groupId: groupId,
          requestedBy: requesterMembership.groupMemberId,
          approvalType: 'add_member',
          requiresAllAdmins: false,
          requiredApprovalPercentage: '50.00',
          status: 'pending',
          approvalData: JSON.stringify({
            targetEmail: email.toLowerCase(),
            targetDisplayName: displayName,
            targetRole: role,
            targetUserId: targetUser?.userId || null,
            targetIconLetters: iconLetters,
            targetIconColor: iconColor || '#6200ee',
            targetIsRegistered: targetUser ? false : true,
            allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
          }),
        },
      });

      // Always create requester's vote (they automatically approve by requesting)
      await prisma.approvalVote.create({
        data: {
          approvalId: approval.approvalId,
          adminId: requesterMembership.groupMemberId,
          vote: 'approve',
          isAutoApproved: false,
        },
      });

      // Create audit log for approval request
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'request_approval',
          performedBy: requesterMembership.groupMemberId,
          performedByName: requesterMembership.displayName,
          performedByEmail: requesterMembership.email || 'N/A',
          actionLocation: 'group_settings',
          messageContent: `Requested approval to add ${email} as ${role}`,
        },
      });

      res.status(202).json({
        success: true,
        message: `Approval request created to add ${email} to the group. Waiting for other admin approvals.`,
        requiresApproval: true,
        approvalId: approval.approvalId,
      });
    }
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      error: 'Failed to invite member',
      message: error.message,
    });
  }
}

/**
 * Update group details
 * PUT /groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function updateGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { name, icon, backgroundColor } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate inputs
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Group name is required',
      });
    }

    // Check if user is an admin of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    if (membership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can update group details',
      });
    }

    // Update group
    const updatedGroup = await prisma.group.update({
      where: { groupId: groupId },
      data: {
        name: name.trim(),
        icon: icon?.trim() || null,
        backgroundColor: backgroundColor || '#6200ee',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'update_group',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email,
        actionLocation: 'group_settings',
        messageContent: `Updated group details for "${name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      group: updatedGroup,
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      error: 'Failed to update group',
      message: error.message,
    });
  }
}

/**
 * Delete group
 * DELETE /groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is an admin of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    if (membership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can delete groups',
      });
    }

    // Get the group to save name for audit log
    const group = await prisma.group.findUnique({
      where: { groupId: groupId },
    });

    if (!group) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Group not found',
      });
    }

    // Check if user is the only admin
    const adminCount = await prisma.groupMember.count({
      where: {
        groupId: groupId,
        role: 'admin',
      },
    });

    // If multiple admins, create approval workflow (appplan.md line 297: >50% approval required)
    if (adminCount > 1) {
      // Get all other admins in the group
      const otherAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
          groupMemberId: {
            not: membership.groupMemberId,
          },
        },
        select: {
          groupMemberId: true,
          displayName: true,
        },
      });

      // Check if ALL other admins have granted auto-approve permission
      // Note: Auto-approve for delete group doesn't exist in schema, so we'll skip this check
      // Deleting group always requires manual approval from other admins

      // Get ALL current admins for snapshot in time
      const allCurrentAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
        },
        select: {
          groupMemberId: true,
        },
      });

      const allAdminIds = allCurrentAdmins.map(a => a.groupMemberId);

      // Create approval record (always, for audit trail)
      const approval = await prisma.approval.create({
        data: {
          groupId: groupId,
          requestedBy: membership.groupMemberId,
          approvalType: 'delete_group',
          requiresAllAdmins: false, // Deleting group requires >50% approval
          requiredApprovalPercentage: '50.00',
          status: 'pending', // Always pending for multi-admin delete
          approvalData: JSON.stringify({
            groupName: group.name,
            allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
          }),
        },
      });

      // Always create requester's vote (they automatically approve by requesting)
      await prisma.approvalVote.create({
        data: {
          approvalId: approval.approvalId,
          adminId: membership.groupMemberId,
          vote: 'approve',
          isAutoApproved: false,
        },
      });

      // Create audit log for approval request
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: membership.email,
          action: 'request_approval',
          actionLocation: 'group_settings',
          messageContent: `Requested approval to delete group "${group.name}"`,
        },
      });

      return res.status(200).json({
        success: true,
        requiresApproval: true,
        approvalId: approval.approvalId,
        message: 'Approval request created. Other admins must approve group deletion.',
      });
    }

    // Single admin: Delete immediately
    // Get ALL current admins for snapshot in time (will just be this one admin)
    const allCurrentAdmins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
      },
      select: {
        groupMemberId: true,
      },
    });

    const allAdminIds = allCurrentAdmins.map(a => a.groupMemberId);

    // Soft delete the group (set isHidden = true)
    await prisma.group.update({
      where: { groupId: groupId },
      data: { isHidden: true },
    });

    // Create approval record for audit trail (auto-approved)
    const approval = await prisma.approval.create({
      data: {
        groupId: groupId,
        requestedBy: membership.groupMemberId,
        approvalType: 'delete_group',
        requiresAllAdmins: false,
        requiredApprovalPercentage: '50.00',
        status: 'approved',
        approvalData: JSON.stringify({
          groupName: group.name,
          allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
        }),
      },
    });

    // Create requester's vote
    await prisma.approvalVote.create({
      data: {
        approvalId: approval.approvalId,
        adminId: membership.groupMemberId,
        vote: 'approve',
        isAutoApproved: false,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'delete_group',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email,
        actionLocation: 'group_settings',
        messageContent: `Deleted group "${group.name}" (auto-approved: only admin)`,
      },
    });

    res.status(200).json({
      success: true,
      requiresApproval: false,
      approvalId: approval.approvalId,
      message: 'Group deleted successfully (auto-approved: only admin)',
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      error: 'Failed to delete group',
      message: error.message,
    });
  }
}

/**
 * Pin a group for the current user
 * PUT /groups/:groupId/pin
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function pinGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Get the highest pinnedOrder for this user
    const pinnedGroups = await prisma.groupMember.findMany({
      where: {
        userId: userId,
        isPinned: true,
      },
      select: {
        pinnedOrder: true,
      },
      orderBy: {
        pinnedOrder: 'desc',
      },
      take: 1,
    });

    const nextOrder = pinnedGroups.length > 0 ? (pinnedGroups[0].pinnedOrder || 0) + 1 : 1;

    // Pin the group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isPinned: true,
        pinnedOrder: nextOrder,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group pinned successfully',
    });
  } catch (error) {
    console.error('Pin group error:', error);
    res.status(500).json({
      error: 'Failed to pin group',
      message: error.message,
    });
  }
}

/**
 * Unpin a group for the current user
 * PUT /groups/:groupId/unpin
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function unpinGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Unpin the group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isPinned: false,
        pinnedOrder: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group unpinned successfully',
    });
  } catch (error) {
    console.error('Unpin group error:', error);
    res.status(500).json({
      error: 'Failed to unpin group',
      message: error.message,
    });
  }
}

/**
 * Reorder pinned groups for the current user
 * PUT /groups/reorder-pins
 * Body: { groupIds: [groupId1, groupId2, ...] } - ordered list of pinned group IDs
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function reorderPinnedGroups(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'groupIds must be a non-empty array',
      });
    }

    // Update pinnedOrder for each group
    const updatePromises = groupIds.map((groupId, index) =>
      prisma.groupMember.updateMany({
        where: {
          groupId: groupId,
          userId: userId,
          isPinned: true,
        },
        data: {
          pinnedOrder: index + 1,
        },
      })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Pinned groups reordered successfully',
    });
  } catch (error) {
    console.error('Reorder pinned groups error:', error);
    res.status(500).json({
      error: 'Failed to reorder pinned groups',
      message: error.message,
    });
  }
}

/**
 * Mute a group for the current user
 * PUT /groups/:groupId/mute
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function muteGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Mute the group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isMuted: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group muted successfully',
    });
  } catch (error) {
    console.error('Mute group error:', error);
    res.status(500).json({
      error: 'Failed to mute group',
      message: error.message,
    });
  }
}

/**
 * Unmute a group for the current user
 * PUT /groups/:groupId/unmute
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function unmuteGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this group',
      });
    }

    // Unmute the group
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isMuted: false,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Group unmuted successfully',
    });
  } catch (error) {
    console.error('Unmute group error:', error);
    res.status(500).json({
      error: 'Failed to unmute group',
      message: error.message,
    });
  }
}

/**
 * Change a member's role in a group
 * PUT /groups/:groupId/members/:userId/role
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function changeMemberRole(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const { groupId, userId: targetUserId } = req.params;
    const { role } = req.body;

    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate role
    const validRoles = ['admin', 'parent', 'child', 'caregiver', 'supervisor'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Validate targetUserId is not null (member must have accepted invite)
    if (!targetUserId || targetUserId === 'null' || targetUserId === 'undefined') {
      return res.status(400).json({
        error: 'Invalid member',
        message: 'Cannot change role for members who have not accepted their invite',
      });
    }

    // Check if current user is admin of the group
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change member roles',
      });
    }

    // Can't change your own role
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You cannot change your own role',
      });
    }

    // Get target user membership
    const targetMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Member not found in this group',
      });
    }

    const oldRole = targetMembership.role;

    // Debug: Log target membership data
    console.log('[DEBUG changeMemberRole] Target membership:', {
      groupMemberId: targetMembership.groupMemberId,
      displayName: targetMembership.displayName,
      email: targetMembership.email,
      userEmail: targetMembership.user?.email,
      userDisplayName: targetMembership.user?.displayName,
    });

    // If changing role TO admin, ALWAYS create an approval card (for audit trail)
    if (role === 'admin' && oldRole !== 'admin') {
      // Count current admins in the group
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId: groupId,
          role: 'admin',
        },
      });

      // Check if ALL other admins have granted this admin auto-approve permission for role changes
      let canAutoApprove = false;
      let autoApproveVotes = [];

      if (adminCount >= 2) {
        // Get all other admins in the group
        const otherAdmins = await prisma.groupMember.findMany({
          where: {
            groupId: groupId,
            role: 'admin',
            groupMemberId: {
              not: currentUserMembership.groupMemberId,
            },
          },
          select: {
            groupMemberId: true,
            displayName: true,
          },
        });

        // Check if ALL other admins have granted auto-approve permission
        const autoApprovePermissions = await prisma.adminPermission.findMany({
          where: {
            groupId: groupId,
            receivingAdminId: currentUserMembership.groupMemberId,
            autoApproveChangeRoles: true,
          },
          select: {
            grantingAdminId: true,
          },
        });

        const grantorIds = new Set(autoApprovePermissions.map(p => p.grantingAdminId));

        // ALL other admins must have granted permission (100% approval requirement for adding admin)
        canAutoApprove = otherAdmins.every(admin => grantorIds.has(admin.groupMemberId));

        // If can auto-approve, prepare the votes
        if (canAutoApprove) {
          autoApproveVotes = otherAdmins.map(admin => ({
            groupMemberId: admin.groupMemberId,
            displayName: admin.displayName,
          }));
        }
      }

      // Determine status: auto-approve if only 1 admin OR if all admins granted permission
      const shouldAutoApprove = adminCount < 2 || canAutoApprove;

      // Get ALL current admins for snapshot in time
      const allCurrentAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
        },
        select: {
          groupMemberId: true,
        },
      });

      const allAdminIds = allCurrentAdmins.map(a => a.groupMemberId);

      // Create approval record (always, for audit trail)
      const approval = await prisma.approval.create({
        data: {
          groupId: groupId,
          requestedBy: currentUserMembership.groupMemberId,
          approvalType: 'change_role_to_admin',
          requiresAllAdmins: true, // Adding admin requires 100% approval
          requiredApprovalPercentage: '100.00',
          status: shouldAutoApprove ? 'approved' : 'pending',
          approvalData: JSON.stringify({
            targetUserId: targetUserId,
            targetGroupMemberId: targetMembership.groupMemberId,
            targetEmail: targetMembership.user?.email || targetMembership.displayName,
            targetDisplayName: targetMembership.user?.displayName || targetMembership.displayName,
            oldRole: oldRole,
            newRole: role,
            allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
          }),
        },
      });

      // Always create requester's vote (they automatically approve by requesting)
      await prisma.approvalVote.create({
        data: {
          approvalId: approval.approvalId,
          adminId: currentUserMembership.groupMemberId,
          vote: 'approve',
          isAutoApproved: false, // Requester's own vote
        },
      });

      // If auto-approving, create additional votes from other admins
      if (shouldAutoApprove) {
        // Create auto-approval votes from other admins (if any)
        if (autoApproveVotes.length > 0) {
          await prisma.approvalVote.createMany({
            data: autoApproveVotes.map(admin => ({
              approvalId: approval.approvalId,
              adminId: admin.groupMemberId,
              vote: 'approve',
              isAutoApproved: true, // These are auto-approved via permissions
            })),
          });
        }

        // Execute the role change immediately
        await prisma.groupMember.update({
          where: {
            groupId_userId: {
              groupId: groupId,
              userId: targetUserId,
            },
          },
          data: {
            role: role,
          },
        });

        // Create audit log for successful change
        const autoApproveReason = adminCount < 2
          ? 'only admin'
          : 'all admins granted auto-approve permission';

        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            performedBy: currentUserMembership.groupMemberId,
            performedByName: currentUserMembership.displayName,
            performedByEmail: currentUserMembership.email || req.user?.email,
            action: 'change_member_role',
            actionLocation: 'group_settings',
            messageContent: `Changed role of ${targetMembership.user?.displayName || targetMembership.email} from ${oldRole} to ${role} (auto-approved: ${autoApproveReason})`,
          },
        });

        return res.status(200).json({
          success: true,
          requiresApproval: false,
          approvalId: approval.approvalId,
          message: `Role changed successfully (auto-approved: ${autoApproveReason}).`,
        });
      } else {
        // 2+ admins without auto-approve permission: Create approval request and wait
        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            performedBy: currentUserMembership.groupMemberId,
            performedByName: currentUserMembership.displayName,
            performedByEmail: currentUserMembership.email || req.user?.email,
            action: 'request_approval',
            actionLocation: 'group_settings',
            messageContent: `Requested approval to change role of ${targetMembership.user?.displayName || targetMembership.email} from ${oldRole} to ${role}`,
          },
        });

        return res.status(200).json({
          success: true,
          requiresApproval: true,
          approvalId: approval.approvalId,
          message: 'Approval request created. Other admins must approve this role change.',
        });
      }
    }

    // If changing role FROM admin, ALWAYS create an approval card (for audit trail)
    if (oldRole === 'admin' && role !== 'admin') {
      // Count current admins in the group
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId: groupId,
          role: 'admin',
        },
      });

      // Check if ALL other admins have granted this admin auto-approve permission for role changes
      let canAutoApprove = false;
      let autoApproveVotes = [];

      if (adminCount >= 2) {
        // Get all other admins in the group (excluding the target admin being demoted)
        const otherAdmins = await prisma.groupMember.findMany({
          where: {
            groupId: groupId,
            role: 'admin',
            groupMemberId: {
              notIn: [currentUserMembership.groupMemberId, targetMembership.groupMemberId],
            },
          },
          select: {
            groupMemberId: true,
            displayName: true,
          },
        });

        // Check if ALL other admins have granted auto-approve permission
        const autoApprovePermissions = await prisma.adminPermission.findMany({
          where: {
            groupId: groupId,
            receivingAdminId: currentUserMembership.groupMemberId,
            autoApproveChangeRoles: true,
          },
          select: {
            grantingAdminId: true,
          },
        });

        const grantorIds = new Set(autoApprovePermissions.map(p => p.grantingAdminId));

        // ALL other admins must have granted permission (>50% approval requirement for removing admin)
        // But we auto-approve if all admins granted permission
        canAutoApprove = otherAdmins.every(admin => grantorIds.has(admin.groupMemberId));

        // If can auto-approve, prepare the votes
        if (canAutoApprove) {
          autoApproveVotes = otherAdmins.map(admin => ({
            groupMemberId: admin.groupMemberId,
            displayName: admin.displayName,
          }));
        }
      }

      // Determine status: auto-approve if only 1 admin OR if all admins granted permission
      const shouldAutoApprove = adminCount < 2 || canAutoApprove;

      // Get ALL current admins for snapshot in time
      const allCurrentAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
        },
        select: {
          groupMemberId: true,
        },
      });

      const allAdminIds = allCurrentAdmins.map(a => a.groupMemberId);

      // Create approval record (always, for audit trail)
      const approval = await prisma.approval.create({
        data: {
          groupId: groupId,
          requestedBy: currentUserMembership.groupMemberId,
          approvalType: 'change_role_from_admin',
          requiresAllAdmins: false, // Removing admin requires >50% approval
          requiredApprovalPercentage: '50.00',
          status: shouldAutoApprove ? 'approved' : 'pending',
          approvalData: JSON.stringify({
            targetUserId: targetUserId,
            targetGroupMemberId: targetMembership.groupMemberId,
            targetEmail: targetMembership.user?.email || targetMembership.displayName,
            targetDisplayName: targetMembership.user?.displayName || targetMembership.displayName,
            oldRole: oldRole,
            newRole: role,
            allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
          }),
        },
      });

      // Always create requester's vote (they automatically approve by requesting)
      await prisma.approvalVote.create({
        data: {
          approvalId: approval.approvalId,
          adminId: currentUserMembership.groupMemberId,
          vote: 'approve',
          isAutoApproved: false, // Requester's own vote
        },
      });

      // If auto-approving, create additional votes from other admins
      if (shouldAutoApprove) {
        // Create auto-approval votes from other admins (if any)
        if (autoApproveVotes.length > 0) {
          await prisma.approvalVote.createMany({
            data: autoApproveVotes.map(admin => ({
              approvalId: approval.approvalId,
              adminId: admin.groupMemberId,
              vote: 'approve',
              isAutoApproved: true, // These are auto-approved via permissions
            })),
          });
        }

        // Execute the role change immediately
        await prisma.groupMember.update({
          where: {
            groupId_userId: {
              groupId: groupId,
              userId: targetUserId,
            },
          },
          data: {
            role: role,
          },
        });

        // Create audit log for successful change
        const autoApproveReason = adminCount < 2
          ? 'only admin'
          : 'all admins granted auto-approve permission';

        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            performedBy: currentUserMembership.groupMemberId,
            performedByName: currentUserMembership.displayName,
            performedByEmail: currentUserMembership.email || req.user?.email,
            action: 'change_member_role',
            actionLocation: 'group_settings',
            messageContent: `Changed role of ${targetMembership.user?.displayName || targetMembership.email} from ${oldRole} to ${role} (auto-approved: ${autoApproveReason})`,
          },
        });

        return res.status(200).json({
          success: true,
          requiresApproval: false,
          approvalId: approval.approvalId,
          message: `Role changed successfully (auto-approved: ${autoApproveReason}).`,
        });
      } else {
        // 2+ admins without auto-approve permission: Create approval request and wait
        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            performedBy: currentUserMembership.groupMemberId,
            performedByName: currentUserMembership.displayName,
            performedByEmail: currentUserMembership.email || req.user?.email,
            action: 'request_approval',
            actionLocation: 'group_settings',
            messageContent: `Requested approval to change role of ${targetMembership.user?.displayName || targetMembership.email} from ${oldRole} to ${role}`,
          },
        });

        return res.status(200).json({
          success: true,
          requiresApproval: true,
          approvalId: approval.approvalId,
          message: 'Approval request created. Other admins must approve this role change.',
        });
      }
    }

    // For non-admin role changes, execute directly without approval
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      data: {
        role: role,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        performedBy: currentUserMembership.groupMemberId,
        performedByName: currentUserMembership.displayName,
        performedByEmail: currentUserMembership.email || req.user?.email,
        action: 'change_member_role',
        actionLocation: 'group_settings',
        messageContent: `Changed role of ${targetMembership.user?.displayName || targetMembership.email} from ${oldRole} to ${role}`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Member role changed from ${oldRole} to ${role}`,
    });
  } catch (error) {
    console.error('Change member role error:', error);
    res.status(500).json({
      error: 'Failed to change member role',
      message: error.message,
    });
  }
}

/**
 * Remove a member from a group
 * DELETE /groups/:groupId/members/:userId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function removeMember(req, res) {
  try {
    const currentUserId = req.user?.userId;
    const { groupId, userId: targetUserId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate targetUserId is not null (member must have accepted invite)
    if (!targetUserId || targetUserId === 'null' || targetUserId === 'undefined') {
      return res.status(400).json({
        error: 'Invalid member',
        message: 'Cannot remove members who have not accepted their invite',
      });
    }

    // Check if current user is admin of the group
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can remove members',
      });
    }

    // Can't remove yourself
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You cannot remove yourself from the group. Admins must use delete group instead.',
      });
    }

    // Get target user membership
    const targetMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Member not found in this group',
      });
    }

    const targetRole = targetMembership.role;
    const targetDisplayName = targetMembership.user?.displayName || targetMembership.email;

    // If removing an ADMIN, create approval workflow (appplan.md line 297: >50% approval required)
    if (targetRole === 'admin') {
      // Count current admins in the group
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId: groupId,
          role: 'admin',
        },
      });

      // Check if ALL other admins have granted this admin auto-approve permission
      let canAutoApprove = false;
      let autoApproveVotes = [];

      if (adminCount >= 2) {
        // Get all other admins (excluding requester and target)
        const otherAdmins = await prisma.groupMember.findMany({
          where: {
            groupId: groupId,
            role: 'admin',
            groupMemberId: {
              notIn: [currentUserMembership.groupMemberId, targetMembership.groupMemberId],
            },
          },
          select: {
            groupMemberId: true,
            displayName: true,
          },
        });

        // Check if ALL other admins have granted auto-approve permission for removing members
        const autoApprovePermissions = await prisma.adminPermission.findMany({
          where: {
            groupId: groupId,
            receivingAdminId: currentUserMembership.groupMemberId,
            autoApproveRemovePeople: true,
          },
          select: {
            grantingAdminId: true,
          },
        });

        const grantorIds = new Set(autoApprovePermissions.map(p => p.grantingAdminId));

        // ALL other admins must have granted permission
        canAutoApprove = otherAdmins.every(admin => grantorIds.has(admin.groupMemberId));

        // If can auto-approve, prepare the votes
        if (canAutoApprove) {
          autoApproveVotes = otherAdmins.map(admin => ({
            groupMemberId: admin.groupMemberId,
            displayName: admin.displayName,
          }));
        }
      }

      // Determine status: auto-approve if only 1 admin OR if all admins granted permission
      const shouldAutoApprove = adminCount < 2 || canAutoApprove;

      // Get ALL current admins for snapshot in time
      const allCurrentAdmins = await prisma.groupMember.findMany({
        where: {
          groupId: groupId,
          role: 'admin',
        },
        select: {
          groupMemberId: true,
        },
      });

      const allAdminIds = allCurrentAdmins.map(a => a.groupMemberId);

      // Create approval record (always, for audit trail)
      const approval = await prisma.approval.create({
        data: {
          groupId: groupId,
          requestedBy: currentUserMembership.groupMemberId,
          approvalType: 'remove_member',
          requiresAllAdmins: false, // Removing admin requires >50% approval
          requiredApprovalPercentage: '50.00',
          status: shouldAutoApprove ? 'approved' : 'pending',
          approvalData: JSON.stringify({
            targetUserId: targetUserId,
            targetGroupMemberId: targetMembership.groupMemberId,
            targetEmail: targetMembership.user?.email || targetMembership.displayName,
            targetDisplayName: targetMembership.user?.displayName || targetMembership.displayName,
            targetRole: targetRole,
            allAdminIds: allAdminIds, // Snapshot of admins at approval creation time
          }),
        },
      });

      // Always create requester's vote (they automatically approve by requesting)
      await prisma.approvalVote.create({
        data: {
          approvalId: approval.approvalId,
          adminId: currentUserMembership.groupMemberId,
          vote: 'approve',
          isAutoApproved: false,
        },
      });

      // If auto-approving, create additional votes from other admins and execute
      if (shouldAutoApprove) {
        // Create auto-approval votes from other admins (if any)
        if (autoApproveVotes.length > 0) {
          await prisma.approvalVote.createMany({
            data: autoApproveVotes.map(admin => ({
              approvalId: approval.approvalId,
              adminId: admin.groupMemberId,
              vote: 'approve',
              isAutoApproved: true,
            })),
          });
        }

        // Delete the membership (hard delete as per original implementation)
        await prisma.groupMember.delete({
          where: {
            groupId_userId: {
              groupId: groupId,
              userId: targetUserId,
            },
          },
        });

        // Create audit log
        const autoApproveReason = adminCount < 2
          ? 'only admin'
          : 'all admins granted auto-approve permission';

        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            performedBy: currentUserMembership.groupMemberId,
            performedByName: currentUserMembership.displayName,
            performedByEmail: currentUserMembership.email || req.user?.email,
            action: 'remove_member',
            actionLocation: 'group_settings',
            messageContent: `Removed ${targetDisplayName} (admin) from group (auto-approved: ${autoApproveReason})`,
          },
        });

        return res.status(200).json({
          success: true,
          requiresApproval: false,
          approvalId: approval.approvalId,
          message: `Member removed successfully (auto-approved: ${autoApproveReason}).`,
        });
      } else {
        // 2+ admins without auto-approve permission: Create approval request and wait
        await prisma.auditLog.create({
          data: {
            groupId: groupId,
            performedBy: currentUserMembership.groupMemberId,
            performedByName: currentUserMembership.displayName,
            performedByEmail: currentUserMembership.email || req.user?.email,
            action: 'request_approval',
            actionLocation: 'group_settings',
            messageContent: `Requested approval to remove ${targetDisplayName} (admin) from group`,
          },
        });

        return res.status(200).json({
          success: true,
          requiresApproval: true,
          approvalId: approval.approvalId,
          message: 'Approval request created. Other admins must approve removing this admin.',
        });
      }
    }

    // For non-admin members, delete directly (no approval needed)
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: targetUserId,
        },
      },
    });

    // CRITICAL: If removed member was an admin with pending approval votes, clean up approvals
    if (targetRole === 'admin') {
      await cleanupAdminApprovals(groupId, targetMembership.groupMemberId);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        userId: currentUserId,
        action: 'remove_member',
        details: `Removed member ${targetMembership.user.email} (${targetMembership.role}) from group`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Member removed from group successfully',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      error: 'Failed to remove member',
      message: error.message,
    });
  }
}

/**
 * Leave a group (for non-admin members)
 * POST /groups/:groupId/leave
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function leaveGroup(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Get user membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'You are not a member of this group',
      });
    }

    if (membership.isHidden) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'You have already left this group',
      });
    }

    // Admins cannot leave - they must delete the group or transfer admin first
    if (membership.role === 'admin') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Admins cannot leave the group. Please delete the group or transfer admin role first.',
      });
    }

    // Soft delete the membership
    await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: groupId,
          userId: userId,
        },
      },
      data: {
        isHidden: true,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        userId: userId,
        action: 'leave_group',
        details: `User left the group (role: ${membership.role})`,
        ipAddress: req.ip,
      },
    });

    res.status(200).json({
      success: true,
      message: `You have left ${membership.group.name}`,
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      error: 'Failed to leave group',
      message: error.message,
    });
  }
}

/**
 * Get group settings (role permissions and preferences)
 * GET /groups/:groupId/settings
 */
async function getGroupSettings(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user is a member
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    // Get or create group settings
    let settings = await prisma.groupSettings.findUnique({
      where: { groupId: groupId },
    });

    // If settings don't exist, create them with defaults
    if (!settings) {
      settings = await prisma.groupSettings.create({
        data: {
          groupId: groupId,
        },
      });
    }

    res.status(200).json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    console.error('Get group settings error:', error);
    res.status(500).json({
      error: 'Failed to get group settings',
      message: error.message,
    });
  }
}

/**
 * Update group settings (admin only)
 * PUT /groups/:groupId/settings
 */
async function updateGroupSettings(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const {
      parentsCreateMessageGroups,
      childrenCreateMessageGroups,
      caregiversCreateMessageGroups,
      financeVisibleToParents,
      financeCreatableByParents,
      financeVisibleToCaregivers,
      financeCreatableByCaregivers,
      financeVisibleToChildren,
      financeCreatableByChildren,
      defaultCurrency,
    } = req.body;

    // Verify user is an admin
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admins can update group settings',
      });
    }

    // Enforce dependency: finance creatable requires finance visible
    const updatedData = {
      parentsCreateMessageGroups,
      childrenCreateMessageGroups,
      caregiversCreateMessageGroups,
      financeVisibleToParents,
      financeCreatableByParents: financeVisibleToParents ? financeCreatableByParents : false,
      financeVisibleToCaregivers,
      financeCreatableByCaregivers: financeVisibleToCaregivers ? financeCreatableByCaregivers : false,
      financeVisibleToChildren,
      financeCreatableByChildren: financeVisibleToChildren ? financeCreatableByChildren : false,
    };

    // Add defaultCurrency if provided
    if (defaultCurrency !== undefined) {
      updatedData.defaultCurrency = defaultCurrency;
    }

    // Update or create settings
    const settings = await prisma.groupSettings.upsert({
      where: { groupId: groupId },
      update: updatedData,
      create: {
        groupId: groupId,
        ...updatedData,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || req.user?.email,
        action: 'update_group_settings',
        actionLocation: 'group_settings',
        messageContent: 'Updated group permission settings',
      },
    });

    res.status(200).json({
      success: true,
      settings: settings,
      message: 'Group settings updated successfully',
    });
  } catch (error) {
    console.error('Update group settings error:', error);
    res.status(500).json({
      error: 'Failed to update group settings',
      message: error.message,
    });
  }
}

/**
 * Get admin permissions for a group (shows auto-approval settings)
 * GET /groups/:groupId/admin-permissions
 */
async function getAdminPermissions(req, res) {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user is an admin
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admins can view admin permissions',
      });
    }

    // Get all admins in the group
    const admins = await prisma.groupMember.findMany({
      where: {
        groupId: groupId,
        role: 'admin',
      },
      select: {
        groupMemberId: true,
        userId: true,
        displayName: true,
        iconLetters: true,
        iconColor: true,
        email: true,
      },
    });

    // Get all permissions where current user is the granting admin
    const permissions = await prisma.adminPermission.findMany({
      where: {
        groupId: groupId,
        grantingAdminId: membership.groupMemberId,
      },
      include: {
        receivingAdmin: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
          },
        },
      },
    });

    // Filter out current user from other admins list
    const otherAdmins = admins.filter(admin => admin.userId !== userId);

    // Merge permissions into each admin object
    const adminsWithPermissions = otherAdmins.map(admin => {
      // Find permissions for this admin
      const adminPermission = permissions.find(p => p.receivingAdminId === admin.groupMemberId);

      return {
        ...admin,
        permissions: {
          canHideMessages: adminPermission?.autoApproveHideMessages || false,
          canChangeMessageDeletionSetting: adminPermission?.autoApproveChangeMessageDeletionSetting || false,
          canAddMembers: adminPermission?.autoApproveAddPeople || false,
          canRemoveMembers: adminPermission?.autoApproveRemovePeople || false,
          canAssignRoles: adminPermission?.autoApproveAssignRoles || false,
          canChangeRoles: adminPermission?.autoApproveChangeRoles || false,
          canAssignRelationships: adminPermission?.autoApproveAssignRelationships || false,
          canChangeRelationships: adminPermission?.autoApproveChangeRelationships || false,
          canCreateCalendarEvents: adminPermission?.autoApproveCalendarEntries || false,
          canAssignChildrenToEvents: adminPermission?.autoApproveAssignChildrenToEvents || false,
          canAssignCaregiversToEvents: adminPermission?.autoApproveAssignCaregiversToEvents || false,
        },
      };
    });

    res.status(200).json({
      success: true,
      admins: adminsWithPermissions, // Changed from otherAdmins to admins to match frontend expectation
    });
  } catch (error) {
    console.error('Get admin permissions error:', error);
    res.status(500).json({
      error: 'Failed to get admin permissions',
      message: error.message,
    });
  }
}

/**
 * Update admin permissions (auto-approval settings for specific admin)
 * PUT /groups/:groupId/admin-permissions/:targetAdminId
 */
async function updateAdminPermissions(req, res) {
  try {
    const { groupId, targetAdminId } = req.params;
    const userId = req.user.userId;

    // Map frontend field names to database field names
    const permissions = req.body;
    const autoApproveHideMessages = permissions.canHideMessages ?? permissions.autoApproveHideMessages;
    const autoApproveChangeMessageDeletionSetting = permissions.canChangeMessageDeletionSetting ?? permissions.autoApproveChangeMessageDeletionSetting;
    const autoApproveAddPeople = permissions.canAddMembers ?? permissions.autoApproveAddPeople;
    const autoApproveRemovePeople = permissions.canRemoveMembers ?? permissions.autoApproveRemovePeople;
    const autoApproveAssignRoles = permissions.canAssignRoles ?? permissions.autoApproveAssignRoles;
    const autoApproveChangeRoles = permissions.canChangeRoles ?? permissions.autoApproveChangeRoles;
    const autoApproveAssignRelationships = permissions.canAssignRelationships ?? permissions.autoApproveAssignRelationships;
    const autoApproveChangeRelationships = permissions.canChangeRelationships ?? permissions.autoApproveChangeRelationships;
    const autoApproveCalendarEntries = permissions.canCreateCalendarEvents ?? permissions.autoApproveCalendarEntries;
    const autoApproveAssignChildrenToEvents = permissions.canAssignChildrenToEvents ?? permissions.autoApproveAssignChildrenToEvents;
    const autoApproveAssignCaregiversToEvents = permissions.canAssignCaregiversToEvents ?? permissions.autoApproveAssignCaregiversToEvents;

    // Verify current user is an admin
    const grantingAdmin = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!grantingAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only admins can update admin permissions',
      });
    }

    // Verify target is an admin
    const receivingAdmin = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        groupMemberId: targetAdminId,
        role: 'admin',
      },
    });

    if (!receivingAdmin) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Target admin not found in this group',
      });
    }

    // Can't set permissions for yourself
    if (grantingAdmin.groupMemberId === targetAdminId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'You cannot set auto-approval permissions for yourself',
      });
    }

    // Update or create permission record
    const permission = await prisma.adminPermission.upsert({
      where: {
        groupId_grantingAdminId_receivingAdminId: {
          groupId: groupId,
          grantingAdminId: grantingAdmin.groupMemberId,
          receivingAdminId: targetAdminId,
        },
      },
      update: {
        autoApproveHideMessages,
        autoApproveChangeMessageDeletionSetting,
        autoApproveAddPeople,
        autoApproveRemovePeople,
        autoApproveAssignRoles,
        autoApproveChangeRoles,
        autoApproveAssignRelationships,
        autoApproveChangeRelationships,
        autoApproveCalendarEntries,
        autoApproveAssignChildrenToEvents,
        autoApproveAssignCaregiversToEvents,
      },
      create: {
        groupId: groupId,
        grantingAdminId: grantingAdmin.groupMemberId,
        receivingAdminId: targetAdminId,
        autoApproveHideMessages,
        autoApproveChangeMessageDeletionSetting,
        autoApproveAddPeople,
        autoApproveRemovePeople,
        autoApproveAssignRoles,
        autoApproveChangeRoles,
        autoApproveAssignRelationships,
        autoApproveChangeRelationships,
        autoApproveCalendarEntries,
        autoApproveAssignChildrenToEvents,
        autoApproveAssignCaregiversToEvents,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        performedBy: grantingAdmin.groupMemberId,
        performedByName: grantingAdmin.displayName,
        performedByEmail: grantingAdmin.email || req.user?.email,
        action: 'update_admin_permissions',
        actionLocation: 'group_settings',
        messageContent: `Updated auto-approval permissions for ${receivingAdmin.displayName}`,
      },
    });

    res.status(200).json({
      success: true,
      permission: permission,
      message: 'Admin permissions updated successfully',
    });
  } catch (error) {
    console.error('Update admin permissions error:', error);
    res.status(500).json({
      error: 'Failed to update admin permissions',
      message: error.message,
    });
  }
}

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  inviteMember,
  pinGroup,
  unpinGroup,
  reorderPinnedGroups,
  muteGroup,
  unmuteGroup,
  changeMemberRole,
  removeMember,
  leaveGroup,
  getGroupSettings,
  updateGroupSettings,
  getAdminPermissions,
  updateAdminPermissions,
};
