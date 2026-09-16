import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Event, EventCategory, EVENT_CATEGORIES } from '../types/event';
import { EventCard } from '../components/EventCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce timer reference
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEvents = useCallback(
    async (query: string, category: EventCategory, isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const response = await api.getEvents({
          search: query,
          category: category === 'All' ? undefined : category,
        });
        setEvents(response.events || []);
      } catch (err: any) {
        setErrorMessage(
          err.message || 'Unable to load events. Please check your connection and try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchEvents(searchQuery, selectedCategory);
  }, []);

  // Search input change handler with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchEvents(text, selectedCategory);
    }, 350);
  };

  // Clear search field
  const handleClearSearch = () => {
    setSearchQuery('');
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    fetchEvents('', selectedCategory);
  };

  // Category select handler
  const handleSelectCategory = (category: EventCategory) => {
    setSelectedCategory(category);
    fetchEvents(searchQuery, category);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    fetchEvents('', 'All');
  };

  // Pull-to-refresh handler
  const handleRefresh = () => {
    fetchEvents(searchQuery, selectedCategory, true);
  };

  // Navigate to Event Details placeholder
  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetail', {
      eventId: event.id,
      eventName: event.name,
    });
  };

  // Render Header Component inside FlatList
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Welcome & Profile Bar */}
      <View style={styles.welcomeCard}>
        <View style={styles.headerRow}>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingText}>Welcome to EventHub,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'Student'}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'USER'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="View Profile"
        >
          <Text style={styles.profileButtonText}>View My Profile →</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events by name, location, or keyword..."
            placeholderTextColor="#a0aec0"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Search events"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={handleClearSearch}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips Selector */}
      <View style={styles.categorySection}>
        <Text style={styles.sectionHeading}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {EVENT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => handleSelectCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
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
      </View>

      {/* Events Heading */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsHeading}>
          {selectedCategory === 'All' ? 'Upcoming Campus Events' : `${selectedCategory} Events`}
        </Text>
        {!loading && !errorMessage && (
          <Text style={styles.resultsCount}>{events.length} found</Text>
        )}
      </View>
    </View>
  );

  // Render Empty State
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2b6cb0" />
          <Text style={styles.loadingText}>Loading available events...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load events</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchEvents(searchQuery, selectedCategory)}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🗓️</Text>
        <Text style={styles.emptyTitle}>No events found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim()
            ? `No events matched "${searchQuery}". Try a different keyword.`
            : `No events in ${selectedCategory} category right now.`}
        </Text>
        {(searchQuery.trim().length > 0 || selectedCategory !== 'All') && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetFilters}
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || errorMessage ? [] : events}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <EventCard event={item} onPress={handleEventPress} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2b6cb0']}
            tintColor="#2b6cb0"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 8,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greetingCol: {
    flex: 1,
    marginRight: 10,
  },
  greetingText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a365d',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#ebf8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  roleText: {
    color: '#2b6cb0',
    fontSize: 12,
    fontWeight: '700',
  },
  profileButton: {
    backgroundColor: '#edf2f7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#2b6cb0',
    fontSize: 13,
    fontWeight: '600',
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a202c',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#a0aec0',
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4a5568',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#2b6cb0',
    borderColor: '#2b6cb0',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  resultsHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a202c',
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#edf2f7',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  resetButton: {
    backgroundColor: '#ebf8ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  resetButtonText: {
    color: '#2b6cb0',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7d7',
    marginTop: 8,
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
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
