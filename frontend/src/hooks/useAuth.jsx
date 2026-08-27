import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { me as meApi, auth as authApi } from '../api/client';

// 1. CREATE CONTEXT: Creates a context object that React components can subscribe to.
// We initialize it with `null`. This acts as our global state container for Authentication.
const AuthContext = createContext(null);

// 2. CONTEXT PROVIDER: A component that wraps the application (or a part of it)
// to provide the authentication state and functions to all child components.
export function AuthProvider({ children }) {
  // 3. REACT STATE (useState): Hook to persist state across component renders.
  // user: stores the current logged-in user object or null.
  const [user, setUser] = useState(null);
  // achievements: stores list of achievements unlocked by the user.
  const [achievements, setAchievements] = useState([]);
  // pinnedAchievements: subset of achievements the user has pinned to their profile.
  const [pinnedAchievements, setPinnedAchievements] = useState([]);
  // favourites: stores list of user's bookmarked or favorited contents.
  const [favourites, setFavourites] = useState([]);
  // loading: keeps track of whether the initial token verification is in progress.
  const [loading, setLoading] = useState(true);

  // 4. MEMOIZED ASYNC CALLBACK (useCallback):
  // Wraps an asynchronous function to ensure the function reference doesn't change on every render.
  // The empty dependency array `[]` means this function is created once and reused.
  const fetchMe = useCallback(async () => {
    // Check if the JWT token exists in the browser's localStorage
    const token = localStorage.getItem('lh_token');

    // If no token exists, the user is not authenticated; set loading to false and stop.
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // API CALL (async/await): Request user details from the backend "/api/me"
      const data = await meApi.get();

      // Update state hooks with retrieved backend data
      setUser(data.user);
      setAchievements(data.achievements || []);
      setPinnedAchievements(data.pinnedAchievements || []);
      setFavourites(data.favourites || []);
    } catch (err) {
      // ERROR HANDLING: If the API call fails (e.g. token expired/invalid),
      // clean up by removing the corrupted token from localStorage.
      localStorage.removeItem('lh_token');
    } finally {
      // FINALLY BLOCK: Executes regardless of try/catch success to end the loading state
      setLoading(false);
    }
  }, []);

  // 5. SIDE EFFECT HOOK (useEffect):
  // Runs side effects after components render.
  // Here, we run `fetchMe()` exactly once when the provider mounts,
  // because `fetchMe` is memoized by `useCallback` and won't change.
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // 6. ASYNC ACTION: LOG IN
  // Sends request to backend, saves JWT to localStorage, updates state, and returns response data.
  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('lh_token', data.token); // Store token for session persistence
    setUser(data.user); // Update React state to trigger UI update
    return data;
  };

  // 7. ASYNC ACTION: REGISTER & AUTO-LOGIN
  // Registers a new user, automatically calls login to retrieve token, and updates user state.
  const register = async (username, email, password) => {
    const data = await authApi.register({ username, email, password });

    // Auto-login sequence:
    const loginData = await authApi.login({ email, password });
    localStorage.setItem('lh_token', loginData.token);
    setUser(loginData.user);
    return data;
  };

  // 8. ACTION: LOG OUT
  // Clears credentials from localStorage and resets React state to force a redirect.
  const logout = () => {
    localStorage.removeItem('lh_token');
    setUser(null);
  };

  // 9. DERIVED STATE / COMPUTED VALUES:
  // Values calculated on the fly during render based on the current state.
  // Optional Chaining (?.) prevents errors if `user` is null/undefined.
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Double Negation (!!) converts the user object or null into a boolean (true/false).
  const isAuthenticated = !!user;

  // 10. CONTEXT PROVIDER VALUE:
  // Passes state variables and action functions down the tree so that children can use them.
  return (
    <AuthContext.Provider value={{ user, achievements, pinnedAchievements, favourites, loading, isAuthenticated, isAdmin, login, register, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

// 11. CUSTOM REACT HOOK:
// A custom hook wrapper around useContext. Allows any child component
// to call `useAuth()` directly to read/write authentication state.
export function useAuth() {
  return useContext(AuthContext);
}