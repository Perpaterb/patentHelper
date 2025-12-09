/**
 * Audit Logs Screen
 *
 * Admin-only screen for viewing and exporting audit logs.
 * React Native Paper version for web-admin.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Paragraph,
  Surface,
  ActivityIndicator,
  Divider,
  DataTable,
  Menu,
  IconButton,
  Chip,
  TextInput,
} from 'react-native-paper';
import api from '../services/api';
import { CustomAlert } from '../components/CustomAlert';

export default function AuditLogsScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Previous exports
  const [previousExports, setPreviousExports] = useState([]);
  const [loadingExports, setLoadingExports] = useState(false);

  // Filters
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedActions, setSelectedActions] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState({});

  // Previous exports section collapsed by default
  const [exportsExpanded, setExportsExpanded] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchPreviousExports();
    }
  }, [selectedGroup]);

  // Fetch logs when filters change
  useEffect(() => {
    if (selectedGroup) {
      fetchLogs();
    }
  }, [selectedGroup, page, selectedActions, selectedUsers, fromDate, toDate]);

  // Fetch filter options only when group changes (not when filters change)
  useEffect(() => {
    if (selectedGroup) {
      fetchFilterOptions();
    }
  }, [selectedGroup]);

  async function fetchFilterOptions() {
    try {
      // Fetch all logs for this group to get unique actions and users
      const response = await api.get(
        `/logs/groups/${selectedGroup.groupId}?page=1&limit=1000`
      );
      const allLogs = response.data.logs || [];

      // Extract unique actions
      const actions = [...new Set(allLogs.map(log => log.action))].sort();
      setAvailableActions(actions);

      // Extract unique users (email)
      const users = [...new Set(allLogs.map(log => log.performedByEmail))].filter(Boolean).sort();
      setAvailableUsers(users);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }

  async function fetchGroups() {
    try {
      const response = await api.get('/groups');
      const adminGroups = response.data.groups.filter(
        (g) => g.role === 'admin'
      );
      setGroups(adminGroups);
      if (adminGroups.length > 0) {
        setSelectedGroup(adminGroups[0]);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page + 1);
      params.append('limit', 20);

      if (selectedActions.length > 0) {
        params.append('actions', selectedActions.join(','));
      }
      if (selectedUsers.length > 0) {
        params.append('users', selectedUsers.join(','));
      }
      if (fromDate) {
        params.append('fromDate', fromDate);
      }
      if (toDate) {
        params.append('toDate', toDate);
      }

      const response = await api.get(
        `/logs/groups/${selectedGroup.groupId}?${params.toString()}`
      );
      setLogs(response.data.logs || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalLogs(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    fetchLogs();
    fetchFilterOptions();
    fetchPreviousExports();
  }

  function handleClearFilters() {
    setSelectedActions([]);
    setSelectedUsers([]);
    setFromDate('');
    setToDate('');
    setPage(0);
  }

  function toggleActionFilter(action) {
    setSelectedActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
    setPage(0); // Reset to first page
  }

  function toggleUserFilter(user) {
    setSelectedUsers(prev =>
      prev.includes(user)
        ? prev.filter(u => u !== user)
        : [...prev, user]
    );
    setPage(0); // Reset to first page
  }

  function toggleRowExpanded(logId) {
    setExpandedRows(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  }

  async function fetchPreviousExports() {
    if (!selectedGroup) return;

    try {
      setLoadingExports(true);
      const response = await api.get(`/logs/${selectedGroup.groupId}/exports`);
      setPreviousExports(response.data.exports || []);
    } catch (err) {
      console.error('Failed to fetch exports:', err);
    } finally {
      setLoadingExports(false);
    }
  }

  async function handleExportLogs() {
    try {
      setExporting(true);
      setError(null);

      // Build filters object
      const filters = {};

      if (fromDate) {
        filters.dateFrom = fromDate;
      }
      if (toDate) {
        filters.dateTo = toDate;
      }
      if (selectedActions.length > 0) {
        filters.actionTypes = selectedActions;
      }
      if (selectedUsers.length > 0) {
        // Convert emails to group member IDs
        const memberIds = await getUserIdsFromEmails(selectedUsers);
        filters.userIds = memberIds;
      }

      // Call backend to generate PDF
      const response = await api.post(
        `/logs/${selectedGroup.groupId}/export`,
        { filters },
        { responseType: 'blob' }
      );

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `AuditLog_${selectedGroup.name}_${new Date().toISOString().split('T')[0]}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Audit log PDF exported successfully!');

      // Refresh previous exports list
      fetchPreviousExports();
    } catch (err) {
      console.error('Failed to export logs:', err);
      setError(err.response?.data?.message || 'Failed to export logs');
    } finally {
      setExporting(false);
    }
  }

  async function getUserIdsFromEmails(emails) {
    // Fetch all group members to map emails to group member IDs
    try {
      const response = await api.get(`/groups/${selectedGroup.groupId}/members`);
      const members = response.data.members || [];

      return members
        .filter(m => emails.includes(m.email))
        .map(m => m.groupMemberId);
    } catch (err) {
      console.error('Failed to fetch members for email mapping:', err);
      return [];
    }
  }

  async function handleDownloadExport(exportId, fileName) {
    try {
      const response = await api.get(
        `/logs/${selectedGroup.groupId}/exports/${exportId}/download`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `audit-log-${exportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Export downloaded successfully!');
    } catch (err) {
      console.error('Failed to download export:', err);
      setError(err.response?.data?.message || 'Failed to download export');
    }
  }

  async function handleDeleteExport(exportId, fileName) {
    CustomAlert.alert(
      'Delete Export',
      `Are you sure you want to delete the export "${fileName}"? This action requires approval from >50% of admins.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await performDelete(exportId);
          },
        },
      ]
    );
  }

  async function performDelete(exportId) {
    try {
      const response = await api.delete(`/logs/${selectedGroup.groupId}/exports/${exportId}`);

      if (response.data.status === 'pending') {
        setSuccess(`Delete request created. ${response.data.currentVotes}/${response.data.requiredVotes} votes received. Waiting for admin approvals.`);
      } else {
        setSuccess('Export deleted successfully!');
        // Refresh exports list
        fetchPreviousExports();
      }
    } catch (err) {
      console.error('Failed to delete export:', err);
      setError(err.response?.data?.message || 'Failed to delete export');
    }
  }

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

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizeInBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  function getFilterSummary(filters) {
    const parts = [];

    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : 'start';
      const to = filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : 'now';
      parts.push(`Date: ${from} to ${to}`);
    }

    if (filters.actionTypes && filters.actionTypes.length > 0) {
      parts.push(`Actions: ${filters.actionTypes.length}`);
    }

    if (filters.userIds && filters.userIds.length > 0) {
      parts.push(`Users: ${filters.userIds.length}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No filters';
  }

  if (loading && groups.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f5f5f5' }}>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          icon="arrow-left"
        >
          Back
        </Button>
        <Title style={styles.headerTitle}>Audit Logs</Title>
        <View style={{ width: 80 }} />
      </View>

      {error && (
        <Surface style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <IconButton icon="close" size={16} onPress={() => setError(null)} />
        </Surface>
      )}

      {success && (
        <Surface style={styles.successBanner}>
          <Text style={styles.successText}>{success}</Text>
          <IconButton icon="close" size={16} onPress={() => setSuccess(null)} />
        </Surface>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
        {groups.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Title>No Admin Groups</Title>
              <Paragraph>
                You must be an admin of at least one group to view audit logs.
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* Group Selector and Export */}
            <View style={styles.toolbar}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    icon="chevron-down"
                    contentStyle={styles.groupButtonContent}
                  >
                    {selectedGroup?.name || 'Select Group'}
                  </Button>
                }
              >
                {groups.map((group) => (
                  <Menu.Item
                    key={group.groupId}
                    onPress={() => {
                      setSelectedGroup(group);
                      setMenuVisible(false);
                      setPage(0);
                    }}
                    title={group.name}
                  />
                ))}
              </Menu>

              <View style={styles.toolbarRight}>
                <IconButton
                  icon="refresh"
                  mode="outlined"
                  onPress={handleRefresh}
                  disabled={!selectedGroup}
                />
                <Button
                  mode={filterVisible ? 'contained' : 'outlined'}
                  onPress={() => setFilterVisible(!filterVisible)}
                  icon="filter"
                  disabled={!selectedGroup}
                >
                  Filters
                </Button>
                <Button
                  mode="contained"
                  onPress={handleExportLogs}
                  icon="download"
                  disabled={!selectedGroup || exporting}
                  loading={exporting}
                >
                  {exporting ? 'Exporting...' : 'Export Logs'}
                </Button>
              </View>
            </View>

            {/* Previous Exports - Collapsible, moved to top */}
            {selectedGroup && (
              <Card style={styles.exportsCard}>
                <View style={styles.exportsHeader}>
                  <View style={styles.exportsHeaderLeft}>
                    <IconButton
                      icon={exportsExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      onPress={() => setExportsExpanded(!exportsExpanded)}
                    />
                    <Text style={styles.exportsTitle}>
                      Previous Exports {previousExports.length > 0 ? `(${previousExports.length})` : ''}
                    </Text>
                  </View>
                  <Button
                    mode="text"
                    onPress={() => setExportsExpanded(!exportsExpanded)}
                    compact
                  >
                    {exportsExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </View>

                {exportsExpanded && (
                  <Card.Content style={styles.exportsContent}>
                    {loadingExports ? (
                      <ActivityIndicator style={styles.exportsLoading} />
                    ) : previousExports.length === 0 ? (
                      <Text style={styles.noExports}>No previous exports found.</Text>
                    ) : (
                      previousExports.map((exp) => (
                        <View key={exp.exportId} style={styles.exportItem}>
                          <View style={styles.exportInfo}>
                            <Text style={styles.exportFileName}>{exp.fileName}</Text>
                            <Text style={styles.exportDate}>
                              Created: {formatDate(exp.createdAt)}
                            </Text>
                            <Text style={styles.exportSize}>
                              Size: {formatFileSize(exp.fileSizeBytes)}
                            </Text>
                            {exp.filters && Object.keys(exp.filters).length > 0 && (
                              <View style={styles.filtersSummary}>
                                <Text style={styles.filtersSummaryText}>
                                  Filters: {getFilterSummary(exp.filters)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.exportActions}>
                            <Button
                              mode="outlined"
                              onPress={() => handleDownloadExport(exp.exportId, exp.fileName)}
                              icon="download"
                              compact
                            >
                              Download
                            </Button>
                            <Button
                              mode="outlined"
                              onPress={() => handleDeleteExport(exp.exportId, exp.fileName)}
                              icon="delete"
                              compact
                              style={styles.deleteButton}
                            >
                              Delete
                            </Button>
                          </View>
                        </View>
                      ))
                    )}
                  </Card.Content>
                )}
              </Card>
            )}

            {/* Filters Panel */}
            {filterVisible && selectedGroup && (
              <Card style={styles.filterCard}>
                <Card.Content>
                  <View style={styles.filterHeader}>
                    <Title style={styles.filterTitle}>Filters</Title>
                    <Button
                      mode="text"
                      onPress={handleClearFilters}
                      disabled={selectedActions.length === 0 && selectedUsers.length === 0 && !fromDate && !toDate}
                    >
                      Clear All
                    </Button>
                  </View>

                  {/* Action Filters */}
                  <Text style={styles.filterSectionTitle}>Actions</Text>
                  <View style={styles.chipContainer}>
                    {availableActions.map(action => (
                      <Chip
                        key={action}
                        selected={selectedActions.includes(action)}
                        onPress={() => toggleActionFilter(action)}
                        style={styles.filterChip}
                      >
                        {action}
                      </Chip>
                    ))}
                  </View>

                  {/* User Filters */}
                  <Text style={styles.filterSectionTitle}>Users</Text>
                  <View style={styles.chipContainer}>
                    {availableUsers.map(user => (
                      <Chip
                        key={user}
                        selected={selectedUsers.includes(user)}
                        onPress={() => toggleUserFilter(user)}
                        style={styles.filterChip}
                      >
                        {user}
                      </Chip>
                    ))}
                  </View>

                  {/* Date Range Filters */}
                  <Text style={styles.filterSectionTitle}>Date Range</Text>
                  <View style={styles.dateRow}>
                    <TextInput
                      label="From Date"
                      value={fromDate}
                      onChangeText={setFromDate}
                      placeholder="YYYY-MM-DD"
                      mode="outlined"
                      style={styles.dateInput}
                      dense
                    />
                    <TextInput
                      label="To Date"
                      value={toDate}
                      onChangeText={setToDate}
                      placeholder="YYYY-MM-DD"
                      mode="outlined"
                      style={styles.dateInput}
                      dense
                    />
                  </View>

                  {/* Active Filters Summary */}
                  {(selectedActions.length > 0 || selectedUsers.length > 0 || fromDate || toDate) && (
                    <View style={styles.activeFiltersSummary}>
                      <Text style={styles.activeFiltersText}>
                        Active filters: {selectedActions.length} actions, {selectedUsers.length} users
                        {fromDate && `, from ${fromDate}`}
                        {toDate && `, to ${toDate}`}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            {/* Info Box */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <View style={styles.infoRow}>
                  <IconButton icon="information" size={20} iconColor="#1976d2" />
                  <Text style={styles.infoText}>
                    Audit logs are immutable records of all group actions. Click "Export Logs" to download a PDF
                    with the current filter settings. All exports are saved and can be re-downloaded from "Previous Exports".
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Summary */}
            {selectedGroup && (
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Title style={styles.summaryTitle}>Log Summary</Title>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Group:</Text>
                    <Text style={styles.summaryValue}>{selectedGroup.name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Logs:</Text>
                    <Text style={styles.summaryValue}>{totalLogs.toLocaleString()}</Text>
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Logs Table */}
            <Card style={styles.tableCard}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <DataTable style={styles.dataTable}>
                  <DataTable.Header>
                    <DataTable.Title style={styles.columnDate}>Date</DataTable.Title>
                    <DataTable.Title style={styles.columnAction}>Action</DataTable.Title>
                    <DataTable.Title style={styles.columnUser}>User</DataTable.Title>
                    <DataTable.Title style={styles.columnLocation}>Location</DataTable.Title>
                    <DataTable.Title style={styles.columnContent}>Content</DataTable.Title>
                  </DataTable.Header>

                  {loading ? (
                    <View style={styles.tableLoading}>
                      <ActivityIndicator />
                    </View>
                  ) : logs.length === 0 ? (
                    <View style={styles.emptyTable}>
                      <Text>No audit logs found for this group.</Text>
                    </View>
                  ) : (
                    logs.map((log, index) => {
                      const isExpanded = expandedRows[log.logId];
                      return (
                        <DataTable.Row key={log.logId || index}>
                          <DataTable.Cell style={styles.columnDate}>
                            {formatDate(log.createdAt)}
                          </DataTable.Cell>
                          <DataTable.Cell style={styles.columnAction}>
                            {log.action}
                          </DataTable.Cell>
                          <DataTable.Cell style={styles.columnUser}>
                            {log.performedByEmail}
                          </DataTable.Cell>
                          <DataTable.Cell style={styles.columnLocation}>
                            {log.actionLocation}
                          </DataTable.Cell>
                          <DataTable.Cell style={styles.columnContent}>
                            <View style={styles.contentCell}>
                              <Text style={styles.contentText} numberOfLines={isExpanded ? undefined : 2}>
                                {log.messageContent}
                              </Text>
                              {log.messageContent && log.messageContent.length > 100 && (
                                <IconButton
                                  icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={16}
                                  onPress={() => toggleRowExpanded(log.logId)}
                                  style={styles.expandButton}
                                />
                              )}
                            </View>
                          </DataTable.Cell>
                        </DataTable.Row>
                      );
                    })
                  )}

                  <DataTable.Pagination
                    page={page}
                    numberOfPages={totalPages}
                    onPageChange={(newPage) => setPage(newPage)}
                    label={`Page ${page + 1} of ${totalPages}`}
                  />
                </DataTable>
              </div>
            </Card>

            {/* Bottom padding */}
            <View style={{ height: 40 }} />
          </>
        )}
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffebee',
    padding: 8,
    paddingLeft: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    padding: 8,
    paddingLeft: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 4,
  },
  successText: {
    color: '#2e7d32',
    flex: 1,
  },
  card: {
    margin: 16,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  groupButtonContent: {
    flexDirection: 'row-reverse',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    backgroundColor: '#e3f2fd',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  summaryCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#666',
  },
  summaryValue: {
    fontWeight: '600',
  },
  tableCard: {
    margin: 16,
    marginTop: 8,
  },
  dataTable: {
    minWidth: 1000,
  },
  columnDate: {
    width: 180,
    minWidth: 180,
  },
  columnAction: {
    width: 150,
    minWidth: 150,
  },
  columnUser: {
    width: 200,
    minWidth: 200,
  },
  columnLocation: {
    width: 120,
    minWidth: 120,
  },
  columnContent: {
    flex: 1,
    minWidth: 350,
  },
  tableLoading: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTable: {
    padding: 40,
    alignItems: 'center',
  },
  exportsCard: {
    margin: 16,
    marginTop: 8,
  },
  exportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
    paddingVertical: 4,
  },
  exportsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exportsContent: {
    paddingTop: 0,
  },
  divider: {
    marginBottom: 16,
  },
  exportsLoading: {
    padding: 20,
  },
  noExports: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  exportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  exportInfo: {
    flex: 1,
    marginRight: 16,
  },
  exportFileName: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  exportDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  exportSize: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  filtersSummary: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  filtersSummaryText: {
    fontSize: 11,
    color: '#1976d2',
  },
  exportActions: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'flex-start',
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#f5f5f5',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  activeFiltersSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  activeFiltersText: {
    fontSize: 13,
    color: '#1976d2',
  },
  contentCell: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    width: '100%',
  },
  contentText: {
    flex: 1,
    flexWrap: 'wrap',
    wordBreak: 'break-word',
    width: '100%',
  },
  expandButton: {
    margin: 0,
    alignSelf: 'center',
  },
});
