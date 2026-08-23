// 🛠️ Funções Utilitárias

// Formatação de Data
export function formatarData(data) {
  if (!data) return '-';
  
  try {
    const d = new Date(data);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return data;
  }
}

// Formatação de Moeda
export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
}

// Gerar Número OS Único
export function gerarNumeroOS() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const aleatorio = String(Math.random()).slice(2, 7);
  
  return `${ano}${mes}${dia}${aleatorio}`;
}

// Validar Dados do Formulário
export function validarFormulario(dados) {
  const erros = [];
  
  if (!dados.cliente?.trim()) {
    erros.push('Cliente é obrigatório');
  }
  
  if (!dados.aparelho?.trim()) {
    erros.push('Aparelho é obrigatório');
  }
  
  if (!dados.defeito?.trim()) {
    erros.push('Defeito é obrigatório');
  }
  
  if (dados.valor_servico < 0) {
    erros.push('Valor de serviço não pode ser negativo');
  }
  
  if (dados.valor_pecas < 0) {
    erros.push('Valor de peças não pode ser negativo');
  }
  
  return erros.length > 0 ? erros[0] : null;
}

// Exibir Notificação
export function exibirToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  
  if (!toast) {
    console.warn('Elemento #toast não encontrado');
    return;
  }
  
  toast.textContent = mensagem;
  toast.className = `toast ${tipo === 'erro' ? 'error' : 'success'}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Copiar para Área de Transferência
export function copiarParaClipboard(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    exibirToast('Copiado para clipboard!');
  }).catch(() => {
    exibirToast('Erro ao copiar', 'erro');
  });
}

// Verificar Conexão Supabase
export async function verificarConexao(supabase) {
  try {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('count(*)', { count: 'exact' })
      .limit(1);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro de conexão:', err);
    return false;
  }
}