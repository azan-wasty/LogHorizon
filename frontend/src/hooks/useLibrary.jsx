import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { library as libraryApi } from '../api/client';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

// 1. CONTEXT INITIALIZATION: Create library context for consumer hooks
const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  // 2. DEPENDENCY HOOKS: Consume other custom hooks within this provider.
  // user: we need the current user to know whether to fetch/reset the library list.
  const { user, refetch: refetchAuth } = useAuth();
  // toast: triggers custom notifications on success or failure of library actions.
  const toast = useToast();

  // 3. REACT STATE
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(false);

  // 4. MEMOIZED API SYNC FUNCTION (useCallback):
  // We specify dependencies `[user, toast]` because the function depends on the active `user`
  // and the `toast` function reference. If they change, the callback is re-evaluated.
  const refreshLibrary = useCallback(async () => {
    if (!user) {
      setLibrary([]); // Clear state if the user logs out
      return;
    }
    setLoading(true);
    try {
      const data = await libraryApi.get();
      setLibrary(data.library || []);
    } catch {
      toast('Failed to sync system library', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // 5. SIDE EFFECT TRIGGER:
  // Whenever the memoized refreshLibrary reference updates (like when user changes from null to a user object),
  // this effect runs and retrieves their library items.
  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // 6. COMPLEX STATE UPDATE ACTION (updateItem):
  // Updates or appends a library item.
  const updateItem = async (contentId, status, rating = null, progress = undefined) => {
    try {
      // Send changes to backend
      const payload = { contentId, status };
      if (rating !== null && rating !== undefined) payload.rating = rating;
      if (progress !== undefined && progress !== null) payload.progress = progress;

      const res = await libraryApi.update(payload);
      
      // FUNCTIONAL STATE UPDATE:
      // Passing a callback `prev => ...` ensures we are modifying the most recent state snapshot
      // and avoids race conditions.
      setLibrary(prev => {
        const index = prev.findIndex(item => item.contentId === contentId);
        
        if (index > -1) {
          // IMMUTABILITY PATTERN:
          // In React, NEVER mutate state array directly (e.g. prev[index] = newValue).
          // Instead, clone the array using the spread operator `[...prev]`, modify the copy, and return it.
          const next = [...prev];
          next[index] = res.entry;
          return next;
        }
        
        // Append new item to the cloned copy of library
        return [...prev, res.entry];
      });

      // Side Effect: Trigger Toast notifications if the backend rewards new achievements
      if (res.newUnlocks && res.newUnlocks.length > 0) {
res.newUnlocks.forEach(ach => {
            toast(`Achievement Unlocked: ${ach.title}`, 'success');
        });
        // Keep the global achievements list (used on the Profile page) in sync
        // without making every page do its own refetch-on-mount.
        refetchAuth?.();
        }
      return { ok: true, entry: res.entry };
    } catch (err) {
      toast(err.message || 'Transmission failed', 'error');
      return { ok: false };
    }
  };

  // 7. REMOVE ITEM ACTION:
  // Removes an item from user library.
  const removeItem = async (contentId) => {
    try {
      await libraryApi.remove(contentId);
      
      // IMMUTABILITY WITH FILTER:
      // Array.prototype.filter returns a BRAND NEW array containing only items
      // that return true. This automatically satisfies React's immutability requirements.
      setLibrary(prev => prev.filter(item => item.contentId !== contentId));
      return { ok: true };
    } catch (err) {
      toast(err.message || 'Removal failed', 'error');
      return { ok: false };
    }
  };

  // 8. HELPER METHOD:
  // Instantly returns the existing library record for a contentId if it exists in local state.
  const isInLibrary = (contentId) => library.find(item => item.contentId === contentId);

  return (
    <LibraryContext.Provider value={{
      library,
      loading,
      refreshLibrary,
      updateItem,
      removeItem,
      isInLibrary
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

// 9. CONSUMER HOOK
export function useLibrary() {
  const context = useContext(LibraryContext);
  // Defensively check that the hook is used inside a valid Context Provider
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}

