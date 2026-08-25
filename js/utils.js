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

// Formatar Telefone para Link do WhatsApp (adiciona DDI 55 se faltar)
export function formatarTelefoneWhatsApp(telefone) {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

// ========== MÁSCARAS (aplicadas conforme o usuário digita) ==========

// Máscara de Telefone: (00) 0000-0000 ou (00) 00000-0000
export function mascararTelefone(valor) {
  let digitos = (valor || '').replace(/\D/g, '').slice(0, 11);

  if (digitos.length <= 2) return digitos.replace(/^(\d*)/, '($1');
  if (digitos.length <= 6) return digitos.replace(/^(\d{2})(\d*)/, '($1) $2');
  if (digitos.length <= 10) {
    return digitos.replace(/^(\d{2})(\d{4})(\d*)/, '($1) $2-$3');
  }
  return digitos.replace(/^(\d{2})(\d{5})(\d*)/, '($1) $2-$3');
}

// Máscara de CEP: 00000-000
export function mascararCEP(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return digitos.replace(/^(\d{5})(\d*)/, '$1-$2');
}

// Máscara de Moeda: trata a digitação como centavos e formata em R$ 0,00
export function mascararMoeda(valor) {
  const digitos = (valor || '').replace(/\D/g, '');
  const numero = (parseInt(digitos || '0', 10)) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Converte um valor mascarado (ex: "R$ 1.234,56") de volta para número (1234.56)
export function desmascararMoeda(valor) {
  const digitos = (valor || '').replace(/\D/g, '');
  return (parseInt(digitos || '0', 10)) / 100;
}

// ========== CATÁLOGOS EDITÁVEIS (Aparelho, Marca, Campanha) ==========
// Persistidos no localStorage do navegador

const CATALOGOS_PADRAO = {
  catalogo_aparelhos: ['Geladeira', 'Fogão', 'Máquina de Lavar', 'Micro-ondas', 'Ar-condicionado', 'Freezer'],
  catalogo_marcas: ['Brastemp', 'Consul', 'Electrolux', 'LG', 'Samsung', 'Philco'],
  catalogo_campanhas: ['01', '02']
};

function obterCatalogo(chave) {
  try {
    const salvo = localStorage.getItem(chave);
    if (salvo) return JSON.parse(salvo);
  } catch {
    // ignora e usa padrão
  }
  return [...(CATALOGOS_PADRAO[chave] || [])];
}

function salvarCatalogo(chave, itens) {
  localStorage.setItem(chave, JSON.stringify(itens));
}

function adicionarItemCatalogo(chave, item) {
  const valor = (item || '').trim();
  if (!valor) return null;

  const itens = obterCatalogo(chave);
  const existente = itens.find(i => i.toLowerCase() === valor.toLowerCase());
  if (existente) return existente;

  itens.push(valor);
  salvarCatalogo(chave, itens);
  return valor;
}

export function obterAparelhos() {
  return obterCatalogo('catalogo_aparelhos');
}

export function adicionarAparelho(nome) {
  return adicionarItemCatalogo('catalogo_aparelhos', nome);
}

export function obterMarcas() {
  return obterCatalogo('catalogo_marcas');
}

export function adicionarMarca(nome) {
  return adicionarItemCatalogo('catalogo_marcas', nome);
}

export function obterCampanhas() {
  return obterCatalogo('catalogo_campanhas');
}

export function adicionarCampanha(nome) {
  return adicionarItemCatalogo('catalogo_campanhas', nome);
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