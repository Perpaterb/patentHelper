/**
 * Wiki Tab
 *
 * Displays wiki documents with markdown editing.
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
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import api from '../../../services/api';

function WikiTab({ groupId, group }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [groupId]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${groupId}/wiki`);
      setDocuments(response.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch wiki documents:', err);
      setError('Failed to load wiki documents.');
    } finally {
      setLoading(false);
    }
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
        <Typography variant="h6">Wiki Documents</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          New Document
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ArticleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            No wiki documents yet. Create your first document to share important information.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {documents.map((doc, index) => (
              <React.Fragment key={doc.wikiDocumentId}>
                {index > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <ArticleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.title}
                      secondary={
                        <>
                          Last updated: {formatDate(doc.updatedAt)}
                          {doc.createdBy && ` by ${doc.createdBy.displayName}`}
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default WikiTab;
