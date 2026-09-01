// ⚙️ CONFIGURAÇÃO SUPABASE - VERSÃO MINIMALISTA

const SUPABASE_URL = 'https://gtnbmhibdahcihoiuxwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmJtaGliZGFoY2lob2l1eHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NDY2NTUsImV4cCI6MjEwMzAyMjY1NX0.d-OMXpYDs5s2ozpWqgcXMbQGhUp9fmD6rWT993d2etU';

// Criar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Supabase conectado');

// Em localhost, usa as tabelas de teste (teste_ordens_servico / teste_tecnico_padrao)
// no mesmo projeto Supabase, para não misturar dados de teste com produção.
const AMBIENTE_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const PREFIXO_TABELA = AMBIENTE_LOCAL ? 'teste_' : '';

export const TABELA_ORDENS_SERVICO = `${PREFIXO_TABELA}ordens_servico`;
export const TABELA_TECNICO_PADRAO = `${PREFIXO_TABELA}tecnico_padrao`;

if (AMBIENTE_LOCAL) {
  console.log(`🧪 Ambiente local — usando tabelas de teste: ${TABELA_ORDENS_SERVICO}, ${TABELA_TECNICO_PADRAO}`);
}

// A autenticação (login real com e-mail/senha) é controlada por js/app.js,
// que escuta supabase.auth.onAuthStateChange e decide quando iniciar o app.

// IMPORTANTE: EXPORTAR PARA APP.JS
export default supabase;
