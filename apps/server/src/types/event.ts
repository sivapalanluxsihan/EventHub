export interface Event {
  id: number;
  organizerId: number;
  name: string;
  image: string | null;
  description: string | null;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
  availableSeats: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventSummary {
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
