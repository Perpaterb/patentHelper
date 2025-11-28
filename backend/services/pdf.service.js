/**
 * PDF Generation Service
 *
 * Generates PDF files for audit log exports.
 * Uses jsPDF and jspdf-autotable for table formatting.
 *
 * @module services/pdf
 */

const { jsPDF } = require('jspdf');
require('jspdf-autotable');

/**
 * Generate a PDF for audit log export
 *
 * @param {Object} options - PDF generation options
 * @param {string} options.groupName - Name of the group
 * @param {Object} options.filters - Filters applied to the export
 * @param {Date} [options.filters.dateFrom] - Start date filter
 * @param {Date} [options.filters.dateTo] - End date filter
 * @param {string[]} [options.filters.actionTypes] - Array of action types to filter
 * @param {string[]} [options.filters.userIds] - Array of user IDs to filter
 * @param {Object[]} options.logs - Array of audit log entries
 * @param {Date} options.createdAt - Export creation date
 * @returns {Buffer} PDF file as buffer
 */
function generateAuditLogPDF({ groupName, filters, logs, createdAt }) {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  doc.setFontSize(20);
  doc.text('Audit Log Export', 14, 22);

  // Add group name
  doc.setFontSize(12);
  doc.text(`Group: ${groupName}`, 14, 32);

  // Add export date
  const exportDate = new Date(createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  doc.text(`Export Date: ${exportDate}`, 14, 38);

  // Add filters section
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Filters Applied:', 14, 46);
  doc.setFont(undefined, 'normal');

  let yPosition = 52;

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom).toLocaleDateString('en-US')
      : 'Beginning';
    const dateTo = filters.dateTo
      ? new Date(filters.dateTo).toLocaleDateString('en-US')
      : 'Now';
    doc.text(`Date Range: ${dateFrom} - ${dateTo}`, 14, yPosition);
    yPosition += 6;
  } else {
    doc.text('Date Range: All dates', 14, yPosition);
    yPosition += 6;
  }

  // Action types filter
  if (filters.actionTypes && filters.actionTypes.length > 0) {
    doc.text(`Action Types: ${filters.actionTypes.join(', ')}`, 14, yPosition);
    yPosition += 6;
  } else {
    doc.text('Action Types: All actions', 14, yPosition);
    yPosition += 6;
  }

  // Users filter
  if (filters.userNames && filters.userNames.length > 0) {
    doc.text(`Users: ${filters.userNames.join(', ')}`, 14, yPosition);
    yPosition += 6;
  } else {
    doc.text('Users: All users', 14, yPosition);
    yPosition += 6;
  }

  yPosition += 4;

  // Add logs count
  doc.setFont(undefined, 'bold');
  doc.text(`Total Records: ${logs.length}`, 14, yPosition);
  yPosition += 8;

  // Prepare table data
  const tableData = logs.map((log) => [
    new Date(log.performedAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    log.action || '-',
    log.actionLocation || '-',
    log.performedByName || 'System',
    log.performedByEmail || '-',
    log.messageContent || '-',
    log.mediaLinks && log.mediaLinks.length > 0 ? log.mediaLinks.join(', ') : '-',
  ]);

  // Add table
  doc.autoTable({
    startY: yPosition,
    head: [['Date/Time', 'Action', 'Location', 'User Name', 'User Email', 'Content', 'Media Links']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, left: 14, right: 14 },
    theme: 'striped',
    columnStyles: {
      0: { cellWidth: 35 }, // Date/Time
      1: { cellWidth: 30 }, // Action
      2: { cellWidth: 30 }, // Location
      3: { cellWidth: 35 }, // User Name
      4: { cellWidth: 40 }, // User Email
      5: { cellWidth: 50 }, // Content
      6: { cellWidth: 40 }, // Media Links
    },
  });

  // Add footer with page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = {
  generateAuditLogPDF,
};
