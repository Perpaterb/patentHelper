/**
 * Audit Logs Screen
 *
 * Admin-only screen for viewing and exporting audit logs.
 * React Native Paper version for web-admin.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
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
  Dialog,
  Portal,
  TextInput,
  Chip,
  ProgressBar,
} from 'react-native-paper';
import api from '../services/api';

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

  // Export dialog
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Previous exports
  const [previousExports, setPreviousExports] = useState([]);
  const [loadingExports, setLoadingExports] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchPreviousExports();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchLogs();
    }
  }, [selectedGroup, page]);

  async function fetchGroups() {
    try {
      const response = await api.get('/groups');
      const adminGroups = response.data.groups.filter(
        (g) => g.currentUserRole === 'admin'
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
      const response = await api.get(
        `/logs/groups/${selectedGroup.groupId}?page=${page + 1}&limit=20`
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

  async function fetchPreviousExports() {
    try {
      setLoadingExports(true);
      const response = await api.get('/logs/exports');
      setPreviousExports(response.data.exports || []);
    } catch (err) {
      console.error('Failed to fetch exports:', err);
    } finally {
      setLoadingExports(false);
    }
  }

  async function handleRequestExport() {
    if (!exportPassword || exportPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setExporting(true);
      await api.post('/logs/exports', {
        groupId: selectedGroup.groupId,
        password: exportPassword,
      });

      setSuccess('Export request submitted. You will receive an email when it is ready.');
      setExportDialogVisible(false);
      setExportPassword('');

      // Refresh previous exports
      fetchPreviousExports();
    } catch (err) {
      console.error('Failed to request export:', err);
      setError(err.response?.data?.message || 'Failed to request export');
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadExport(exportId) {
    try {
      const response = await api.get(`/logs/exports/${exportId}/download`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${exportId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download export:', err);
      setError(err.response?.data?.message || 'Failed to download export');
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

  function getStatusColor(status) {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'processing':
        return '#ff9800';
      case 'pending':
        return '#2196f3';
      case 'failed':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }

  if (loading && groups.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.scrollView}>
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

              <Button
                mode="contained"
                onPress={() => setExportDialogVisible(true)}
                icon="download"
                disabled={!selectedGroup}
              >
                Export Logs
              </Button>
            </View>

            {/* Info Box */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <View style={styles.infoRow}>
                  <IconButton icon="information" size={20} iconColor="#1976d2" />
                  <Text style={styles.infoText}>
                    Audit logs are immutable records of all group actions. Exports are password-protected ZIP files
                    containing decrypted messages and activity data. Keep your export password secure.
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
            <ScrollView horizontal>
              <Card style={styles.tableCard}>
                <DataTable>
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
                    logs.map((log, index) => (
                      <DataTable.Row key={log.logId || index}>
                        <DataTable.Cell style={styles.columnDate}>
                          {formatDate(log.createdAt)}
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.columnAction}>
                          {log.action}
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.columnUser}>
                          {log.performedByName}
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.columnLocation}>
                          {log.actionLocation}
                        </DataTable.Cell>
                        <DataTable.Cell style={styles.columnContent}>
                          <Text numberOfLines={2}>{log.messageContent}</Text>
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))
                  )}

                  <DataTable.Pagination
                    page={page}
                    numberOfPages={totalPages}
                    onPageChange={(newPage) => setPage(newPage)}
                    label={`Page ${page + 1} of ${totalPages}`}
                  />
                </DataTable>
              </Card>
            </ScrollView>

            {/* Previous Exports */}
            <Card style={styles.exportsCard}>
              <Card.Content>
                <Title style={styles.exportsTitle}>Previous Exports</Title>
                <Divider style={styles.divider} />

                {loadingExports ? (
                  <ActivityIndicator style={styles.exportsLoading} />
                ) : previousExports.length === 0 ? (
                  <Text style={styles.noExports}>No previous exports found.</Text>
                ) : (
                  previousExports.map((exp) => (
                    <View key={exp.exportId} style={styles.exportItem}>
                      <View style={styles.exportInfo}>
                        <Text style={styles.exportGroup}>{exp.groupName}</Text>
                        <Text style={styles.exportDate}>
                          Requested: {formatDate(exp.requestedAt)}
                        </Text>
                        <View style={styles.exportStatusRow}>
                          <Chip
                            mode="flat"
                            textStyle={{ fontSize: 12 }}
                            style={[
                              styles.statusChip,
                              { backgroundColor: getStatusColor(exp.status) + '20' },
                            ]}
                          >
                            {exp.status}
                          </Chip>
                          <Text style={styles.expiresText}>
                            Expires: {formatDate(exp.expiresAt)}
                          </Text>
                        </View>
                      </View>
                      {exp.status === 'completed' && (
                        <Button
                          mode="outlined"
                          onPress={() => handleDownloadExport(exp.exportId)}
                          icon="download"
                          compact
                        >
                          Download
                        </Button>
                      )}
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Export Dialog */}
      <Portal>
        <Dialog
          visible={exportDialogVisible}
          onDismiss={() => {
            setExportDialogVisible(false);
            setExportPassword('');
          }}
        >
          <Dialog.Title>Export Audit Logs</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Create a password-protected ZIP file containing all audit logs for{' '}
              <Text style={{ fontWeight: 'bold' }}>{selectedGroup?.name}</Text>.
            </Paragraph>
            <Paragraph style={styles.dialogNote}>
              The export will include decrypted message content, timestamps, and user activity.
              Keep your password secure - you will need it to open the ZIP file.
            </Paragraph>
            <TextInput
              label="Export Password"
              value={exportPassword}
              onChangeText={setExportPassword}
              secureTextEntry={!passwordVisible}
              mode="outlined"
              style={styles.passwordInput}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? 'eye-off' : 'eye'}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
            />
            <Text style={styles.passwordHint}>
              Password must be at least 8 characters
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setExportDialogVisible(false);
                setExportPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleRequestExport}
              loading={exporting}
              disabled={exporting || exportPassword.length < 8}
            >
              Request Export
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
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
    minWidth: 900,
  },
  columnDate: {
    flex: 1.5,
    minWidth: 150,
  },
  columnAction: {
    flex: 1,
    minWidth: 120,
  },
  columnUser: {
    flex: 1,
    minWidth: 120,
  },
  columnLocation: {
    flex: 1,
    minWidth: 100,
  },
  columnContent: {
    flex: 2,
    minWidth: 200,
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
  exportsTitle: {
    fontSize: 16,
    marginBottom: 8,
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
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  exportInfo: {
    flex: 1,
  },
  exportGroup: {
    fontWeight: '600',
    fontSize: 14,
  },
  exportDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  exportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statusChip: {
    height: 24,
  },
  expiresText: {
    color: '#666',
    fontSize: 12,
  },
  dialogNote: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  passwordInput: {
    marginTop: 16,
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
