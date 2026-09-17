import { Event } from './event';
import { Booking, BookingWithEvent } from './booking';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
  EventDetail: { eventId: number; eventName?: string; event?: Event };
  Booking: { eventId: number; event?: Event };
  BookingConfirmation: { booking: Booking; event: Event };
  MyBookings: undefined;
  BookingDetails: { bookingId: number; booking?: BookingWithEvent };
  OrganizerDashboard: undefined;
  OrganizerAddEvent: undefined;
  OrganizerEditEvent: { eventId: number; event: Event };
  OrganizerEventBookings: { eventId: number; eventName?: string };
};
