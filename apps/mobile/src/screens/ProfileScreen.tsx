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

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const ProfileScreen: React.FC<Props> = () => {
  const { user, updateProfile, logout, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

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
});
