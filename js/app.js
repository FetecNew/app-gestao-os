import { supabase } from './supabase.js';
import { 
  formatarData, 
  formatarMoeda, 
  gerarNumeroOS, 
  validarFormulario,
  exibirToast 
} from './utils.js';

// ========== VARIÁVEIS GLOBAIS ==========
let lista_os = [];
let indice_edicao = -1;

// ========== INICIALIZAÇÃO ==========
async function inicializar() {
  console.log('Iniciando aplicação...');
  await carregarOS();
  renderizar();
  popularDatalists();
}

// ========== CARREGAR DADOS DO SUPABASE ==========
async function carregarOS() {
  try {
    console.log('Carregando Ordens de Serviço...');
    
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar:', error);
      exibirToast('Erro ao carregar dados', 'erro');
      return;
    }
    
    lista_os = data || [];
    console.log(`${lista_os.length} OS carregadas`);
  } catch (err) {
    console.error('Erro:', err);
    exibirToast('Erro de conexão', 'erro');
  }
}

// ========== SALVAR NOVA OS ==========
async function salvarOS() {
  const idx = document.getElementById('indiceEdicao').value;
  
  // Validar dados
  const dados = {
    cliente: document.getElementById('fCliente').value.trim(),
    aparelho: document.getElementById('fAparelho').value.trim(),
    defeito: document.getElementById('fDefeito').value.trim()
  };
  
  const erro = validarFormulario(dados);
  if (erro) {
    exibirToast(erro, 'erro');
    return;
  }
  
  // Preparar dados completos
  const novaOS = {
    numero_os: document.getElementById('fNumeroOS').value || gerarNumeroOS(),
    data_abertura: document.getElementById('fData').value,
    cliente: document.getElementById('fCliente').value.trim(),
    telefone: document.getElementById('fTelefone').value.trim(),
    whatsapp: document.getElementById('fWhatsapp').value.trim(),
    endereco: document.getElementById('fEndereco').value.trim(),
    complemento: document.getElementById('fComplemento').value.trim(),
    cep: document.getElementById('fCEP').value.trim(),
    aparelho: document.getElementById('fAparelho').value.trim(),
    marca: document.getElementById('fMarca').value.trim(),
    modelo: document.getElementById('fModelo').value.trim(),
    defeito: document.getElementById('fDefeito').value.trim(),
    tecnico: document.getElementById('fTecnico').value.trim(),
    valor_servico: parseFloat(document.getElementById('fVS').value) || 0,
    valor_pecas: parseFloat(document.getElementById('fVP').value) || 0,
    status: document.getElementById('fStatus').value,
    data_conclusao: document.getElementById('fDC').value || null,
    observacoes: document.getElementById('fObs').value.trim()
  };
  
  try {
    if (idx >= 0) {
      // ATUALIZAR
      const { error } = await supabase
        .from('ordens_servico')
        .update(novaOS)
        .eq('id', lista_os[idx].id);
      
      if (error) throw error;
      exibirToast(`OS #${novaOS.numero_os} atualizada!`);
    } else {
      // CRIAR NOVA
      const { error } = await supabase
        .from('ordens_servico')
        .insert([novaOS]);
      
      if (error) throw error;
      exibirToast(`OS #${novaOS.numero_os} criada!`);
    }
    
    fecharModal();
    await carregarOS();
    renderizar();
  } catch (err) {
    console.error('Erro ao salvar:', err);
    exibirToast('Erro ao salvar OS', 'erro');
  }
}

// ========== EXCLUIR OS ==========
async function excluirOS(id) {
  if (!confirm('Excluir esta OS?')) return;
  
  try {
    const { error } = await supabase
      .from('ordens_servico')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    exibirToast('OS excluída!');
    await carregarOS();
    renderizar();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    exibirToast('Erro ao excluir OS', 'erro');
  }
}

// ========== RENDERIZAR TABELA ==========
function renderizar() {
  const busca = document.getElementById('busca').value.toLowerCase();
  const filtroStatus = document.getElementById('filtroStatus').value;
  
  // Filtrar dados
  let filtrados = lista_os.filter(os => {
    const matchBusca = !busca || 
      os.cliente.toLowerCase().includes(busca) ||
      os.numero_os.includes(busca) ||
      os.aparelho.toLowerCase().includes(busca);
    
    const matchStatus = !filtroStatus || os.status === filtroStatus;
    
    return matchBusca && matchStatus;
  });
  
  // Atualizar estatísticas
  atualizarEstatisticas();
  
  // Limpar tabela
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';
  
  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma OS encontrada</td></tr>';
    return;
  }
  
  // Preencher tabela
  filtrados.forEach(os => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${os.numero_os}</td>
      <td>${formatarData(os.data_abertura)}</td>
      <td>${os.cliente}</td>
      <td>${os.aparelho}</td>
      <td>${os.tecnico || '-'}</td>
      <td>${formatarMoeda(os.valor_total || 0)}</td>
      <td><span class="status-badge status-${os.status.toLowerCase().replace(' ', '')}">${os.status}</span></td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary" onclick="verOS(${os.id})">👁️</button>
        <button class="btn btn-sm btn-warning" onclick="editarOS(${os.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="excluirOS(${os.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== ATUALIZAR ESTATÍSTICAS ==========
function atualizarEstatisticas() {
  const total = lista_os.length;
  const abertas = lista_os.filter(o => o.status === 'Aberto').length;
  const andamento = lista_os.filter(o => o.status === 'Em Andamento').length;
  const finalizadas = lista_os.filter(o => o.status === 'Finalizado').length;
  const entregues = lista_os.filter(o => o.status === 'Entregue').length;
  const faturamento = lista_os.reduce((sum, o) => sum + (o.valor_total || 0), 0);
  
  document.getElementById('sTotal').textContent = total;
  document.getElementById('sAbertas').textContent = abertas;
  document.getElementById('sAndamento').textContent = andamento;
  document.getElementById('sFinalizadas').textContent = finalizadas;
  document.getElementById('sEntregues').textContent = entregues;
  document.getElementById('sFaturamento').textContent = formatarMoeda(faturamento);
}

// ========== MODAIS ==========
function abrirNovaOS() {
  document.getElementById('tituloModal').textContent = 'Nova Ordem de Serviço';
  document.getElementById('indiceEdicao').value = '-1';
  document.getElementById('fNumeroOS').value = gerarNumeroOS();
  document.getElementById('fData').value = new Date().toISOString().split('T')[0];
  limparFormulario();
  popularDatalists();
  habilitarEdicao(true);
  document.getElementById('modalFundo').classList.add('active');
}

function fecharModal() {
  document.getElementById('modalFundo').classList.remove('active');
  limparFormulario();
}

function limparFormulario() {
  document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(el => {
    el.value = '';
  });
}

// ========== INICIALIZAR ==========
document.addEventListener('DOMContentLoaded', inicializar);

// Exportar funções para uso inline no HTML
window.salvarOS = salvarOS;
window.excluirOS = excluirOS;
window.renderizar = renderizar;
window.abrirNovaOS = abrirNovaOS;
window.fecharModal = fecharModal;
window.formatarMoeda = formatarMoeda;
window.formatarData = formatarData;