import { Request } from 'express';

export type UserRole = 'USER' | 'ORGANIZER';

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface JWTPayload {
  userId: number;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: SafeUser;
}

export type EventCategory = 'Music' | 'Sports' | 'Technology' | 'Education' | 'Community';

export interface Event {
  id: number;
  organizerId: number;
  name: string;
  image?: string | null;
  description?: string | null;
  date: string;
  time: string;
  location: string;
  category: EventCategory | string;
  price: number;
  availableSeats: number;
  createdAt: string;
  updatedAt: string;
}

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
