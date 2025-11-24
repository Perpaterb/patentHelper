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
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchGroups();
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
        `/groups/${selectedGroup.groupId}/audit-logs?page=${page + 1}&limit=20`
      );
      setLogs(response.data.logs || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format) {
    try {
      setExporting(true);
      const response = await api.get(
        `/groups/${selectedGroup.groupId}/audit-logs/export?format=${format}`,
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${selectedGroup.name}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export logs:', err);
      setError('Failed to export audit logs');
    } finally {
      setExporting(false);
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

            <View style={styles.exportButtons}>
              <Button
                mode="contained"
                onPress={() => handleExport('pdf')}
                loading={exporting}
                disabled={exporting || !selectedGroup}
                style={styles.exportButton}
                compact
              >
                Export PDF
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleExport('csv')}
                loading={exporting}
                disabled={exporting || !selectedGroup}
                compact
              >
                Export CSV
              </Button>
            </View>
          </View>

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
                    <DataTable.Row key={index}>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    marginRight: 8,
  },
  tableCard: {
    margin: 16,
    marginTop: 0,
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
});
