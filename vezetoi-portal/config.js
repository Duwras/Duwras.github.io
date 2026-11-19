/* ==========================================================================
   VEZETŐI PORTÁL — beállítások
   Itt CSAK a Supabase projekt URL-je és az „anon public” kulcs állhat.
   Ezek nyilvánosak (a böngészőbe kerülnek), a védelmet az adatbázis RLS-e
   adja. A „service_role” kulcs SOHA ne kerüljön ide, se a repóba!
   Hol találod: Supabase → Project Settings → API (docs/vezetoi-portal-setup.md)
   ========================================================================== */
window.VP_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
};
