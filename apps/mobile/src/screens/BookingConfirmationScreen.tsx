import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import {
  sendBookingConfirmationNotification,
  scheduleEventReminder,
} from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmation'>;

export const BookingConfirmationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { booking, event } = route.params;

  useEffect(() => {
    // Fire notifications asynchronously without delaying screen presentation
    const triggerNotifications = async () => {
      try {
        await sendBookingConfirmationNotification(event, booking);
        await scheduleEventReminder(event, booking);
      } catch (err) {
        console.warn('[BookingConfirmation] Notification dispatch skipped:', err);
      }
    };
    triggerNotifications();
  }, [event, booking]);

  const totalCost =
    event.price === 0 ? 'Free' : `$${(event.price * booking.numberOfSeats).toFixed(2)}`;

  const handleViewMyBookings = () => {
    navigation.navigate('MyBookings');
  };

  const handleBackToEvents = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success Header Card */}
      <View style={styles.successCard}>
        <View style={styles.iconCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your reservation has been recorded successfully.
        </Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>

      {/* Booking Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>Booking Summary</Text>
          <View style={styles.refBadge}>
            <Text style={styles.refBadgeText}>ID #{booking.id}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Event Info */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Event</Text>
          <Text style={styles.detailValueBold}>{event.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date & Time</Text>
          <Text style={styles.detailValue}>
            {event.date} at {event.time}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{event.location}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{event.category}</Text>
        </View>

        <View style={styles.divider} />

        {/* Seat & Price Info */}
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
            {event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Paid</Text>
          <Text style={[styles.totalAmount, event.price === 0 && styles.freeTotal]}>
            {totalCost}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Booking Date</Text>
          <Text style={styles.detailValueSubtle}>{booking.bookingDate}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleBackToEvents}
          accessibilityRole="button"
          accessibilityLabel="Back to Events"
        >
          <Text style={styles.primaryButtonText}>Back to Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleViewMyBookings}
          accessibilityRole="button"
          accessibilityLabel="View My Bookings"
        >
          <Text style={styles.secondaryButtonText}>View My Bookings</Text>
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
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2f0d9',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f0fff4',
    borderWidth: 2,
    borderColor: '#9ae6b4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkIcon: {
    fontSize: 34,
    fontWeight: '800',
    color: '#276749',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    backgroundColor: '#c6f6d5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22543d',
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 8,
  },
  cardHeaderTitle: {
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
    paddingVertical: 6,
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
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  freeTotal: {
    color: '#276749',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
  },
  secondaryButtonText: {
    color: '#4a5568',
    fontSize: 15,
    fontWeight: '700',
  },
});
