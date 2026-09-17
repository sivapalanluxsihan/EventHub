import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
} from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, updateProfile, logout, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    checkNotificationStatus();
  }, [user]);

  const checkNotificationStatus = async () => {
    const status = await getNotificationPermissionStatus();
    setNotificationEnabled(status.granted);
  };

  const handleToggleNotification = async () => {
    const result = await requestNotificationPermissions();
    setNotificationEnabled(result.granted);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const handleUpdate = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Name cannot be empty.');
      return;
    }

    if (name.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Email cannot be empty.');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    const result = await updateProfile(name.trim(), email.trim());
    setSaving(false);

    if (result.success) {
      setSuccessMessage('Profile updated successfully!');
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* User Summary Card */}
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Account Role:</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user?.role || 'USER'}</Text>
            </View>
          </View>
        </View>

        {/* Feedback Messages */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Edit Profile Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>Edit Profile</Text>

          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errorMessage) setErrorMessage(null);
              if (successMessage) setSuccessMessage(null);
            }}
            placeholder="Your name"
            placeholderTextColor="#8e8e93"
          />

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
              if (successMessage) setSuccessMessage(null);
            }}
            placeholder="Your email"
            placeholderTextColor="#8e8e93"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Notification Status Card */}
        <View style={styles.notificationCard}>
          <View style={styles.notifHeaderRow}>
            <View style={styles.notifTitleRow}>
              <Text style={styles.notifIcon}>🔔</Text>
              <Text style={styles.notifTitle}>Event Alerts</Text>
            </View>
            <View
              style={[
                styles.notifBadge,
                notificationEnabled ? styles.notifBadgeActive : styles.notifBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.notifBadgeText,
                  notificationEnabled ? styles.notifTextActive : styles.notifTextInactive,
                ]}
              >
                {notificationEnabled ? '● Enabled' : '○ Disabled'}
              </Text>
            </View>
          </View>
          <Text style={styles.notifDesc}>
            Receive instant booking confirmations, cancellation updates, and event reminders.
          </Text>
          {!notificationEnabled && (
            <TouchableOpacity
              style={styles.enableNotifButton}
              onPress={handleToggleNotification}
              accessibilityRole="button"
              accessibilityLabel="Enable Notifications"
            >
              <Text style={styles.enableNotifButtonText}>Enable Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Organizer Portal Action */}
        {user?.role === 'ORGANIZER' && (
          <TouchableOpacity
            style={styles.organizerButton}
            onPress={() => navigation.navigate('OrganizerDashboard')}
            accessibilityRole="button"
            accessibilityLabel="Organizer Portal"
          >
            <Text style={styles.organizerButtonText}>📊 Organizer Portal</Text>
          </TouchableOpacity>
        )}

        {/* My Bookings Action */}
        <TouchableOpacity
          style={styles.bookingsButton}
          onPress={() => navigation.navigate('MyBookings')}
          accessibilityRole="button"
          accessibilityLabel="View My Bookings"
        >
          <Text style={styles.bookingsButtonText}>🎟️ View My Bookings</Text>
        </TouchableOpacity>

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
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
    padding: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2b6cb0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleLabel: {
    fontSize: 13,
    color: '#718096',
  },
  roleBadge: {
    backgroundColor: '#ebf8ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  roleBadgeText: {
    color: '#2b6cb0',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#c53030',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: '#f0fff4',
    borderColor: '#9ae6b4',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#276749',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#edf2f7',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a202c',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  organizerButton: {
    backgroundColor: '#1a365d',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  organizerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  bookingsButton: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1.5,
    borderColor: '#bee3f8',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bookingsButtonText: {
    color: '#2b6cb0',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#fed7d7',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoutButtonText: {
    color: '#9b2c2c',
    fontSize: 15,
    fontWeight: '700',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifIcon: {
    fontSize: 18,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a365d',
  },
  notifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  notifBadgeActive: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#9ae6b4',
  },
  notifBadgeInactive: {
    backgroundColor: '#edf2f7',
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  notifBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notifTextActive: {
    color: '#22543d',
  },
  notifTextInactive: {
    color: '#718096',
  },
  notifDesc: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 18,
    marginBottom: 8,
  },
  enableNotifButton: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#90cdf4',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  enableNotifButtonText: {
    color: '#2b6cb0',
    fontSize: 13,
    fontWeight: '700',
  },
});
