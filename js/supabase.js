// ⚙️ CONFIGURAÇÃO SUPABASE - VERSÃO MINIMALISTA

const SUPABASE_URL = 'https://gtnbmhibdahcihoiuxwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmJtaGliZGFoY2lob2l1eHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI0ODA2NjcsImV4cCI6MTk3ODA1NjY2N30.B_KzFrLd8Z_8xK1d-F1ZzJWnJMXX-xJwXKh6H-YY7qE';

// Criar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Supabase conectado');

// Inicializar autenticação anônima ao carregar
async function inicializarAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('📝 Iniciando login anônimo...');
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ Erro login anônimo:', error.message);
        return;
      }
      
      console.log('✅ Login anônimo OK:', data.user.id);
    } else {
      console.log('✅ Sessão existe:', session.user.id);
    }
  } catch (error) {
    console.error('⚠️ Erro auth:', error);
  }
}

// Chamar ao carregar
inicializarAuth();

// IMPORTANTE: EXPORTAR PARA APP.JS
export default supabase;