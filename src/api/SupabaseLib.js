function getSupabaseLibInline() {
  const js = UrlFetchApp.fetch('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js').getContentText();
  return '<script>' + js + '<\/script>';
}