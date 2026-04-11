import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { library as libraryApi } from '../api/client';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshLibrary = useCallback(async () => {
    if (!user) {
      setLibrary([]);
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

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const updateItem = async (contentId, status, rating = null) => {
    try {
      const res = await libraryApi.update({ contentId, status, rating });
      setLibrary(prev => {
        const index = prev.findIndex(item => item.contentId === contentId);
        if (index > -1) {
          const next = [...prev];
          next[index] = res.entry;
          return next;
        }
        return [...prev, res.entry];
      });
      return { ok: true };
    } catch (err) {
      toast(err.message || 'Transmission failed', 'error');
      return { ok: false };
    }
  };

  const removeItem = async (contentId) => {
    try {
      await libraryApi.remove(contentId);
      setLibrary(prev => prev.filter(item => item.contentId !== contentId));
      return { ok: true };
    } catch (err) {
      toast(err.message || 'Removal failed', 'error');
      return { ok: false };
    }
  };

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

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}
