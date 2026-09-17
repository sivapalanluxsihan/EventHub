import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Event } from '../types/event';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'technology':
      return { bg: '#ebf8ff', text: '#2b6cb0', border: '#bee3f8' };
    case 'music':
      return { bg: '#faf5ff', text: '#6b46c1', border: '#e9d8fd' };
    case 'sports':
      return { bg: '#fffaf0', text: '#c05621', border: '#feebc8' };
    case 'education':
      return { bg: '#e6fffa', text: '#234e52', border: '#b2f5ea' };
    case 'community':
      return { bg: '#f0fff4', text: '#276749', border: '#c6f6d5' };
    default:
      return { bg: '#edf2f7', text: '#4a5568', border: '#e2e8f0' };
  }
};

export const EventDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId, eventName } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getEventById(eventId);
      setEvent(res.event);
    } catch (err: any) {
      setError(err?.message || 'Failed to load event details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Could Not Load Event</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'The requested event could not be found.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadEvent}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.backLinkText}>← Back to Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const catTheme = getCategoryColor(event.category || 'General');
  const formattedPrice =
    event.price === 0 ? 'Free Event' : `$${event.price.toFixed(2)}`;
  const isSoldOut = event.availableSeats <= 0;

  const handleBookingPress = () => {
    if (isSoldOut) {
      Alert.alert(
        'Sold Out',
        'Sorry, this event is completely sold out. No seats are available for booking.'
      );
      return;
    }
    Alert.alert(
      'Ready for Booking',
      'The booking backend API is ready. Full booking UI will be connected in Step 19.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner / Image */}
      {event.image && !imageError ? (
        <Image
          source={{ uri: event.image }}
          style={styles.heroImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.heroFallback, { backgroundColor: catTheme.bg }]}>
          <Text style={[styles.heroFallbackText, { color: catTheme.text }]}>
            {event.category.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Main Details Card */}
      <View style={styles.card}>
        {/* Category & Price Row */}
        <View style={styles.topRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: catTheme.bg, borderColor: catTheme.border },
            ]}
          >
            <Text style={[styles.categoryText, { color: catTheme.text }]}>
              {event.category}
            </Text>
          </View>
          <View
            style={[
              styles.priceBadge,
              event.price === 0 ? styles.freePriceBadge : styles.paidPriceBadge,
            ]}
          >
            <Text
              style={[
                styles.priceText,
                event.price === 0 ? styles.freePriceText : styles.paidPriceText,
              ]}
            >
              {formattedPrice}
            </Text>
          </View>
        </View>

        {/* Event Title */}
        <Text style={styles.title}>{event.name}</Text>

        {/* Availability Status Banner */}
        {isSoldOut ? (
          <View style={styles.soldOutBanner}>
            <Text style={styles.soldOutIcon}>🚫</Text>
            <View style={styles.soldOutTextCol}>
              <Text style={styles.soldOutTitle}>Sold Out</Text>
              <Text style={styles.soldOutSubtitle}>
                All seats for this event have been reserved.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.availabilityBanner}>
            <Text style={styles.availabilityIcon}>🎟️</Text>
            <View style={styles.availabilityTextCol}>
              <Text style={styles.availabilityTitle}>
                {event.availableSeats}{' '}
                {event.availableSeats === 1 ? 'seat' : 'seats'} available
              </Text>
              <Text style={styles.availabilitySubtitle}>
                Booking is open for registered students.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Logistics Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>
                {event.date} at {event.time}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Location / Venue</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👥</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Seat Availability</Text>
              <Text
                style={[
                  styles.infoValue,
                  isSoldOut ? styles.soldOutText : styles.availableSeatsText,
                ]}
              >
                {isSoldOut
                  ? 'Sold Out (0 seats remaining)'
                  : `${event.availableSeats} seats remaining`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Description Section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionHeader}>About This Event</Text>
          <Text style={styles.descriptionText}>
            {event.description ||
              'No detailed description has been provided for this event.'}
          </Text>
        </View>

        {/* Action Button: Booking or Sold Out Notice */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.bookingButton,
              isSoldOut && styles.disabledBookingButton,
            ]}
            onPress={handleBookingPress}
            disabled={isSoldOut}
            accessibilityRole="button"
            accessibilityLabel={
              isSoldOut ? 'Sold out, cannot book' : 'Proceed to booking'
            }
          >
            <Text
              style={[
                styles.bookingButtonText,
                isSoldOut && styles.disabledButtonText,
              ]}
            >
              {isSoldOut ? 'Sold Out' : 'Proceed to Booking'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to Event Discovery"
          >
            <Text style={styles.backButtonText}>← Back to Event Discovery</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 40,
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
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#c53030',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '600',
  },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#e2e8f0',
  },
  heroFallback: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginTop: -20,
    marginHorizontal: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  freePriceBadge: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  paidPriceBadge: {
    backgroundColor: '#edf2f7',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  freePriceText: {
    color: '#276749',
  },
  paidPriceText: {
    color: '#2d3748',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a365d',
    lineHeight: 28,
    marginBottom: 16,
  },
  soldOutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  soldOutIcon: {
    fontSize: 22,
  },
  soldOutTextCol: {
    flex: 1,
  },
  soldOutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9b2c2c',
  },
  soldOutSubtitle: {
    fontSize: 12,
    color: '#c53030',
  },
  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    borderColor: '#9ae6b4',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  availabilityIcon: {
    fontSize: 22,
  },
  availabilityTextCol: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22543d',
  },
  availabilitySubtitle: {
    fontSize: 12,
    color: '#2f855a',
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 16,
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#2d3748',
    fontWeight: '600',
  },
  soldOutText: {
    color: '#e53e3e',
    fontWeight: '700',
  },
  availableSeatsText: {
    color: '#2b6cb0',
  },
  descriptionSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: 24,
    gap: 12,
  },
  bookingButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBookingButton: {
    backgroundColor: '#cbd5e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookingButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButtonText: {
    color: '#718096',
  },
  backButton: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButtonText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '700',
  },
});
