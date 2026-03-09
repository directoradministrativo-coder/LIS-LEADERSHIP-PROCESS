import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called, platform:", Platform.OS);
    try {
      setLoading(true);
      setError(null);

      // All platforms: check for session token first (localStorage for web, SecureStore for native)
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[useAuth] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing",
      );

      if (sessionToken) {
        // Token exists: verify with API and get fresh user info
        console.log("[useAuth] Token found, verifying with API...");
        const apiUser = await Api.getMe();
        console.log("[useAuth] API user response:", apiUser);

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] User set from API:", userInfo);
        } else {
          // Token is invalid or expired
          console.log("[useAuth] Token invalid or expired, clearing session");
          await Auth.removeSessionToken();
          await Auth.clearUserInfo();
          setUser(null);
        }
        return;
      }

      // No token found: user is not authenticated
      console.log("[useAuth] No session token found, user is not authenticated");
      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        // Has cached user info but no token - clear stale cache
        console.log("[useAuth] Clearing stale cached user info (no token)");
        await Auth.clearUserInfo();
      }
      setUser(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      // Check for cached user info first for faster initial load (all platforms)
      Auth.getUserInfo().then((cachedUser) => {
        console.log("[useAuth] Cached user check:", cachedUser ? "found" : "not found");
        if (cachedUser) {
          console.log("[useAuth] Setting cached user immediately for fast load");
          setUser(cachedUser);
          setLoading(false);
          // Still verify token in background (don't await)
          Auth.getSessionToken().then((token) => {
            if (!token) {
              // No token but has cached user - clear stale cache
              console.log("[useAuth] No token but cached user found, clearing stale cache");
              Auth.clearUserInfo();
              setUser(null);
            }
          });
        } else {
          // No cached user, do full fetch
          fetchUser();
        }
      });
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
