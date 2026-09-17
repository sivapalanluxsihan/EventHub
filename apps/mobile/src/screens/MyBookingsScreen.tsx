import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { BookingWithEvent, BookingStatus } from '../types/booking';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'MyBookings'>;

type FilterTab = 'UPCOMING' | 'CANCELLED' | 'ALL';

export const MyBookingsScreen: React.FC<Props> = ({ navigation }) => {
  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('UPCOMING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await api.getUserBookings();
      setBookings(response.bookings || []);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to load your bookings. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch when screen mounts or focuses
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Add focus listener so when user returns from BookingDetails after cancellation, list refreshes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings(true);
    });
    return unsubscribe;
  }, [navigation, fetchBookings]);

  const handleRefresh = () => {
    fetchBookings(true);
  };

  const handleBookingPress = (booking: BookingWithEvent) => {
    navigation.navigate('BookingDetails', {
      bookingId: booking.id,
      booking,
    });
  };

  const handleExploreEvents = () => {
    navigation.navigate('Home');
  };

  // Counts for tabs
  const upcomingCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;
  const allCount = bookings.length;

  // Filtered list based on activeTab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'UPCOMING') return b.status === 'CONFIRMED';
    if (activeTab === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  const renderStatusBadge = (status: BookingStatus) => {
    const isConfirmed = status === 'CONFIRMED';
    return (
      <View
        style={[
          styles.statusBadge,
          isConfirmed ? styles.statusBadgeConfirmed : styles.statusBadgeCancelled,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            isConfirmed ? styles.statusTextConfirmed : styles.statusTextCancelled,
          ]}
        >
          {status}
        </Text>
      </View>
    );
  };

  const renderBookingCard = ({ item }: { item: BookingWithEvent }) => {
    const totalPrice =
      item.price === 0
        ? 'Free'
        : `$${(item.price * item.numberOfSeats).toFixed(2)}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => handleBookingPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Booking #${item.id} for ${item.eventName}`}
      >
        {/* Card Top: Image & Event Summary */}
        <View style={styles.cardHeader}>
          {item.eventImage ? (
            <Image
              source={{ uri: item.eventImage }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <Text style={styles.placeholderIcon}>🎟️</Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <View style={styles.topMetaRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              {renderStatusBadge(item.status)}
            </View>

            <Text style={styles.eventName} numberOfLines={2}>
              {item.eventName}
            </Text>

            <Text style={styles.refText}>Reference: #{item.id}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card Body: Event Details */}
        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📅</Text>
            <Text style={styles.metaText}>
              {item.date} • {item.time}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.seatsBadge}>
              <Text style={styles.seatsText}>
                {item.numberOfSeats} {item.numberOfSeats === 1 ? 'seat' : 'seats'}
              </Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total:</Text>
              <Text
                style={[
                  styles.priceValue,
                  item.price === 0 && styles.freePriceValue,
                ]}
              >
                {totalPrice}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Footer Action */}
        <View style={styles.cardFooter}>
          <Text style={styles.bookingDateText}>Booked: {item.bookingDate}</Text>
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'UPCOMING' && styles.tabButtonActive]}
        onPress={() => setActiveTab('UPCOMING')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeTab === 'UPCOMING' }}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'UPCOMING' && styles.tabButtonTextActive,
          ]}
        >
          Upcoming ({upcomingCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'CANCELLED' && styles.tabButtonActive]}
        onPress={() => setActiveTab('CANCELLED')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeTab === 'CANCELLED' }}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'CANCELLED' && styles.tabButtonTextActive,
          ]}
        >
          Cancelled ({cancelledCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'ALL' && styles.tabButtonActive]}
        onPress={() => setActiveTab('ALL')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeTab === 'ALL' }}
      >
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'ALL' && styles.tabButtonTextActive,
          ]}
        >
          All ({allCount})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2b6cb0" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load bookings</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchBookings()}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🎟️</Text>
        <Text style={styles.emptyTitle}>
          {bookings.length === 0
            ? 'No bookings yet'
            : activeTab === 'UPCOMING'
            ? 'No upcoming bookings'
            : 'No cancelled bookings'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {bookings.length === 0
            ? 'You have not made any event bookings yet. Browse campus events and secure your seats!'
            : activeTab === 'UPCOMING'
            ? 'You do not have any confirmed upcoming bookings right now.'
            : 'You have no cancelled bookings.'}
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={handleExploreEvents}
          accessibilityRole="button"
          accessibilityLabel="Explore Events"
        >
          <Text style={styles.exploreButtonText}>Explore Events</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header bar tabs */}
      {renderTabs()}

      <FlatList
        data={loading || errorMessage ? [] : filteredBookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBookingCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2b6cb0',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ebf8ff',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#edf2f7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeConfirmed: {
    backgroundColor: '#c6f6d5',
  },
  statusBadgeCancelled: {
    backgroundColor: '#fed7d7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextConfirmed: {
    color: '#22543d',
  },
  statusTextCancelled: {
    color: '#9b2c2c',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a365d',
    lineHeight: 20,
    marginBottom: 4,
  },
  refText: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 12,
  },
  cardBody: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaText: {
    fontSize: 13,
    color: '#4a5568',
    fontWeight: '500',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc',
  },
  seatsBadge: {
    backgroundColor: '#ebf8ff',
    borderColor: '#bee3f8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seatsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  freePriceValue: {
    color: '#276749',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  bookingDateText: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '500',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  arrowIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  centerBox: {
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
    justifyContent: 'center',
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
  exploreButton: {
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  exploreButtonText: {
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
});
