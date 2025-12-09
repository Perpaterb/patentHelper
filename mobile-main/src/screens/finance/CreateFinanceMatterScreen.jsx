/**
 * Create Finance Matter Screen
 *
 * Allows users to create a new finance matter for a group.
 * Includes name, description, total amount, currency, due date, and member allocations.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import {
  Card,
  Title,
  TextInput,
  Button,
  Text,
  Chip,
  Divider,
  Menu,
} from 'react-native-paper';
import DateTimeSelector, { formatDateByType } from '../../components/DateTimeSelector';
import api from '../../services/api';
import CustomNavigationHeader from '../../components/CustomNavigationHeader';

/**
 * CreateFinanceMatterScreen component
 *
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation navigation object
 * @param {Object} props.route - React Navigation route object with groupId
 * @returns {JSX.Element}
 */
export default function CreateFinanceMatterScreen({ navigation, route }) {
  const { groupId } = route.params;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberAllocations, setMemberAllocations] = useState({});
  const [memberPaidAmounts, setMemberPaidAmounts] = useState({}); // Track amount already paid by each member

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGroupMembers();
    loadDefaultCurrency();
  }, [groupId]);

  /**
   * Load group members and filter to only those who have finance visibility
   */
  const loadGroupMembers = async () => {
    try {
      setError(null);
      const response = await api.get(`/groups/${groupId}`);
      const allMembers = response.data.group.members || [];
      const settings = response.data.group.settings || {};

      // Filter members to only those who can view finance
      // Admins and supervisors always have access
      // Other roles check their visibility settings
      const membersWithFinanceAccess = allMembers.filter((member) => {
        const memberRole = member.role;
        if (memberRole === 'admin' || memberRole === 'supervisor') return true;
        if (memberRole === 'parent') return settings.financeVisibleToParents === true;
        if (memberRole === 'adult') return settings.financeVisibleToAdults === true;
        if (memberRole === 'caregiver') return settings.financeVisibleToCaregivers === true;
        if (memberRole === 'child') return settings.financeVisibleToChildren === true;
        return false;
      });

      setMembers(membersWithFinanceAccess);
    } catch (err) {
      console.error('Load group members error:', err);

      if (err.isAuthError) {
        console.log('[CreateFinanceMatter] Auth error detected - user will be logged out');
        return;
      }

      setError(err.response?.data?.message || 'Failed to load group members');
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Load default currency from group settings
   */
  const loadDefaultCurrency = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/settings`);
      if (response.data.success && response.data.settings.defaultCurrency) {
        setCurrency(response.data.settings.defaultCurrency);
      }
    } catch (err) {
      console.error('Load default currency error:', err);
      // Non-blocking - just use USD as default
    }
  };

  /**
   * Toggle member selection
   */
  const toggleMemberSelection = (member) => {
    const isSelected = selectedMembers.some(m => m.groupMemberId === member.groupMemberId);

    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => m.groupMemberId !== member.groupMemberId));
      // Remove allocation and paid amount
      const newAllocations = { ...memberAllocations };
      delete newAllocations[member.groupMemberId];
      setMemberAllocations(newAllocations);

      const newPaidAmounts = { ...memberPaidAmounts };
      delete newPaidAmounts[member.groupMemberId];
      setMemberPaidAmounts(newPaidAmounts);
    } else {
      setSelectedMembers([...selectedMembers, member]);
      // Initialize allocation to equal split percentage
      const newPercentage = totalAmount ? (100 / (selectedMembers.length + 1)).toFixed(2) : '0';
      setMemberAllocations({
        ...memberAllocations,
        [member.groupMemberId]: {
          percentage: newPercentage,
          amount: totalAmount ? ((parseFloat(totalAmount) * parseFloat(newPercentage)) / 100).toFixed(2) : '0',
        },
      });
      // Initialize paid amount to 0
      setMemberPaidAmounts({
        ...memberPaidAmounts,
        [member.groupMemberId]: '0',
      });
    }
  };

  /**
   * Update member allocation percentage
   */
  const updateMemberPercentage = (memberId, percentage) => {
    const amount = totalAmount ? ((parseFloat(totalAmount) * parseFloat(percentage)) / 100).toFixed(2) : '0';
    setMemberAllocations({
      ...memberAllocations,
      [memberId]: {
        percentage,
        amount,
      },
    });
  };

  /**
   * Update member allocation amount
   */
  const updateMemberAmount = (memberId, amount) => {
    const percentage = totalAmount ? ((parseFloat(amount) / parseFloat(totalAmount)) * 100).toFixed(2) : '0';
    setMemberAllocations({
      ...memberAllocations,
      [memberId]: {
        percentage,
        amount,
      },
    });
  };

  /**
   * Update member paid amount
   */
  const updateMemberPaidAmount = (memberId, paidAmount) => {
    setMemberPaidAmounts({
      ...memberPaidAmounts,
      [memberId]: paidAmount,
    });
  };

  /**
   * Distribute amount equally among selected members
   */
  const distributeEqually = () => {
    if (!totalAmount || selectedMembers.length === 0) {
      CustomAlert.alert('Error', 'Please enter a total amount and select members first');
      return;
    }

    const equalPercentage = (100 / selectedMembers.length).toFixed(2);
    const equalAmount = (parseFloat(totalAmount) / selectedMembers.length).toFixed(2);

    const newAllocations = {};
    selectedMembers.forEach(member => {
      newAllocations[member.groupMemberId] = {
        percentage: equalPercentage,
        amount: equalAmount,
      };
    });

    setMemberAllocations(newAllocations);
  };

  /**
   * Handle date change
   */
  const handleDateChange = (selectedDate) => {
    setDueDate(selectedDate);
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!name.trim()) {
      CustomAlert.alert('Validation Error', 'Please enter a name for the finance matter');
      return false;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      CustomAlert.alert('Validation Error', 'Please enter a valid total amount');
      return false;
    }

    if (selectedMembers.length === 0) {
      CustomAlert.alert('Validation Error', 'Please select at least one member');
      return false;
    }

    // Check that allocations are between 99% and 100% (not above 100%)
    const totalPercentage = Object.values(memberAllocations).reduce((sum, alloc) => {
      return sum + parseFloat(alloc.percentage || 0);
    }, 0);

    if (totalPercentage > 100) {
      CustomAlert.alert('Validation Error', `Member allocations cannot exceed 100% (currently ${totalPercentage.toFixed(2)}%)`);
      return false;
    }

    if (totalPercentage < 99) {
      CustomAlert.alert('Validation Error', `Member allocations must be at least 99% (currently ${totalPercentage.toFixed(2)}%)`);
      return false;
    }

    // Check that total paid amounts don't exceed the total amount
    const totalPaid = Object.values(memberPaidAmounts).reduce((sum, paid) => {
      return sum + parseFloat(paid || 0);
    }, 0);

    const total = parseFloat(totalAmount);
    if (totalPaid > total) {
      CustomAlert.alert(
        'Validation Error',
        `Total paid amounts (${currency} ${totalPaid.toFixed(2)}) cannot exceed the total amount (${currency} ${total.toFixed(2)})`
      );
      return false;
    }

    return true;
  };

  /**
   * Handle create finance matter
   */
  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare members data
      const membersData = selectedMembers.map(member => ({
        groupMemberId: member.groupMemberId,
        expectedPercentage: parseFloat(memberAllocations[member.groupMemberId].percentage),
        expectedAmount: parseFloat(memberAllocations[member.groupMemberId].amount),
        paidAmount: parseFloat(memberPaidAmounts[member.groupMemberId] || 0),
      }));

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        totalAmount: parseFloat(totalAmount),
        currency,
        dueDate: dueDate ? dueDate.toISOString() : null,
        members: membersData,
      };

      await api.post(`/groups/${groupId}/finance-matters`, payload);

      CustomAlert.alert('Success', 'Finance matter created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Create finance matter error:', err);

      if (err.isAuthError) {
        console.log('[CreateFinanceMatter] Auth error detected - user will be logged out');
        return;
      }

      CustomAlert.alert('Error', err.response?.data?.message || 'Failed to create finance matter');
    } finally {
      setLoading(false);
    }
  };

  if (loadingMembers) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading members...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadGroupMembers} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Navigation Header */}
      <CustomNavigationHeader
        title="New Finance Matter"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Basic Info Card */}
        <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Finance Matter Details</Title>
          <Divider style={styles.divider} />

          <TextInput
            label="Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., School Trip, Summer Camp"
          />

          <TextInput
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Additional details about this expense"
          />

          <View style={styles.row}>
            <TextInput
              label="Total Amount *"
              value={totalAmount}
              onChangeText={setTotalAmount}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, styles.amountInput]}
              placeholder="0.00"
            />

            <Menu
              visible={currencyMenuVisible}
              onDismiss={() => setCurrencyMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCurrencyMenuVisible(true)}
                  style={styles.currencyButton}
                  contentStyle={styles.currencyButtonContent}
                >
                  {currency}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setCurrency('USD'); setCurrencyMenuVisible(false); }} title="USD" />
              <Menu.Item onPress={() => { setCurrency('EUR'); setCurrencyMenuVisible(false); }} title="EUR" />
              <Menu.Item onPress={() => { setCurrency('GBP'); setCurrencyMenuVisible(false); }} title="GBP" />
              <Menu.Item onPress={() => { setCurrency('CAD'); setCurrencyMenuVisible(false); }} title="CAD" />
              <Menu.Item onPress={() => { setCurrency('AUD'); setCurrencyMenuVisible(false); }} title="AUD" />
              <Menu.Item onPress={() => { setCurrency('JPY'); setCurrencyMenuVisible(false); }} title="JPY" />
              <Menu.Item onPress={() => { setCurrency('CNY'); setCurrencyMenuVisible(false); }} title="CNY" />
              <Menu.Item onPress={() => { setCurrency('INR'); setCurrencyMenuVisible(false); }} title="INR" />
            </Menu>
          </View>

          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            icon="calendar"
            style={styles.input}
          >
            {dueDate ? `Due: ${formatDateByType(dueDate, 3)}` : 'Set Due Date (Optional)'}
          </Button>

          <DateTimeSelector
            value={dueDate || new Date()}
            onChange={handleDateChange}
            format={3}
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            title="Due Date"
          />
        </Card.Content>
      </Card>

      {/* Members Selection Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Select Members *</Title>
          <Text style={styles.helperText}>Choose who will contribute to this expense</Text>
          <Divider style={styles.divider} />

          <View style={styles.chipsContainer}>
            {members.map(member => {
              const isSelected = selectedMembers.some(m => m.groupMemberId === member.groupMemberId);
              return (
                <Chip
                  key={member.groupMemberId}
                  onPress={() => toggleMemberSelection(member)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected
                  ]}
                  textStyle={isSelected && styles.chipTextSelected}
                >
                  {member.displayName || member.email}
                </Chip>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* Member Allocations Card */}
      {selectedMembers.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Allocations</Title>
              <Button
                mode="text"
                onPress={distributeEqually}
                compact
                style={styles.equalButton}
              >
                Equal Split
              </Button>
            </View>
            <Text style={styles.helperText}>Set how much each member should contribute</Text>
            <Divider style={styles.divider} />

            {selectedMembers.map(member => (
              <View key={member.groupMemberId} style={styles.allocationRow}>
                <Text style={styles.memberName}>{member.displayName || member.email}</Text>

                {/* Expected Allocation Row */}
                <Text style={styles.inputLabel}>Expected:</Text>
                <View style={styles.allocationInputs}>
                  <TextInput
                    value={memberAllocations[member.groupMemberId]?.percentage || '0'}
                    onChangeText={(value) => updateMemberPercentage(member.groupMemberId, value)}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.percentageInput}
                    dense
                    right={<TextInput.Affix text="%" />}
                  />
                  <TextInput
                    value={memberAllocations[member.groupMemberId]?.amount || '0'}
                    onChangeText={(value) => updateMemberAmount(member.groupMemberId, value)}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.amountInputSmall}
                    dense
                    left={<TextInput.Affix text={currency} />}
                  />
                </View>

                {/* Already Paid Row */}
                <Text style={styles.inputLabel}>Already Paid:</Text>
                <View style={styles.allocationInputs}>
                  <TextInput
                    value={memberPaidAmounts[member.groupMemberId] || '0'}
                    onChangeText={(value) => updateMemberPaidAmount(member.groupMemberId, value)}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.paidInput}
                    dense
                    left={<TextInput.Affix text={currency} />}
                    placeholder="0.00"
                  />
                </View>
              </View>
            ))}

            {/* Total Percentage Display */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                {Object.values(memberAllocations).reduce((sum, alloc) => sum + parseFloat(alloc.percentage || 0), 0).toFixed(2)}%
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Create Button */}
      <Button
        mode="contained"
        onPress={handleCreate}
        loading={loading}
        disabled={loading}
        style={styles.createButton}
        contentStyle={styles.createButtonContent}
      >
        Create Finance Matter
      </Button>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
  },
  currencyButton: {
    width: 100,
    borderColor: '#6200ee',
  },
  currencyButtonContent: {
    height: 56,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#4caf50',
  },
  chipTextSelected: {
    color: '#fff',
  },
  equalButton: {
    marginTop: -8,
  },
  allocationRow: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  allocationInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  percentageInput: {
    flex: 1,
  },
  amountInputSmall: {
    flex: 1,
  },
  paidInput: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  createButton: {
    margin: 16,
    marginTop: 8,
  },
  createButtonContent: {
    height: 48,
  },
});
