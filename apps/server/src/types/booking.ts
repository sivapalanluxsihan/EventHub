import { BookingStatus } from './index.js';

export interface CreateBookingDto {
  eventId: number;
  numberOfSeats: number;
}

export interface BookingWithEvent {
  id: number;
  userId: number;
  eventId: number;
  numberOfSeats: number;
  status: BookingStatus;
  bookingDate: string;
  createdAt: string;
  updatedAt: string;
  eventName: string;
  eventImage: string | null;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
}
