/**
 * profile-store.ts
 *
 * A minimal event-emitter store for the SuperAdmin's active profile.
 * This allows select-profile.tsx to update the effectiveRole in the
 * TabLayout context WITHOUT triggering a full re-mount of the layout.
 *
 * Pattern: publish/subscribe with a single value.
 */

type ProfileListener = (profile: "user" | "admin" | null) => void;

let _currentProfile: "user" | "admin" | null = null;
const _listeners = new Set<ProfileListener>();

export const ProfileStore = {
  /** Get the current active profile */
  get(): "user" | "admin" | null {
    return _currentProfile;
  },

  /** Set the active profile and notify all listeners */
  set(profile: "user" | "admin" | null) {
    _currentProfile = profile;
    _listeners.forEach(fn => fn(profile));
  },

  /** Subscribe to profile changes. Returns an unsubscribe function. */
  subscribe(fn: ProfileListener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
