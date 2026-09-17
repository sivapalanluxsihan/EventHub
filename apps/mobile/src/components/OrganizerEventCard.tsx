import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Event } from '../types/event';

interface Props {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
  onViewBookings: (event: Event) => void;
}

export const OrganizerEventCard: React.FC<Props> = ({
  event,
  onEdit,
  onDelete,
  onView,
  onViewBookings,
}) => {
  const isSoldOut = event.availableSeats === 0;

  return (
    <View style={styles.card}>
      {/* Top Header: Image + Basic Info */}
      <View style={styles.headerRow}>
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderIcon}>🎪</Text>
          </View>
        )}

        <View style={styles.infoCol}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {event.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.priceText, event.price === 0 && styles.freePrice]}>
              {event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`}
            </Text>
            <Text style={styles.seatsCount}>
              {isSoldOut ? '⚠️ Sold Out' : `👥 ${event.availableSeats} seats left`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Event Details: Date, Time, Venue */}
      <View style={styles.detailsCol}>
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📅</Text>
          <Text style={styles.metaText}>
            {event.date} • {event.time}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.bookingsButton}
          onPress={() => onViewBookings(event)}
          accessibilityRole="button"
          accessibilityLabel={`View bookings for ${event.name}`}
        >
          <Text style={styles.bookingsButtonText}>📋 Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => onView(event)}
          accessibilityRole="button"
          accessibilityLabel={`View ${event.name}`}
        >
          <Text style={styles.viewButtonText}>👁️ View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(event)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${event.name}`}
        >
          <Text style={styles.editButtonText}>✏️ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(event)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${event.name}`}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  image: {
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
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#edf2f7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a365d',
    lineHeight: 19,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2b6cb0',
  },
  freePrice: {
    color: '#276749',
  },
  seatsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 12,
  },
  detailsCol: {
    gap: 6,
    marginBottom: 12,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bookingsButton: {
    flex: 1.2,
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#90cdf4',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a5568',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#c6f6d5',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#276749',
  },
  deleteButton: {
    flex: 0.6,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fed7d7',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c53030',
  },
});
