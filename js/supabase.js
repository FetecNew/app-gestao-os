// ⚙️ CONFIGURAÇÃO SUPABASE v2 - COM AUTENTICAÇÃO ANÔNIMA

const SUPABASE_URL = 'https://gtnbmhibdahcihoiuxwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmJtaGliZGFoY2lob2l1eHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI0ODA2NjcsImV4cCI6MTk3ODA1NjY2N30.B_KzFrLd8Z_8xK1d-F1ZzJWnJMXX-xJwXKh6H-YY7qE';

// ========== CRIAR CLIENTE SUPABASE ==========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Cliente Supabase inicializado');

// ========== INICIALIZAR AUTENTICAÇÃO ANÔNIMA ==========
export async function inicializarAuth() {
  try {
    // Tentar obter sessão existente
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('📝 Nenhuma sessão. Fazendo login anônimo...');
      
      // Login anônimo
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ Erro no login anônimo:', error);
        console.log('⚠️ Continuando em modo guest...');
        return null;
      }
      
      console.log('✅ Login anônimo realizado!', data.user.id);
      return data.user.id;
    }
    
    console.log('✅ Sessão já existe:', session.user.id);
    return session.user.id;
  } catch (err) {
    console.error('⚠️ Erro ao inicializar auth:', err);
    return null;
  }
}

// ========== OBTER USUÁRIO ATUAL ==========
export async function obterUsuarioAtual() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (err) {
    console.error('⚠️ Erro ao obter usuário:', err);
    return null;
  }
}

// ========== EXPORTAR CLIENTE SUPABASE COMO DEFAULT ==========
export default supabase;
