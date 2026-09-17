import { Platform } from 'react-native';
import { AuthResponse, User } from '../types/auth';
import { Event, CreateEventDto, UpdateEventDto } from '../types/event';
import {
  Booking,
  BookingResponse,
  BookingWithEvent,
  OrganizerEventBookingsResponse,
} from '../types/booking';
import { storage } from './storage';

// On Android emulator, 10.0.2.2 maps to the host machine's localhost (port 5000)
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : 'http://localhost:5000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  let token = options.token;

  // Automatically supply JWT from local persistent storage if not explicitly provided
  if (!token) {
    token = await storage.getToken();
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error || data?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMessage);
      (err as any).status = response.status;
      throw err;
    }

    return data as T;
  } catch (err: any) {
    if (err.message && !err.message.includes('Network request failed')) {
      throw err;
    }
    throw new Error('Unable to connect to EventHub server. Please check your connection.');
  }
}

export const api = {
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  getProfile: async (token: string): Promise<{ user: User }> => {
    return request<{ user: User }>('/auth/profile', {
      method: 'GET',
      token,
    });
  },

  updateProfile: async (
    token: string,
    updates: { name?: string; email?: string }
  ): Promise<{ message: string; user: User }> => {
    return request<{ message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      token,
      body: updates,
    });
  },

  logout: async (token?: string | null): Promise<{ message: string }> => {
    try {
      return await request<{ message: string }>('/auth/logout', {
        method: 'POST',
        token,
      });
    } catch {
      // Backend logout is advisory (JWT is stateless); client-side token deletion is what counts
      return { message: 'Logged out locally' };
    }
  },

  getEvents: async (params?: {
    search?: string;
    category?: string;
  }): Promise<{ events: Event[] }> => {
    const queryParts: string[] = [];
    if (params?.search && params.search.trim().length > 0) {
      queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params?.category && params.category.trim().length > 0 && params.category !== 'All') {
      queryParts.push(`category=${encodeURIComponent(params.category.trim())}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return request<{ events: Event[] }>(`/events${queryString}`, {
      method: 'GET',
    });
  },

  getEventById: async (id: number): Promise<{ event: Event }> => {
    return request<{ event: Event }>(`/events/${id}`, {
      method: 'GET',
    });
  },

  createBooking: async (
    eventId: number,
    numberOfSeats: number,
    token?: string
  ): Promise<BookingResponse> => {
    return request<BookingResponse>('/bookings', {
      method: 'POST',
      token,
      body: { eventId, numberOfSeats },
    });
  },

  getUserBookings: async (token?: string): Promise<{ bookings: BookingWithEvent[] }> => {
    return request<{ bookings: BookingWithEvent[] }>('/bookings', {
      method: 'GET',
      token,
    });
  },

  getBookingById: async (id: number, token?: string): Promise<{ booking: BookingWithEvent }> => {
    return request<{ booking: BookingWithEvent }>(`/bookings/${id}`, {
      method: 'GET',
      token,
    });
  },

  cancelBooking: async (
    id: number,
    token?: string
  ): Promise<{ message: string; booking: Booking }> => {
    return request<{ message: string; booking: Booking }>(`/bookings/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  createEvent: async (
    data: CreateEventDto,
    token?: string
  ): Promise<{ message: string; event: Event }> => {
    return request<{ message: string; event: Event }>('/events', {
      method: 'POST',
      token,
      body: data,
    });
  },

  getOrganizerEvents: async (token?: string): Promise<{ events: Event[] }> => {
    return request<{ events: Event[] }>('/events/organizer/my-events', {
      method: 'GET',
      token,
    });
  },

  updateEvent: async (
    id: number,
    data: UpdateEventDto,
    token?: string
  ): Promise<{ message: string; event: Event }> => {
    return request<{ message: string; event: Event }>(`/events/${id}`, {
      method: 'PUT',
      token,
      body: data,
    });
  },

  deleteEvent: async (id: number, token?: string): Promise<{ message: string }> => {
    return request<{ message: string }>(`/events/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  getOrganizerEventBookings: async (
    eventId: number,
    token?: string
  ): Promise<OrganizerEventBookingsResponse> => {
    return request<OrganizerEventBookingsResponse>(`/organizer/events/${eventId}/bookings`, {
      method: 'GET',
      token,
    });
  },
};
