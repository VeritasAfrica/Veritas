/*
========================================
VALMS
Supabase Configuration
========================================
*/

const SUPABASE_URL = "https://ebcjwbxufsxygfvzjckz.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViY2p3Ynh1ZnN4eWdmdnpqY2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNTE4MTUsImV4cCI6MjEwMDkyNzgxNX0.PYrRy6TUBTnUb8BBGdU7UzB79tjKE_bhw0u0dyj1wkI";

/*
Replace YOUR_SUPABASE_ANON_KEY
with your project's anon public key.
*/

const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

