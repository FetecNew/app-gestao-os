// 🎯 APLICAÇÃO PRINCIPAL - Gestão de OS (VERSÃO 2 ATUALIZADA)

import supabase, {
  TABELA_ORDENS_SERVICO,
  TABELA_ORDENS_SERVICO_LEITURA,
  TABELA_TECNICO_PADRAO,
  TABELA_CATALOGOS,
  TABELA_CONFIG_EMPRESA
} from './supabase.js';
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
  desmascararMoeda
} from './utils.js';

// Ícone oficial do WhatsApp (glifo da marca), em vez de emoji genérico de celular
const ICONE_WHATSAPP = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#25D366" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>`;

// ========== VARIÁVEIS GLOBAIS ==========
let lista_os = [];
let lista_filtrada_atual = [];
let indice_edicao = -1;
let tecnico_padrao = null;
let ehAdminAtual = false; // define visibilidade de valores/menus restritos a administradores

// ========== CATÁLOGOS (Aparelho, Marca, Campanha) ==========
// Centralizados no banco (tabela catalogos) e compartilhados entre todos os
// usuários — antes viviam separadamente no localStorage de cada navegador.
let catalogoAparelhos = [];
let catalogoMarcas = [];
let catalogoCampanhas = [];

// ========== DADOS DA EMPRESA ==========
// Config editável só por administradores (tela Administração), lida por
// todos os usuários autenticados. Objeto abaixo traz os valores padrão até
// a config carregar do banco.
let configEmpresa = {
  nome_empresa: 'FETEC',
  subtitulo: 'Assistência Técnica',
  telefone_contato: '',
  whatsapp_contato: '',
  endereco: ''
};

function obterCatalogo(tipo) {
  if (tipo === 'aparelho') return catalogoAparelhos;
  if (tipo === 'marca') return catalogoMarcas;
  return catalogoCampanhas;
}

function estaNoCatalogo(tipo, valor) {
  return obterCatalogo(tipo).some(i => i.toLowerCase() === valor.toLowerCase());
}

function adicionarNoCatalogoLocal(tipo, valor) {
  const itens = obterCatalogo(tipo);
  itens.push(valor);
  itens.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

async function carregarCatalogos() {
  try {
    const { data, error } = await supabase
      .from(TABELA_CATALOGOS)
      .select('tipo, valor')
      .order('valor', { ascending: true });

    if (error) throw error;

    catalogoAparelhos = (data || []).filter(i => i.tipo === 'aparelho').map(i => i.valor);
    catalogoMarcas = (data || []).filter(i => i.tipo === 'marca').map(i => i.valor);
    catalogoCampanhas = (data || []).filter(i => i.tipo === 'campanha').map(i => i.valor);
  } catch (err) {
    console.error('❌ Erro ao carregar catálogos:', err);
  }
}

// Grava um item novo no banco (usado tanto pelo "+" do formulário de OS
// quanto pela tela de Administração). Ignora erro de duplicado (23505),
// pois o item já existe para outro usuário/aba.
async function persistirItemCatalogo(tipo, valor) {
  const { error } = await supabase.from(TABELA_CATALOGOS).insert([{ tipo, valor }]);
  if (error && error.code !== '23505') {
    console.error('❌ Erro ao salvar item de catálogo:', error);
    exibirToast('Erro ao salvar item de catálogo', 'erro');
  }
}

// Garante que um valor legado/customizado de uma OS já existente apareça
// selecionado no combo mesmo que ainda não esteja no catálogo — sem travar
// a UI (persiste em segundo plano).
function garantirOpcaoCombo(tipo, valor) {
  if (!valor || estaNoCatalogo(tipo, valor)) return;
  adicionarNoCatalogoLocal(tipo, valor);
  persistirItemCatalogo(tipo, valor);
}

// ========== COMBOS EDITÁVEIS (Aparelho, Marca, Campanha) ==========
function preencherSelect(id, itens, valorSelecionado) {
  const select = document.getElementById(id);
  const valorAtual = valorSelecionado !== undefined ? valorSelecionado : select.value;

  select.innerHTML = '<option value="">Selecione...</option>' +
    itens.map(item => `<option value="${item}">${item}</option>`).join('');

  if (valorAtual) select.value = valorAtual;
}

function atualizarCombos(valores = {}) {
  preencherSelect('fAparelho', catalogoAparelhos, valores.aparelho);
  preencherSelect('fMarca', catalogoMarcas, valores.marca);
  preencherSelect('fCampanha', catalogoCampanhas, valores.campanha);
}

// ========== MODAL ADICIONAR ITEM (Aparelho/Marca/Campanha) ==========
const CONFIG_NOVO_ITEM = {
  aparelho: { titulo: '➕ Novo Aparelho', label: '🔧 Nome do Aparelho', selectId: 'fAparelho' },
  marca: { titulo: '➕ Nova Marca', label: '🏷️ Nome da Marca', selectId: 'fMarca' },
  campanha: { titulo: '➕ Nova Campanha', label: '📢 Nome/Código da Campanha', selectId: 'fCampanha' }
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

async function confirmarNovoItem() {
  const tipo = document.getElementById('fNovoItemTipo').value;
  const config = CONFIG_NOVO_ITEM[tipo];
  const nome = document.getElementById('fNovoItemValor').value.trim();

  if (nome && !estaNoCatalogo(tipo, nome)) {
    adicionarNoCatalogoLocal(tipo, nome);
    await persistirItemCatalogo(tipo, nome);
  }
  if (nome) preencherSelect(config.selectId, obterCatalogo(tipo), nome);

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
  atualizarIconeTema(document.documentElement.getAttribute('data-theme') || 'dark');
  await Promise.all([
    carregarOS(),
    carregarTecnicoPadrao(),
    carregarCatalogos(),
    carregarConfigEmpresa()
  ]);
  renderizar();
}

// ========== LOGIN / LOGOUT ==========
let appJaIniciado = false;

function mostrarApp() {
  document.getElementById('telaLogin').style.display = 'none';
  document.getElementById('appPrincipal').style.display = 'block';
}

function mostrarLogin() {
  document.getElementById('appPrincipal').style.display = 'none';
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('loginSenha').value = '';
  mostrarBlocoLogin();
}

// ---- Alternância entre os 3 estados da tela de login ----
function mostrarBlocoLogin() {
  document.getElementById('blocoLogin').style.display = 'block';
  document.getElementById('blocoEsqueciSenha').style.display = 'none';
  document.getElementById('blocoNovaSenhaRecuperacao').style.display = 'none';
}

function mostrarEsqueciSenha() {
  document.getElementById('blocoLogin').style.display = 'none';
  document.getElementById('blocoEsqueciSenha').style.display = 'block';
  document.getElementById('recuperarEmail').value = document.getElementById('loginEmail').value;
  limparErroRecuperar();
  document.getElementById('recuperarSucesso').classList.remove('show');
}

function mostrarTelaRedefinirSenha() {
  document.getElementById('appPrincipal').style.display = 'none';
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('blocoLogin').style.display = 'none';
  document.getElementById('blocoEsqueciSenha').style.display = 'none';
  document.getElementById('blocoNovaSenhaRecuperacao').style.display = 'block';
}

function exibirErroRecuperar(mensagem) {
  const erroEl = document.getElementById('recuperarErro');
  erroEl.textContent = mensagem;
  erroEl.classList.add('show');
}

function limparErroRecuperar() {
  const erroEl = document.getElementById('recuperarErro');
  erroEl.textContent = '';
  erroEl.classList.remove('show');
}

async function confirmarEsqueciSenha() {
  const email = document.getElementById('recuperarEmail').value.trim();
  const botao = document.getElementById('btnRecuperarSenha');

  limparErroRecuperar();
  document.getElementById('recuperarSucesso').classList.remove('show');
  botao.disabled = true;
  botao.textContent = 'Enviando...';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) console.error('Erro ao solicitar recuperação:', error);

    // Sempre mostra sucesso, exista ou não o e-mail (evita expor quais e-mails estão cadastrados)
    const sucessoEl = document.getElementById('recuperarSucesso');
    sucessoEl.textContent = '✅ Se esse e-mail estiver cadastrado, você receberá um link de recuperação em instantes.';
    sucessoEl.classList.add('show');
  } catch (err) {
    console.error('❌ Erro ao solicitar recuperação:', err);
    exibirErroRecuperar('Erro de conexão. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar link';
  }
}

async function confirmarNovaSenhaRecuperacao() {
  const novaSenha = document.getElementById('recuperarNovaSenha').value;
  const confirmarSenha = document.getElementById('recuperarConfirmarSenha').value;
  const botao = document.getElementById('btnDefinirNovaSenha');
  const erroEl = document.getElementById('recuperarNovaSenhaErro');

  erroEl.textContent = '';
  erroEl.classList.remove('show');

  if (novaSenha !== confirmarSenha) {
    erroEl.textContent = 'As senhas não coincidem.';
    erroEl.classList.add('show');
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw error;

    exibirToast('✅ Senha redefinida com sucesso!');

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      atualizarInfoUsuarioLogado(session.user);
      mostrarApp();
      if (!appJaIniciado) {
        appJaIniciado = true;
        inicializar();
      }
    } else {
      mostrarLogin();
    }
  } catch (err) {
    console.error('❌ Erro ao redefinir senha:', err);
    erroEl.textContent = 'Erro ao redefinir senha. Tente novamente.';
    erroEl.classList.add('show');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar nova senha';
  }
}

function exibirErroLogin(mensagem) {
  const erroEl = document.getElementById('loginErro');
  erroEl.textContent = mensagem;
  erroEl.classList.add('show');
}

function limparErroLogin() {
  const erroEl = document.getElementById('loginErro');
  erroEl.textContent = '';
  erroEl.classList.remove('show');
}

async function fazerLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const botao = document.getElementById('btnFazerLogin');

  limparErroLogin();
  botao.disabled = true;
  botao.textContent = 'Entrando...';

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      exibirErroLogin('E-mail ou senha inválidos.');
    }
    // Sucesso: onAuthStateChange cuida de mostrar o app e carregar os dados.
  } catch (err) {
    console.error('❌ Erro ao fazer login:', err);
    exibirErroLogin('Erro de conexão. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
}

async function fazerLogout() {
  await supabase.auth.signOut();
  // onAuthStateChange cuida de mostrar a tela de login.
}

// Reage a login/logout, ao clique no link de recuperação de senha por e-mail,
// e ao estado inicial da sessão ao carregar a página.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    mostrarTelaRedefinirSenha();
    return;
  }

  if (session) {
    atualizarInfoUsuarioLogado(session.user);
    if (!appJaIniciado) {
      appJaIniciado = true;
      mostrarApp();
      inicializar();
    }
  } else {
    appJaIniciado = false;
    mostrarLogin();
  }
});

// ========== TROCAR SENHA ==========
function abrirModalSenha() {
  document.getElementById('senhaAtual').value = '';
  document.getElementById('novaSenha').value = '';
  document.getElementById('confirmarNovaSenha').value = '';
  limparErroSenha();
  document.getElementById('modalSenhaFundo').classList.add('active');
}

function fecharModalSenha() {
  document.getElementById('modalSenhaFundo').classList.remove('active');
}

function exibirErroSenha(mensagem) {
  const erroEl = document.getElementById('senhaErro');
  erroEl.textContent = mensagem;
  erroEl.classList.add('show');
}

function limparErroSenha() {
  const erroEl = document.getElementById('senhaErro');
  erroEl.textContent = '';
  erroEl.classList.remove('show');
}

async function confirmarTrocaSenha() {
  const senhaAtual = document.getElementById('senhaAtual').value;
  const novaSenha = document.getElementById('novaSenha').value;
  const confirmarNova = document.getElementById('confirmarNovaSenha').value;
  const botao = document.getElementById('btnSalvarSenha');

  limparErroSenha();

  if (novaSenha !== confirmarNova) {
    exibirErroSenha('As senhas novas não coincidem.');
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão inválida.');

    // Reautentica com a senha atual antes de trocar (evita troca sem saber a senha antiga)
    const { error: erroReauth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: senhaAtual
    });
    if (erroReauth) {
      exibirErroSenha('Senha atual incorreta.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw error;

    fecharModalSenha();
    exibirToast('✅ Senha alterada com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao trocar senha:', err);
    exibirErroSenha('Erro ao trocar senha. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = '✓ Salvar';
  }
}

// ========== CADASTRAR NOVO USUÁRIO ==========
function abrirModalNovoUsuario() {
  document.getElementById('novoUsuarioNome').value = '';
  document.getElementById('novoUsuarioEmail').value = '';
  document.getElementById('novoUsuarioSenha').value = '';
  document.getElementById('novoUsuarioPerfil').value = 'tecnico';
  limparErroNovoUsuario();
  document.getElementById('modalNovoUsuarioFundo').classList.add('active');
}

function fecharModalNovoUsuario() {
  document.getElementById('modalNovoUsuarioFundo').classList.remove('active');
}

function exibirErroNovoUsuario(mensagem) {
  const erroEl = document.getElementById('novoUsuarioErro');
  erroEl.textContent = mensagem;
  erroEl.classList.add('show');
}

function limparErroNovoUsuario() {
  const erroEl = document.getElementById('novoUsuarioErro');
  erroEl.textContent = '';
  erroEl.classList.remove('show');
}

async function confirmarNovoUsuario() {
  const nome = document.getElementById('novoUsuarioNome').value.trim();
  const email = document.getElementById('novoUsuarioEmail').value.trim();
  const senha = document.getElementById('novoUsuarioSenha').value;
  const perfil = document.getElementById('novoUsuarioPerfil').value;
  const botao = document.getElementById('btnCriarUsuario');

  limparErroNovoUsuario();
  botao.disabled = true;
  botao.textContent = 'Cadastrando...';

  try {
    const { data, error } = await supabase.functions.invoke('criar-usuario', {
      body: { nome, email, password: senha, perfil }
    });

    // supabase.functions.invoke não lança para respostas 4xx/5xx: o corpo de erro
    // vem em `data` (nossa function sempre responde JSON) ou em `error` (falha de rede).
    if (error || data?.error) {
      exibirErroNovoUsuario(data?.error || 'Erro ao cadastrar usuário.');
      return;
    }

    fecharModalNovoUsuario();
    exibirToast(`✅ Usuário ${nome} cadastrado!`);
    carregarUsuarios();
  } catch (err) {
    console.error('❌ Erro ao cadastrar usuário:', err);
    exibirErroNovoUsuario('Erro de conexão. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = '✓ Cadastrar';
  }
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

// ========== DADOS DA EMPRESA ==========
async function carregarConfigEmpresa() {
  try {
    const { data, error } = await supabase
      .from(TABELA_CONFIG_EMPRESA)
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    if (data) configEmpresa = data;

    aplicarConfigEmpresaNaUI();
  } catch (err) {
    console.error('❌ Erro ao carregar dados da empresa:', err);
  }
}

// Aplica nome/subtítulo configurados no título da página e no texto da logo,
// mantendo "FETEC" / "Assistência Técnica" como visual padrão se vazio.
function aplicarConfigEmpresaNaUI() {
  const nome = configEmpresa.nome_empresa || 'FETEC';
  const subtitulo = configEmpresa.subtitulo || 'Assistência Técnica';

  document.title = `Gestão de OS ${nome} - ${subtitulo}`;

  const textoLogo = document.querySelector('.logo-fetec .fetec-text');
  const textoSubtitulo = document.querySelector('.logo-fetec .fetec-subtitle');
  if (textoLogo) textoLogo.textContent = nome;
  if (textoSubtitulo) textoSubtitulo.textContent = subtitulo.toUpperCase();
}

async function salvarConfigEmpresa() {
  const dados = {
    nome_empresa: document.getElementById('cfgNomeEmpresa').value.trim() || 'FETEC',
    subtitulo: document.getElementById('cfgSubtitulo').value.trim() || 'Assistência Técnica',
    telefone_contato: document.getElementById('cfgTelefone').value.trim(),
    whatsapp_contato: document.getElementById('cfgWhatsapp').value.trim(),
    endereco: document.getElementById('cfgEndereco').value.trim()
  };

  try {
    const { error } = await supabase
      .from(TABELA_CONFIG_EMPRESA)
      .update(dados)
      .eq('id', 1);

    if (error) throw error;

    configEmpresa = { ...configEmpresa, ...dados };
    aplicarConfigEmpresaNaUI();
    exibirToast('✅ Dados da empresa atualizados!');
  } catch (err) {
    console.error('❌ Erro ao salvar dados da empresa:', err);
    exibirToast('Erro ao salvar dados da empresa', 'erro');
  }
}

// ========== CARREGAR DADOS DO SUPABASE ==========
async function carregarOS() {
  try {
    console.log('📊 Carregando Ordens de Serviço...');
    
    // Lê pela view de leitura: valor_servico/valor_pecas vêm mascarados (null) para
    // quem não é administrador — mascaramento feito no banco, não só na UI.
    const { data, error } = await supabase
      .from(TABELA_ORDENS_SERVICO_LEITURA)
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
  garantirOpcaoCombo('aparelho', os.aparelho);
  garantirOpcaoCombo('marca', os.marca);
  garantirOpcaoCombo('campanha', os.campanha);
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
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #999;">Nenhuma OS encontrada</td></tr>';
    return;
  }

  // Preencher tabela
  filtrados.forEach(os => {
    const tr = document.createElement('tr');
    const statusClass = `status-${os.status.toLowerCase().replace(' ', '')}`;
    if (os.atendido) tr.classList.add('os-atendida');

    // Definir ícone do período
    const iconePeriodo = os.periodo_visita === 'Manhã' ? '🌅' : '🌤️';

    tr.innerHTML = `
      <td>${os.numero_os}</td>
      <td>${formatarData(os.data_abertura)}</td>
      <td>${os.cliente}</td>
      <td>${os.aparelho}${os.marca ? ' (' + os.marca + ')' : ''}</td>
      <td class="somente-admin">${formatarMoeda(os.valor_servico + os.valor_pecas)}</td>
      <td>${iconePeriodo} ${os.periodo_visita || '-'}</td>
      <td>${os.campanha ? 'Camp. ' + os.campanha : '-'}</td>
      <td><span class="status-badge ${statusClass}">${os.status}</span></td>
      <td style="text-align: center;">
        <input type="checkbox" class="checkbox-atendido" ${os.atendido ? 'checked' : ''} onchange="marcarAtendido(${os.id}, this.checked)" title="Marcar como atendida">
      </td>
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

// ========== MARCAR OS COMO ATENDIDA ==========
async function marcarAtendido(id, valor) {
  try {
    const { error } = await supabase
      .from(TABELA_ORDENS_SERVICO)
      .update({ atendido: valor })
      .eq('id', id);

    if (error) throw error;

    const os = lista_os.find(o => o.id === id);
    if (os) os.atendido = valor;

    renderizar();
  } catch (err) {
    console.error('❌ Erro ao marcar atendida:', err);
    exibirToast('Erro ao atualizar', 'erro');
    renderizar(); // desfaz o estado visual do checkbox
  }
}

// ========== TEMA CLARO/ESCURO ==========
function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') || 'dark';
  const novo = atual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', novo);
  localStorage.setItem('tema', novo);
  atualizarIconeTema(novo);
}

function atualizarIconeTema(tema) {
  const btn = document.getElementById('btnAlternarTema');
  if (btn) btn.textContent = tema === 'dark' ? '☀️' : '🌙';
}

// ========== MENU DE USUÁRIO ==========
function alternarMenuUsuario() {
  document.getElementById('dropdownUsuario').classList.toggle('active');
}

function fecharMenuUsuario() {
  document.getElementById('dropdownUsuario').classList.remove('active');
}

// Fecha o menu ao clicar fora dele
document.addEventListener('click', (evento) => {
  const menu = document.querySelector('.menu-usuario');
  if (menu && !menu.contains(evento.target)) {
    fecharMenuUsuario();
  }
});

function atualizarInfoUsuarioLogado(user) {
  if (!user) return;

  const nome = user.user_metadata?.nome || user.email;

  document.getElementById('emailUsuarioLogado').textContent = nome;
  document.getElementById('dropdownUsuarioNome').textContent = nome;
  document.getElementById('dropdownUsuarioEmail').textContent = user.email;

  if (user.created_at) {
    document.getElementById('dropdownUsuarioCriadoEm').textContent =
      `Conta criada em ${formatarData(user.created_at.slice(0, 10))}`;
  }

  // Elementos com a classe "somente-admin" (menus de Usuários/Relatórios/
  // Administração, valores da OS e faturamento) só aparecem para administradores.
  ehAdminAtual = user.user_metadata?.perfil === 'admin';
  document.body.classList.toggle('perfil-tecnico', !ehAdminAtual);

  // Se um técnico estiver (ou cair) numa seção restrita, volta para a tela principal
  const secaoAtual = SECOES.find(s => document.getElementById(`secao${s.charAt(0).toUpperCase()}${s.slice(1)}`)?.style.display !== 'none');
  if (!ehAdminAtual && secaoAtual && secaoAtual !== 'os') {
    mostrarSecao('os');
  }
}

// ========== MENU PRINCIPAL (navegação de seções) ==========
const SECOES = ['os', 'usuarios', 'relatorios', 'admin'];
let usuariosJaCarregados = false;

function mostrarSecao(nome) {
  SECOES.forEach(secao => {
    const el = document.getElementById(`secao${secao.charAt(0).toUpperCase()}${secao.slice(1)}`);
    if (el) el.style.display = secao === nome ? 'block' : 'none';
  });

  document.querySelectorAll('.menu-item').forEach((btn, indice) => {
    btn.classList.toggle('active', SECOES[indice] === nome);
  });

  if (nome === 'usuarios' && !usuariosJaCarregados) {
    usuariosJaCarregados = true;
    carregarUsuarios();
  }
  if (nome === 'relatorios') renderizarRelatorios();
  if (nome === 'admin') renderizarAdmin();
}

// ========== SEÇÃO RELATÓRIOS ==========
function obterOSNoPeriodoRelatorio() {
  const inicio = document.getElementById('relFiltroInicio')?.value || '';
  const fim = document.getElementById('relFiltroFim')?.value || '';

  return lista_os.filter(os => {
    if (inicio && os.data_abertura < inicio) return false;
    if (fim && os.data_abertura > fim) return false;
    return true;
  });
}

function limparFiltroRelatorio() {
  document.getElementById('relFiltroInicio').value = '';
  document.getElementById('relFiltroFim').value = '';
  renderizarRelatorios();
}

function agruparRelatorio(lista, chaveDe) {
  const grupos = {};
  lista.forEach(os => {
    const chave = chaveDe(os);
    if (!grupos[chave]) grupos[chave] = { qtd: 0, total: 0 };
    grupos[chave].qtd++;
    grupos[chave].total += (os.valor_servico || 0) + (os.valor_pecas || 0);
  });
  return Object.entries(grupos).sort((a, b) => b[1].total - a[1].total);
}

function renderizarTabelaRelatorio(elementoId, grupos) {
  const tbody = document.getElementById(elementoId);
  tbody.innerHTML = grupos.length
    ? grupos.map(([chave, r]) => `
        <tr>
          <td>${chave}</td>
          <td>${r.qtd}</td>
          <td>${formatarMoeda(r.total)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="text-align:center; padding:16px; color:#999;">Nenhuma OS no período</td></tr>';
}

function renderizarRelatorios() {
  const lista = obterOSNoPeriodoRelatorio();
  const faturamentoTotal = lista.reduce((soma, os) => soma + (os.valor_servico || 0) + (os.valor_pecas || 0), 0);
  const atendidas = lista.filter(os => os.atendido).length;

  document.getElementById('relFaturamentoTotal').textContent = formatarMoeda(faturamentoTotal);
  document.getElementById('relTotalOS').textContent = lista.length;
  document.getElementById('relAtendidas').textContent = atendidas;
  document.getElementById('relPendentes').textContent = lista.length - atendidas;

  renderizarTabelaRelatorio('tbodyRelatorioStatus', agruparRelatorio(lista, os => os.status || '-'));
  renderizarTabelaRelatorio('tbodyRelatorioCampanha', agruparRelatorio(lista, os => os.campanha || 'Sem campanha'));
}

// ========== SEÇÃO ADMINISTRAÇÃO ==========
function elementoIdCatalogo(tipo) {
  return tipo === 'aparelho' ? 'listaCatalogoAparelho' : tipo === 'marca' ? 'listaCatalogoMarca' : 'listaCatalogoCampanha';
}

function inputIdCatalogo(tipo) {
  return tipo === 'aparelho' ? 'catNovoAparelho' : tipo === 'marca' ? 'catNovoMarca' : 'catNovoCampanha';
}

function renderizarAdmin() {
  document.getElementById('cfgNomeEmpresa').value = configEmpresa.nome_empresa || '';
  document.getElementById('cfgSubtitulo').value = configEmpresa.subtitulo || '';
  document.getElementById('cfgTelefone').value = mascararTelefone(configEmpresa.telefone_contato || '');
  document.getElementById('cfgWhatsapp').value = mascararTelefone(configEmpresa.whatsapp_contato || '');
  document.getElementById('cfgEndereco').value = configEmpresa.endereco || '';

  renderizarListaCatalogoAdmin('aparelho');
  renderizarListaCatalogoAdmin('marca');
  renderizarListaCatalogoAdmin('campanha');
}

function renderizarListaCatalogoAdmin(tipo) {
  const lista = document.getElementById(elementoIdCatalogo(tipo));
  const itens = obterCatalogo(tipo);

  lista.innerHTML = itens.length
    ? itens.map((item, indice) => `
        <li class="catalogo-item">
          <span>${item}</span>
          <button type="button" class="catalogo-item-remover" onclick="removerItemCatalogo('${tipo}', ${indice})" title="Remover ${item}">✕</button>
        </li>
      `).join('')
    : '<li class="catalogo-item catalogo-vazio">Nenhum item cadastrado</li>';
}

async function adicionarItemAdmin(tipo) {
  const input = document.getElementById(inputIdCatalogo(tipo));
  const nome = input.value.trim();
  if (!nome) return;

  if (estaNoCatalogo(tipo, nome)) {
    exibirToast('Esse item já está no catálogo', 'erro');
    return;
  }

  adicionarNoCatalogoLocal(tipo, nome);
  await persistirItemCatalogo(tipo, nome);

  input.value = '';
  renderizarListaCatalogoAdmin(tipo);
  atualizarCombos();
}

function removerItemCatalogo(tipo, indice) {
  const valor = obterCatalogo(tipo)[indice];
  if (!valor) return;

  abrirModalConfirmar(`⚠️ Remover "${valor}" do catálogo? OS já cadastradas não são afetadas.`, async () => {
    try {
      const { error } = await supabase
        .from(TABELA_CATALOGOS)
        .delete()
        .eq('tipo', tipo)
        .ilike('valor', valor);

      if (error) throw error;

      const itens = obterCatalogo(tipo);
      const idx = itens.findIndex(i => i.toLowerCase() === valor.toLowerCase());
      if (idx >= 0) itens.splice(idx, 1);

      renderizarListaCatalogoAdmin(tipo);
      atualizarCombos();
      exibirToast('✅ Item removido do catálogo!');
    } catch (err) {
      console.error('❌ Erro ao remover item de catálogo:', err);
      exibirToast('Erro ao remover item', 'erro');
    }
  });
}

// ========== SEÇÃO USUÁRIOS ==========
let listaUsuariosAtual = [];

async function carregarUsuarios() {
  const tbody = document.getElementById('tbodyUsuarios');
  try {
    const { data, error } = await supabase.functions.invoke('listar-usuarios');
    if (error || data?.error) throw new Error(data?.error || error.message);

    listaUsuariosAtual = data.usuarios || [];
    if (listaUsuariosAtual.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Nenhum usuário encontrado</td></tr>';
      return;
    }

    const { data: { user: usuarioLogado } } = await supabase.auth.getUser();

    tbody.innerHTML = listaUsuariosAtual.map(u => `
      <tr>
        <td>${u.nome || '<span style="opacity:.6">— sem nome —</span>'}</td>
        <td>${u.email || '-'}</td>
        <td><span class="status-badge ${u.perfil === 'admin' ? 'status-andamento' : 'status-aberto'}">${u.perfil === 'admin' ? 'Administrador' : 'Técnico'}</span></td>
        <td>${formatarData((u.created_at || '').slice(0, 10))}</td>
        <td>${u.last_sign_in_at ? formatarData(u.last_sign_in_at.slice(0, 10)) : 'Nunca'}</td>
        <td style="display: flex; gap: 5px;">
          <button class="btn btn-sm btn-acao" onclick="abrirModalEditarUsuario('${u.id}')" title="Editar">✏️</button>
          ${u.id !== usuarioLogado?.id
            ? `<button class="btn btn-sm btn-acao btn-acao-excluir" onclick="confirmarExclusaoUsuario('${u.id}', '${(u.nome || u.email).replace(/'/g, "\\'")}')" title="Excluir">🗑️</button>`
            : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('❌ Erro ao carregar usuários:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#dc3545;">Erro ao carregar usuários</td></tr>';
  }
}

// ========== EDITAR USUÁRIO ==========
function abrirModalEditarUsuario(userId) {
  const usuario = listaUsuariosAtual.find(u => u.id === userId);
  if (!usuario) return;

  document.getElementById('editarUsuarioId').value = usuario.id;
  document.getElementById('editarUsuarioEmail').value = usuario.email || '';
  document.getElementById('editarUsuarioNome').value = usuario.nome || '';
  document.getElementById('editarUsuarioPerfil').value = usuario.perfil || 'tecnico';
  document.getElementById('editarUsuarioSenha').value = '';
  limparErroEditarUsuario();
  document.getElementById('modalEditarUsuarioFundo').classList.add('active');
}

function fecharModalEditarUsuario() {
  document.getElementById('modalEditarUsuarioFundo').classList.remove('active');
}

function exibirErroEditarUsuario(mensagem) {
  const erroEl = document.getElementById('editarUsuarioErro');
  erroEl.textContent = mensagem;
  erroEl.classList.add('show');
}

function limparErroEditarUsuario() {
  const erroEl = document.getElementById('editarUsuarioErro');
  erroEl.textContent = '';
  erroEl.classList.remove('show');
}

async function confirmarEditarUsuario() {
  const userId = document.getElementById('editarUsuarioId').value;
  const nome = document.getElementById('editarUsuarioNome').value.trim();
  const perfil = document.getElementById('editarUsuarioPerfil').value;
  const novaSenha = document.getElementById('editarUsuarioSenha').value;
  const botao = document.getElementById('btnSalvarEditarUsuario');

  limparErroEditarUsuario();
  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    const { data, error } = await supabase.functions.invoke('editar-usuario', {
      body: { userId, nome, perfil, novaSenha: novaSenha || undefined }
    });

    if (error || data?.error) {
      exibirErroEditarUsuario(data?.error || 'Erro ao salvar alterações.');
      return;
    }

    fecharModalEditarUsuario();
    exibirToast('✅ Usuário atualizado!');
    carregarUsuarios();
  } catch (err) {
    console.error('❌ Erro ao editar usuário:', err);
    exibirErroEditarUsuario('Erro de conexão. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = '✓ Salvar';
  }
}

// ========== EXCLUIR USUÁRIO ==========
function confirmarExclusaoUsuario(userId, nome) {
  abrirModalConfirmar(`⚠️ Tem certeza que deseja excluir o usuário "${nome}"? Essa ação não pode ser desfeita.`, async () => {
    try {
      const { data, error } = await supabase.functions.invoke('deletar-usuario', {
        body: { userId }
      });

      if (error || data?.error) {
        exibirToast(data?.error || 'Erro ao excluir usuário', 'erro');
        return;
      }

      exibirToast('✅ Usuário excluído!');
      carregarUsuarios();
    } catch (err) {
      console.error('❌ Erro ao excluir usuário:', err);
      exibirToast('Erro ao excluir usuário', 'erro');
    }
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

    // Técnico não vê valores nem no CSV (mesma restrição da tela)
    const colunas = [
      'ID', 'Número OS', 'Data', 'Cliente', 'Telefone', 'Endereço', 'Complemento', 'CEP',
      'Aparelho', 'Marca',
      ...(ehAdminAtual ? ['Valor Serviço', 'Valor Peças', 'Valor Total'] : []),
      'Período', 'Campanha', 'Status', 'Atendido', 'Observações'
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
      ...(ehAdminAtual ? [
        escaparCSV(os.valor_servico),
        escaparCSV(os.valor_pecas),
        escaparCSV(os.valor_servico + os.valor_pecas)
      ] : []),
      escaparCSV(os.periodo_visita || ''),
      escaparCSV(os.campanha || ''),
      escaparCSV(os.status),
      escaparCSV(os.atendido ? 'Sim' : 'Não'),
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
// A inicialização agora é disparada pelo listener de autenticação
// (supabase.auth.onAuthStateChange), assim que houver uma sessão válida.

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
window.marcarAtendido = marcarAtendido;
window.alternarTema = alternarTema;
window.fazerLogin = fazerLogin;
window.abrirModalSenha = abrirModalSenha;
window.fecharModalSenha = fecharModalSenha;
window.confirmarTrocaSenha = confirmarTrocaSenha;
window.abrirModalNovoUsuario = abrirModalNovoUsuario;
window.fecharModalNovoUsuario = fecharModalNovoUsuario;
window.abrirModalEditarUsuario = abrirModalEditarUsuario;
window.fecharModalEditarUsuario = fecharModalEditarUsuario;
window.confirmarEditarUsuario = confirmarEditarUsuario;
window.confirmarExclusaoUsuario = confirmarExclusaoUsuario;
window.mostrarEsqueciSenha = mostrarEsqueciSenha;
window.mostrarBlocoLogin = mostrarBlocoLogin;
window.confirmarEsqueciSenha = confirmarEsqueciSenha;
window.confirmarNovaSenhaRecuperacao = confirmarNovaSenhaRecuperacao;
window.mostrarTelaRedefinirSenha = mostrarTelaRedefinirSenha;
window.confirmarNovoUsuario = confirmarNovoUsuario;
window.mostrarSecao = mostrarSecao;
window.alternarMenuUsuario = alternarMenuUsuario;
window.fecharMenuUsuario = fecharMenuUsuario;
window.fazerLogout = fazerLogout;
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
window.renderizarRelatorios = renderizarRelatorios;
window.limparFiltroRelatorio = limparFiltroRelatorio;
window.salvarConfigEmpresa = salvarConfigEmpresa;
window.adicionarItemAdmin = adicionarItemAdmin;
window.removerItemCatalogo = removerItemCatalogo;
