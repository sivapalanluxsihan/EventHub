export interface Event {
  id: number;
  name: string;
  image: string | null;
  description: string | null;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
  availableSeats: number;
}

export type EventCategory =
  | 'All'
  | 'Technology'
  | 'Music'
  | 'Sports'
  | 'Education'
  | 'Community';

export const EVENT_CATEGORIES: EventCategory[] = [
  'All',
  'Technology',
  'Music',
  'Sports',
  'Education',
  'Community',
];
