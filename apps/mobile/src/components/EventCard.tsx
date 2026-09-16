import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Event } from '../types/event';

interface EventCardProps {
  event: Event;
  onPress: (event: Event) => void;
}

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

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const catTheme = getCategoryColor(event.category);

  const formattedPrice =
    event.price === 0 ? 'Free' : `$${event.price.toFixed(2)}`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.78}
      onPress={() => onPress(event)}
      accessibilityRole="button"
      accessibilityLabel={`Event: ${event.name}`}
    >
      {/* Event Image or Fallback */}
      {event.image && !imageError ? (
        <Image
          source={{ uri: event.image }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.imageFallback, { backgroundColor: catTheme.bg }]}>
          <Text style={[styles.imageFallbackText, { color: catTheme.text }]}>
            {event.category.toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Category Badge & Price Row */}
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
          <Text style={[styles.price, event.price === 0 && styles.freePrice]}>
            {formattedPrice}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.name} numberOfLines={2}>
          {event.name}
        </Text>

        {/* Description snippet if available */}
        {event.description && (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        {/* Info Rows */}
        <View style={styles.metaContainer}>
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

        {/* Card Footer: Seats & Action prompt */}
        <View style={styles.footer}>
          <View style={styles.seatsContainer}>
            <Text style={styles.seatsIcon}>👥</Text>
            <Text style={styles.seatsText}>
              {event.availableSeats > 0
                ? `${event.availableSeats} seats available`
                : 'Sold Out'}
            </Text>
          </View>
          <Text style={styles.tapPrompt}>View Details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#e2e8f0',
  },
  imageFallback: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d3748',
  },
  freePrice: {
    color: '#276749',
    fontWeight: '800',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    lineHeight: 24,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaContainer: {
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
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 4,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsIcon: {
    fontSize: 12,
  },
  seatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  tapPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
});
