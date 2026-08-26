// 🎯 APLICAÇÃO PRINCIPAL - Gestão de OS (VERSÃO 2 ATUALIZADA)

import supabase, { TABELA_ORDENS_SERVICO, TABELA_TECNICO_PADRAO } from './supabase.js';
import {
  formatarData,
  formatarMoeda,
  gerarNumeroOS,
  validarFormulario,
  exibirToast,
  formatarTelefoneWhatsApp,
  normalizarTexto,
  escaparCSV,
  forcarTextoCSV,
  obterDataLocalISO,
  mascararTelefone,
  mascararCEP,
  mascararMoeda,
  desmascararMoeda,
  obterAparelhos,
  adicionarAparelho,
  obterMarcas,
  adicionarMarca,
  obterCampanhas,
  adicionarCampanha
} from './utils.js';

// Ícone oficial do WhatsApp (glifo da marca), em vez de emoji genérico de celular
const ICONE_WHATSAPP = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#25D366" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>`;

// ========== VARIÁVEIS GLOBAIS ==========
let lista_os = [];
let lista_filtrada_atual = [];
let indice_edicao = -1;
let tecnico_padrao = null;

// ========== COMBOS EDITÁVEIS (Aparelho, Marca, Campanha) ==========
function preencherSelect(id, itens, valorSelecionado) {
  const select = document.getElementById(id);
  const valorAtual = valorSelecionado !== undefined ? valorSelecionado : select.value;

  select.innerHTML = '<option value="">Selecione...</option>' +
    itens.map(item => `<option value="${item}">${item}</option>`).join('');

  if (valorAtual) select.value = valorAtual;
}

function atualizarCombos(valores = {}) {
  preencherSelect('fAparelho', obterAparelhos(), valores.aparelho);
  preencherSelect('fMarca', obterMarcas(), valores.marca);
  preencherSelect('fCampanha', obterCampanhas(), valores.campanha);
}

// ========== MODAL ADICIONAR ITEM (Aparelho/Marca/Campanha) ==========
const CONFIG_NOVO_ITEM = {
  aparelho: { titulo: '➕ Novo Aparelho', label: '🔧 Nome do Aparelho', obter: obterAparelhos, adicionar: adicionarAparelho, selectId: 'fAparelho' },
  marca: { titulo: '➕ Nova Marca', label: '🏷️ Nome da Marca', obter: obterMarcas, adicionar: adicionarMarca, selectId: 'fMarca' },
  campanha: { titulo: '➕ Nova Campanha', label: '📢 Nome/Código da Campanha', obter: obterCampanhas, adicionar: adicionarCampanha, selectId: 'fCampanha' }
};

function abrirModalNovoItem(tipo) {
  const config = CONFIG_NOVO_ITEM[tipo];
  document.getElementById('fNovoItemTipo').value = tipo;
  document.getElementById('tituloNovoItem').textContent = config.titulo;
  document.getElementById('labelNovoItem').textContent = config.label;
  document.getElementById('fNovoItemValor').value = '';
  document.getElementById('modalNovoItemFundo').classList.add('active');
  document.getElementById('fNovoItemValor').focus();
}

function fecharModalNovoItem() {
  document.getElementById('modalNovoItemFundo').classList.remove('active');
}

function confirmarNovoItem() {
  const tipo = document.getElementById('fNovoItemTipo').value;
  const config = CONFIG_NOVO_ITEM[tipo];
  const nome = document.getElementById('fNovoItemValor').value.trim();

  const salvo = config.adicionar(nome);
  if (salvo) preencherSelect(config.selectId, config.obter(), salvo);

  fecharModalNovoItem();
}

// ========== MODAL DE CONFIRMAÇÃO (genérico) ==========
let acaoConfirmar = null;

function abrirModalConfirmar(mensagem, aoConfirmar, tituloBotao = '🗑️ Excluir') {
  document.getElementById('mensagemConfirmar').textContent = mensagem;
  document.getElementById('btnConfirmarAcao').textContent = tituloBotao;
  acaoConfirmar = aoConfirmar;
  document.getElementById('modalConfirmarFundo').classList.add('active');
}

function fecharModalConfirmar() {
  document.getElementById('modalConfirmarFundo').classList.remove('active');
  acaoConfirmar = null;
}

function executarAcaoConfirmada() {
  const acao = acaoConfirmar;
  fecharModalConfirmar();
  if (acao) acao();
}

// ========== INICIALIZAÇÃO ==========
async function inicializar() {
  console.log('🚀 Iniciando aplicação v2...');
  await carregarOS();
  await carregarTecnicoPadrao();
  renderizar();
}

// ========== CARREGAR TÉCNICO PADRÃO ==========
async function carregarTecnicoPadrao() {
  try {
    const { data, error } = await supabase
      .from(TABELA_TECNICO_PADRAO)
      .select('*')
      .eq('eh_padrao', true)
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao carregar técnico:', error);
      return;
    }
    
    tecnico_padrao = data && data.length > 0 ? data[0] : null;
    console.log('✅ Técnico padrão carregado:', tecnico_padrao?.nome_tecnico);
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

// ========== CARREGAR DADOS DO SUPABASE ==========
async function carregarOS() {
  try {
    console.log('📊 Carregando Ordens de Serviço...');
    
    const { data, error } = await supabase
      .from(TABELA_ORDENS_SERVICO)
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
    aparelho: document.getElementById('fAparelho').value.trim()
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
    endereco: document.getElementById('fEndereco').value.trim(),
    complemento: document.getElementById('fComplemento').value.trim(),
    cep: document.getElementById('fCEP').value.trim(),
    aparelho: document.getElementById('fAparelho').value.trim(),
    marca: document.getElementById('fMarca').value.trim(),
    valor_servico: desmascararMoeda(document.getElementById('fVS').value) || 0,
    valor_pecas: desmascararMoeda(document.getElementById('fVP').value) || 0,
    periodo_visita: document.getElementById('fPeriodo').value || 'Manhã',
    campanha: document.getElementById('fCampanha').value || null,
    status: document.getElementById('fStatus').value,
    observacoes: document.getElementById('fObs').value.trim()
  };
  
  try {
    if (idx >= 0) {
      // ATUALIZAR
      const { error } = await supabase
        .from(TABELA_ORDENS_SERVICO)
        .update(novaOS)
        .eq('id', lista_os[idx].id);
      
      if (error) throw error;
      exibirToast(`✅ OS #${novaOS.numero_os} atualizada!`);
    } else {
      // CRIAR NOVA
      const { error } = await supabase
        .from(TABELA_ORDENS_SERVICO)
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
function excluirOS(id) {
  abrirModalConfirmar('⚠️ Tem certeza que deseja excluir esta OS? Essa ação não pode ser desfeita.', async () => {
    try {
      const { error } = await supabase
        .from(TABELA_ORDENS_SERVICO)
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
  });
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
  // Garante que os selects já tenham as opções (inclusive itens legados que
  // não estejam no catálogo) antes de atribuir o valor selecionado.
  if (os.aparelho) adicionarAparelho(os.aparelho);
  if (os.marca) adicionarMarca(os.marca);
  if (os.campanha) adicionarCampanha(os.campanha);
  atualizarCombos({ aparelho: os.aparelho, marca: os.marca, campanha: os.campanha });

  document.getElementById('fNumeroOS').value = os.numero_os || '';
  document.getElementById('fData').value = os.data_abertura || '';
  document.getElementById('fCliente').value = os.cliente || '';
  document.getElementById('fTelefone').value = mascararTelefone(os.telefone || '');
  document.getElementById('fEndereco').value = os.endereco || '';
  document.getElementById('fComplemento').value = os.complemento || '';
  document.getElementById('fCEP').value = mascararCEP(os.cep || '');
  document.getElementById('fVS').value = mascararMoeda(String(Math.round((os.valor_servico || 0) * 100)));
  document.getElementById('fVP').value = mascararMoeda(String(Math.round((os.valor_pecas || 0) * 100)));
  document.getElementById('fPeriodo').value = os.periodo_visita || 'Manhã';
  document.getElementById('fStatus').value = os.status || 'Visita';
  document.getElementById('fObs').value = os.observacoes || '';
}

// ========== HABILITAR/DESABILITAR EDIÇÃO ==========
function habilitarEdicao(habilitar) {
  const campos = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea, .form-group .btn-add');
  campos.forEach(campo => {
    campo.disabled = !habilitar;
  });
  document.getElementById('fNumeroOS').disabled = true; // Número sempre desabilitado
}

// ========== FILTRO DE DATA E ORDENAÇÃO DE COLUNAS ==========
// Ordenação genérica: funciona para qualquer coluna clicável (data, cliente, status)
let ordenacao = { campo: null, direcao: null }; // direcao: 'asc' | 'desc'

const ICONES_ORDENACAO = {
  data: 'iconeOrdenacaoData',
  cliente: 'iconeOrdenacaoCliente',
  status: 'iconeOrdenacaoStatus'
};

function limparFiltroData() {
  document.getElementById('filtroDataInicio').value = '';
  document.getElementById('filtroDataFim').value = '';
  renderizar();
}

function alternarOrdenacao(campo) {
  if (ordenacao.campo !== campo) {
    ordenacao = { campo, direcao: 'asc' };
  } else if (ordenacao.direcao === 'asc') {
    ordenacao.direcao = 'desc';
  } else {
    ordenacao = { campo: null, direcao: null };
  }

  Object.entries(ICONES_ORDENACAO).forEach(([nomeCampo, idIcone]) => {
    const icone = document.getElementById(idIcone);
    if (!icone) return;
    icone.textContent = ordenacao.campo !== nomeCampo
      ? '↕️'
      : ordenacao.direcao === 'asc' ? '▲' : '▼';
  });

  renderizar();
}

// ========== RENDERIZAR TABELA ==========
function renderizar() {
  // Múltiplos termos separados por vírgula = busca "OU" (ex: "visita, garantia")
  const termosBusca = document.getElementById('busca').value
    .split(',')
    .map(termo => normalizarTexto(termo).trim())
    .filter(termo => termo.length > 0);

  const dataInicio = document.getElementById('filtroDataInicio').value;
  const dataFim = document.getElementById('filtroDataFim').value;

  // Filtrar dados
  let filtrados = lista_os.filter(os => {
    // Busca inteligente: cliente, número da OS, aparelho, marca ou status (tolera acentos)
    const matchBusca = termosBusca.length === 0 || termosBusca.some(termo =>
      normalizarTexto(os.cliente).includes(termo) ||
      os.numero_os.includes(termo) ||
      normalizarTexto(os.aparelho).includes(termo) ||
      normalizarTexto(os.marca).includes(termo) ||
      normalizarTexto(os.status).includes(termo)
    );

    const matchDataInicio = !dataInicio || os.data_abertura >= dataInicio;
    const matchDataFim = !dataFim || os.data_abertura <= dataFim;

    return matchBusca && matchDataInicio && matchDataFim;
  });

  // Ordenar pela coluna escolhida pelo usuário (data, cliente ou status)
  if (ordenacao.campo) {
    filtrados.sort((a, b) => {
      let cmp;
      if (ordenacao.campo === 'data') {
        cmp = a.data_abertura.localeCompare(b.data_abertura);
      } else {
        cmp = a[ordenacao.campo].localeCompare(b[ordenacao.campo], 'pt-BR', { sensitivity: 'base' });
      }
      return ordenacao.direcao === 'asc' ? cmp : -cmp;
    });
  }

  // Guarda a lista filtrada/ordenada atual para o CSV exportar o que está na tela
  lista_filtrada_atual = filtrados;

  // Atualizar estatísticas (refletindo os filtros aplicados)
  atualizarEstatisticas(filtrados);

  // Limpar tabela
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '';
  
  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #999;">Nenhuma OS encontrada</td></tr>';
    return;
  }
  
  // Preencher tabela
  filtrados.forEach(os => {
    const tr = document.createElement('tr');
    const statusClass = `status-${os.status.toLowerCase().replace(' ', '')}`;
    
    // Definir ícone do período
    const iconePeriodo = os.periodo_visita === 'Manhã' ? '🌅' : '🌤️';
    
    tr.innerHTML = `
      <td>${os.numero_os}</td>
      <td>${formatarData(os.data_abertura)}</td>
      <td>${os.cliente}</td>
      <td>${os.aparelho}${os.marca ? ' (' + os.marca + ')' : ''}</td>
      <td>${formatarMoeda(os.valor_servico + os.valor_pecas)}</td>
      <td>${iconePeriodo} ${os.periodo_visita || '-'}</td>
      <td>${os.campanha ? 'Camp. ' + os.campanha : '-'}</td>
      <td><span class="status-badge ${statusClass}">${os.status}</span></td>
      <td style="display: flex; gap: 5px;">
        <button class="btn btn-sm btn-acao" onclick="verOS(${os.id})" title="Ver">👁️</button>
        <button class="btn btn-sm btn-acao" onclick="editarOS(${os.id})" title="Editar">✏️</button>
        <button class="btn btn-sm btn-acao" onclick="abrirModalWhatsapp(${os.id})" title="Enviar por WhatsApp">${ICONE_WHATSAPP}</button>
        <button class="btn btn-sm btn-acao btn-acao-excluir" onclick="excluirOS(${os.id})" title="Deletar">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== ATUALIZAR ESTATÍSTICAS ==========
function atualizarEstatisticas(lista = lista_os) {
  const total = lista.length;
  const visita = lista.filter(o => o.status === 'Visita').length;
  const garantia = lista.filter(o => o.status === 'Garantia').length;
  const aprovada = lista.filter(o => o.status === 'Aprovada').length;
  const desistencia = lista.filter(o => o.status === 'Desistência').length;
  const faturamento = lista.reduce((sum, o) => sum + (o.valor_servico + o.valor_pecas || 0), 0);
  
  document.getElementById('sTotal').textContent = total;
  document.getElementById('sVisita').textContent = visita;
  document.getElementById('sGarantia').textContent = garantia;
  document.getElementById('sAprovada').textContent = aprovada;
  document.getElementById('sDesistencia').textContent = desistencia;
  document.getElementById('sFaturamento').textContent = formatarMoeda(faturamento);
}

// ========== MODAIS ==========
function abrirNovaOS() {
  document.getElementById('tituloModal').textContent = 'Nova Ordem de Serviço';
  document.getElementById('indiceEdicao').value = '-1';
  atualizarCombos();
  limparFormulario();
  document.getElementById('fNumeroOS').value = gerarNumeroOS();
  document.getElementById('fData').value = obterDataLocalISO();
  document.getElementById('fPeriodo').value = 'Manhã';
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
  document.getElementById('fVS').value = mascararMoeda('0');
  document.getElementById('fVP').value = mascararMoeda('0');
  document.getElementById('fPeriodo').value = 'Manhã';
  document.getElementById('fStatus').value = 'Visita';
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
  var marca = os.marca ? ' (' + os.marca + ')' : '';
  
  var h='<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OS #'+os.numero_os+'</title>';
  h+='<style>body{font-family:Segoe UI,sans-serif;padding:20px;color:#222}h1{text-align:center;color:#1a237e;border-bottom:3px solid #1a237e;padding-bottom:12px;font-size:1.4em}.info{margin:16px 0}.info p{margin:6px 0}.footer{text-align:center;color:#999;font-size:.8em;border-top:1px solid #ddd;padding-top:12px;margin-top:24px}@media print{button{display:none}}</style></head><body>';
  h+='<h1>ORDEM DE SERVIÇO #'+os.numero_os+'</h1><p style="text-align:center">Assistência Técnica Linha Branca</p><div class="info">';
  h+='<p><strong>Cliente:</strong> '+(os.cliente||'-')+'</p>';
  h+='<p><strong>Telefone:</strong> '+(os.telefone||'-')+'</p>';
  h+=end+comp+cep;
  h+='<p><strong>Aparelho:</strong> '+(os.aparelho||'-')+marca+'</p>';
  h+='<p><strong>Status:</strong> '+os.status+'</p>';
  h+='<p><strong>Abertura:</strong> '+formatarData(os.data_abertura)+'</p>';
  if(os.periodo_visita)h+='<p><strong>Período da Visita:</strong> '+os.periodo_visita+'</p>';
  if(os.campanha)h+='<p><strong>Campanha:</strong> '+os.campanha+'</p>';
  h+='</div>';
  if(os.observacoes)h+='<hr><p><strong>Obs:</strong> '+os.observacoes+'</p>';
  h+='<div class="footer"><p>Gerado em '+new Date().toLocaleString('pt-BR')+'</p></div>';
  h+='</body></html>';
  
  var w=window.open('','_blank');
  w.document.write(h);
  w.document.close();
}

// ========== ENVIAR PELO WHATSAPP (MODAL ÚNICO) ==========
function abrirModalWhatsapp(id) {
  const os = lista_os.find(o => o.id === id);
  if (!os) return;

  document.getElementById('fWhatsappOsId').value = id;
  document.getElementById('fWhatsappNome').value = tecnico_padrao?.nome_tecnico || '';
  document.getElementById('fWhatsappTelefone').value = mascararTelefone(tecnico_padrao?.telefone_tecnico || '');
  document.getElementById('fWhatsappSalvarPadrao').checked = false;

  document.getElementById('modalWhatsappFundo').classList.add('active');
}

function fecharModalWhatsapp() {
  document.getElementById('modalWhatsappFundo').classList.remove('active');
}

async function confirmarEnvioWhatsapp() {
  const id = parseInt(document.getElementById('fWhatsappOsId').value, 10);
  const os = lista_os.find(o => o.id === id);
  if (!os) return;

  const nomeInput = document.getElementById('fWhatsappNome').value.trim();
  const telefoneInput = document.getElementById('fWhatsappTelefone').value.trim();
  const ehPadrao = document.getElementById('fWhatsappSalvarPadrao').checked;

  if (!nomeInput || !telefoneInput) {
    exibirToast('Preencha nome e telefone do técnico', 'erro');
    return;
  }

  if (ehPadrao) {
    await salvarTecnicoPadrao(nomeInput, telefoneInput);
  }

  // Montar mensagem WhatsApp
  const mensagem = `OS #${os.numero_os} - ${os.status}

Cliente: ${os.cliente}
Telefone: ${os.telefone || 'N/A'}
Aparelho: ${os.aparelho}${os.marca ? ' (' + os.marca + ')' : ''}
Endereço: ${os.endereco || 'N/A'}
${os.complemento ? 'Complemento: ' + os.complemento + '\n' : ''}CEP: ${os.cep || 'N/A'}
Período: ${os.periodo_visita || 'N/A'}
${os.campanha ? 'Campanha: ' + os.campanha + '\n' : ''}${os.observacoes ? '\nObservações: ' + os.observacoes : ''}`;

  // Abrir WhatsApp Web sempre na mesma aba (reaproveita se já estiver aberta)
  const mensagemCodificada = encodeURIComponent(mensagem);
  const telefoneDestino = formatarTelefoneWhatsApp(telefoneInput);
  const url = telefoneDestino
    ? `https://wa.me/${telefoneDestino}?text=${mensagemCodificada}`
    : `https://web.whatsapp.com/send?text=${mensagemCodificada}`;

  window.open(url, 'whatsappWebOS');
  fecharModalWhatsapp();
  exibirToast('✅ Abrindo WhatsApp...');
}

// ========== SALVAR TÉCNICO PADRÃO ==========
async function salvarTecnicoPadrao(nome, telefone) {
  try {
    // Se já existe um padrão, delete primeiro
    if (tecnico_padrao) {
      await supabase
        .from(TABELA_TECNICO_PADRAO)
        .delete()
        .eq('id', tecnico_padrao.id);
    }
    
    // Inserir novo
    const { data, error } = await supabase
      .from(TABELA_TECNICO_PADRAO)
      .insert([{
        nome_tecnico: nome,
        telefone_tecnico: telefone,
        eh_padrao: true
      }])
      .select();

    if (error) throw error;
    
    tecnico_padrao = data[0];
    console.log('✅ Técnico padrão salvo:', nome);
  } catch (err) {
    console.error('❌ Erro ao salvar técnico:', err);
  }
}

// ========== EXPORTAR PARA CSV ==========
function exportarCSV() {
  try {
    // Exporta exatamente o que está filtrado/visível na tela, não a lista inteira
    const os_list = lista_filtrada_atual;

    if (os_list.length === 0) {
      exibirToast('Nenhuma OS para exportar', 'erro');
      return;
    }

    const colunas = [
      'ID', 'Número OS', 'Data', 'Cliente', 'Telefone', 'Endereço', 'Complemento', 'CEP',
      'Aparelho', 'Marca', 'Valor Serviço', 'Valor Peças', 'Valor Total',
      'Período', 'Campanha', 'Status', 'Observações'
    ];
    const cabecalho = colunas.join(',') + '\n';

    // Linhas (cada campo é escapado para não quebrar o CSV com vírgulas/aspas/quebras de linha;
    // Número OS usa forcarTextoCSV para não virar notação científica no Excel)
    const linhas = os_list.map(os => [
      escaparCSV(os.id),
      forcarTextoCSV(os.numero_os),
      escaparCSV(formatarData(os.data_abertura)),
      escaparCSV(os.cliente),
      escaparCSV(os.telefone || ''),
      escaparCSV(os.endereco || ''),
      escaparCSV(os.complemento || ''),
      escaparCSV(os.cep || ''),
      escaparCSV(os.aparelho),
      escaparCSV(os.marca || ''),
      escaparCSV(os.valor_servico),
      escaparCSV(os.valor_pecas),
      escaparCSV(os.valor_servico + os.valor_pecas),
      escaparCSV(os.periodo_visita || ''),
      escaparCSV(os.campanha || ''),
      escaparCSV(os.status),
      escaparCSV(os.observacoes || '')
    ].join(',')).join('\n');

    // Criar blob
    const csv = '\uFEFF' + cabecalho + linhas;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    
    // Download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OS_${obterDataLocalISO()}.csv`;
    link.click();
    
    exibirToast('✅ Arquivo exportado!');
    
  } catch (err) {
    console.error('Erro na exportação:', err);
    exibirToast('Erro ao exportar', 'erro');
  }
}

// ========== INICIALIZAR NA PÁGINA ==========
document.addEventListener('DOMContentLoaded', inicializar);

// Exportar funções para uso no HTML
window.salvarOS = salvarOS;
window.excluirOS = excluirOS;
window.renderizar = renderizar;
window.abrirNovaOS = abrirNovaOS;
window.fecharModal = fecharModal;
window.verOS = verOS;
window.editarOS = editarOS;
window.imprimirOS = imprimirOS;
window.exportarCSV = exportarCSV;
window.formatarMoeda = formatarMoeda;
window.formatarData = formatarData;
window.limparFiltroData = limparFiltroData;
window.alternarOrdenacao = alternarOrdenacao;

// WhatsApp (modal único)
window.abrirModalWhatsapp = abrirModalWhatsapp;
window.fecharModalWhatsapp = fecharModalWhatsapp;
window.confirmarEnvioWhatsapp = confirmarEnvioWhatsapp;

// Combos editáveis (Aparelho, Marca, Campanha)
window.abrirModalNovoItem = abrirModalNovoItem;
window.fecharModalNovoItem = fecharModalNovoItem;
window.confirmarNovoItem = confirmarNovoItem;

// Confirmação (genérico)
window.fecharModalConfirmar = fecharModalConfirmar;
window.executarAcaoConfirmada = executarAcaoConfirmada;

// Máscaras (usadas via oninput no HTML)
window.mascararTelefone = mascararTelefone;
window.mascararCEP = mascararCEP;
window.mascararMoeda = mascararMoeda;
