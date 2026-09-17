import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Event } from '../types/event';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

export const BookingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId, event: initialEvent } = route.params;
  const { logout } = useAuth();

  const [event, setEvent] = useState<Event | null>(initialEvent || null);
  const [numberOfSeats, setNumberOfSeats] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(!initialEvent);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEvent) {
      const fetchEvent = async () => {
        try {
          setIsLoading(true);
          setErrorMessage(null);
          const res = await api.getEventById(eventId);
          setEvent(res.event);
        } catch (err: any) {
          setErrorMessage(err?.message || 'Failed to load event for booking.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchEvent();
    }
  }, [eventId, initialEvent]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Event Not Found</Text>
        <Text style={styles.errorSubtitle}>
          {errorMessage || 'The requested event is no longer available.'}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Back to Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maxSeats = Math.max(0, event.availableSeats);
  const isSoldOut = maxSeats === 0;

  const handleDecrement = () => {
    if (numberOfSeats > 1) {
      setNumberOfSeats((prev) => prev - 1);
      setErrorMessage(null);
    }
  };

  const handleIncrement = () => {
    if (numberOfSeats < maxSeats) {
      setNumberOfSeats((prev) => prev + 1);
      setErrorMessage(null);
    } else {
      setErrorMessage(`Cannot book more than ${maxSeats} available seats.`);
    }
  };

  const calculateTotal = (): { totalNumber: number; displayTotal: string } => {
    const total = event.price * numberOfSeats;
    if (event.price === 0) {
      return { totalNumber: 0, displayTotal: 'Free' };
    }
    return { totalNumber: total, displayTotal: `$${total.toFixed(2)}` };
  };

  const { displayTotal } = calculateTotal();

  const handleConfirmBooking = async () => {
    // 1. Client-side validations
    if (isSoldOut) {
      Alert.alert('Sold Out', 'This event has no seats available.');
      return;
    }

    if (
      !Number.isInteger(numberOfSeats) ||
      numberOfSeats <= 0
    ) {
      setErrorMessage('Please select a valid seat count greater than 0.');
      return;
    }

    if (numberOfSeats > maxSeats) {
      setErrorMessage(`Only ${maxSeats} seats are available for this event.`);
      return;
    }

    // 2. Prevent duplicate submissions
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // 3. Send POST /api/bookings
      const response = await api.createBooking(event.id, numberOfSeats);

      if (response && response.booking) {
        // 4. Navigate to confirmation screen with real booking response
        navigation.replace('BookingConfirmation', {
          booking: response.booking,
          event: {
            ...event,
            availableSeats: Math.max(0, event.availableSeats - numberOfSeats),
          },
        });
      } else {
        throw new Error('Invalid response from booking service.');
      }
    } catch (err: any) {
      const status = (err as any).status;
      const msg = err?.message || 'Failed to complete booking. Please try again.';

      if (status === 401) {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please sign in again to complete your booking.',
          [
            {
              text: 'Log In',
              onPress: async () => {
                await logout();
              },
            },
          ]
        );
      } else if (status === 400 || msg.toLowerCase().includes('not enough seats')) {
        setErrorMessage(msg);
        Alert.alert('Booking Error', msg);
      } else if (status === 404) {
        Alert.alert('Event Unavailable', 'This event could not be found or has been removed.');
        navigation.goBack();
      } else {
        setErrorMessage(msg);
        Alert.alert('Booking Failed', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Event Summary Card */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>
          <View style={[styles.statusBadge, isSoldOut ? styles.soldOutBadge : styles.availableBadge]}>
            <Text style={[styles.statusBadgeText, isSoldOut ? styles.soldOutBadgeText : styles.availableBadgeText]}>
              {isSoldOut ? 'Sold Out' : `${event.availableSeats} Available`}
            </Text>
          </View>
        </View>

        <Text style={styles.eventTitle}>{event.name}</Text>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📅</Text>
            <Text style={styles.metaText}>{event.date} at {event.time}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>🏷️</Text>
            <Text style={styles.metaText}>
              Price per seat: {event.price === 0 ? 'Free Event' : `$${event.price.toFixed(2)}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Seat Selection Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Number of Seats</Text>
        <Text style={styles.sectionSubtitle}>
          Choose how many seats you wish to reserve for this event.
        </Text>

        {isSoldOut ? (
          <View style={styles.soldOutAlert}>
            <Text style={styles.soldOutAlertText}>
              🚫 This event is currently sold out. No bookings can be made.
            </Text>
          </View>
        ) : (
          <View style={styles.selectorContainer}>
            <TouchableOpacity
              style={[styles.stepperButton, numberOfSeats <= 1 && styles.stepperDisabled]}
              onPress={handleDecrement}
              disabled={numberOfSeats <= 1 || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Decrease seat count"
            >
              <Text style={[styles.stepperButtonText, numberOfSeats <= 1 && styles.stepperDisabledText]}>
                −
              </Text>
            </TouchableOpacity>

            <View style={styles.seatCountBox}>
              <Text style={styles.seatCountText}>{numberOfSeats}</Text>
              <Text style={styles.seatCountSubtext}>
                {numberOfSeats === 1 ? 'seat' : 'seats'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperButton, numberOfSeats >= maxSeats && styles.stepperDisabled]}
              onPress={handleIncrement}
              disabled={numberOfSeats >= maxSeats || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Increase seat count"
            >
              <Text style={[styles.stepperButtonText, numberOfSeats >= maxSeats && styles.stepperDisabledText]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorMessageText}>⚠️ {errorMessage}</Text>
          </View>
        )}
      </View>

      {/* Pricing Breakdown Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Price Summary</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price per seat</Text>
          <Text style={styles.priceValue}>
            {event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Number of seats</Text>
          <Text style={styles.priceValue}>× {numberOfSeats}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={[styles.totalValue, event.price === 0 && styles.freeTotalText]}>
            {displayTotal}
          </Text>
        </View>
      </View>

      {/* Submission Actions */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (isSoldOut || isSubmitting) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={isSoldOut || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Confirm Booking"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {isSoldOut ? 'Sold Out' : 'Confirm Booking'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Cancel and return to event details"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#4a5568',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#c53030',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#ebf8ff',
    borderColor: '#bee3f8',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  availableBadge: {
    backgroundColor: '#f0fff4',
    borderColor: '#c6f6d5',
  },
  availableBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#276749',
  },
  soldOutBadge: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
  },
  soldOutBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c53030',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a365d',
    lineHeight: 26,
    marginBottom: 14,
  },
  metaList: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 16,
  },
  soldOutAlert: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  soldOutAlertText: {
    color: '#c53030',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 8,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ebf8ff',
    borderWidth: 1.5,
    borderColor: '#bee3f8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2b6cb0',
    lineHeight: 26,
  },
  stepperDisabled: {
    backgroundColor: '#edf2f7',
    borderColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  stepperDisabledText: {
    color: '#a0aec0',
  },
  seatCountBox: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  seatCountText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a365d',
  },
  seatCountSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  errorMessageText: {
    color: '#c53030',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#4a5568',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a365d',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  freeTotalText: {
    color: '#276749',
  },
  actionSection: {
    gap: 12,
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#a0aec0',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
