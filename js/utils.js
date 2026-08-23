// Funções utilitárias reutilizáveis

export function formatarData(data) {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function gerarNumeroOS() {
  const ano = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, '0');
  const aleatorio = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
  return `${ano}${mes}${aleatorio}`;
}

export function validarFormulario(dados) {
  if (!dados.cliente?.trim()) return 'Cliente é obrigatório';
  if (!dados.aparelho?.trim()) return 'Aparelho é obrigatório';
  if (!dados.defeito?.trim()) return 'Defeito é obrigatório';
  return null; // Sem erros
}

export function exibirToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = tipo === 'erro' ? 'toast error' : 'toast';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}