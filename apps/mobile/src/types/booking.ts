export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: number;
  userId: number;
  eventId: number;
  numberOfSeats: number;
  status: BookingStatus;
  bookingDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingResponse {
  message: string;
  booking: Booking;
}

export interface BookingWithEvent extends Booking {
  eventName: string;
  eventImage: string | null;
  eventDescription?: string | null;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
}

export interface OrganizerBookingItem {
  id: number;
  userId: number;
  eventId: number;
  numberOfSeats: number;
  status: BookingStatus;
  bookingDate: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

export interface OrganizerEventBookingsResponse {
  event: {
    id: number;
    name: string;
    date: string;
    time: string;
    location: string;
    price: number;
    availableSeats: number;
  };
  bookings: OrganizerBookingItem[];
}
