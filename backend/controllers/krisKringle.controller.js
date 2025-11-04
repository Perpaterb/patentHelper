/**
 * Kris Kringle Controller
 *
 * Handles Kris Kringle / Secret Santa operations.
 */

const { prisma } = require('../config/database');
const { emailService } = require('../services/email');

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
    const { name, description, priceLimit, revealDate, exchangeDate, participants, exclusions } = req.body;

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
    const krisKringle = await prisma.krisKringle.create({
      data: {
        groupId: groupId,
        name: name.trim(),
        description: description?.trim() || null,
        priceLimit: priceLimit || null,
        revealDate: revealDate ? new Date(revealDate) : null,
        exchangeDate: exchangeDate ? new Date(exchangeDate) : null,
        createdBy: membership.groupMemberId,
        status: 'draft',
      },
    });

    // Add participants
    const participantRecords = [];
    for (const p of participants) {
      if (p.groupMemberId) {
        // Existing group member
        const member = await prisma.groupMember.findUnique({
          where: { groupMemberId: p.groupMemberId },
        });

        if (!member || member.groupId !== groupId) {
          continue; // Skip invalid members
        }

        participantRecords.push({
          krisKringleId: krisKringle.krisKringleId,
          groupMemberId: p.groupMemberId,
          email: member.email,
          name: member.displayName,
          hasJoined: true, // Already in group
        });
      } else if (p.email && p.name) {
        // External participant (email invite)
        participantRecords.push({
          krisKringleId: krisKringle.krisKringleId,
          groupMemberId: null,
          email: p.email.trim(),
          name: p.name.trim(),
          hasJoined: false, // Needs to sign up
        });
      }
    }

    await prisma.krisKringleParticipant.createMany({
      data: participantRecords,
    });

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

module.exports = {
  getKrisKringles,
  createKrisKringle,
  generateKrisKringleMatches,
  getMyMatch,
  deleteKrisKringle,
};
