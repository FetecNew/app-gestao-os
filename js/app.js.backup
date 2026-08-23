// 🎯 APLICAÇÃO PRINCIPAL - Gestão de OS

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
  console.log('🚀 Iniciando aplicação...');
  await carregarOS();
  renderizar();
}

// ========== CARREGAR DADOS DO SUPABASE ==========
async function carregarOS() {
  try {
    console.log('📊 Carregando Ordens de Serviço...');
    
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao carregar:', error);
      exibirToast('Erro ao carregar dados', 'erro');
      return;
    }
    
    lista_os = data || [];
    console.log(`✅ ${lista_os.length} OS carregadas`);
  } catch (err) {
    console.error('❌ Erro:', err);
    exibirToast('Erro de conexão', 'erro');
  }
}

// ========== SALVAR OS (CREATE ou UPDATE) ==========
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
      exibirToast(`✅ OS #${novaOS.numero_os} atualizada!`);
    } else {
      // CRIAR NOVA
      const { error } = await supabase
        .from('ordens_servico')
        .insert([novaOS]);
      
      if (error) throw error;
      exibirToast(`✅ OS #${novaOS.numero_os} criada!`);
    }
    
    fecharModal();
    await carregarOS();
    renderizar();
  } catch (err) {
    console.error('❌ Erro ao salvar:', err);
    exibirToast('Erro ao salvar OS', 'erro');
  }
}

// ========== EXCLUIR OS ==========
async function excluirOS(id) {
  if (!confirm('⚠️ Tem certeza que deseja excluir esta OS?')) return;
  
  try {
    const { error } = await supabase
      .from('ordens_servico')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    exibirToast('✅ OS excluída!');
    await carregarOS();
    renderizar();
  } catch (err) {
    console.error('❌ Erro ao excluir:', err);
    exibirToast('Erro ao excluir OS', 'erro');
  }
}

// ========== VER DETALHES DA OS ==========
function verOS(id) {
  var lista = lista_os, os = null;
  for (var i = 0; i < lista.length; i++) { 
    if (lista[i].id === id) { 
      os = lista[i]; 
      break; 
    } 
  }
  if (!os) return;
  
  document.getElementById('tituloModal').textContent = 'OS #'+os.numero_os+' - Detalhes';
  document.getElementById('indiceEdicao').value = '-1';
  preencherForm(os);
  habilitarEdicao(false);
  
  document.querySelector('.form-actions').innerHTML = 
    '<button type="button" class="btn btn-warning" onclick="editarOS('+os.id+')">✏️ Editar</button>' +
    '<button type="button" class="btn btn-success" onclick="imprimirOS('+os.id+')">🖨️ Imprimir</button>' +
    '<button type="button" class="btn btn-danger" onclick="fecharModal()">Fechar</button>';
  
  document.getElementById('modalFundo').classList.add('active');
}

// ========== EDITAR OS ==========
function editarOS(id) {
  var lista = lista_os, idx = -1;
  for (var i = 0; i < lista.length; i++) { 
    if (lista[i].id === id) { 
      idx = i; 
      break; 
    } 
  }
  if (idx < 0) return;
  
  var os = lista[idx];
  document.getElementById('tituloModal').textContent = 'Editar OS #'+os.numero_os;
  document.getElementById('indiceEdicao').value = idx;
  preencherForm(os);
  habilitarEdicao(true);
  
  document.querySelector('.form-actions').innerHTML = 
    '<button type="button" class="btn btn-danger" onclick="fecharModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-success">Salvar Alterações</button>';
  
  document.getElementById('modalFundo').classList.add('active');
}

// ========== PREENCHER FORMULÁRIO ==========
function preencherForm(os) {
  document.getElementById('fNumeroOS').value = os.numero_os || '';
  document.getElementById('fData').value = os.data_abertura || '';
  document.getElementById('fCliente').value = os.cliente || '';
  document.getElementById('fTelefone').value = os.telefone || '';
  document.getElementById('fWhatsapp').value = os.whatsapp || '';
  document.getElementById('fEndereco').value = os.endereco || '';
  document.getElementById('fComplemento').value = os.complemento || '';
  document.getElementById('fCEP').value = os.cep || '';
  document.getElementById('fAparelho').value = os.aparelho || '';
  document.getElementById('fMarca').value = os.marca || '';
  document.getElementById('fModelo').value = os.modelo || '';
  document.getElementById('fDefeito').value = os.defeito || '';
  document.getElementById('fTecnico').value = os.tecnico || '';
  document.getElementById('fVS').value = os.valor_servico || 0;
  document.getElementById('fVP').value = os.valor_pecas || 0;
  document.getElementById('fStatus').value = os.status || 'Aberto';
  document.getElementById('fDC').value = os.data_conclusao || '';
  document.getElementById('fObs').value = os.observacoes || '';
}

// ========== HABILITAR/DESABILITAR EDIÇÃO ==========
function habilitarEdicao(habilitar) {
  const campos = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
  campos.forEach(campo => {
    campo.disabled = !habilitar;
  });
  document.getElementById('fNumeroOS').disabled = true; // Número sempre desabilitado
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
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #999;">Nenhuma OS encontrada</td></tr>';
    return;
  }
  
  // Preencher tabela
  filtrados.forEach(os => {
    const tr = document.createElement('tr');
    const statusClass = `status-${os.status.toLowerCase().replace(' ', '')}`;
    
    tr.innerHTML = `
      <td>${os.numero_os}</td>
      <td>${formatarData(os.data_abertura)}</td>
      <td>${os.cliente}</td>
      <td>${os.aparelho}</td>
      <td>${os.tecnico || '-'}</td>
      <td>${formatarMoeda(os.valor_servico + os.valor_pecas)}</td>
      <td><span class="status-badge ${statusClass}">${os.status}</span></td>
      <td style="display: flex; gap: 5px;">
        <button class="btn btn-sm btn-primary" onclick="verOS(${os.id})" title="Ver">👁️</button>
        <button class="btn btn-sm btn-warning" onclick="editarOS(${os.id})" title="Editar">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="excluirOS(${os.id})" title="Deletar">🗑️</button>
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
  const faturamento = lista_os.reduce((sum, o) => sum + (o.valor_servico + o.valor_pecas || 0), 0);
  
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
  habilitarEdicao(true);
  
  document.querySelector('.form-actions').innerHTML = 
    '<button type="button" class="btn btn-danger" onclick="fecharModal()">Cancelar</button>' +
    '<button type="submit" class="btn btn-success">Salvar</button>';
  
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

// ========== IMPRIMIR OS ==========
function imprimirOS(id) {
  var lista = lista_os, os = null;
  for (var i = 0; i < lista.length; i++) { 
    if (lista[i].id === id) { 
      os = lista[i]; 
      break; 
    } 
  }
  if (!os) return;
  
  var end = os.endereco ? '<p><strong>Endereço:</strong> ' + os.endereco + '</p>' : '';
  var comp = os.complemento ? '<p><strong>Complemento:</strong> ' + os.complemento + '</p>' : '';
  var cep = os.cep ? '<p><strong>CEP:</strong> ' + os.cep + '</p>' : '';
  
  var h='<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OS #'+os.numero_os+'</title>';
  h+='<style>body{font-family:Segoe UI,sans-serif;padding:20px;color:#222}h1{text-align:center;color:#1a237e;border-bottom:3px solid #1a237e;padding-bottom:12px;font-size:1.4em}.info{margin:16px 0}.info p{margin:6px 0}.footer{text-align:center;color:#999;font-size:.8em;border-top:1px solid #ddd;padding-top:12px;margin-top:24px}@media print{button{display:none}}</style></head><body>';
  h+='<h1>ORDEM DE SERVIÇO #'+os.numero_os+'</h1><p style="text-align:center">Assistência Técnica Linha Branca</p><div class="info">';
  h+='<p><strong>Cliente:</strong> '+(os.cliente||'-')+'</p>';
  h+='<p><strong>Telefone:</strong> '+(os.telefone||'-')+'</p>';
  h+=end+comp+cep;
  var ap=os.aparelho||'-';if(os.marca)ap+=' ('+os.marca+')';if(os.modelo)ap+=' '+os.modelo;
  h+='<p><strong>Aparelho:</strong> '+ap+'</p>';
  h+='<p><strong>Defeito:</strong> '+(os.defeito||'-')+'</p>';
  h+='<p><strong>Técnico:</strong> '+(os.tecnico||'-')+'</p>';
  h+='<p><strong>Status:</strong> '+os.status+'</p>';
  h+='<p><strong>Abertura:</strong> '+formatarData(os.data_abertura)+'</p>';
  if(os.data_conclusao)h+='<p><strong>Conclusão:</strong> '+formatarData(os.data_conclusao)+'</p>';
  h+='</div>';
  if(os.observacoes)h+='<hr><p><strong>Obs:</strong> '+os.observacoes+'</p>';
  h+='<div class="footer"><p>Gerado em '+new Date().toLocaleString('pt-BR')+'</p></div>';
  h+='</body></html>';
  
  var w=window.open('','_blank');
  w.document.write(h);
  w.document.close();
}

// ========== INICIALIZAR NA PÁGINA ==========
document.addEventListener('DOMContentLoaded', inicializar);

// ========== EXPORTAR PARA CSV ==========
function exportarCSV() {
  try {
    const os_list = lista_os;
    
    if (os_list.length === 0) {
      exibirToast('Nenhuma OS para exportar', 'erro');
      return;
    }
    
    // Cabeçalho
    const cabecalho = 'ID,Número,Data,Cliente,Aparelho,Status,Valor Total\n';
    
    // Linhas
    const linhas = os_list.map(os =>
      `${os.id},${os.numero_os},${os.data_abertura},${os.cliente},${os.aparelho},${os.status},${os.valor_servico + os.valor_pecas}`
    ).join('\n');
    
    // Criar blob
    const csv = '\uFEFF' + cabecalho + linhas;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    
    // Download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OS_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    exibirToast('✅ Arquivo exportado!');
    
  } catch (err) {
    console.error('Erro na exportação:', err);
    exibirToast('Erro ao exportar', 'erro');
  }
}

window.exportarCSV = exportarCSV;

// Exportar funções para uso no HTML
window.salvarOS = salvarOS;
window.excluirOS = excluirOS;
window.renderizar = renderizar;
window.abrirNovaOS = abrirNovaOS;
window.fecharModal = fecharModal;
window.verOS = verOS;
window.editarOS = editarOS;
window.imprimirOS = imprimirOS;
window.formatarMoeda = formatarMoeda;
window.formatarData = formatarData;