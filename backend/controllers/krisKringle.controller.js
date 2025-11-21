/**
 * Kris Kringle Controller
 *
 * Handles Kris Kringle / Secret Santa operations.
 */

const { prisma } = require('../config/database');
const { emailService } = require('../services/email');
const crypto = require('crypto');

/**
 * Generate a random 6-character alphanumeric passcode
 * @returns {string} Passcode
 */
function generatePasscode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0/O, 1/I
  let passcode = '';
  for (let i = 0; i < 6; i++) {
    passcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return passcode;
}

/**
 * Generate a random web token (32-character hex string)
 * @returns {string} Web token
 */
function generateWebToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate Kris Kringle matches with exclusion rules
 *
 * Algorithm:
 * 1. Create a derangement (no one draws themselves)
 * 2. Respect exclusion rules (certain pairs can't be matched)
 * 3. Try up to 1000 times to find valid matching
 *
 * @param {Array} participants - Array of participant IDs
 * @param {Array} exclusions - Array of {participant1Id, participant2Id} objects
 * @returns {Array|null} Array of {giverId, receiverId} matches, or null if impossible
 */
function generateMatches(participants, exclusions) {
  const maxAttempts = 1000;

  // Build exclusion map for quick lookup
  const exclusionMap = new Map();
  exclusions.forEach(ex => {
    if (!exclusionMap.has(ex.participant1Id)) {
      exclusionMap.set(ex.participant1Id, new Set());
    }
    if (!exclusionMap.has(ex.participant2Id)) {
      exclusionMap.set(ex.participant2Id, new Set());
    }
    exclusionMap.get(ex.participant1Id).add(ex.participant2Id);
    exclusionMap.get(ex.participant2Id).add(ex.participant1Id);
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const receivers = shuffleArray(participants);
    const matches = [];
    let valid = true;

    for (let i = 0; i < participants.length; i++) {
      const giver = participants[i];
      const receiver = receivers[i];

      // Check: Can't draw yourself
      if (giver === receiver) {
        valid = false;
        break;
      }

      // Check: Can't draw someone in exclusion list
      if (exclusionMap.has(giver) && exclusionMap.get(giver).has(receiver)) {
        valid = false;
        break;
      }

      matches.push({ giverId: giver, receiverId: receiver });
    }

    if (valid) {
      return matches;
    }
  }

  // No valid matching found after max attempts
  return null;
}

/**
 * Get all Kris Kringle events for a group
 * GET /groups/:groupId/kris-kringle
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getKrisKringles(req, res) {
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

    // Get all Kris Kringle events for this group
    const krisKringles = await prisma.krisKringle.findMany({
      where: {
        groupId: groupId,
        isHidden: false,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
          },
        },
        participants: {
          include: {
            groupMember: {
              select: {
                displayName: true,
                iconLetters: true,
                iconColor: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
            matches: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      krisKringles: krisKringles,
    });
  } catch (error) {
    console.error('Get Kris Kringles error:', error);
    res.status(500).json({
      error: 'Failed to get Kris Kringles',
      message: error.message,
    });
  }
}

/**
 * Create a new Kris Kringle event
 * POST /groups/:groupId/kris-kringle
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createKrisKringle(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { name, description, occasion, priceLimit, assigningDateTime, exchangeDate, participants, exclusions } = req.body;

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
        message: 'Name is required',
      });
    }

    if (!participants || participants.length < 3) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least 3 participants are required for Kris Kringle',
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

    // Create Kris Kringle event (status: draft - matches not generated yet)
    const webToken = generateWebToken();
    const krisKringle = await prisma.krisKringle.create({
      data: {
        groupId: groupId,
        name: name.trim(),
        description: description?.trim() || null,
        occasion: occasion?.trim() || null,
        priceLimit: priceLimit || null,
        assigningDateTime: assigningDateTime ? new Date(assigningDateTime) : new Date(), // Default to now
        exchangeDate: exchangeDate ? new Date(exchangeDate) : null,
        webToken: webToken,
        createdBy: membership.groupMemberId,
        status: 'draft',
        isAssigned: false,
      },
    });

    // Add participants
    const participantRecords = [];
    for (const p of participants) {
      if (p.groupMemberId) {
        // Existing group member
        const member = await prisma.groupMember.findUnique({
          where: { groupMemberId: p.groupMemberId },
          include: {
            user: {
              select: {
                email: true,
                displayName: true,
              },
            },
          },
        });

        if (!member || member.groupId !== groupId) {
          continue; // Skip invalid members
        }

        // Use user's actual email if available, otherwise use member email
        const email = member.user?.email || member.email;
        if (!email) {
          continue; // Skip members without email
        }

        participantRecords.push({
          krisKringleId: krisKringle.krisKringleId,
          groupMemberId: p.groupMemberId,
          email: email,
          name: member.user?.displayName || member.displayName,
          passcode: generatePasscode(),
          hasJoined: true, // Already in group
        });
      } else if (p.email && p.name) {
        // External participant (email invite)
        participantRecords.push({
          krisKringleId: krisKringle.krisKringleId,
          groupMemberId: null,
          email: p.email.trim().toLowerCase(),
          name: p.name.trim(),
          passcode: generatePasscode(),
          hasJoined: false, // Needs to sign up
        });
      }
    }

    await prisma.krisKringleParticipant.createMany({
      data: participantRecords,
    });

    // Send initial emails to all participants
    const createdParticipants = await prisma.krisKringleParticipant.findMany({
      where: { krisKringleId: krisKringle.krisKringleId },
    });

    const externalUrl = process.env.APP_URL || 'https://parentinghelperapp.com';

    for (const participant of createdParticipants) {
      try {
        await emailService.sendEmail({
          to: participant.email,
          subject: `🎁 You've been added to ${krisKringle.name} Secret Santa!`,
          text: `Hi ${participant.name},\n\nYou've been added to the Secret Santa event "${krisKringle.name}"!\n\n${krisKringle.occasion ? `Occasion: ${krisKringle.occasion}\n` : ''}${krisKringle.exchangeDate ? `Exchange date: ${new Date(krisKringle.exchangeDate).toLocaleDateString()}\n` : ''}${krisKringle.priceLimit ? `Gift value: $${krisKringle.priceLimit}\n` : ''}\nYour Secret Santa will be revealed on ${new Date(krisKringle.assigningDateTime).toLocaleString()}.\n\nTo view your assignment when it's ready, visit:\n${externalUrl}/secret-santa/${krisKringle.webToken}\n\nYour access code: ${participant.passcode}\n\n- Parenting Helper`,
          html: `<p>Hi ${participant.name},</p><p>You've been added to the Secret Santa event <strong>"${krisKringle.name}"</strong>!</p>${krisKringle.occasion ? `<p>Occasion: ${krisKringle.occasion}</p>` : ''}${krisKringle.exchangeDate ? `<p>Exchange date: ${new Date(krisKringle.exchangeDate).toLocaleDateString()}</p>` : ''}${krisKringle.priceLimit ? `<p>Gift value: <strong>$${krisKringle.priceLimit}</strong></p>` : ''}<p>Your Secret Santa will be revealed on <strong>${new Date(krisKringle.assigningDateTime).toLocaleString()}</strong>.</p><p>To view your assignment when it's ready, visit:<br><a href="${externalUrl}/secret-santa/${krisKringle.webToken}">${externalUrl}/secret-santa/${krisKringle.webToken}</a></p><p>Your access code: <strong>${participant.passcode}</strong></p><p>- Parenting Helper</p>`,
        });

        // Update email sent timestamp
        await prisma.krisKringleParticipant.update({
          where: { participantId: participant.participantId },
          data: { initialEmailSentAt: new Date() },
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${participant.email}:`, emailError);
      }
    }

    // Add exclusions (if any)
    if (exclusions && exclusions.length > 0) {
      // Get created participants to map names to IDs
      const createdParticipants = await prisma.krisKringleParticipant.findMany({
        where: { krisKringleId: krisKringle.krisKringleId },
      });

      const exclusionRecords = [];
      for (const ex of exclusions) {
        const p1 = createdParticipants.find(p =>
          p.groupMemberId === ex.participant1Id || p.email === ex.participant1Email
        );
        const p2 = createdParticipants.find(p =>
          p.groupMemberId === ex.participant2Id || p.email === ex.participant2Email
        );

        if (p1 && p2) {
          exclusionRecords.push({
            krisKringleId: krisKringle.krisKringleId,
            participant1Id: p1.participantId,
            participant2Id: p2.participantId,
          });
        }
      }

      if (exclusionRecords.length > 0) {
        await prisma.krisKringleExclusion.createMany({
          data: exclusionRecords,
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'create_kris_kringle',
        actionLocation: 'kris_kringle',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Created Kris Kringle event "${name}" with ${participantRecords.length} participants`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Kris Kringle event created successfully',
      krisKringle: {
        ...krisKringle,
        participantCount: participantRecords.length,
      },
    });
  } catch (error) {
    console.error('Create Kris Kringle error:', error);
    res.status(500).json({
      error: 'Failed to create Kris Kringle event',
      message: error.message,
    });
  }
}

/**
 * Generate matches for a Kris Kringle event
 * POST /groups/:groupId/kris-kringle/:krisKringleId/generate-matches
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function generateKrisKringleMatches(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, krisKringleId } = req.params;

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

    // Get Kris Kringle event
    const krisKringle = await prisma.krisKringle.findUnique({
      where: { krisKringleId: krisKringleId },
      include: {
        participants: {
          include: {
            groupMember: true,
          },
        },
        exclusions: true,
      },
    });

    if (!krisKringle || krisKringle.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Kris Kringle event not found',
      });
    }

    // Only creator can generate matches
    if (krisKringle.createdBy !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the event creator can generate matches',
      });
    }

    // Check if matches already exist
    const existingMatches = await prisma.krisKringleMatch.findMany({
      where: { krisKringleId: krisKringleId },
    });

    if (existingMatches.length > 0) {
      return res.status(400).json({
        error: 'Matches Already Generated',
        message: 'Matches have already been generated for this event',
      });
    }

    // Generate matches
    const participantIds = krisKringle.participants.map(p => p.participantId);
    const matches = generateMatches(participantIds, krisKringle.exclusions);

    if (!matches) {
      return res.status(400).json({
        error: 'Matching Impossible',
        message: 'Cannot generate valid matches with current exclusion rules. Try removing some exclusions.',
      });
    }

    // Save matches to database
    await prisma.krisKringleMatch.createMany({
      data: matches.map(m => ({
        krisKringleId: krisKringleId,
        giverId: m.giverId,
        receiverId: m.receiverId,
      })),
    });

    // Update status to active
    await prisma.krisKringle.update({
      where: { krisKringleId: krisKringleId },
      data: { status: 'active' },
    });

    // Send emails to all participants
    for (const participant of krisKringle.participants) {
      const match = matches.find(m => m.giverId === participant.participantId);
      const receiver = krisKringle.participants.find(p => p.participantId === match.receiverId);

      if (participant.email) {
        try {
          await emailService.sendEmail({
            to: participant.email,
            subject: `🎁 Kris Kringle: ${krisKringle.name}`,
            text: `Hi ${participant.name},\n\nYou've been matched in the Kris Kringle event "${krisKringle.name}"!\n\nYou're giving a gift to: ${receiver.name}\n\n${krisKringle.priceLimit ? `Price limit: $${krisKringle.priceLimit}\n` : ''}${krisKringle.exchangeDate ? `Exchange date: ${new Date(krisKringle.exchangeDate).toLocaleDateString()}\n` : ''}\n${receiver.wishListId ? `View their wish list: [LINK TO WISH LIST]\n` : ''}\n${!participant.hasJoined ? '\nYou need to sign up for Parenting Helper to create your wish list:\n[SIGNUP LINK]\n' : ''}\nKeep it secret!\n\n- Parenting Helper`,
            html: `<p>Hi ${participant.name},</p><p>You've been matched in the Kris Kringle event <strong>"${krisKringle.name}"</strong>!</p><p>You're giving a gift to: <strong>${receiver.name}</strong></p>${krisKringle.priceLimit ? `<p>Price limit: <strong>$${krisKringle.priceLimit}</strong></p>` : ''}${krisKringle.exchangeDate ? `<p>Exchange date: ${new Date(krisKringle.exchangeDate).toLocaleDateString()}</p>` : ''}${receiver.wishListId ? '<p><a href="[LINK]">View their wish list</a></p>' : ''}${!participant.hasJoined ? '<p>You need to sign up for Parenting Helper to create your wish list:<br><a href="[SIGNUP LINK]">Sign Up Now</a></p>' : ''}<p>Keep it secret! 🤫</p><p>- Parenting Helper</p>`,
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${participant.email}:`, emailError);
        }
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'generate_kris_kringle_matches',
        actionLocation: 'kris_kringle',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Generated matches for Kris Kringle event "${krisKringle.name}" and sent ${krisKringle.participants.length} emails`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Matches generated and emails sent successfully',
      matchCount: matches.length,
    });
  } catch (error) {
    console.error('Generate Kris Kringle matches error:', error);
    res.status(500).json({
      error: 'Failed to generate matches',
      message: error.message,
    });
  }
}

/**
 * Get my match (who I'm giving to) for a Kris Kringle event
 * GET /groups/:groupId/kris-kringle/:krisKringleId/my-match
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getMyMatch(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, krisKringleId } = req.params;

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

    // Find participant record for this user
    const participant = await prisma.krisKringleParticipant.findFirst({
      where: {
        krisKringleId: krisKringleId,
        groupMemberId: membership.groupMemberId,
      },
    });

    if (!participant) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'You are not a participant in this Kris Kringle event',
      });
    }

    // Find match
    const match = await prisma.krisKringleMatch.findFirst({
      where: {
        krisKringleId: krisKringleId,
        giverId: participant.participantId,
      },
      include: {
        receiver: {
          include: {
            groupMember: true,
            wishList: {
              include: {
                items: {
                  where: {
                    isHidden: false,
                  },
                  orderBy: [
                    { isPurchased: 'asc' },
                    { priority: 'desc' },
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!match) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No match found. Matches may not have been generated yet.',
      });
    }

    res.status(200).json({
      success: true,
      recipient: {
        name: match.receiver.name,
        wishList: match.receiver.wishList,
      },
    });
  } catch (error) {
    console.error('Get my match error:', error);
    res.status(500).json({
      error: 'Failed to get match',
      message: error.message,
    });
  }
}

/**
 * Delete Kris Kringle event (soft delete)
 * DELETE /groups/:groupId/kris-kringle/:krisKringleId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteKrisKringle(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, krisKringleId } = req.params;

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

    // Get Kris Kringle event
    const krisKringle = await prisma.krisKringle.findUnique({
      where: { krisKringleId: krisKringleId },
    });

    if (!krisKringle || krisKringle.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Kris Kringle event not found',
      });
    }

    // Only creator or admins can delete
    if (krisKringle.createdBy !== membership.groupMemberId && membership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the event creator or admins can delete this event',
      });
    }

    // Soft delete
    await prisma.krisKringle.update({
      where: { krisKringleId: krisKringleId },
      data: { isHidden: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'delete_kris_kringle',
        actionLocation: 'kris_kringle',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Deleted Kris Kringle event "${krisKringle.name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Kris Kringle event deleted successfully',
    });
  } catch (error) {
    console.error('Delete Kris Kringle error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: error.message,
    });
  }
}

/**
 * Get a specific Kris Kringle event details
 * GET /groups/:groupId/kris-kringle/:krisKringleId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getKrisKringle(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, krisKringleId } = req.params;

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

    // Get Kris Kringle event with details
    const krisKringle = await prisma.krisKringle.findUnique({
      where: { krisKringleId: krisKringleId },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
        participants: {
          include: {
            groupMember: {
              select: {
                displayName: true,
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
          },
        },
        _count: {
          select: {
            participants: true,
            matches: true,
          },
        },
      },
    });

    if (!krisKringle || krisKringle.groupId !== groupId || krisKringle.isHidden) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Kris Kringle event not found',
      });
    }

    // Check if current user is the creator or admin
    const isCreator = krisKringle.createdBy === membership.groupMemberId;
    const isAdmin = membership.role === 'admin';
    const canManage = isCreator || isAdmin;

    res.status(200).json({
      success: true,
      krisKringle: {
        ...krisKringle,
        creator: {
          groupMemberId: krisKringle.creator.groupMemberId,
          displayName: krisKringle.creator.user?.displayName || krisKringle.creator.displayName,
        },
        participants: krisKringle.participants.map(p => ({
          participantId: p.participantId,
          name: p.name,
          email: canManage ? p.email : undefined, // Only show emails to creator/admin
          passcode: canManage ? p.passcode : undefined, // Only show passcode to creator/admin
          hasJoined: p.hasJoined,
          hasViewed: p.hasViewed,
          initialEmailSentAt: p.initialEmailSentAt,
          assignmentEmailSentAt: p.assignmentEmailSentAt,
          groupMember: p.groupMember ? {
            displayName: p.groupMember.user?.displayName || p.groupMember.displayName,
            iconLetters: p.groupMember.user?.memberIcon || p.groupMember.iconLetters,
            iconColor: p.groupMember.user?.iconColor || p.groupMember.iconColor,
          } : null,
        })),
        canManage: canManage,
        isCreator: isCreator,
      },
    });
  } catch (error) {
    console.error('Get Kris Kringle error:', error);
    res.status(500).json({
      error: 'Failed to get Kris Kringle event',
      message: error.message,
    });
  }
}

/**
 * Resend email to a participant with new passcode
 * POST /groups/:groupId/kris-kringle/:krisKringleId/participants/:participantId/resend
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function resendParticipantEmail(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, krisKringleId, participantId } = req.params;

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

    // Get Kris Kringle event
    const krisKringle = await prisma.krisKringle.findUnique({
      where: { krisKringleId: krisKringleId },
    });

    if (!krisKringle || krisKringle.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Kris Kringle event not found',
      });
    }

    // Only creator or admins can resend emails
    if (krisKringle.createdBy !== membership.groupMemberId && membership.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the event creator or admins can resend emails',
      });
    }

    // Get participant
    const participant = await prisma.krisKringleParticipant.findUnique({
      where: { participantId: participantId },
    });

    if (!participant || participant.krisKringleId !== krisKringleId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Participant not found',
      });
    }

    // Generate new passcode
    const newPasscode = generatePasscode();

    // Update participant with new passcode
    await prisma.krisKringleParticipant.update({
      where: { participantId: participantId },
      data: { passcode: newPasscode },
    });

    // Send email
    const externalUrl = process.env.APP_URL || 'https://parentinghelperapp.com';

    await emailService.sendEmail({
      to: participant.email,
      subject: `🎁 ${krisKringle.name} Secret Santa - New Access Code`,
      text: `Hi ${participant.name},\n\nHere's your new access code for the Secret Santa event "${krisKringle.name}".\n\nTo view your assignment, visit:\n${externalUrl}/secret-santa/${krisKringle.webToken}\n\nYour new access code: ${newPasscode}\n\n- Parenting Helper`,
      html: `<p>Hi ${participant.name},</p><p>Here's your new access code for the Secret Santa event <strong>"${krisKringle.name}"</strong>.</p><p>To view your assignment, visit:<br><a href="${externalUrl}/secret-santa/${krisKringle.webToken}">${externalUrl}/secret-santa/${krisKringle.webToken}</a></p><p>Your new access code: <strong>${newPasscode}</strong></p><p>- Parenting Helper</p>`,
    });

    // Update email sent timestamp
    await prisma.krisKringleParticipant.update({
      where: { participantId: participantId },
      data: { initialEmailSentAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'resend_kris_kringle_email',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        actionLocation: 'kris_kringle',
        messageContent: `Resent Secret Santa assignment email to ${participant.name} for event "${krisKringle.name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Email resent with new access code',
    });
  } catch (error) {
    console.error('Resend participant email error:', error);
    res.status(500).json({
      error: 'Failed to resend email',
      message: error.message,
    });
  }
}

/**
 * Public endpoint to verify email and passcode for external access
 * POST /secret-santa/:webToken/verify
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function verifySecretSantaAccess(req, res) {
  try {
    const { webToken } = req.params;
    const { email, passcode } = req.body;

    if (!email || !passcode) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and passcode are required',
      });
    }

    // Find Kris Kringle by web token
    const krisKringle = await prisma.krisKringle.findUnique({
      where: { webToken: webToken },
      include: {
        participants: true,
        matches: true,
      },
    });

    if (!krisKringle || krisKringle.isHidden) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Secret Santa event not found',
      });
    }

    // Find participant by email and passcode
    const participant = krisKringle.participants.find(
      p => p.email.toLowerCase() === email.toLowerCase() && p.passcode.toUpperCase() === passcode.toUpperCase()
    );

    if (!participant) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Invalid email or access code',
      });
    }

    // Check if assignments have been made
    const now = new Date();
    const assigningTime = new Date(krisKringle.assigningDateTime);
    const isAssigned = krisKringle.isAssigned && krisKringle.matches.length > 0;

    // If not assigned yet, return countdown info
    if (!isAssigned || now < assigningTime) {
      return res.status(200).json({
        success: true,
        eventName: krisKringle.name,
        occasion: krisKringle.occasion,
        exchangeDate: krisKringle.exchangeDate,
        priceLimit: krisKringle.priceLimit,
        assigningDateTime: krisKringle.assigningDateTime,
        isRevealed: false,
        message: 'Your Secret Santa will be revealed soon!',
      });
    }

    // Find who this participant is giving to
    const match = krisKringle.matches.find(m => m.giverId === participant.participantId);

    if (!match) {
      return res.status(404).json({
        error: 'Match Not Found',
        message: 'No match found for this participant',
      });
    }

    // Get receiver details
    const receiver = krisKringle.participants.find(p => p.participantId === match.receiverId);

    // Update hasViewed
    if (!participant.hasViewed) {
      await prisma.krisKringleParticipant.update({
        where: { participantId: participant.participantId },
        data: {
          hasViewed: true,
          viewedAt: new Date(),
        },
      });
    }

    // TODO: Get receiver's gift registry if they have one linked

    res.status(200).json({
      success: true,
      eventName: krisKringle.name,
      occasion: krisKringle.occasion,
      exchangeDate: krisKringle.exchangeDate,
      priceLimit: krisKringle.priceLimit,
      isRevealed: true,
      recipientName: receiver.name,
      // giftRegistryUrl: receiver.giftRegistryId ? `${externalUrl}/registry/${receiver.giftRegistryId}` : null,
    });
  } catch (error) {
    console.error('Verify Secret Santa access error:', error);
    res.status(500).json({
      error: 'Failed to verify access',
      message: error.message,
    });
  }
}

/**
 * Public endpoint to get Secret Santa event info (no auth required)
 * GET /secret-santa/:webToken
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getSecretSantaPublic(req, res) {
  try {
    const { webToken } = req.params;

    // Find Kris Kringle by web token
    const krisKringle = await prisma.krisKringle.findUnique({
      where: { webToken: webToken },
    });

    if (!krisKringle || krisKringle.isHidden) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Secret Santa event not found',
      });
    }

    // Return basic event info (no sensitive data)
    res.status(200).json({
      success: true,
      eventName: krisKringle.name,
      occasion: krisKringle.occasion,
      exchangeDate: krisKringle.exchangeDate,
      assigningDateTime: krisKringle.assigningDateTime,
      priceLimit: krisKringle.priceLimit,
    });
  } catch (error) {
    console.error('Get Secret Santa public error:', error);
    res.status(500).json({
      error: 'Failed to get event info',
      message: error.message,
    });
  }
}

module.exports = {
  getKrisKringles,
  getKrisKringle,
  createKrisKringle,
  generateKrisKringleMatches,
  getMyMatch,
  deleteKrisKringle,
  resendParticipantEmail,
  verifySecretSantaAccess,
  getSecretSantaPublic,
};
