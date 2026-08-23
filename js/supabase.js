// Configuração do Supabase
const SUPABASE_URL = 'https://gtnbmhibdahcihoiuxwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmJtaGliZGFoY2lob2l1eHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NDY2NTUsImV4cCI6MjEwMzAyMjY1NX0.d-OMXpYDs5s2ozpWqgcXMbQGhUp9fmD6rWT993d2etU';

// Importar cliente Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// Inicializar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para usar em outros arquivos
export { supabase };

// Testar conexão (abra o console do navegador com F12)
supabase.from('ordens_servico')
  .select('*', { count: 'exact' })
  .limit(1)
  .then(res => console.log('✅ Supabase conectado! Total de OS:', res.count))
  .catch(err => console.error('❌ Erro conexão:', err));