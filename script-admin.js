window.onload = function() {
    const token = localStorage.getItem('admin_token'); // Usa o token de admin
    if (!token) {
        alert("Acesso restrito ao Administrador.");
        window.location.href = "admin-login.html";
        return;
    }

    let todasPresencas = []; // Guarda todos os dados para a pesquisa funcionar

    function carregarDados() {
        document.getElementById('tabela-corpo').innerHTML = '<tr><td colspan="4" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';

        apiFetch('/api/admin/presencas', { token })
        .then(data => {
            if (data.erro) throw new Error(data.erro);
            todasPresencas = data;
            renderizarTabela(data);
        })
        .catch(err => {
            console.error("Erro:", err);
            document.getElementById('tabela-corpo').innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Erro ao carregar dados.</td></tr>';
        });
    }

    function renderizarTabela(dados) {
        const tbody = document.getElementById('tabela-corpo');
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #718096;">Nenhuma presença encontrada.</td></tr>';
            return;
        }

        dados.forEach(item => {
            const nomeUnidade = item.unidade === 'gb-matriz' ? 'Centro' : 'Rio';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold; color: #c53030;">${item.nome}</td>
                <td><span class="badge">${nomeUnidade}</span></td>
                <td>${item.aula}</td>
                <td style="color: #4a5568; font-size: 14px;">${item.data}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Lógica para sair do Painel
    document.getElementById('btn-sair-admin').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('admin_token');
        window.location.href = "index.html";
    });

    // Lógica da Barra de Pesquisa (Filtro em tempo real)
    document.getElementById('search-input').addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        const filtrados = todasPresencas.filter(item => 
            item.nome.toLowerCase().includes(termo) ||
            item.aula.toLowerCase().includes(termo) ||
            item.unidade.toLowerCase().includes(termo) ||
            item.data.toLowerCase().includes(termo)
        );
        renderizarTabela(filtrados);
    });

    // Chama a função ao abrir a página
    carregarDados();
};