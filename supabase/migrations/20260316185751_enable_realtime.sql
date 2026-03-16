-- Enable realtime replication for the necessary ledger tables
begin;
  -- Remove the supabase_realtime publication if it exists to replace it
  drop publication if exists supabase_realtime;
  
  -- Re-create it with the tables we want to broadcast
  create publication supabase_realtime for table sessions, players, settlements;
commit;
