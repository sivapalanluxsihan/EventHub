import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/auth';

const TOKEN_KEY = '@eventhub_auth_token';
const USER_KEY = '@eventhub_user_profile';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to save token to local storage', e);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove token from local storage', e);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user to local storage', e);
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to remove user from local storage', e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (e) {
      console.error('Failed to clear local storage', e);
    }
  },
};
