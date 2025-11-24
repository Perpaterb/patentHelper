/**
 * Logs Controller
 *
 * Handles audit log export operations.
 * When exporting messages, all encrypted content must be decrypted for admin review.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const encryptionService = require('../services/encryption.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get audit logs for a group
 * GET /logs/groups/:groupId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getAuditLogs(req, res) {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Check if user is admin of this group
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
    });

    if (!groupMember) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You must be an admin of this group to view audit logs',
      });
    }

    // Get total count for pagination
    const totalLogs = await prisma.auditLog.count({
      where: { groupId: groupId },
    });

    // Get logs with pagination
    const logs = await prisma.auditLog.findMany({
      where: { groupId: groupId },
      orderBy: { performedAt: 'desc' },
      skip: skip,
      take: limit,
      select: {
        logId: true,
        action: true,
        actionLocation: true,
        performedByName: true,
        performedByEmail: true,
        performedAt: true,
        messageContent: true,
        mediaLinks: true,
      },
    });

    // Map the response to match frontend expectations
    const formattedLogs = logs.map(log => ({
      logId: log.logId,
      action: log.action,
      actionLocation: log.actionLocation || 'Unknown',
      performedByName: log.performedByName || 'Unknown',
      performedByEmail: log.performedByEmail,
      createdAt: log.performedAt,
      messageContent: log.messageContent || '',
      mediaLinks: log.mediaLinks || [],
    }));

    res.status(200).json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: page,
        limit: limit,
        total: totalLogs,
        totalPages: Math.ceil(totalLogs / limit),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Failed to get audit logs',
      message: error.message,
    });
  }
}

/**
 * Request a new log export
 * POST /logs/exports
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function requestExport(req, res) {
  try {
    const { prisma } = require('../config/database');
    const userId = req.user?.userId;
    const { groupId, password } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Validate required fields
    if (!groupId || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'groupId and password are required',
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
      });
    }

    // Check if user is admin of this group
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'admin',
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!groupMember) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You must be an admin of this group to export logs',
      });
    }

    // Create export request
    // For now, we'll store this in a simple JSON file
    // In production, this would be in a database table
    const exportId = uuidv4();
    const exportRequest = {
      exportId: exportId,
      groupId: groupId,
      groupName: groupMember.group.name,
      userId: userId,
      requestedAt: new Date().toISOString(),
      status: 'pending', // pending, processing, completed, failed
      password: password, // In production, this should be hashed
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    // Store export request (simplified for local development)
    const exportsDir = path.join(__dirname, '../uploads/exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const exportFilePath = path.join(exportsDir, `${exportId}.json`);
    fs.writeFileSync(exportFilePath, JSON.stringify(exportRequest, null, 2));

    // In production, trigger background job to process export
    // IMPORTANT: When exporting messages, use encryptionService.decrypt() to decrypt
    // all message content so admins can read them in the export ZIP file
    // For now, we'll just mark it as completed immediately for testing
    setTimeout(() => {
      try {
        const request = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));
        request.status = 'completed';
        fs.writeFileSync(exportFilePath, JSON.stringify(request, null, 2));
      } catch (err) {
        console.error('Failed to update export status:', err);
      }
    }, 2000); // Simulate processing delay

    res.status(201).json({
      success: true,
      exportId: exportId,
      message: 'Export request created. You will receive an email when it is ready.',
    });
  } catch (error) {
    console.error('Request export error:', error);
    res.status(500).json({
      error: 'Failed to request export',
      message: error.message,
    });
  }
}

/**
 * Get all export requests for the user
 * GET /logs/exports
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getExports(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Read all export requests for this user
    const exportsDir = path.join(__dirname, '../uploads/exports');

    if (!fs.existsSync(exportsDir)) {
      return res.status(200).json({
        success: true,
        exports: [],
      });
    }

    const files = fs.readdirSync(exportsDir);
    const exports = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(exportsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      })
      .filter(exp => exp.userId === userId)
      .map(exp => ({
        exportId: exp.exportId,
        groupName: exp.groupName,
        requestedAt: exp.requestedAt,
        status: exp.status,
        expiresAt: exp.expiresAt,
      }))
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    res.status(200).json({
      success: true,
      exports: exports,
    });
  } catch (error) {
    console.error('Get exports error:', error);
    res.status(500).json({
      error: 'Failed to get exports',
      message: error.message,
    });
  }
}

/**
 * Download a completed export
 * GET /logs/exports/:id/download
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function downloadExport(req, res) {
  try {
    const userId = req.user?.userId;
    const exportId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // Read export request
    const exportFilePath = path.join(__dirname, '../uploads/exports', `${exportId}.json`);

    if (!fs.existsSync(exportFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Export not found',
      });
    }

    const exportRequest = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));

    // Check if user owns this export
    if (exportRequest.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to download this export',
      });
    }

    // Check if export is completed
    if (exportRequest.status !== 'completed') {
      return res.status(404).json({
        error: 'Not Found',
        message: `Export is ${exportRequest.status}. Please wait for it to complete.`,
      });
    }

    // Check if export has expired
    if (new Date(exportRequest.expiresAt) < new Date()) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Export has expired',
      });
    }

    // For local development, create a dummy ZIP file
    // In production, this would be a real password-protected ZIP with audit logs
    const dummyZipContent = Buffer.from(`Audit logs for ${exportRequest.groupName}\nRequested at: ${exportRequest.requestedAt}\nPassword protected with: ${exportRequest.password}`);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${exportId}.zip"`);
    res.send(dummyZipContent);
  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({
      error: 'Failed to download export',
      message: error.message,
    });
  }
}

module.exports = {
  getAuditLogs,
  requestExport,
  getExports,
  downloadExport,
};
