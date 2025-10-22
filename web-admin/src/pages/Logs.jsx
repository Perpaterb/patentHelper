/**
 * Logs Page
 *
 * Request and download audit log exports for groups where user is admin.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import api from '../services/api';

function Logs() {
  const [groups, setGroups] = useState([]);
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [exportPassword, setExportPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Fetch groups and export history
   */
  async function fetchData() {
    try {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchExports()]);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load log export information.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetch groups where user is admin
   */
  async function fetchGroups() {
    try {
      const response = await api.get('/groups');
      // Filter to only groups where user is admin
      setGroups(response.data.groups.filter(g => g.role === 'admin'));
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      if (err.response?.status !== 404) {
        throw err;
      }
    }
  }

  /**
   * Fetch export history
   */
  async function fetchExports() {
    try {
      const response = await api.get('/logs/exports');
      setExports(response.data.exports);
    } catch (err) {
      console.error('Failed to fetch exports:', err);
      if (err.response?.status !== 404) {
        throw err;
      }
    }
  }

  /**
   * Request new log export
   */
  async function handleRequestExport() {
    if (!selectedGroup || !exportPassword) {
      setError('Please select a group and provide a password for the export.');
      return;
    }

    if (exportPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      setRequesting(true);
      setError(null);

      await api.post('/logs/exports', {
        groupId: selectedGroup,
        password: exportPassword,
      });

      // Refresh exports list
      await fetchExports();

      // Close dialog and reset form
      setDialogOpen(false);
      setSelectedGroup('');
      setExportPassword('');

      setError(null);
    } catch (err) {
      console.error('Failed to request export:', err);
      setError(err.response?.data?.message || 'Failed to request export. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  /**
   * Download export file
   * @param {string} exportId - Export ID
   */
  async function handleDownload(exportId) {
    try {
      const response = await api.get(`/logs/exports/${exportId}/download`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${exportId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download export:', err);
      setError('Failed to download export. Please try again.');
    }
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get status chip for export
   * @param {string} status - Export status
   * @returns {JSX.Element} Status chip
   */
  function getStatusChip(status) {
    switch (status) {
      case 'completed':
        return <Chip label="Ready" color="success" size="small" icon={<CheckCircleIcon />} />;
      case 'processing':
        return <Chip label="Processing" color="warning" size="small" icon={<HourglassEmptyIcon />} />;
      case 'pending':
        return <Chip label="Pending" color="info" size="small" icon={<HourglassEmptyIcon />} />;
      case 'failed':
        return <Chip label="Failed" color="error" size="small" />;
      default:
        return <Chip label={status} color="default" size="small" />;
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading log export information...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Audit Log Exports
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Request and download complete audit logs for your groups
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Request New Export Card */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FolderIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Request New Export</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export complete audit logs for any group where you are an admin.
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>What's included:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • All messages and conversations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Media files (images and videos)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Admin actions and approvals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Calendar events and finance entries
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Complete audit trail with timestamps
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ p: 2, pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setDialogOpen(true)}
                disabled={groups.length === 0}
              >
                {groups.length === 0 ? 'No Admin Groups' : 'Request Export'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DownloadIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Export Details</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Important information about log exports:
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Security:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  All exports are password-protected ZIP files. You will need the password you
                  provide during the request to open the file.
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Processing Time:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Exports are processed in the background. You'll receive an email notification when
                  your export is ready to download.
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Availability:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed exports are available for 30 days from the request date.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Export History
        </Typography>

        {exports.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No export requests yet. Request your first export above.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Group Name</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.exportId}>
                    <TableCell>{exp.groupName}</TableCell>
                    <TableCell>{formatDate(exp.requestedAt)}</TableCell>
                    <TableCell>{getStatusChip(exp.status)}</TableCell>
                    <TableCell>
                      {exp.expiresAt ? formatDate(exp.expiresAt) : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {exp.status === 'completed' && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(exp.exportId)}
                        >
                          Download
                        </Button>
                      )}
                      {exp.status === 'processing' && (
                        <Typography variant="body2" color="text.secondary">
                          Processing...
                        </Typography>
                      )}
                      {exp.status === 'pending' && (
                        <Typography variant="body2" color="text.secondary">
                          In queue...
                        </Typography>
                      )}
                      {exp.status === 'failed' && (
                        <Typography variant="body2" color="error">
                          Failed
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Request Export Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Log Export</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Group</InputLabel>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                label="Select Group"
              >
                {groups.map((group) => (
                  <MenuItem key={group.groupId} value={group.groupId}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="password"
              label="Export Password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              helperText="This password will be required to open the exported ZIP file. Minimum 8 characters."
              sx={{ mb: 2 }}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> Save this password securely. You will need it to open
                the exported file. We cannot recover it for you.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={requesting}>
            Cancel
          </Button>
          <Button
            onClick={handleRequestExport}
            variant="contained"
            disabled={requesting || !selectedGroup || !exportPassword}
          >
            {requesting ? <CircularProgress size={24} /> : 'Request Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Logs;
