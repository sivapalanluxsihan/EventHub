import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { BookingWithEvent, BookingStatus } from '../types/booking';
import { api } from '../services/api';
import {
  sendBookingCancellationNotification,
  cancelEventReminder,
} from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetails'>;

export const BookingDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId, booking: initialBooking } = route.params;

  const [booking, setBooking] = useState<BookingWithEvent | null>(initialBooking || null);
  const [loading, setLoading] = useState(!initialBooking);
  const [cancelling, setCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBookingDetails = useCallback(async () => {
    if (!booking) {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await api.getBookingById(bookingId);
      setBooking(response.booking);
    } catch (err: any) {
      if (err.status === 401) {
        setErrorMessage('Session expired. Please log in again.');
      } else if (err.status === 403) {
        setErrorMessage('You do not have permission to view this booking.');
      } else if (err.status === 404) {
        setErrorMessage('Booking not found. It may have been removed.');
      } else {
        setErrorMessage(
          err.message || 'Unable to load booking details. Please check your connection.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, booking]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const handleCancelBooking = () => {
    if (!booking || booking.status === 'CANCELLED') return;

    Alert.alert(
      'Cancel Booking?',
      'Are you sure you want to cancel this booking? This will restore your reserved seats for other attendees.',
      [
        {
          text: 'Keep Booking',
          style: 'cancel',
        },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: confirmCancellation,
        },
      ]
    );
  };

  const confirmCancellation = async () => {
    setCancelling(true);
    try {
      const response = await api.cancelBooking(bookingId);
      if (response.booking) {
        setBooking((prev) =>
          prev
            ? {
                ...prev,
                status: 'CANCELLED',
                updatedAt: response.booking.updatedAt,
              }
            : null
        );
      } else {
        // Fallback: re-fetch from server
        await fetchBookingDetails();
      }

      // Send cancellation notification and cleanup reminder asynchronously without blocking
      try {
        await sendBookingCancellationNotification(
          { name: booking?.eventName || 'Campus Event' },
          { id: bookingId, numberOfSeats: booking?.numberOfSeats }
        );
        await cancelEventReminder(bookingId);
      } catch (notifyErr) {
        console.warn('[BookingDetails] Notification dispatch skipped:', notifyErr);
      }

      Alert.alert(
        'Booking Cancelled',
        'Your booking has been cancelled successfully. Any reserved seats have been returned.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert(
        'Cancellation Failed',
        err.message || 'Unable to cancel booking. Please try again.'
      );
    } finally {
      setCancelling(false);
    }
  };

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (errorMessage || !booking) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>
            {errorMessage || 'Booking details are currently unavailable.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchBookingDetails}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.backLinkText}>← Back to My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';
  const totalPrice =
    booking.price === 0
      ? 'Free'
      : `$${(booking.price * booking.numberOfSeats).toFixed(2)}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Event Header Banner */}
      <View style={styles.bannerCard}>
        {booking.eventImage ? (
          <Image
            source={{ uri: booking.eventImage }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.bannerImage, styles.placeholderBanner]}>
            <Text style={styles.placeholderIcon}>🎟️</Text>
          </View>
        )}

        <View style={styles.bannerContent}>
          <View style={styles.bannerTopRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{booking.category}</Text>
            </View>
            {renderStatusBadge(booking.status)}
          </View>

          <Text style={styles.eventName}>{booking.eventName}</Text>

          {booking.eventDescription ? (
            <Text style={styles.eventDescription}>{booking.eventDescription}</Text>
          ) : null}
        </View>
      </View>

      {/* Booking Status Notice (if cancelled) */}
      {!isConfirmed && (
        <View style={styles.cancelledNotice}>
          <Text style={styles.cancelledNoticeIcon}>ℹ️</Text>
          <View style={styles.cancelledNoticeTextCol}>
            <Text style={styles.cancelledNoticeTitle}>This booking is CANCELLED</Text>
            <Text style={styles.cancelledNoticeSubtitle}>
              The reservation was cancelled and the reserved seats were restored to the event.
            </Text>
          </View>
        </View>
      )}

      {/* Booking Information Card */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Reservation Details</Text>
          <View style={styles.refBadge}>
            <Text style={styles.refBadgeText}>Reference #{booking.id}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date & Time</Text>
          <Text style={styles.detailValueBold}>
            {booking.date} at {booking.time}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{booking.location}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{booking.category}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Seats Reserved</Text>
          <Text style={styles.detailValueBold}>
            {booking.numberOfSeats}{' '}
            {booking.numberOfSeats === 1 ? 'seat' : 'seats'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price per Seat</Text>
          <Text style={styles.detailValue}>
            {booking.price === 0 ? 'Free' : `$${booking.price.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Price</Text>
          <Text
            style={[
              styles.totalPriceValue,
              booking.price === 0 && styles.freeTotalPrice,
            ]}
          >
            {totalPrice}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Booking Date</Text>
          <Text style={styles.detailValueSubtle}>{booking.bookingDate}</Text>
        </View>

        {booking.updatedAt !== booking.createdAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValueSubtle}>{booking.updatedAt}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isConfirmed ? (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
            onPress={handleCancelBooking}
            disabled={cancelling}
            accessibilityRole="button"
            accessibilityLabel="Cancel Booking"
          >
            {cancelling ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledActionBox}>
            <Text style={styles.disabledActionText}>
              ✓ Booking history preserved. Cancellation is complete.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to My Bookings"
        >
          <Text style={styles.backButtonText}>← Back to My Bookings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  bannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  bannerImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  placeholderBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ebf8ff',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  bannerContent: {
    padding: 18,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#edf2f7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeConfirmed: {
    backgroundColor: '#c6f6d5',
  },
  statusBadgeCancelled: {
    backgroundColor: '#fed7d7',
  },
  statusText: {
    fontSize: 11,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1a365d',
    lineHeight: 26,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginTop: 4,
  },
  cancelledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fed7d7',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  cancelledNoticeIcon: {
    fontSize: 22,
  },
  cancelledNoticeTextCol: {
    flex: 1,
  },
  cancelledNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#c53030',
    marginBottom: 2,
  },
  cancelledNoticeSubtitle: {
    fontSize: 12,
    color: '#742a2a',
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a365d',
  },
  refBadge: {
    backgroundColor: '#ebf8ff',
    borderColor: '#bee3f8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 5,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueBold: {
    fontSize: 14,
    color: '#1a365d',
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueSubtle: {
    fontSize: 12,
    color: '#a0aec0',
    flexShrink: 1,
    textAlign: 'right',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  freeTotalPrice: {
    color: '#276749',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#e53e3e',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#e53e3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disabledActionBox: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  disabledActionText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
  },
  backButtonText: {
    color: '#4a5568',
    fontSize: 15,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7d7',
    maxWidth: 340,
    width: '100%',
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
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backLink: {
    padding: 6,
  },
  backLinkText: {
    color: '#2b6cb0',
    fontSize: 13,
    fontWeight: '600',
  },
});
