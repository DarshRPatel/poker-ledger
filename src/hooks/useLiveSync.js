import { useEffect } from 'react';
import { supabase } from '../services/supabase';

/**
 * useLiveSync
 * Subscribes to Supabase realtime Postgres changes for the specified tables.
 * 
 * @param {Array<string>} tables - Array of table names to listen to (e.g. ['sessions', 'players'])
 * @param {Function} onUpdate - Callback fired whenever an INSERT, UPDATE, or DELETE happens
 * @param {Array} deps - React dependency array for the effect hook
 */
export function useLiveSync(tables, onUpdate, deps = []) {
  useEffect(() => {
    // If we're mocking Supabase and there's no active connection,
    // the channel setup will log a warning or silently fail, which is fine for local dev.
    const channels = tables.map(table => {
      return supabase.channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          (payload) => {
            console.log(`[LiveSync] Change detected in ${table}:`, payload);
            onUpdate(payload);
          }
        )
        .subscribe();
    });

    return () => {
      // Cleanup subscriptions on unmount
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
