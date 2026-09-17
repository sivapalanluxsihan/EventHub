import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { BookingConfirmationScreen } from '../screens/BookingConfirmationScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { BookingDetailsScreen } from '../screens/BookingDetailsScreen';
import { OrganizerDashboardScreen } from '../screens/OrganizerDashboardScreen';
import { OrganizerAddEventScreen } from '../screens/OrganizerAddEventScreen';
import { OrganizerEditEventScreen } from '../screens/OrganizerEditEventScreen';
import { OrganizerEventBookingsScreen } from '../screens/OrganizerEventBookingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>EventHub</Text>
        <ActivityIndicator size="large" color="#2b6cb0" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#1a365d',
          headerTitleStyle: {
            fontWeight: '700',
          },
          headerShadowVisible: false,
        }}
      >
        {isAuthenticated ? (
          // Application Stack (Protected)
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'EventHub' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ title: 'Event Details' }}
            />
            <Stack.Screen
              name="Booking"
              component={BookingScreen}
              options={{ title: 'Book Event' }}
            />
            <Stack.Screen
              name="BookingConfirmation"
              component={BookingConfirmationScreen}
              options={{
                title: 'Booking Confirmed',
                headerBackVisible: false,
              }}
            />
            <Stack.Screen
              name="MyBookings"
              component={MyBookingsScreen}
              options={{ title: 'My Bookings' }}
            />
            <Stack.Screen
              name="BookingDetails"
              component={BookingDetailsScreen}
              options={{ title: 'Booking Details' }}
            />
            <Stack.Screen
              name="OrganizerDashboard"
              component={OrganizerDashboardScreen}
              options={{ title: 'Organizer Portal' }}
            />
            <Stack.Screen
              name="OrganizerAddEvent"
              component={OrganizerAddEventScreen}
              options={{ title: 'Create Event' }}
            />
            <Stack.Screen
              name="OrganizerEditEvent"
              component={OrganizerEditEventScreen}
              options={{ title: 'Edit Event' }}
            />
            <Stack.Screen
              name="OrganizerEventBookings"
              component={OrganizerEventBookingsScreen}
              options={{ title: 'Event Bookings' }}
            />
          </>
        ) : (
          // Authentication Stack
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingLogo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
});
