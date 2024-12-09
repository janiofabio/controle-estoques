document.addEventListener('DOMContentLoaded', () => {
  console.log('01 App carregado. Verificando autenticação...');
  const content = document.getElementById('content');
  const navLinks = document.querySelectorAll('nav a');

  function capitalize(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
  }

  async function loadPage(page) {
      console.log(`02 Tentando carregar a página: ${page}`);
      try {
          const response = await fetch(`/pages/${page}.html`);
          console.log(`03 Resposta para ${page}.html:`, response.status);
          if (!response.ok) {
              throw new Error(`Erro HTTP! Status: ${response.status}`);
          }
          const html = await response.text();
          content.innerHTML = html;
          if (window[`init${capitalize(page)}`]) {
              console.log(`04 Inicializando: init${capitalize(page)}`);
              window[`init${capitalize(page)}`]();
          }
      } catch (error) {
          console.error('05 Erro ao carregar página:', error);
          content.innerHTML = '<p>Erro ao carregar a página. Por favor, tente novamente.</p>';
      }
  }

  async function isAuthenticated() {
      try {
          const response = await fetch('/api/verificar-auth', {
              credentials: 'include'
          });
          return response.ok;
      } catch (error) {
          console.error('06 Erro ao verificar autenticação:', error);
          return false;
      }
  }

  navLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
          e.preventDefault();
          const page = e.target.getAttribute('data-page');
          console.log(`07 Link clicado: ${page}`);
          if (page !== 'login' && page !== 'cadastro' && !(await isAuthenticated())) {
              console.warn('08 Usuário não autenticado. Redirecionando para login.');
              alert('Por favor, faça login para acessar esta página.');
              loadPage('login');
          } else {
              loadPage(page);
          }
      });
  });

  // Ação inicial ao carregar a página
  isAuthenticated().then(autenticado => {
      if (autenticado) {
          console.log('09 Usuário autenticado. Carregando fornecedores.');
          loadPage('fornecedores');
      } else {
          console.log('10 Usuário não autenticado. Carregando login.');
          loadPage('login');
      }
  });

  // Expor a função loadPage globalmente
  window.loadPage = loadPage;
});