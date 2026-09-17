import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event } from '../types/event';
import { Booking } from '../types/booking';

// Configure foreground notification behavior (alert, sound, badge)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('[NotificationService] Failed to set notification handler:', e);
}

const REMINDER_STORAGE_KEY_PREFIX = '@eventhub_reminder_';

export interface NotificationPermissionStatus {
  granted: boolean;
  status: Notifications.PermissionStatus | string;
  canAskAgain: boolean;
}

/**
 * Configure Android notification channels for high visibility
 */
export const setupNotificationChannels = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'EventHub Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2b6cb0',
        sound: 'default',
      });
    } catch (e) {
      console.warn('[NotificationService] Channel creation warning:', e);
    }
  }
};

/**
 * Request user notification permissions
 */
export const requestNotificationPermissions = async (): Promise<NotificationPermissionStatus> => {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      await setupNotificationChannels();
      return {
        granted: true,
        status: existing.status,
        canAskAgain: existing.canAskAgain,
      };
    }

    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) {
      await setupNotificationChannels();
    }
    return {
      granted: requested.granted,
      status: requested.status,
      canAskAgain: requested.canAskAgain,
    };
  } catch (error) {
    console.warn('[NotificationService] Permission request failed:', error);
    return {
      granted: false,
      status: 'undetermined',
      canAskAgain: false,
    };
  }
};

/**
 * Check existing notification permission status without prompting
 */
export const getNotificationPermissionStatus = async (): Promise<NotificationPermissionStatus> => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return {
      granted: permissions.granted,
      status: permissions.status,
      canAskAgain: permissions.canAskAgain,
    };
  } catch (error) {
    console.warn('[NotificationService] Permission check failed:', error);
    return {
      granted: false,
      status: 'undetermined',
      canAskAgain: false,
    };
  }
};

/**
 * Send immediate booking confirmation notification
 * Safe: Catch all errors internally so booking flow never fails
 */
export const sendBookingConfirmationNotification = async (
  event: Event,
  booking: Booking
): Promise<string | null> => {
  try {
    const permission = await getNotificationPermissionStatus();
    if (!permission.granted) {
      // If not granted, attempt a non-intrusive one-time request
      const req = await requestNotificationPermissions();
      if (!req.granted) return null;
    }

    const seatsText = booking.numberOfSeats === 1 ? '1 seat' : `${booking.numberOfSeats} seats`;
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎟️ Booking Confirmed (#${booking.id})`,
        body: `You're all set for "${event.name}"! ${seatsText} reserved. Date: ${event.date} at ${event.time}.`,
        data: { bookingId: booking.id, eventId: event.id, type: 'BOOKING_CONFIRMATION' },
        sound: 'default',
      },
      trigger: null, // immediate delivery
    });

    return notificationId;
  } catch (error) {
    console.warn('[NotificationService] Booking confirmation notification skipped:', error);
    return null;
  }
};

/**
 * Send immediate booking cancellation notification
 * Safe: Catch all errors internally so cancellation flow never fails
 */
export const sendBookingCancellationNotification = async (
  event: { name: string },
  booking: { id: number; numberOfSeats?: number }
): Promise<string | null> => {
  try {
    const permission = await getNotificationPermissionStatus();
    if (!permission.granted) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚫 Booking Cancelled (#${booking.id})`,
        body: `Your booking for "${event.name}" has been cancelled. Available seats have been returned.`,
        data: { bookingId: booking.id, type: 'BOOKING_CANCELLATION' },
        sound: 'default',
      },
      trigger: null, // immediate delivery
    });

    return notificationId;
  } catch (error) {
    console.warn('[NotificationService] Booking cancellation notification skipped:', error);
    return null;
  }
};

/**
 * Helper to safely parse event date and time strings into a valid future Date object
 */
export const parseEventDateTime = (dateStr: string, timeStr: string): Date | null => {
  try {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Normalizing YYYY-MM-DD
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) return null;

    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
    const day = parseInt(dateParts[2], 10);

    let hours = 9;
    let minutes = 0;

    if (timeStr && typeof timeStr === 'string') {
      const isPM = /pm/i.test(timeStr);
      const isAM = /am/i.test(timeStr);
      const cleanTime = timeStr.replace(/am|pm/gi, '').trim();
      const timeParts = cleanTime.split(':');

      if (timeParts.length >= 1) {
        hours = parseInt(timeParts[0], 10);
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
      if (timeParts.length >= 2) {
        minutes = parseInt(timeParts[1], 10);
      }
    }

    const eventDate = new Date(year, month, day, hours, minutes, 0);
    if (isNaN(eventDate.getTime())) return null;

    return eventDate;
  } catch {
    return null;
  }
};

/**
 * Schedule a local event reminder before the event takes place
 * Safely handles past events, invalid formats, and notification failures
 */
export const scheduleEventReminder = async (
  event: Event,
  booking: Booking
): Promise<string | null> => {
  try {
    const permission = await getNotificationPermissionStatus();
    if (!permission.granted) return null;

    const eventDate = parseEventDateTime(event.date, event.time);
    if (!eventDate) {
      console.warn(`[NotificationService] Unable to parse event date/time: ${event.date} ${event.time}`);
      return null;
    }

    const now = new Date();
    // Do not schedule reminders for past events
    if (eventDate.getTime() <= now.getTime()) {
      return null;
    }

    // Schedule reminder 2 hours before event if sufficiently in the future,
    // otherwise schedule at least 5 minutes before event
    const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
    let triggerDate: Date;

    if (twoHoursBefore.getTime() > now.getTime()) {
      triggerDate = twoHoursBefore;
    } else {
      // Event is within 2 hours: schedule reminder in 1 minute or midway
      const midway = new Date(now.getTime() + Math.max(60 * 1000, (eventDate.getTime() - now.getTime()) / 2));
      triggerDate = midway;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Reminder: Upcoming Event Today!`,
        body: `"${event.name}" starts soon at ${event.time} (${event.location}). Have your booking (#${booking.id}) ready!`,
        data: { bookingId: booking.id, eventId: event.id, type: 'EVENT_REMINDER' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    // Save reminder ID in persistent storage mapped to bookingId
    await AsyncStorage.setItem(
      `${REMINDER_STORAGE_KEY_PREFIX}${booking.id}`,
      notificationId
    );

    return notificationId;
  } catch (error) {
    console.warn('[NotificationService] Event reminder scheduling skipped:', error);
    return null;
  }
};

/**
 * Clean up / cancel scheduled reminder when a booking is cancelled
 */
export const cancelEventReminder = async (bookingId: number): Promise<boolean> => {
  try {
    const key = `${REMINDER_STORAGE_KEY_PREFIX}${bookingId}`;
    const notificationId = await AsyncStorage.getItem(key);

    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await AsyncStorage.removeItem(key);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[NotificationService] Failed to cancel event reminder:', error);
    return false;
  }
};

/**
 * Send event update notification for attendees
 */
export const sendEventUpdateNotification = async (
  eventName: string,
  updateDetails: string
): Promise<string | null> => {
  try {
    const permission = await getNotificationPermissionStatus();
    if (!permission.granted) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📢 Event Update: ${eventName}`,
        body: updateDetails,
        data: { type: 'EVENT_UPDATE' },
        sound: 'default',
      },
      trigger: null,
    });

    return notificationId;
  } catch (error) {
    console.warn('[NotificationService] Event update notification skipped:', error);
    return null;
  }
};
