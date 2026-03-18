window.onload = function() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        alert("Acesso restrito ao Administrador.");
        window.location.href = "admin-login.html";
        return;
    }

    let todosAlunos = [];

    function carregarDados() {
        document.getElementById('tabela-corpo').innerHTML = '<tr><td colspan="4" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';

        fetch(`${API_BASE_URL}/api/admin/alunos`, {
            method: 'GET',
            headers: { 'Authorization': token }
        })
        .then(async response => {
            const text = await response.text(); // Lê a resposta como texto primeiro
            try {
                const data = JSON.parse(text); // Tenta converter para formato de dados
                if (!response.ok) throw new Error(data.erro || "Erro no servidor");
                return data;
            } catch (e) {
                // Se não for dado válido (for um HTML), é o Render reiniciando
                throw new Error("O servidor (Render) está reiniciando ou acordando. Aguarde 1 minuto e recarregue a página.");
            }
        })
        .then(data => {
            todosAlunos = data;
            renderizarTabela(data);
        })
        .catch(err => {
            console.error("Erro:", err);
            document.getElementById('tabela-corpo').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #c53030;"><b>Erro:</b> ${err.message}. Você criou a coluna no Neon?</td></tr>`;
        });
    }

    function renderizarTabela(dados) {
        const tbody = document.getElementById('tabela-corpo');
        tbody.innerHTML = '';

        // Verifica se a lista de alunos está vazia
        if (!Array.isArray(dados) || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #718096;">Nenhum aluno encontrado.</td></tr>';
            return;
        }

        dados.forEach(aluno => {
            const nomeUnidade = aluno.unidade === 'gb-matriz' ? 'Centro' : 'Rio';
            const faixaAtual = aluno.faixa || ''; // Vazio significa Automático
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold; color: #2c5282;">${aluno.nome}</td>
                <td><span class="badge">${nomeUnidade}</span></td>
                <td style="font-weight: bold; text-align: center;">${aluno.total_presencas}</td>
                <td>
                    <select class="faixa-select" onchange="mudarFaixa(${aluno.id}, this.value)">
                        <option value="" ${faixaAtual === '' ? 'selected' : ''}>🤖 Automático</option>
                        <option value="Branca" ${faixaAtual === 'Branca' ? 'selected' : ''}>Branca</option>
                        <option value="Azul" ${faixaAtual === 'Azul' ? 'selected' : ''}>Azul</option>
                        <option value="Roxa" ${faixaAtual === 'Roxa' ? 'selected' : ''}>Roxa</option>
                        <option value="Marrom" ${faixaAtual === 'Marrom' ? 'selected' : ''}>Marrom</option>
                        <option value="Preta" ${faixaAtual === 'Preta' ? 'selected' : ''}>Preta</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.mudarFaixa = function(id, novaFaixa) {
        fetch(`${API_BASE_URL}/api/admin/alunos/${id}/faixa`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ faixa: novaFaixa })
        }).catch(err => alert("Erro ao salvar!"));
    };

    document.getElementById('search-input').addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        renderizarTabela(todosAlunos.filter(item => item.nome.toLowerCase().includes(termo)));
    });

    carregarDados();
};