/**
 * Finance Matter Details Screen
 *
 * Shows detailed information about a finance matter including:
 * - Finance matter details (name, description, total, currency, due date)
 * - Member allocations (expected vs paid)
 * - Reimbursement calculations (who owes whom)
 * - Payment recording
 * - Settlement status
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput as RNTextInput } from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  Divider,
  Chip,
  Avatar,
  List,
  TextInput,
  IconButton,
  Menu,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * FinanceMatterDetailsScreen component
 *
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation navigation object
 * @param {Object} props.route - React Navigation route object with groupId and financeMatterId
 * @returns {JSX.Element}
 */
export default function FinanceMatterDetailsScreen({ navigation, route }) {
  const { groupId, financeMatterId } = route.params;

  const [financeMatter, setFinanceMatter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserGroupMemberId, setCurrentUserGroupMemberId] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFinanceMatter();
      if (showMessages) {
        loadMessages();
      }
    }, [groupId, financeMatterId, showMessages])
  );

  /**
   * Load finance matter details
   */
  const loadFinanceMatter = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}/finance-matters/${financeMatterId}`);
      setFinanceMatter(response.data.financeMatter);
      setUserRole(response.data.userRole);
      setCurrentUserGroupMemberId(response.data.currentGroupMemberId);
      setPendingPayments(response.data.pendingPayments || []);
    } catch (err) {
      console.error('Load finance matter error:', err);

      if (err.isAuthError) {
        console.log('[FinanceMatterDetails] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load finance matter');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate reimbursements (who owes whom)
   */
  const calculateReimbursements = () => {
    if (!financeMatter?.members) return [];

    const reimbursements = [];
    const balances = [];

    // Calculate each member's balance (paid - expected)
    financeMatter.members.forEach(member => {
      const paid = parseFloat(member.paidAmount || 0);
      const expected = parseFloat(member.expectedAmount || 0);
      const balance = paid - expected;

      if (Math.abs(balance) > 0.01) { // Ignore tiny rounding differences
        balances.push({
          member: member.groupMember,
          balance: balance,
        });
      }
    });

    // Sort: creditors (positive balance) and debtors (negative balance)
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    // Match creditors with debtors
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

      reimbursements.push({
        from: debtor.member,
        to: creditor.member,
        amount: amount.toFixed(2),
      });

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.01) i++;
      if (Math.abs(debtor.balance) < 0.01) j++;
    }

    return reimbursements;
  };

  /**
   * Format due date with urgency
   */
  const formatDueDate = (dueDate) => {
    if (!dueDate) return { text: 'No due date', style: {} };

    const date = new Date(dueDate);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, style: styles.overdueText };
    }
    if (diffDays === 0) {
      return { text: 'Due today', style: styles.urgentText };
    }
    if (diffDays === 1) {
      return { text: 'Due tomorrow', style: styles.urgentText };
    }
    if (diffDays < 7) {
      return { text: `Due in ${diffDays} days`, style: styles.soonText };
    }

    return { text: `Due ${date.toLocaleDateString()}`, style: {} };
  };

  /**
   * Load messages for this finance matter
   */
  const loadMessages = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/finance-matters/${financeMatterId}/messages`);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Load messages error:', err);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  /**
   * Send a message
   */
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const response = await api.post(`/groups/${groupId}/finance-matters/${financeMatterId}/messages`, {
        content: newMessage.trim(),
      });
      setMessages([...messages, response.data.message]);
      setNewMessage('');
    } catch (err) {
      console.error('Send message error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  /**
   * Toggle discussion visibility
   */
  const toggleDiscussion = () => {
    if (!showMessages) {
      loadMessages();
    }
    setShowMessages(!showMessages);
  };

  /**
   * Handle record payment - opens the dialog
   * @param {Object} member - The member object from financeMatter.members
   * @param {Object} recipient - The recipient from reimbursements (who they owe to)
   * @param {string} reimbursementAmount - The specific amount owed to this recipient
   */
  const handleRecordPayment = (member = null, recipient = null, reimbursementAmount = null) => {
    setSelectedMember({ ...member, recipient, reimbursementAmount });
    setPaymentAmount('');
    setShowPaymentDialog(true);
  };

  /**
   * Submit the payment recording
   */
  const submitPaymentRecord = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    if (!selectedMember.recipient) {
      Alert.alert('Error', 'Payment recipient not found');
      return;
    }

    // Validate against the specific reimbursement amount
    const maxAmount = parseFloat(selectedMember.reimbursementAmount || 0);
    if (amount > maxAmount + 0.01) { // Allow small rounding error
      Alert.alert('Error', `Payment cannot exceed ${financeMatter.currency} ${maxAmount.toFixed(2)}`);
      return;
    }

    setRecordingPayment(true);
    try {
      await api.put(`/groups/${groupId}/finance-matters/${financeMatterId}/record-payment`, {
        groupMemberId: selectedMember.groupMember.groupMemberId,
        amount: amount,
        toMemberId: selectedMember.recipient.groupMemberId,
      });

      Alert.alert('Success', `Payment of ${amount.toFixed(2)} reported to ${selectedMember.recipient.displayName}. Awaiting confirmation.`);
      setShowPaymentDialog(false);
      setSelectedMember(null);
      setPaymentAmount('');
      loadFinanceMatter(); // Reload to show updated amounts
    } catch (err) {
      console.error('Record payment error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  /**
   * Handle confirm payment
   */
  const handleConfirmPayment = (payment) => {
    Alert.alert(
      'Confirm Payment',
      `Confirm that you received ${financeMatter.currency} ${payment.amount.toFixed(2)} from ${payment.from.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.post(`/groups/${groupId}/finance-matters/${financeMatterId}/payments/${payment.paymentId}/confirm`);
              Alert.alert('Success', 'Payment confirmed');
              loadFinanceMatter();
            } catch (err) {
              console.error('Confirm payment error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to confirm payment');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle reject payment
   */
  const handleRejectPayment = (payment) => {
    Alert.alert(
      'Reject Payment',
      `Reject payment of ${financeMatter.currency} ${payment.amount.toFixed(2)} from ${payment.from.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/groups/${groupId}/finance-matters/${financeMatterId}/payments/${payment.paymentId}/reject`);
              Alert.alert('Success', 'Payment rejected');
              loadFinanceMatter();
            } catch (err) {
              console.error('Reject payment error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to reject payment');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle mark as settled (admin only)
   */
  const handleMarkAsSettled = () => {
    Alert.alert(
      'Mark as Settled',
      'Are you sure you want to mark this finance matter as settled? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Settled',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/groups/${groupId}/finance-matters/${financeMatterId}/settle`);
              Alert.alert('Success', 'Finance matter marked as settled');
              loadFinanceMatter(); // Reload to show updated status
            } catch (err) {
              console.error('Mark as settled error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to mark as settled');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle cancel finance matter (admin or creator only)
   */
  const handleCancelFinanceMatter = () => {
    Alert.alert(
      'Cancel Finance Matter',
      'Are you sure you want to cancel this finance matter? It will become read-only and cannot be uncanceled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cancel Finance Matter',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/groups/${groupId}/finance-matters/${financeMatterId}/cancel`);
              Alert.alert('Success', 'Finance matter has been canceled');
              loadFinanceMatter(); // Reload to show updated status
            } catch (err) {
              console.error('Cancel finance matter error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to cancel finance matter');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading finance matter...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadFinanceMatter} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  if (!financeMatter) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Finance matter not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.retryButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const dueDate = formatDueDate(financeMatter.dueDate);
  const reimbursements = calculateReimbursements();
  const totalPaid = financeMatter.members?.reduce((sum, m) => sum + parseFloat(m.paidAmount || 0), 0) || 0;
  const totalExpected = parseFloat(financeMatter.totalAmount);
  const remaining = totalExpected - totalPaid;

  const isCreator = financeMatter.creator?.groupMemberId === currentUserGroupMemberId;
  const canCancel = (userRole === 'admin' || isCreator) && !financeMatter.isSettled && !financeMatter.isCanceled;

  return (
    <ScrollView style={styles.container}>
      {/* Finance Matter Details Card */}
      <Card style={[styles.card, financeMatter.isCanceled && styles.canceledCard]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.title}>{financeMatter.name}</Title>
            {financeMatter.isSettled && (
              <Chip mode="outlined" style={styles.settledChip} textStyle={styles.settledChipText}>
                Settled
              </Chip>
            )}
            {financeMatter.isCanceled && (
              <Chip mode="outlined" style={styles.canceledChip} textStyle={styles.canceledChipText}>
                Canceled
              </Chip>
            )}
          </View>

          {financeMatter.description && (
            <Text style={styles.description}>{financeMatter.description}</Text>
          )}

          <Divider style={styles.divider} />

          <View style={styles.amountRow}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.totalAmount}>
              {financeMatter.currency} {totalExpected.toFixed(2)}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.label}>Paid So Far:</Text>
            <Text style={styles.paidAmount}>
              {financeMatter.currency} {totalPaid.toFixed(2)}
            </Text>
          </View>

          {!financeMatter.isSettled && remaining > 0 && (
            <View style={styles.amountRow}>
              <Text style={styles.label}>Remaining:</Text>
              <Text style={styles.remainingAmount}>
                {financeMatter.currency} {remaining.toFixed(2)}
              </Text>
            </View>
          )}

          {financeMatter.dueDate && (
            <View style={styles.dueDateRow}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={[styles.dueDateText, dueDate.style]}>{dueDate.text}</Text>
            </View>
          )}

          {financeMatter.creator && (
            <View style={styles.creatorRow}>
              <Text style={styles.label}>Created by:</Text>
              <Text style={styles.creatorName}>
                {financeMatter.creator.displayName || financeMatter.creator.email}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <Button
          mode="outlined"
          onPress={toggleDiscussion}
          style={styles.actionButton}
          icon={showMessages ? 'chevron-up' : 'message-text'}
        >
          {showMessages ? 'Hide Discussion' : 'View Discussion'}
        </Button>
      </View>

      {/* Discussion Section */}
      {showMessages && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Discussion</Title>
            <Divider style={styles.divider} />

            {messages.length === 0 ? (
              <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
            ) : (
              <View style={styles.messagesContainer}>
                {messages.map((message) => (
                  <View key={message.messageId} style={styles.messageRow}>
                    <Avatar.Text
                      size={32}
                      label={message.sender?.iconLetters || '?'}
                      style={{ backgroundColor: message.sender?.iconColor || '#6200ee', marginRight: 8 }}
                      color={getContrastTextColor(message.sender?.iconColor || '#6200ee')}
                    />
                    <View style={styles.messageContent}>
                      <Text style={styles.messageSender}>
                        {message.sender?.displayName || 'Unknown'}
                      </Text>
                      <Text style={styles.messageText}>{message.content}</Text>
                      <Text style={styles.messageTime}>
                        {new Date(message.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.messageInputContainer}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                mode="outlined"
                style={styles.messageInput}
                multiline
                disabled={sendingMessage || financeMatter.isCanceled}
              />
              <IconButton
                icon="send"
                size={24}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage || financeMatter.isCanceled}
                style={styles.sendButton}
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Member Allocations Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Member Allocations</Title>
          <Divider style={styles.divider} />

          {financeMatter.members?.map(member => {
            const expected = parseFloat(member.expectedAmount);
            const paid = parseFloat(member.paidAmount || 0);
            const balance = paid - expected;
            const percentage = parseFloat(member.expectedPercentage);

            return (
              <View key={member.groupMemberId} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Avatar.Text
                    size={40}
                    label={member.groupMember?.iconLetters || '?'}
                    style={{ backgroundColor: member.groupMember?.iconColor || '#6200ee' }}
                    color={getContrastTextColor(member.groupMember?.iconColor || '#6200ee')}
                  />
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>
                      {member.groupMember?.displayName || member.groupMember?.email}
                    </Text>
                    <Text style={styles.memberAllocation}>
                      {percentage.toFixed(1)}% · {financeMatter.currency} {expected.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentStatus}>
                  <Text style={styles.paidLabel}>Paid:</Text>
                  <Text style={styles.paidValue}>
                    {financeMatter.currency} {paid.toFixed(2)}
                  </Text>
                  {Math.abs(balance) > 0.01 && (
                    <Text style={[styles.balanceText, balance > 0 ? styles.creditText : styles.debitText]}>
                      {balance > 0 ? `+${balance.toFixed(2)}` : balance.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {/* Reimbursements Card */}
      {!financeMatter.isSettled && reimbursements.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Who Owes Whom</Title>
            <Text style={styles.helperText}>Simplified reimbursement plan</Text>
            <Divider style={styles.divider} />

            {reimbursements.map((reimb, index) => {
              const isCurrentUserDebtor = reimb.from.groupMemberId === currentUserGroupMemberId;

              // Find the corresponding member object for recording payment
              const debtorMember = financeMatter.members?.find(
                m => m.groupMember?.groupMemberId === reimb.from.groupMemberId
              );

              return (
                <View key={index}>
                  <List.Item
                    title={`${reimb.from.displayName || reimb.from.email} owes ${reimb.to.displayName || reimb.to.email}`}
                    description={`Amount: ${financeMatter.currency} ${reimb.amount}`}
                    left={(props) => <List.Icon {...props} icon="arrow-right" color="#6200ee" />}
                    style={styles.reimbursementItem}
                  />

                  {isCurrentUserDebtor && debtorMember && !financeMatter.isCanceled && (
                    <Button
                      mode="contained"
                      onPress={() => handleRecordPayment(debtorMember, reimb.to, reimb.amount)}
                      style={styles.recordPaymentButtonReimb}
                      icon="cash-plus"
                      compact
                    >
                      Record My Payment
                    </Button>
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Pending Payments</Title>
            <Text style={styles.helperText}>Awaiting confirmation</Text>
            <Divider style={styles.divider} />

            {pendingPayments.map((payment) => {
              const isRecipient = payment.to.groupMemberId === currentUserGroupMemberId;
              const isSender = payment.from.groupMemberId === currentUserGroupMemberId;

              return (
                <View key={payment.paymentId} style={styles.pendingPaymentItem}>
                  <View style={styles.pendingPaymentInfo}>
                    <Avatar.Text
                      size={36}
                      label={payment.from.iconLetters}
                      color="#fff"
                      style={{ backgroundColor: payment.from.iconColor }}
                    />
                    <View style={styles.pendingPaymentText}>
                      <Text style={styles.pendingPaymentTitle}>
                        {payment.from.displayName} → {payment.to.displayName}
                      </Text>
                      <Text style={styles.pendingPaymentAmount}>
                        {financeMatter.currency} {payment.amount.toFixed(2)}
                      </Text>
                      <Text style={styles.pendingPaymentDate}>
                        Reported: {new Date(payment.reportedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {isRecipient && !financeMatter.isCanceled && (
                    <View style={styles.pendingPaymentActions}>
                      <Button
                        mode="contained"
                        onPress={() => handleConfirmPayment(payment)}
                        style={styles.confirmButton}
                        compact
                        icon="check"
                      >
                        Confirm
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleRejectPayment(payment)}
                        style={styles.rejectButton}
                        compact
                        icon="close"
                      >
                        Reject
                      </Button>
                    </View>
                  )}

                  {isSender && !isRecipient && (
                    <Chip icon="clock-outline" style={styles.waitingChip}>
                      Waiting for confirmation
                    </Chip>
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* Cancel Finance Matter Button */}
      {canCancel && (
        <View style={styles.cancelButtonContainer}>
          <Button
            mode="outlined"
            onPress={handleCancelFinanceMatter}
            style={styles.cancelButton}
            icon="cancel"
            buttonColor="#ffebee"
            textColor="#c62828"
          >
            Cancel Finance Matter
          </Button>
        </View>
      )}

      <View style={styles.bottomPadding} />

      {/* Payment Recording Dialog */}
      <Portal>
        <Dialog visible={showPaymentDialog} onDismiss={() => setShowPaymentDialog(false)}>
          <Dialog.Title>Record Payment</Dialog.Title>
          <Dialog.Content>
            {selectedMember && (
              <>
                <Text style={styles.dialogText}>
                  Reporting payment from:{' '}
                  <Text style={styles.dialogMemberName}>
                    {selectedMember.groupMember?.displayName || selectedMember.groupMember?.email}
                  </Text>
                </Text>

                <Text style={styles.dialogText}>
                  To:{' '}
                  <Text style={styles.dialogMemberName}>
                    {selectedMember.recipient?.displayName || selectedMember.recipient?.email}
                  </Text>
                </Text>

                <Text style={styles.dialogText}>
                  Expected: {financeMatter.currency}{' '}
                  {parseFloat(selectedMember.reimbursementAmount || 0).toFixed(2)}
                </Text>

                <Text style={styles.dialogText}>
                  Already paid: {financeMatter.currency} 0.00
                </Text>

                <Text style={styles.dialogText}>
                  Remaining: {financeMatter.currency}{' '}
                  {parseFloat(selectedMember.reimbursementAmount || 0).toFixed(2)}
                </Text>

                <TextInput
                  label="Payment Amount"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.paymentInput}
                  disabled={recordingPayment}
                  left={<TextInput.Affix text={financeMatter.currency} />}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentDialog(false)} disabled={recordingPayment}>
              Cancel
            </Button>
            <Button onPress={submitPaymentRecord} loading={recordingPayment} disabled={recordingPayment}>
              Record
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  settledChip: {
    backgroundColor: '#c8e6c9',
    borderColor: '#4caf50',
  },
  settledChipText: {
    color: '#2e7d32',
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  paidAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f57c00',
  },
  dueDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dueDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  overdueText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  urgentText: {
    color: '#f57c00',
    fontWeight: 'bold',
  },
  soonText: {
    color: '#ffa726',
  },
  creatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  creatorName: {
    fontSize: 13,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  memberAllocation: {
    fontSize: 12,
    color: '#666',
  },
  paymentStatus: {
    alignItems: 'flex-end',
  },
  paidLabel: {
    fontSize: 11,
    color: '#999',
  },
  paidValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  balanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  creditText: {
    color: '#2e7d32',
  },
  debitText: {
    color: '#d32f2f',
  },
  reimbursementItem: {
    paddingVertical: 4,
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  settleButton: {
    backgroundColor: '#4caf50',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingBottom: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  noMessagesText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 16,
  },
  messagesContainer: {
    maxHeight: 300,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageContent: {
    flex: 1,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  messageInput: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 4,
  },
  recordPaymentButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  recordPaymentButtonReimb: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#6200ee',
  },
  dialogText: {
    fontSize: 14,
    marginBottom: 8,
  },
  dialogMemberName: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  paymentInput: {
    marginTop: 12,
  },
  pendingPaymentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pendingPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pendingPaymentText: {
    flex: 1,
    marginLeft: 12,
  },
  pendingPaymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pendingPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 2,
  },
  pendingPaymentDate: {
    fontSize: 12,
    color: '#999',
  },
  pendingPaymentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    borderColor: '#f44336',
  },
  waitingChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff3e0',
  },
  canceledCard: {
    backgroundColor: '#ffebee',
  },
  canceledChip: {
    borderColor: '#c62828',
  },
  canceledChipText: {
    color: '#c62828',
  },
  cancelButtonContainer: {
    padding: 16,
  },
  cancelButton: {
    borderColor: '#c62828',
  },
  bottomPadding: {
    height: 20,
  },
});
