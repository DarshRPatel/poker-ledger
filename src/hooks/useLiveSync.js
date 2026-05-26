import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

const isSupabaseConfigured = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder-project.supabase.co' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key';

/**
 * useLiveSync
 * Subscribes to Supabase realtime Postgres changes for the specified tables.
 * 
 * @param {Array<string>} tables - Array of table names to listen to (e.g. ['sessions'])
 * @param {Function} onUpdate - Callback fired whenever an INSERT, UPDATE, or DELETE happens
 */
export function useLiveSync(tables, onUpdate) {
  const onUpdateRef = useRef(onUpdate);

  // Keep callback reference updated without re-running useEffect
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Serialize the tables array to generate a stable key for dependency array
  const tablesKey = (tables || []).join(',');

  // Backdoor for E2E testing to simulate realtime events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.liveSyncMockTriggers) {
        window.liveSyncMockTriggers = {};
      }
      (tables || []).forEach(table => {
        window.liveSyncMockTriggers[table] = (payload) => {
          console.log(`[E2E LiveSync Mock Trigger] ${table}:`, payload);
          if (onUpdateRef.current) {
            onUpdateRef.current(payload);
          }
        };
      });
    }
  }, [tablesKey]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channels = (tables || []).map(table => {
      return supabase.channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          (payload) => {
            console.log(`[LiveSync] Change detected in table ${table}:`, payload);
            if (onUpdateRef.current) {
              onUpdateRef.current(payload);
            }
          }
        )
        .subscribe();
    });

    return () => {
      // Cleanup subscriptions on unmount or key change
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey]);
}
