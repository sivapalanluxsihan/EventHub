import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { EVENT_CATEGORIES, EventCategory } from '../types/event';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizerAddEvent'>;

const CATEGORIES = EVENT_CATEGORIES.filter((c) => c !== 'All');

export const OrganizerAddEventScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0] || 'Technology');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-11-20');
  const [time, setTime] = useState('10:00 AM');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('0.00');
  const [availableSeats, setAvailableSeats] = useState('50');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Validations
    if (!name.trim()) {
      setErrorMessage('Event name is required.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Event description is required.');
      return;
    }

    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setErrorMessage('Date must be in format YYYY-MM-DD (e.g., 2026-11-20).');
      return;
    }

    if (!time.trim()) {
      setErrorMessage('Time is required (e.g., 10:00 AM).');
      return;
    }

    if (!location.trim()) {
      setErrorMessage('Location / Venue is required.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Price must be a valid number greater than or equal to 0.');
      return;
    }

    const parsedSeats = parseInt(availableSeats, 10);
    if (isNaN(parsedSeats) || parsedSeats < 0 || !Number.isInteger(parsedSeats)) {
      setErrorMessage('Available seats must be a valid integer greater than or equal to 0.');
      return;
    }

    setLoading(true);

    try {
      await api.createEvent({
        name: name.trim(),
        image: imageUrl.trim() || null,
        description: description.trim(),
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        category,
        price: parsedPrice,
        availableSeats: parsedSeats,
      });

      Alert.alert('Success', 'Event created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to create event. Please verify all details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Add New Campus Event</Text>
          <Text style={styles.headerSubtitle}>
            Publish an event for university students and attendees.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formCard}>
          {/* Event Name */}
          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. AI & Robotics Hackathon 2026"
            placeholderTextColor="#a0aec0"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errorMessage) setErrorMessage(null);
            }}
          />

          {/* Category Selector */}
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Detailed description of the event..."
            placeholderTextColor="#a0aec0"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errorMessage) setErrorMessage(null);
            }}
          />

          {/* Date & Time Row */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-11-20"
                placeholderTextColor="#a0aec0"
                value={date}
                onChangeText={(text) => {
                  setDate(text);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00 AM"
                placeholderTextColor="#a0aec0"
                value={time}
                onChangeText={(text) => {
                  setTime(text);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>
          </View>

          {/* Location */}
          <Text style={styles.label}>Location / Venue *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Student Innovation Center, Hall A"
            placeholderTextColor="#a0aec0"
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              if (errorMessage) setErrorMessage(null);
            }}
          />

          {/* Price & Available Seats Row */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Price ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#a0aec0"
                keyboardType="numeric"
                value={price}
                onChangeText={(text) => {
                  setPrice(text);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>Available Seats *</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                placeholderTextColor="#a0aec0"
                keyboardType="number-pad"
                value={availableSeats}
                onChangeText={(text) => {
                  setAvailableSeats(text);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>
          </View>

          {/* Image URL (Optional) */}
          <Text style={styles.label}>Image URL (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor="#a0aec0"
            autoCapitalize="none"
            value={imageUrl}
            onChangeText={setImageUrl}
          />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Create Event"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Event</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#718096',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#edf2f7',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a5568',
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#edf2f7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1a202c',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  multilineInput: {
    minHeight: 90,
  },
  categoryScroll: {
    marginBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#2b6cb0',
    borderColor: '#2b6cb0',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
    marginTop: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#c53030',
    fontSize: 13,
    fontWeight: '600',
  },
});
