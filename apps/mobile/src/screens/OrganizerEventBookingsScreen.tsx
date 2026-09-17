import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { OrganizerBookingItem } from '../types/booking';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizerEventBookings'>;

interface EventHeaderInfo {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  price: number;
  availableSeats: number;
}

export const OrganizerEventBookingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId, eventName } = route.params;

  const [eventInfo, setEventInfo] = useState<EventHeaderInfo | null>(null);
  const [bookings, setBookings] = useState<OrganizerBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBookings = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.getOrganizerEventBookings(eventId);
      setEventInfo(response.event);
      setBookings(response.bookings || []);
    } catch (err: any) {
      console.error('Error loading organizer event bookings:', err);
      if (err.status === 401) {
        setErrorMessage('Authentication required. Please log in again.');
      } else if (err.status === 403) {
        setErrorMessage('Access denied: You do not have permission to view bookings for this event.');
      } else if (err.status === 404) {
        setErrorMessage('Event not found or has been removed.');
      } else {
        setErrorMessage(err.message || 'Failed to load bookings. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBookings(false);
  }, [fetchBookings]);

  // Derived real data summary calculations
  const totalBookings = bookings.length;
  const confirmedSeats = bookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + b.numberOfSeats, 0);
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED').length;

  const renderSummaryCards = () => (
    <View style={styles.metricsContainer}>
      <View style={[styles.metricCard, styles.metricCardPrimary]}>
        <Text style={styles.metricNumber}>{totalBookings}</Text>
        <Text style={styles.metricLabel}>Total Bookings</Text>
      </View>

      <View style={[styles.metricCard, styles.metricCardSuccess]}>
        <Text style={[styles.metricNumber, styles.successColor]}>{confirmedSeats}</Text>
        <Text style={styles.metricLabel}>Confirmed Seats</Text>
      </View>

      <View style={[styles.metricCard, styles.metricCardDanger]}>
        <Text style={[styles.metricNumber, styles.dangerColor]}>{cancelledBookings}</Text>
        <Text style={styles.metricLabel}>Cancelled</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Event Details Box */}
      <View style={styles.eventInfoBox}>
        <View style={styles.eventIconContainer}>
          <Text style={styles.eventIcon}>🎪</Text>
        </View>
        <View style={styles.eventTextCol}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {eventInfo?.name || eventName || `Event #${eventId}`}
          </Text>
          {eventInfo && (
            <View style={styles.eventMetaCol}>
              <Text style={styles.eventMetaRow}>
                📅 {eventInfo.date} • 🕒 {eventInfo.time}
              </Text>
              <Text style={styles.eventMetaRow} numberOfLines={1}>
                📍 {eventInfo.location}
              </Text>
              <Text style={styles.eventPriceRow}>
                🎟️ {eventInfo.price === 0 ? 'Free Entry' : `$${eventInfo.price.toFixed(2)}`} • {eventInfo.availableSeats} seats remaining
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Booking Summary Metrics */}
      <Text style={styles.sectionHeading}>Booking Summary</Text>
      {renderSummaryCards()}

      {/* Bookings Section Header */}
      <View style={styles.listHeadingRow}>
        <Text style={styles.sectionHeading}>Attendee Bookings</Text>
        <Text style={styles.listCountBadge}>{bookings.length}</Text>
      </View>
    </View>
  );

  const renderBookingItem = ({ item }: { item: OrganizerBookingItem }) => {
    const isConfirmed = item.status === 'CONFIRMED';
    const formattedDate = item.bookingDate
      ? item.bookingDate.replace('T', ' ').slice(0, 16)
      : 'Recent';

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingTopRow}>
          <View style={styles.bookingIdBadge}>
            <Text style={styles.bookingIdText}>Booking #{item.id}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isConfirmed ? styles.statusConfirmedBadge : styles.statusCancelledBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isConfirmed ? styles.statusConfirmedText : styles.statusCancelledText,
              ]}
            >
              {isConfirmed ? '● CONFIRMED' : '✕ CANCELLED'}
            </Text>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {item.customerName ? item.customerName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.customerInfoCol}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.customerEmail}>{item.customerEmail}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Booking Meta: Seats & Date */}
        <View style={styles.bookingMetaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Seats Reserved</Text>
            <Text style={styles.metaItemValue}>👥 {item.numberOfSeats} {item.numberOfSeats === 1 ? 'seat' : 'seats'}</Text>
          </View>

          <View style={[styles.metaItem, styles.metaItemRight]}>
            <Text style={styles.metaItemLabel}>Booking Date</Text>
            <Text style={styles.metaItemValue}>📅 {formattedDate}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySubtitle}>
        When attendees register or purchase seats for this event, their bookings will appear here in real-time.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#2b6cb0" />
          <Text style={styles.loadingText}>Loading event bookings...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Bookings</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchBookings(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBookingItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#2b6cb0']}
              tintColor="#2b6cb0"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 8,
  },
  eventInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  eventIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#ebf8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  eventIcon: {
    fontSize: 26,
  },
  eventTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 6,
    lineHeight: 22,
  },
  eventMetaCol: {
    gap: 3,
  },
  eventMetaRow: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '500',
  },
  eventPriceRow: {
    fontSize: 12,
    color: '#2b6cb0',
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#edf2f7',
    elevation: 1,
  },
  metricCardPrimary: {
    borderTopWidth: 3,
    borderTopColor: '#2b6cb0',
  },
  metricCardSuccess: {
    borderTopWidth: 3,
    borderTopColor: '#38a169',
  },
  metricCardDanger: {
    borderTopWidth: 3,
    borderTopColor: '#e53e3e',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
    textAlign: 'center',
  },
  successColor: {
    color: '#276749',
  },
  dangerColor: {
    color: '#c53030',
  },
  listHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listCountBadge: {
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookingIdBadge: {
    backgroundColor: '#f7fafc',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bookingIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusConfirmedBadge: {
    backgroundColor: '#f0fff4',
    borderColor: '#9ae6b4',
    borderWidth: 1,
  },
  statusCancelledBadge: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusConfirmedText: {
    color: '#22543d',
  },
  statusCancelledText: {
    color: '#742a2a',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#bee3f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  customerInfoCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 13,
    color: '#718096',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginBottom: 10,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  metaItemRight: {
    alignItems: 'flex-end',
  },
  metaItemLabel: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '600',
    marginBottom: 2,
  },
  metaItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#bee3f8',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  errorIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#edf2f7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '700',
  },
});
