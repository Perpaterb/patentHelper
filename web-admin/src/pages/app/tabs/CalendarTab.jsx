/**
 * Calendar Tab
 *
 * Displays calendar with events and child responsibilities.
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
  IconButton,
  Chip,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import api from '../../../services/api';

function CalendarTab({ groupId, group }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, [groupId, currentDate]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await api.get(`/groups/${groupId}/calendar/events?year=${year}&month=${month}`);
      setEvents(response.data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }

  function handlePrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function getMonthName() {
    return currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  }

  function getDaysInMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }

  function getEventsForDay(day) {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.startDate?.startsWith(dateStr));
  }

  function isToday(day) {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  }

  if (loading && events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handlePrevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mx: 2, minWidth: 200, textAlign: 'center' }}>
            {getMonthName()}
          </Typography>
          <IconButton onClick={handleNextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Event
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Calendar Grid */}
      <Paper sx={{ p: 2 }}>
        {/* Week days header */}
        <Grid container>
          {weekDays.map((day) => (
            <Grid item xs={12/7} key={day}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 1,
                  fontWeight: 'bold',
                  color: 'text.secondary',
                }}
              >
                {day}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Calendar days */}
        <Grid container>
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            return (
              <Grid item xs={12/7} key={index}>
                <Paper
                  variant="outlined"
                  sx={{
                    minHeight: 100,
                    p: 1,
                    backgroundColor: isToday(day) ? '#e3f2fd' : 'transparent',
                    cursor: day ? 'pointer' : 'default',
                    '&:hover': day ? { backgroundColor: '#f5f5f5' } : {},
                  }}
                >
                  {day && (
                    <>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isToday(day) ? 'bold' : 'normal',
                          color: isToday(day) ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {day}
                      </Typography>
                      {dayEvents.slice(0, 3).map((event) => (
                        <Chip
                          key={event.eventId}
                          label={event.title}
                          size="small"
                          sx={{
                            mt: 0.5,
                            width: '100%',
                            justifyContent: 'flex-start',
                            fontSize: '0.7rem',
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{dayEvents.length - 3} more
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}

export default CalendarTab;
