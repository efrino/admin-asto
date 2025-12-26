// ==================== src/config/supabase.js ====================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kwwcbkdftasoetbkhtsp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d2Nia2RmdGFzb2V0YmtodHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzIzODcsImV4cCI6MjA4MTc0ODM4N30.FGdYHuE9uhgbPq01SLE_Ld6n11NdqnIfsf-50end-pU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
