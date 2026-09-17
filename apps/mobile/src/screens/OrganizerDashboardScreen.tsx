import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Event } from '../types/event';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OrganizerEventCard } from '../components/OrganizerEventCard';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizerDashboard'>;

export const OrganizerDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEvents = useCallback(async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await api.getOrganizerEvents();
      setEvents(response.events || []);
    } catch (err: any) {
      if (err.status === 403) {
        setErrorMessage('Access forbidden: Only verified organizers can access this portal.');
      } else {
        setErrorMessage(
          err.message || 'Unable to load organizer events. Please check your connection.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Focus listener to re-fetch when returning from Add or Edit
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents(true);
    });
    return unsubscribe;
  }, [navigation, fetchEvents]);

  // Role protection guard
  if (user?.role !== 'ORGANIZER') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedTitle}>Organizer Access Only</Text>
          <Text style={styles.accessDeniedSubtitle}>
            Your account is currently registered as a standard student USER. Organizer privileges
            are required to create and manage campus events.
          </Text>
          <TouchableOpacity
            style={styles.returnHomeButton}
            onPress={() => navigation.navigate('Home')}
            accessibilityRole="button"
          >
            <Text style={styles.returnHomeButtonText}>← Return to Event Discovery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleAddEvent = () => {
    navigation.navigate('OrganizerAddEvent');
  };

  const handleEditEvent = (event: Event) => {
    navigation.navigate('OrganizerEditEvent', {
      eventId: event.id,
      event,
    });
  };

  const handleViewEvent = (event: Event) => {
    navigation.navigate('EventDetail', {
      eventId: event.id,
      eventName: event.name,
      event,
    });
  };

  const handleViewBookings = (event: Event) => {
    navigation.navigate('OrganizerEventBookings', {
      eventId: event.id,
      eventName: event.name,
    });
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event?',
      `Are you sure you want to permanently delete "${event.name}"? This action cannot be reversed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Event',
          style: 'destructive',
          onPress: () => confirmDelete(event.id),
        },
      ]
    );
  };

  const confirmDelete = async (eventId: number) => {
    try {
      await api.deleteEvent(eventId);
      Alert.alert('Event Deleted', 'The event was successfully removed.');
      fetchEvents(true);
    } catch (err: any) {
      Alert.alert(
        'Deletion Failed',
        err.message || 'Unable to delete event. Please check if attendee bookings exist.'
      );
    }
  };

  const renderHeader = () => (
    <View style={styles.headerBox}>
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>Organizer Portal</Text>
            <Text style={styles.bannerSubtitle}>
              Create, update, and manage your campus event listings
            </Text>
          </View>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>ORGANIZER</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleAddEvent}
          accessibilityRole="button"
          accessibilityLabel="Create New Event"
        >
          <Text style={styles.createButtonText}>+ Create New Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitle}>My Managed Events</Text>
        {!loading && !errorMessage && (
          <Text style={styles.countText}>{events.length} total</Text>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b6cb0" />
          <Text style={styles.loadingText}>Loading your managed events...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchEvents()}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🎪</Text>
        <Text style={styles.emptyTitle}>No events created yet</Text>
        <Text style={styles.emptySubtitle}>
          You haven't published any campus events yet. Tap the button below to add your first event!
        </Text>
        <TouchableOpacity
          style={styles.emptyCreateButton}
          onPress={handleAddEvent}
          accessibilityRole="button"
          accessibilityLabel="Create Your First Event"
        >
          <Text style={styles.emptyCreateButtonText}>+ Create Your First Event</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || errorMessage ? [] : events}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <OrganizerEventCard
            event={item}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onView={handleViewEvent}
            onViewBookings={handleViewBookings}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEvents(true)}
            colors={['#2b6cb0']}
            tintColor="#2b6cb0"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  headerBox: {
    marginBottom: 16,
  },
  banner: {
    backgroundColor: '#1a365d',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1a365d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bannerTextCol: {
    flex: 1,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#cbd5e0',
    lineHeight: 18,
  },
  roleTag: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: '#3182ce',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a202c',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf2f7',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyCreateButton: {
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  emptyCreateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7d7',
    marginTop: 20,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c53030',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#742a2a',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#c53030',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  accessDeniedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accessDeniedIcon: {
    fontSize: 52,
    marginBottom: 14,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#c53030',
    marginBottom: 8,
  },
  accessDeniedSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  returnHomeButton: {
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  returnHomeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
