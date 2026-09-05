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
  //
  // OPTIMISTIC UPDATE: mirrors the onboarding pipeline's toggle methodology —
  // apply the change to local state synchronously (same render pass as the
  // click) so the button reflects it instantly, THEN sync to the backend in
  // the background. If the request fails, roll the local state back to what
  // it was before the click and surface a toast. This is what makes onboarding
  // feel instant while everywhere else was waiting on a network round-trip.
  const updateItem = async (contentId, status, rating = null, progress = undefined) => {
    const payload = { contentId, status };
    if (rating !== null && rating !== undefined) payload.rating = rating;
    if (progress !== undefined && progress !== null) payload.progress = progress;

    // Snapshot what we're overwriting so we can restore it on failure.
    let previousEntry = null;
    let wasNew = false;

    // INSTANT LOCAL UPDATE — happens before the network call, not after.
    setLibrary(prev => {
      const index = prev.findIndex(item => item.contentId === contentId);

      if (index > -1) {
        previousEntry = prev[index];
        const next = [...prev];
        next[index] = { ...prev[index], ...payload };
        return next;
      }

      wasNew = true;
      return [...prev, { contentId, status, rating: rating ?? null, progress: progress ?? 0 }];
    });

    try {
      const res = await libraryApi.update(payload);

      // Reconcile the optimistic guess with the authoritative server record
      // (picks up server-computed fields like updatedAt, id, etc.).
      setLibrary(prev => {
        const index = prev.findIndex(item => item.contentId === contentId);
        if (index > -1) {
          const next = [...prev];
          next[index] = res.entry;
          return next;
        }
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
      // ROLLBACK: the optimistic guess didn't hold up, restore prior state.
      setLibrary(prev => {
        if (wasNew) return prev.filter(item => item.contentId !== contentId);
        const index = prev.findIndex(item => item.contentId === contentId);
        if (index > -1 && previousEntry) {
          const next = [...prev];
          next[index] = previousEntry;
          return next;
        }
        return prev;
      });
      toast(err.message || 'Transmission failed', 'error');
      return { ok: false };
    }
  };

  // 7. REMOVE ITEM ACTION:
  // Removes an item from user library. Also optimistic — see updateItem above.
  const removeItem = async (contentId) => {
    let previousEntry = null;
    let previousIndex = -1;

    setLibrary(prev => {
      previousIndex = prev.findIndex(item => item.contentId === contentId);
      if (previousIndex > -1) previousEntry = prev[previousIndex];
      return prev.filter(item => item.contentId !== contentId);
    });

    try {
      await libraryApi.remove(contentId);
      return { ok: true };
    } catch (err) {
      // ROLLBACK: re-insert at its original position if we can.
      if (previousEntry) {
        setLibrary(prev => {
          const next = [...prev];
          const at = Math.min(previousIndex, next.length);
          next.splice(at < 0 ? next.length : at, 0, previousEntry);
          return next;
        });
      }
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