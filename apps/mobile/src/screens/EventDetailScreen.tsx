import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export const EventDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId, eventName } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Event ID: {eventId}</Text>
        </View>

        <Text style={styles.title}>{eventName}</Text>

        <View style={styles.divider} />

        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderIcon}>📌</Text>
          <Text style={styles.placeholderTitle}>Event Details Placeholder</Text>
          <Text style={styles.placeholderSubtitle}>
            Full event details, interactive agenda, ticket tiers, and seat booking will be implemented in Step 18.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to Event Discovery"
        >
          <Text style={styles.backButtonText}>← Back to Event Discovery</Text>
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
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#ebf8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bee3f8',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a365d',
    lineHeight: 28,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginBottom: 20,
  },
  placeholderBox: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e0',
    marginBottom: 24,
  },
  placeholderIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 6,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
