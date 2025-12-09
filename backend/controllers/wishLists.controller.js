/**
 * Wish Lists Controller
 *
 * Handles Gift Registry / Wish List operations.
 */

const { prisma } = require('../config/database');

/**
 * Get all wish lists for a group
 * GET /groups/:groupId/wish-lists
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getWishLists(req, res) {
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

    // Get all wish lists for this group (not hidden)
    const wishLists = await prisma.wishList.findMany({
      where: {
        groupId: groupId,
        isHidden: false,
      },
      include: {
        forMember: {
          include: {
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
                profilePhotoFileId: true,
              },
            },
          },
        },
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
          },
        },
        items: {
          where: {
            isHidden: false,
          },
          select: {
            itemId: true,
            name: true,
            description: true,
            url: true,
            imageUrl: true,
            price: true,
            priority: true,
            // CRITICAL: Hide purchase status from wish list owner
            // Other members can see to avoid duplicates
            isPurchased: membership.groupMemberId !== membership.groupMemberId, // This will be filtered below
            purchasedBy: true,
            purchasedAt: true,
            createdAt: true,
          },
          orderBy: [
            { isPurchased: 'asc' }, // Unpurchased first
            { priority: 'desc' }, // Then by priority
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            items: {
              where: {
                isHidden: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter purchase info based on viewer
    const filteredWishLists = wishLists.map(wishList => {
      const isOwner = wishList.forMemberId === membership.groupMemberId;

      return {
        ...wishList,
        forMember: {
          ...wishList.forMember,
          // Merge user profile (priority: User > GroupMember)
          displayName: wishList.forMember.user?.displayName || wishList.forMember.displayName,
          iconLetters: wishList.forMember.user?.memberIcon || wishList.forMember.iconLetters,
          iconColor: wishList.forMember.user?.iconColor || wishList.forMember.iconColor,
          profilePhotoUrl: wishList.forMember.user?.profilePhotoFileId
            ? `${process.env.API_BASE_URL || 'http://localhost:3000'}/files/${wishList.forMember.user.profilePhotoFileId}`
            : null,
        },
        items: wishList.items.map(item => ({
          ...item,
          // Hide purchase info from list owner (surprise!)
          isPurchased: isOwner ? undefined : item.isPurchased,
          purchasedBy: isOwner ? undefined : item.purchasedBy,
          purchasedAt: isOwner ? undefined : item.purchasedAt,
        })),
      };
    });

    res.status(200).json({
      success: true,
      wishLists: filteredWishLists,
    });
  } catch (error) {
    console.error('Get wish lists error:', error);
    res.status(500).json({
      error: 'Failed to get wish lists',
      message: error.message,
    });
  }
}

/**
 * Create a new wish list
 * POST /groups/:groupId/wish-lists
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function createWishList(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const { name, description, forMemberId } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!name || !forMemberId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name and forMemberId are required',
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

    // Verify forMemberId is valid group member
    const forMember = await prisma.groupMember.findUnique({
      where: {
        groupMemberId: forMemberId,
      },
    });

    if (!forMember || forMember.groupId !== groupId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid forMemberId - must be a member of this group',
      });
    }

    // Create wish list
    const wishList = await prisma.wishList.create({
      data: {
        groupId: groupId,
        name: name.trim(),
        description: description?.trim() || null,
        forMemberId: forMemberId,
        createdBy: membership.groupMemberId,
      },
      include: {
        forMember: {
          include: {
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
                profilePhotoFileId: true,
              },
            },
          },
        },
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'create_wish_list',
        actionLocation: 'gift_registry',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Created wish list "${name}" for ${forMember.displayName}`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Wish list created successfully',
      wishList: wishList,
    });
  } catch (error) {
    console.error('Create wish list error:', error);
    res.status(500).json({
      error: 'Failed to create wish list',
      message: error.message,
    });
  }
}

/**
 * Add item to wish list
 * POST /groups/:groupId/wish-lists/:wishListId/items
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function addWishListItem(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, wishListId } = req.params;
    const { name, description, url, imageUrl, price, priority, notes } = req.body;

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
        message: 'Item name is required',
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

    // Verify wish list exists and belongs to this group
    const wishList = await prisma.wishList.findUnique({
      where: {
        wishListId: wishListId,
      },
    });

    if (!wishList || wishList.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wish list not found',
      });
    }

    // Only the wish list owner can add items
    if (wishList.forMemberId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the wish list owner can add items',
      });
    }

    // Create wish list item
    const item = await prisma.wishListItem.create({
      data: {
        wishListId: wishListId,
        name: name.trim(),
        description: description?.trim() || null,
        url: url?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        price: price || null,
        priority: priority || 'medium',
        notes: notes?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'add_wish_list_item',
        actionLocation: 'gift_registry',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Added item "${name}" to wish list "${wishList.name}"`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Item added to wish list',
      item: item,
    });
  } catch (error) {
    console.error('Add wish list item error:', error);
    res.status(500).json({
      error: 'Failed to add item',
      message: error.message,
    });
  }
}

/**
 * Mark wish list item as purchased
 * PUT /groups/:groupId/wish-lists/:wishListId/items/:itemId/purchase
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function markItemAsPurchased(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, wishListId, itemId } = req.params;

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

    // Verify wish list exists and belongs to this group
    const wishList = await prisma.wishList.findUnique({
      where: {
        wishListId: wishListId,
      },
    });

    if (!wishList || wishList.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wish list not found',
      });
    }

    // CRITICAL: Wish list owner cannot mark items as purchased (surprise!)
    if (wishList.forMemberId === membership.groupMemberId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot mark items on your own wish list as purchased',
      });
    }

    // Verify item exists
    const item = await prisma.wishListItem.findUnique({
      where: {
        itemId: itemId,
      },
    });

    if (!item || item.wishListId !== wishListId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Item not found',
      });
    }

    // Mark as purchased
    const updatedItem = await prisma.wishListItem.update({
      where: {
        itemId: itemId,
      },
      data: {
        isPurchased: true,
        purchasedBy: membership.groupMemberId,
        purchasedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'mark_wish_list_item_purchased',
        actionLocation: 'gift_registry',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Marked "${item.name}" as purchased from "${wishList.name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Item marked as purchased',
      item: updatedItem,
    });
  } catch (error) {
    console.error('Mark item as purchased error:', error);
    res.status(500).json({
      error: 'Failed to mark item as purchased',
      message: error.message,
    });
  }
}

/**
 * Unmark wish list item as purchased
 * PUT /groups/:groupId/wish-lists/:wishListId/items/:itemId/unpurchase
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function unmarkItemAsPurchased(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, wishListId, itemId } = req.params;

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

    // Verify wish list exists
    const wishList = await prisma.wishList.findUnique({
      where: {
        wishListId: wishListId,
      },
    });

    if (!wishList || wishList.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wish list not found',
      });
    }

    // Verify item exists
    const item = await prisma.wishListItem.findUnique({
      where: {
        itemId: itemId,
      },
    });

    if (!item || item.wishListId !== wishListId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Item not found',
      });
    }

    // Only the person who marked it purchased can unmark it
    if (item.purchasedBy !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the person who marked this item as purchased can unmark it',
      });
    }

    // Unmark as purchased
    const updatedItem = await prisma.wishListItem.update({
      where: {
        itemId: itemId,
      },
      data: {
        isPurchased: false,
        purchasedBy: null,
        purchasedAt: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'unmark_wish_list_item_purchased',
        actionLocation: 'gift_registry',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Unmarked "${item.name}" as purchased from "${wishList.name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Item unmarked as purchased',
      item: updatedItem,
    });
  } catch (error) {
    console.error('Unmark item as purchased error:', error);
    res.status(500).json({
      error: 'Failed to unmark item',
      message: error.message,
    });
  }
}

/**
 * Delete wish list item
 * DELETE /groups/:groupId/wish-lists/:wishListId/items/:itemId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteWishListItem(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId, wishListId, itemId } = req.params;

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

    // Verify wish list exists
    const wishList = await prisma.wishList.findUnique({
      where: {
        wishListId: wishListId,
      },
    });

    if (!wishList || wishList.groupId !== groupId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Wish list not found',
      });
    }

    // Only the wish list owner can delete items
    if (wishList.forMemberId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the wish list owner can delete items',
      });
    }

    // Verify item exists
    const item = await prisma.wishListItem.findUnique({
      where: {
        itemId: itemId,
      },
    });

    if (!item || item.wishListId !== wishListId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Item not found',
      });
    }

    // Soft delete
    await prisma.wishListItem.update({
      where: {
        itemId: itemId,
      },
      data: {
        isHidden: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'delete_wish_list_item',
        actionLocation: 'gift_registry',
        performedBy: membership.groupMemberId,
        performedByName: membership.displayName,
        performedByEmail: membership.email || 'N/A',
        messageContent: `Deleted item "${item.name}" from wish list "${wishList.name}"`,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Delete wish list item error:', error);
    res.status(500).json({
      error: 'Failed to delete item',
      message: error.message,
    });
  }
}

module.exports = {
  getWishLists,
  createWishList,
  addWishListItem,
  markItemAsPurchased,
  unmarkItemAsPurchased,
  deleteWishListItem,
};
