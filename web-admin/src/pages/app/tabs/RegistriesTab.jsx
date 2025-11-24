/**
 * Registries Tab
 *
 * Displays gift registries and item registries.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import api from '../../../services/api';

function RegistriesTab({ groupId, group }) {
  const [registryType, setRegistryType] = useState(0); // 0 = Gift, 1 = Item
  const [giftRegistries, setGiftRegistries] = useState([]);
  const [itemRegistries, setItemRegistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegistries();
  }, [groupId]);

  async function fetchRegistries() {
    try {
      setLoading(true);
      const [giftRes, itemRes] = await Promise.all([
        api.get(`/groups/${groupId}/gift-registries`),
        api.get(`/groups/${groupId}/item-registries`),
      ]);
      setGiftRegistries(giftRes.data.giftRegistries || []);
      setItemRegistries(itemRes.data.itemRegistries || []);
    } catch (err) {
      console.error('Failed to fetch registries:', err);
      setError('Failed to load registries.');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={registryType} onChange={(e, v) => setRegistryType(v)}>
          <Tab icon={<CardGiftcardIcon />} label="Gift Registries" iconPosition="start" />
          <Tab icon={<ListAltIcon />} label="Item Registries" iconPosition="start" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Gift Registries */}
      {registryType === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Gift Registries</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} size="small">
              Create Registry
            </Button>
          </Box>

          {giftRegistries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CardGiftcardIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                No gift registries yet. Create one for birthdays, holidays, or special occasions.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {giftRegistries.map((registry) => (
                <Grid item xs={12} sm={6} md={4} key={registry.giftRegistryId}>
                  <Card>
                    <CardActionArea>
                      <CardContent>
                        <Typography variant="h6">{registry.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {registry.description || 'No description'}
                        </Typography>
                        {registry.eventDate && (
                          <Typography variant="caption" color="primary">
                            Event: {formatDate(registry.eventDate)}
                          </Typography>
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {registry.itemCount || 0} items
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Item Registries */}
      {registryType === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Item Registries</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} size="small">
              Create Registry
            </Button>
          </Box>

          {itemRegistries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ListAltIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                No item registries yet. Create one for chores, shopping lists, or tasks.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {itemRegistries.map((registry) => (
                <Grid item xs={12} sm={6} md={4} key={registry.itemRegistryId}>
                  <Card>
                    <CardActionArea>
                      <CardContent>
                        <Typography variant="h6">{registry.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {registry.description || 'No description'}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {registry.itemCount || 0} items
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}

export default RegistriesTab;
