/**
 * Finance Tab
 *
 * Displays finance matters and transactions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../../../services/api';

function FinanceTab({ groupId, group }) {
  const [financeMatters, setFinanceMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFinanceMatters();
  }, [groupId]);

  async function fetchFinanceMatters() {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}/finance-matters`);
      setFinanceMatters(response.data.financeMatters || []);
    } catch (err) {
      console.error('Failed to fetch finance matters:', err);
      setError('Failed to load finance matters.');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount || 0);
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Finance Matters</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Transaction
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {financeMatters.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No finance matters yet. Add your first transaction to start tracking expenses.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {financeMatters.map((matter, index) => (
              <React.Fragment key={matter.financeMatterId}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={matter.title}
                    secondary={
                      <>
                        {matter.description && (
                          <Typography variant="body2" color="text.secondary">
                            {matter.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(matter.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="h6"
                      color={matter.amount >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency(matter.amount)}
                    </Typography>
                    <Chip
                      label={matter.status || 'pending'}
                      size="small"
                      color={matter.status === 'settled' ? 'success' : 'default'}
                    />
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default FinanceTab;
