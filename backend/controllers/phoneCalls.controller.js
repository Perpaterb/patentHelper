/**
 * Phone Calls Controller
 *
 * Handles phone call operations within groups.
 * Features:
 * - View call history (users see their calls, admins see all)
 * - Initiate calls with member selection
 * - Accept/reject incoming calls
 * - Track call status and recordings
 * - Admin-only recording deletion
 */

const { prisma } = require('../config/database');
const { isGroupReadOnly, getReadOnlyErrorResponse } = require('../utils/permissions');
const audioConverter = require('../services/audioConverter');
const recorderService = require('../services/recorder.service');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * In-memory signaling store for WebRTC phone calls
 * Structure: { callId: { peerId: [signals] } }
 * Each signal: { type: 'offer'|'answer'|'ice-candidate', data: {...}, from: peerId, timestamp }
 */
const signalingStore = new Map();

// Clean up old signals after 5 minutes
const SIGNAL_TTL_MS = 5 * 60 * 1000;

function cleanupOldSignals() {
  const now = Date.now();
  for (const [callId, peers] of signalingStore.entries()) {
    for (const [peerId, signals] of Object.entries(peers)) {
      peers[peerId] = signals.filter(s => now - s.timestamp < SIGNAL_TTL_MS);
      if (peers[peerId].length === 0) {
        delete peers[peerId];
      }
    }
    if (Object.keys(peers).length === 0) {
      signalingStore.delete(callId);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupOldSignals, 60 * 1000);

/**
 * Check if user has permission to use phone calls
 * @param {Object} membership - The group membership object
 * @param {Object} settings - The group settings object
 * @returns {boolean} - Whether user can use phone calls
 */
function canUsePhoneCalls(membership, settings) {
  const role = membership.role;

  // Admins always have access
  if (role === 'admin') return true;

  // Check role-based permissions
  switch (role) {
    case 'parent':
      return settings?.phoneCallsUsableByParents !== false;
    case 'adult':
      return settings?.phoneCallsUsableByAdults !== false;
    case 'caregiver':
      return settings?.phoneCallsUsableByCaregivers !== false;
    case 'child':
      return settings?.phoneCallsUsableByChildren !== false;
    case 'supervisor':
      // Supervisors can never make calls
      return false;
    default:
      return false;
  }
}

/**
 * Check if user can see phone calls
 * @param {Object} membership - The group membership object
 * @param {Object} settings - The group settings object
 * @returns {boolean} - Whether user can see phone calls
 */
function canSeePhoneCalls(membership, settings) {
  const role = membership.role;

  // Admins always have access
  if (role === 'admin') return true;

  // Check role-based permissions
  switch (role) {
    case 'parent':
      return settings?.phoneCallsVisibleToParents !== false;
    case 'adult':
      return settings?.phoneCallsVisibleToAdults !== false;
    case 'caregiver':
      return settings?.phoneCallsVisibleToCaregivers !== false;
    case 'child':
      return settings?.phoneCallsVisibleToChildren !== false;
    case 'supervisor':
      return settings?.phoneCallsVisibleToSupervisors === true;
    default:
      return false;
  }
}

/**
 * Get phone call history for a group
 * GET /groups/:groupId/phone-calls
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getPhoneCalls(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get group settings
    const settings = await prisma.groupSettings.findUnique({
      where: { groupId },
    });

    // Check if user can see phone calls
    if (!canSeePhoneCalls(membership, settings)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view phone calls',
      });
    }

    // Build query filter
    // Admins see all calls, others see only calls they participated in
    const whereClause = {
      groupId: groupId,
    };

    if (membership.role !== 'admin') {
      whereClause.OR = [
        { initiatedBy: membership.groupMemberId },
        { participants: { some: { groupMemberId: membership.groupMemberId } } },
      ];
    }

    // Get phone calls
    const phoneCalls = await prisma.phoneCall.findMany({
      where: whereClause,
      include: {
        initiator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        participants: {
          include: {
            participant: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        },
        recordingHider: {
          select: {
            displayName: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Format response
    const formattedCalls = phoneCalls.map(call => ({
      callId: call.callId,
      groupId: call.groupId,
      status: call.status,
      startedAt: call.startedAt,
      connectedAt: call.connectedAt,
      endedAt: call.endedAt,
      durationMs: call.durationMs,
      initiator: {
        groupMemberId: call.initiator.groupMemberId,
        displayName: call.initiator.user?.displayName || call.initiator.displayName,
        iconLetters: call.initiator.user?.memberIcon || call.initiator.iconLetters,
        iconColor: call.initiator.user?.iconColor || call.initiator.iconColor,
        role: call.initiator.role,
      },
      participants: call.participants.map(p => ({
        groupMemberId: p.participant.groupMemberId,
        displayName: p.participant.user?.displayName || p.participant.displayName,
        iconLetters: p.participant.user?.memberIcon || p.participant.iconLetters,
        iconColor: p.participant.user?.iconColor || p.participant.iconColor,
        role: p.participant.role,
        status: p.status,
        invitedAt: p.invitedAt,
        respondedAt: p.respondedAt,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
      })),
      recording: call.recordingIsHidden ? {
        isHidden: true,
        hiddenBy: {
          displayName: call.recordingHider?.user?.displayName || call.recordingHider?.displayName || 'Admin',
          iconLetters: call.recordingHider?.user?.memberIcon || call.recordingHider?.iconLetters || '?',
          iconColor: call.recordingHider?.user?.iconColor || call.recordingHider?.iconColor || '#d32f2f',
        },
        hiddenAt: call.recordingHiddenAt,
      } : {
        isHidden: false,
        status: call.recordingStatus || (call.recordingUrl ? 'ready' : null),
        url: call.recordingUrl,
        durationMs: call.recordingDurationMs,
      },
    }));

    return res.json({
      success: true,
      phoneCalls: formattedCalls,
      hasMore: phoneCalls.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Get phone calls error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get phone calls',
      error: error.message,
    });
  }
}

/**
 * Get active/incoming calls for the current user
 * GET /groups/:groupId/phone-calls/active
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getActiveCalls(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get group settings
    const settings = await prisma.groupSettings.findUnique({
      where: { groupId },
    });

    // Check if user can see phone calls
    if (!canSeePhoneCalls(membership, settings)) {
      return res.json({
        success: true,
        activeCalls: [],
        incomingCalls: [],
      });
    }

    // Get active calls (user is participant and call is active or ringing)
    const calls = await prisma.phoneCall.findMany({
      where: {
        groupId: groupId,
        status: { in: ['ringing', 'active'] },
        OR: [
          { initiatedBy: membership.groupMemberId },
          { participants: { some: { groupMemberId: membership.groupMemberId } } },
        ],
      },
      include: {
        initiator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        participants: {
          include: {
            participant: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Separate into active calls (user has joined) and incoming calls (user hasn't responded)
    const activeCalls = [];
    const incomingCalls = [];

    for (const call of calls) {
      const userParticipant = call.participants.find(
        p => p.groupMemberId === membership.groupMemberId
      );
      const isInitiator = call.initiatedBy === membership.groupMemberId;

      const formattedCall = {
        callId: call.callId,
        groupId: call.groupId,
        status: call.status,
        startedAt: call.startedAt,
        connectedAt: call.connectedAt,
        initiator: {
          groupMemberId: call.initiator.groupMemberId,
          displayName: call.initiator.user?.displayName || call.initiator.displayName,
          iconLetters: call.initiator.user?.memberIcon || call.initiator.iconLetters,
          iconColor: call.initiator.user?.iconColor || call.initiator.iconColor,
          role: call.initiator.role,
        },
        participants: call.participants.map(p => ({
          groupMemberId: p.participant.groupMemberId,
          displayName: p.participant.user?.displayName || p.participant.displayName,
          iconLetters: p.participant.user?.memberIcon || p.participant.iconLetters,
          iconColor: p.participant.user?.iconColor || p.participant.iconColor,
          role: p.participant.role,
          status: p.status,
        })),
        userStatus: userParticipant?.status || (isInitiator ? 'initiator' : 'unknown'),
      };

      // If user is initiator or has joined/accepted, it's an active call
      if (isInitiator || userParticipant?.status === 'joined' || userParticipant?.status === 'accepted') {
        activeCalls.push(formattedCall);
      } else if (userParticipant?.status === 'invited') {
        // User hasn't responded yet - it's an incoming call
        incomingCalls.push(formattedCall);
      }
    }

    return res.json({
      success: true,
      activeCalls,
      incomingCalls,
    });
  } catch (error) {
    console.error('Get active calls error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get active calls',
      error: error.message,
    });
  }
}

/**
 * Initiate a new phone call
 * POST /groups/:groupId/phone-calls
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function initiateCall(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { participantIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one participant is required',
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Check if group is read-only
    const group = await prisma.group.findUnique({
      where: { groupId },
    });

    if (isGroupReadOnly(group)) {
      return res.status(403).json(getReadOnlyErrorResponse());
    }

    // Get group settings
    const settings = await prisma.groupSettings.findUnique({
      where: { groupId },
    });

    // Check if user can make phone calls
    if (!canUsePhoneCalls(membership, settings)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to make phone calls',
      });
    }

    // Verify all participants are valid group members
    const participants = await prisma.groupMember.findMany({
      where: {
        groupMemberId: { in: participantIds },
        groupId: groupId,
        isRegistered: true,
      },
    });

    if (participants.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants are not valid group members',
      });
    }

    // Check if any participant is a supervisor (they can't participate in calls)
    const supervisorParticipant = participants.find(p => p.role === 'supervisor');
    if (supervisorParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Supervisors cannot participate in phone calls',
      });
    }

    // Create the call
    const call = await prisma.phoneCall.create({
      data: {
        groupId: groupId,
        initiatedBy: membership.groupMemberId,
        status: 'ringing',
        participants: {
          create: participantIds.map(id => ({
            groupMemberId: id,
            status: 'invited',
          })),
        },
      },
      include: {
        initiator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        participants: {
          include: {
            participant: {
              select: {
                groupMemberId: true,
                displayName: true,
                iconLetters: true,
                iconColor: true,
                role: true,
                user: {
                  select: {
                    displayName: true,
                    memberIcon: true,
                    iconColor: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'initiate_call',
        actionLocation: 'phone_calls',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Initiated call with ${participantIds.length} participant(s)`,
        logData: {
          callId: call.callId,
          participantIds,
        },
      },
    });

    // Format response
    const formattedCall = {
      callId: call.callId,
      groupId: call.groupId,
      status: call.status,
      startedAt: call.startedAt,
      initiator: {
        groupMemberId: call.initiator.groupMemberId,
        displayName: call.initiator.user?.displayName || call.initiator.displayName,
        iconLetters: call.initiator.user?.memberIcon || call.initiator.iconLetters,
        iconColor: call.initiator.user?.iconColor || call.initiator.iconColor,
        role: call.initiator.role,
      },
      participants: call.participants.map(p => ({
        groupMemberId: p.participant.groupMemberId,
        displayName: p.participant.user?.displayName || p.participant.displayName,
        iconLetters: p.participant.user?.memberIcon || p.participant.iconLetters,
        iconColor: p.participant.user?.iconColor || p.participant.iconColor,
        role: p.participant.role,
        status: p.status,
        invitedAt: p.invitedAt,
      })),
    };

    return res.status(201).json({
      success: true,
      phoneCall: formattedCall,
    });
  } catch (error) {
    console.error('Initiate call error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate call',
      error: error.message,
    });
  }
}

/**
 * Respond to an incoming call (accept or reject)
 * PUT /groups/:groupId/phone-calls/:callId/respond
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function respondToCall(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "accept" or "reject"',
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get the call
    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: {
        participants: true,
      },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (call.status !== 'ringing') {
      return res.status(400).json({
        success: false,
        message: 'This call is no longer ringing',
      });
    }

    // Check if user is a participant
    const participant = call.participants.find(
      p => p.groupMemberId === membership.groupMemberId
    );

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this call',
      });
    }

    if (participant.status !== 'invited') {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this call',
      });
    }

    // Update participant status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await prisma.phoneCallParticipant.update({
      where: {
        callId_groupMemberId: {
          callId: callId,
          groupMemberId: membership.groupMemberId,
        },
      },
      data: {
        status: newStatus,
        respondedAt: new Date(),
      },
    });

    // If accepted, check if this is the first accept - update call to active
    if (action === 'accept') {
      const acceptedCount = call.participants.filter(p => p.status === 'accepted').length + 1;
      if (acceptedCount === 1) {
        await prisma.phoneCall.update({
          where: { callId },
          data: {
            status: 'active',
            connectedAt: new Date(),
          },
        });
      }
    }

    // If all participants rejected, mark call as missed
    if (action === 'reject') {
      const allRejected = call.participants.every(
        p => p.groupMemberId === membership.groupMemberId || p.status === 'rejected'
      );
      if (allRejected) {
        await prisma.phoneCall.update({
          where: { callId },
          data: {
            status: 'missed',
            endedAt: new Date(),
          },
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: action === 'accept' ? 'accept_call' : 'reject_call',
        actionLocation: 'phone_calls',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `${action === 'accept' ? 'Accepted' : 'Rejected'} phone call`,
        logData: { callId },
      },
    });

    return res.json({
      success: true,
      message: action === 'accept' ? 'Call accepted' : 'Call rejected',
    });
  } catch (error) {
    console.error('Respond to call error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to call',
      error: error.message,
    });
  }
}

/**
 * End an active call
 * PUT /groups/:groupId/phone-calls/:callId/end
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function endCall(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get the call
    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: {
        participants: true,
      },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (!['ringing', 'active'].includes(call.status)) {
      return res.status(400).json({
        success: false,
        message: 'This call has already ended',
      });
    }

    // Check if user is initiator or participant
    const isInitiator = call.initiatedBy === membership.groupMemberId;
    const isParticipant = call.participants.some(
      p => p.groupMemberId === membership.groupMemberId
    );

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call',
      });
    }

    // Calculate duration if call was connected
    let durationMs = null;
    if (call.connectedAt) {
      durationMs = Date.now() - new Date(call.connectedAt).getTime();
    }

    // End the call
    await prisma.phoneCall.update({
      where: { callId },
      data: {
        status: call.status === 'ringing' ? 'missed' : 'ended',
        endedAt: new Date(),
        durationMs,
      },
    });

    // Update all joined participants to 'left'
    await prisma.phoneCallParticipant.updateMany({
      where: {
        callId,
        status: { in: ['accepted', 'joined'] },
      },
      data: {
        status: 'left',
        leftAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'end_call',
        actionLocation: 'phone_calls',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Ended phone call. Duration: ${durationMs ? Math.round(durationMs / 1000) + 's' : 'N/A'}`,
        logData: { callId, durationMs },
      },
    });

    return res.json({
      success: true,
      message: 'Call ended',
      durationMs,
    });
  } catch (error) {
    console.error('End call error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to end call',
      error: error.message,
    });
  }
}

/**
 * Hide a call recording (admin only)
 * PUT /groups/:groupId/phone-calls/:callId/hide-recording
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function hideRecording(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Only admins can hide recordings
    if (membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can hide call recordings',
      });
    }

    // Get the call
    const call = await prisma.phoneCall.findUnique({
      where: { callId },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (!call.recordingUrl) {
      return res.status(400).json({
        success: false,
        message: 'This call has no recording',
      });
    }

    if (call.recordingIsHidden) {
      return res.status(400).json({
        success: false,
        message: 'Recording is already hidden',
      });
    }

    // Hide the recording
    await prisma.phoneCall.update({
      where: { callId },
      data: {
        recordingIsHidden: true,
        recordingHiddenBy: membership.groupMemberId,
        recordingHiddenAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'hide_call_recording',
        actionLocation: 'phone_calls',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: 'Hid phone call recording',
        logData: { callId },
      },
    });

    return res.json({
      success: true,
      message: 'Recording hidden',
    });
  } catch (error) {
    console.error('Hide recording error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to hide recording',
      error: error.message,
    });
  }
}

/**
 * Upload a call recording
 * POST /groups/:groupId/phone-calls/:callId/recording
 *
 * Converts audio to MP3 format if needed for universal playback.
 *
 * @param {Object} req - Express request (with file from multer)
 * @param {Object} res - Express response
 */
async function uploadRecording(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No recording file provided',
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get the call
    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: { participants: true },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    // Check if user is initiator or participant
    const isInitiator = call.initiatedBy === membership.groupMemberId;
    const isParticipant = call.participants.some(
      p => p.groupMemberId === membership.groupMemberId
    );

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call',
      });
    }

    // Set recording status to 'processing' first
    await prisma.phoneCall.update({
      where: { callId },
      data: { recordingStatus: 'processing' },
    });

    // Save the file temporarily
    const tempDir = os.tmpdir();
    const tempInputPath = path.join(tempDir, `phone_recording_${Date.now()}_${uuidv4()}`);
    await fs.writeFile(tempInputPath, req.file.buffer);

    let filePath = tempInputPath;
    let fileMimeType = req.file.mimetype;
    let fileName = req.file.originalname;
    let fileSize = req.file.size;
    let durationMs = 0;

    try {
      // Convert to MP3 if needed
      const converted = await audioConverter.convertIfNeeded(tempInputPath, fileMimeType, tempDir);
      filePath = converted.path;
      fileMimeType = converted.mimeType;
      durationMs = converted.durationMs;

      if (converted.wasConverted) {
        fileName = fileName.replace(/\.[^.]+$/, '.mp3');
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      }

      // For local development, save to uploads directory
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'recordings');
      await fs.mkdir(uploadsDir, { recursive: true });

      const fileId = uuidv4();
      const finalFileName = `${fileId}.mp3`;
      const finalPath = path.join(uploadsDir, finalFileName);

      // Copy converted file to uploads
      const fileBuffer = await fs.readFile(filePath);
      await fs.writeFile(finalPath, fileBuffer);

      // Create metadata JSON file for storage service compatibility
      const metadataPath = path.join(uploadsDir, `${fileId}.json`);
      const metadata = {
        fileId: fileId,
        fileName: finalFileName,
        originalName: fileName,
        mimeType: 'audio/mpeg',
        size: fileSize,
        category: 'recordings',
        userId: userId,
        groupId: groupId,
        storagePath: finalPath,
        uploadedAt: new Date().toISOString(),
        isHidden: false,
        callId: callId,
        durationMs: durationMs,
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Generate URL
      const recordingUrl = `/files/${fileId}`;

      // Update the call with recording info
      await prisma.phoneCall.update({
        where: { callId },
        data: {
          recordingFileId: fileId,
          recordingUrl: recordingUrl,
          recordingStatus: 'ready',
          recordingDurationMs: durationMs,
          recordingSizeBytes: BigInt(fileSize),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'upload_call_recording',
          actionLocation: 'phone_calls',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: membership.email || 'N/A',
          messageContent: `Uploaded phone call recording. Duration: ${Math.round(durationMs / 1000)}s, Size: ${Math.round(fileSize / 1024)}KB`,
          logData: { callId, fileId, durationMs, fileSize },
        },
      });

      return res.json({
        success: true,
        message: 'Recording uploaded successfully',
        recording: {
          url: recordingUrl,
          status: 'ready',
          durationMs,
          sizeBytes: fileSize,
          mimeType: 'audio/mpeg',
        },
      });
    } finally {
      // Cleanup temp files
      try {
        if (filePath !== tempInputPath) {
          await fs.unlink(filePath).catch(() => {});
        }
        await fs.unlink(tempInputPath).catch(() => {});
      } catch (cleanupErr) {
        console.warn('Cleanup warning:', cleanupErr.message);
      }
    }
  } catch (error) {
    console.error('Upload recording error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload recording',
      error: error.message,
    });
  }
}

/**
 * Leave a call (without ending it for others)
 * PUT /groups/:groupId/phone-calls/:callId/leave
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function leaveCall(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
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

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group',
      });
    }

    // Get the call
    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: {
        participants: true,
      },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (!['ringing', 'active'].includes(call.status)) {
      return res.status(400).json({
        success: false,
        message: 'This call has already ended',
      });
    }

    // Check if user is initiator or participant
    const isInitiator = call.initiatedBy === membership.groupMemberId;
    const participant = call.participants.find(
      p => p.groupMemberId === membership.groupMemberId
    );

    if (!isInitiator && !participant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call',
      });
    }

    // If user is the initiator, leaving ends the call for everyone
    if (isInitiator) {
      // Calculate duration if call was connected
      let durationMs = null;
      if (call.connectedAt) {
        durationMs = Date.now() - new Date(call.connectedAt).getTime();
      }

      // End the call
      await prisma.phoneCall.update({
        where: { callId },
        data: {
          status: call.status === 'ringing' ? 'missed' : 'ended',
          endedAt: new Date(),
          durationMs,
        },
      });

      // Update all participants to 'left'
      await prisma.phoneCallParticipant.updateMany({
        where: {
          callId,
          status: { in: ['accepted', 'joined', 'invited'] },
        },
        data: {
          status: 'left',
          leftAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'end_call',
          actionLocation: 'phone_calls',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: membership.email || 'N/A',
          messageContent: `Initiator left, ending call. Duration: ${durationMs ? Math.round(durationMs / 1000) + 's' : 'N/A'}`,
          logData: { callId, durationMs },
        },
      });

      return res.json({
        success: true,
        message: 'Call ended (initiator left)',
        callEnded: true,
      });
    }

    // User is a participant - just mark them as left
    await prisma.phoneCallParticipant.update({
      where: {
        callId_groupMemberId: {
          callId: callId,
          groupMemberId: membership.groupMemberId,
        },
      },
      data: {
        status: 'left',
        leftAt: new Date(),
      },
    });

    // Check if all participants have left or rejected
    const remainingParticipants = call.participants.filter(
      p => p.groupMemberId !== membership.groupMemberId &&
           ['accepted', 'joined', 'invited'].includes(p.status)
    );

    // If no participants remaining, end the call
    if (remainingParticipants.length === 0) {
      let durationMs = null;
      if (call.connectedAt) {
        durationMs = Date.now() - new Date(call.connectedAt).getTime();
      }

      await prisma.phoneCall.update({
        where: { callId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          durationMs,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'end_call',
          actionLocation: 'phone_calls',
          performedBy: membership.groupMemberId,
          performedByName: membership.displayName,
          performedByEmail: membership.email || 'N/A',
          messageContent: `Last participant left, call ended. Duration: ${durationMs ? Math.round(durationMs / 1000) + 's' : 'N/A'}`,
          logData: { callId, durationMs },
        },
      });

      return res.json({
        success: true,
        message: 'You left the call (call ended as last participant)',
        callEnded: true,
      });
    }

    // Create audit log for leaving
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'leave_call',
        actionLocation: 'phone_calls',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: 'Left phone call',
        logData: { callId },
      },
    });

    return res.json({
      success: true,
      message: 'You left the call',
      callEnded: false,
    });
  } catch (error) {
    console.error('Leave call error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to leave call',
      error: error.message,
    });
  }
}

/**
 * Send a WebRTC signaling message for phone calls
 * POST /groups/:groupId/phone-calls/:callId/signal
 */
async function sendSignal(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;
    const { type, data, targetPeerId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!type || !data) {
      return res.status(400).json({ success: false, message: 'Signal type and data are required' });
    }

    if (!['offer', 'answer', 'ice-candidate'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid signal type' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: { participants: true },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const isInitiator = call.initiatedBy === membership.groupMemberId;
    const isParticipant = call.participants.some(p => p.groupMemberId === membership.groupMemberId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not part of this call' });
    }

    const signal = {
      type,
      data,
      from: membership.groupMemberId,
      timestamp: Date.now(),
    };

    if (!signalingStore.has(callId)) {
      signalingStore.set(callId, {});
    }

    const callSignals = signalingStore.get(callId);

    if (targetPeerId) {
      if (!callSignals[targetPeerId]) callSignals[targetPeerId] = [];
      callSignals[targetPeerId].push(signal);
    } else {
      const allPeers = [call.initiatedBy, ...call.participants.map(p => p.groupMemberId)];
      for (const peerId of allPeers) {
        if (peerId !== membership.groupMemberId) {
          if (!callSignals[peerId]) callSignals[peerId] = [];
          callSignals[peerId].push(signal);
        }
      }
    }

    console.log(`[WebRTC Phone Signal] ${type} from ${membership.groupMemberId} in call ${callId}`);

    return res.json({ success: true, message: 'Signal sent' });
  } catch (error) {
    console.error('Send phone signal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send signal', error: error.message });
  }
}

/**
 * Get pending WebRTC signaling messages for phone calls
 * GET /groups/:groupId/phone-calls/:callId/signal
 */
async function getSignals(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, callId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership || !membership.isRegistered) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: { participants: true },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const isInitiator = call.initiatedBy === membership.groupMemberId;
    const isParticipant = call.participants.some(p => p.groupMemberId === membership.groupMemberId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not part of this call' });
    }

    const callSignals = signalingStore.get(callId) || {};
    const mySignals = callSignals[membership.groupMemberId] || [];

    if (callSignals[membership.groupMemberId]) {
      delete callSignals[membership.groupMemberId];
    }

    const peers = [];
    if (isInitiator) {
      for (const p of call.participants) {
        if (['accepted', 'joined'].includes(p.status)) {
          peers.push({ peerId: p.groupMemberId, status: p.status });
        }
      }
      // Add recorder as a peer if recording is active
      if (recorderService.isRecording(callId, 'phone')) {
        peers.push({ peerId: 'recorder', status: 'recording' });
      }
    } else {
      peers.push({ peerId: call.initiatedBy, status: 'initiator' });
      // Non-initiators also need to connect to recorder
      if (recorderService.isRecording(callId, 'phone')) {
        peers.push({ peerId: 'recorder', status: 'recording' });
      }
    }

    return res.json({
      success: true,
      signals: mySignals,
      peers,
      myPeerId: membership.groupMemberId,
    });
  } catch (error) {
    console.error('Get phone signals error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get signals', error: error.message });
  }
}

/**
 * Get STUN/TURN server configuration for phone calls
 * GET /groups/:groupId/phone-calls/:callId/ice-servers
 */
async function getIceServers(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    if (process.env.TURN_SERVER_URL) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_SERVER_USERNAME || '',
        credential: process.env.TURN_SERVER_CREDENTIAL || '',
      });
    }

    return res.json({ success: true, iceServers });
  } catch (error) {
    console.error('Get ICE servers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get ICE servers', error: error.message });
  }
}

/**
 * Start server-side recording for a call
 * POST /groups/:groupId/phone-calls/:callId/start-recording
 */
async function startServerRecording(req, res) {
  try {
    const { groupId, callId } = req.params;
    const userId = req.user?.userId;

    // Verify user is in the call
    const call = await prisma.phoneCall.findFirst({
      where: { callId, groupId },
      include: { participants: true },
    });

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (call.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Call is not active' });
    }

    // Check if already recording
    if (recorderService.isRecording(callId, 'phone')) {
      return res.json({ success: true, message: 'Recording already in progress', isRecording: true });
    }

    // Get auth token from request
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const apiUrl = `${req.protocol}://${req.get('host')}`;

    // Start the ghost recorder
    await recorderService.startRecording({
      groupId,
      callId,
      callType: 'phone',
      authToken,
      apiUrl,
    });

    // Update call record
    await prisma.phoneCall.update({
      where: { callId },
      data: { recordingStatus: 'recording' },
    });

    return res.json({ success: true, message: 'Server-side recording started', isRecording: true });
  } catch (error) {
    console.error('Start server recording error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start recording', error: error.message });
  }
}

/**
 * Stop server-side recording for a call
 * POST /groups/:groupId/phone-calls/:callId/stop-recording
 */
async function stopServerRecording(req, res) {
  try {
    const { groupId, callId } = req.params;

    const result = await recorderService.stopRecording(callId, 'phone');

    // Update call record
    await prisma.phoneCall.update({
      where: { callId },
      data: { recordingStatus: 'completed' },
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Stop server recording error:', error);
    return res.status(500).json({ success: false, message: 'Failed to stop recording', error: error.message });
  }
}

/**
 * Get recording status for a call
 * GET /groups/:groupId/phone-calls/:callId/recording-status
 */
async function getRecordingStatus(req, res) {
  try {
    const { callId } = req.params;

    const status = recorderService.getRecordingStatus(callId, 'phone');

    return res.json({
      success: true,
      isRecording: !!status,
      ...status,
    });
  } catch (error) {
    console.error('Get recording status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get recording status', error: error.message });
  }
}

/**
 * Get WebRTC signals for the ghost recorder
 * GET /groups/:groupId/phone-calls/:callId/recorder-signal
 */
async function getRecorderSignals(req, res) {
  try {
    const { groupId, callId } = req.params;

    const call = await prisma.phoneCall.findUnique({
      where: { callId },
      include: { participants: true },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    // Get signals meant for the recorder
    const callSignals = signalingStore.get(callId) || {};
    const recorderSignals = callSignals['recorder'] || [];

    // Clear the signals after retrieving
    if (callSignals['recorder']) {
      delete callSignals['recorder'];
    }

    return res.json({
      success: true,
      signals: recorderSignals,
    });
  } catch (error) {
    console.error('Get recorder signals error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get recorder signals', error: error.message });
  }
}

/**
 * Send WebRTC signal from the ghost recorder
 * POST /groups/:groupId/phone-calls/:callId/recorder-signal
 */
async function sendRecorderSignal(req, res) {
  try {
    const { groupId, callId } = req.params;
    const { type, data, targetPeerId } = req.body;

    if (!type || !data || !targetPeerId) {
      return res.status(400).json({ success: false, message: 'Missing required fields: type, data, targetPeerId' });
    }

    const call = await prisma.phoneCall.findUnique({
      where: { callId },
    });

    if (!call || call.groupId !== groupId) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    // Store signal for target participant
    if (!signalingStore.has(callId)) {
      signalingStore.set(callId, {});
    }
    const callSignals = signalingStore.get(callId);

    if (!callSignals[targetPeerId]) {
      callSignals[targetPeerId] = [];
    }

    callSignals[targetPeerId].push({
      from: 'recorder',
      type,
      data,
    });

    console.log(`[WebRTC Phone Signal] ${type} from recorder to ${targetPeerId} in call ${callId}`);

    return res.json({ success: true });
  } catch (error) {
    console.error('Send recorder signal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send recorder signal', error: error.message });
  }
}

module.exports = {
  getPhoneCalls,
  getActiveCalls,
  initiateCall,
  respondToCall,
  endCall,
  leaveCall,
  hideRecording,
  uploadRecording,
  sendSignal,
  getSignals,
  getIceServers,
  startServerRecording,
  stopServerRecording,
  getRecordingStatus,
  getRecorderSignals,
  sendRecorderSignal,
};
