export type UserRole = 'USER' | 'ORGANIZER';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message?: string;
  token?: string;
  user?: User;
  error?: string;
}
