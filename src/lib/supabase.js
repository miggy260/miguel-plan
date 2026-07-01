import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://obikyygbeqhnzkxjvcxr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaWt5eWdiZXFobnpreGp2Y3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTQ0NjUsImV4cCI6MjA5NzQzMDQ2NX0.ogLpKFsf6rwn0ie-ppz6I5QRXRksq-SH17-sZBP1nws',
)
