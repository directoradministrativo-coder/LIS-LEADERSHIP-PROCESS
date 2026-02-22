/**
 * Cross-platform storage wrapper.
 * Uses localStorage on web and AsyncStorage on native.
 * This avoids crashes when AsyncStorage is not available in the web bundle.
 */
import { Platform } from "react-native";

let AsyncStorageModule: typeof import("@react-native-async-storage/async-storage").default | null = null;

// Lazy-load AsyncStorage only on native to avoid web bundle issues
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AsyncStorageModule = require("@react-native-async-storage/async-storage").default;
  } catch {
    AsyncStorageModule = null;
  }
}

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    if (AsyncStorageModule) {
      return AsyncStorageModule.getItem(key);
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore
      }
      return;
    }
    if (AsyncStorageModule) {
      await AsyncStorageModule.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    if (AsyncStorageModule) {
      await AsyncStorageModule.removeItem(key);
    }
  },
};
