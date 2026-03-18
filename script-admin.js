window.onload = function() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        alert("Acesso negado. Faça login.");
        window.location.href = "index.html";
        return;
    }

    let todasPresencas = []; // Guarda todos os dados para a pesquisa funcionar

    function carregarDados() {
        document.getElementById('tabela-corpo').innerHTML = '<tr><td colspan="4" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';

        fetch(`${API_BASE_URL}/api/admin/presencas`, {
            method: 'GET',
            headers: { 'Authorization': token }
        })
        .then(response => response.json())
        .then(data => {
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
                <td style="font-weight: bold; color: #2c5282;">${item.nome}</td>
                <td><span class="badge">${nomeUnidade}</span></td>
                <td>${item.aula}</td>
                <td style="color: #4a5568; font-size: 14px;">${item.data}</td>
            `;
            tbody.appendChild(tr);
        });
    }

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