window.onload = function() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        alert("Acesso restrito ao Administrador.");
        window.location.href = "admin-login.html";
        return;
    }

    let todosAlunos = [];
    let alunosFiltrados = []; // Mantém controle da pesquisa atual
    let currentPage = 1;
    const itemsPerPage = 10; // Exibe 10 alunos por página
    let alunoSelecionado = null; // Guarda o aluno aberto no modal

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
            alunosFiltrados = data;
            renderizarTabelaAtiva();
        })
        .catch(err => {
            console.error("Erro:", err);
            document.getElementById('tabela-corpo').innerHTML = `<tr><td colspan="4" style="text-align: center; color: #c53030;"><b>Erro:</b> ${err.message}. Você criou a coluna no Neon?</td></tr>`;
        });
    }

    function renderizarTabelaAtiva() {
        const tbody = document.getElementById('tabela-corpo');
        tbody.innerHTML = '';

        // Verifica se a lista de alunos está vazia
        if (!Array.isArray(alunosFiltrados) || alunosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #718096;">Nenhum aluno encontrado.</td></tr>';
            atualizarControlesPaginacao();
            return;
        }

        // Corta (Slice) o array apenas para mostrar os alunos da página atual
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginaDados = alunosFiltrados.slice(startIndex, endIndex);

        paginaDados.forEach(aluno => {
            const nomeUnidade = aluno.unidade === 'gb-matriz' ? 'Centro' : 'Rio';
            const faixaAtual = aluno.faixa || ''; // Vazio significa Automático
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold;">
                    <a href="#" onclick="abrirPerfil(${aluno.id}); return false;" style="color: #c53030; text-decoration: none; display: flex; align-items: center; gap: 8px;" title="Ver Perfil Completo">
                        <i class="fa-regular fa-id-card"></i> ${aluno.nome}
                    </a>
                </td>
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
        
        atualizarControlesPaginacao();
    }

    // Atualiza o visual dos botões e do texto de páginas
    function atualizarControlesPaginacao() {
        const totalPages = Math.ceil(alunosFiltrados.length / itemsPerPage) || 1;
        document.getElementById('page-info').innerText = `Página ${currentPage} de ${totalPages}`;

        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');

        // Lógica para desativar botão Voltar
        btnPrev.disabled = currentPage <= 1;
        btnPrev.style.opacity = currentPage <= 1 ? '0.5' : '1';
        btnPrev.style.cursor = currentPage <= 1 ? 'not-allowed' : 'pointer';

        // Lógica para desativar botão Próxima
        btnNext.disabled = currentPage >= totalPages;
        btnNext.style.opacity = currentPage >= totalPages ? '0.5' : '1';
        btnNext.style.cursor = currentPage >= totalPages ? 'not-allowed' : 'pointer';
    }

    // Função chamada pelos botões de Voltar e Avançar no HTML
    window.mudarPagina = function(direcao) {
        const totalPages = Math.ceil(alunosFiltrados.length / itemsPerPage) || 1;
        const novaPagina = currentPage + direcao;
        
        if (novaPagina >= 1 && novaPagina <= totalPages) {
            currentPage = novaPagina;
            renderizarTabelaAtiva();
        }
    };

    window.mudarFaixa = function(id, novaFaixa) {
        fetch(`${API_BASE_URL}/api/admin/alunos/${id}/faixa`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ faixa: novaFaixa })
        }).catch(err => alert("Erro ao salvar!"));
    };

    document.getElementById('search-input').addEventListener('input', function(e) {
        const termo = e.target.value.toLowerCase();
        alunosFiltrados = todosAlunos.filter(item => item.nome.toLowerCase().includes(termo));
        currentPage = 1; // Reseta para a página 1 ao fazer uma nova busca
        renderizarTabelaAtiva();
    });

    // --- Funções do Modal de Perfil do Aluno ---
    window.abrirPerfil = function(id) {
        const aluno = todosAlunos.find(a => a.id === id);
        if (!aluno) return;
        alunoSelecionado = aluno;

        document.getElementById('modal-nome').innerText = aluno.nome;
        document.getElementById('modal-email').innerText = aluno.email || 'Não informado';
        document.getElementById('modal-unidade').innerText = aluno.unidade === 'gb-matriz' ? 'Gracie Barra Centro' : 'Gracie Barra Rio';
        document.getElementById('modal-presencas').innerText = aluno.total_presencas;
        
        const foto = aluno.foto_perfil || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
        document.getElementById('modal-foto').src = foto;

        const faixaAtual = aluno.faixa || 'Branca';
        const faixasInfo = {
            "Branca": { bg: "#f8f9fa", text: "#2d3748", border: "#cbd5e0" },
            "Azul": { bg: "#3182ce", text: "#ffffff", border: "#2b6cb0" },
            "Roxa": { bg: "#805ad5", text: "#ffffff", border: "#6b46c1" },
            "Marrom": { bg: "#744210", text: "#ffffff", border: "#5f370e" },
            "Preta": { bg: "#1a202c", text: "#ffffff", border: "#000000" }
        };
        const info = faixasInfo[faixaAtual] || faixasInfo["Branca"];
        const badge = document.getElementById('modal-faixa-badge');
        badge.innerText = `Faixa ${faixaAtual}`;
        badge.style.backgroundColor = info.bg;
        badge.style.color = info.text;
        badge.style.border = `1px solid ${info.border}`;

        document.getElementById('modal-perfil').style.display = 'flex'; // Exibe o modal
    };

    window.fecharPerfil = function() {
        document.getElementById('modal-perfil').style.display = 'none'; // Esconde o modal
    };

    window.abrirEditar = function() {
        if (!alunoSelecionado) return;
        
        // Preenche o formulário com os dados atuais do aluno
        document.getElementById('edit-aluno-id').value = alunoSelecionado.id;
        document.getElementById('edit-aluno-nome').value = alunoSelecionado.nome;
        document.getElementById('edit-aluno-email').value = alunoSelecionado.email;
        document.getElementById('edit-aluno-unidade').value = alunoSelecionado.unidade;
        
        fecharPerfil(); // Fecha a foto/visualização
        document.getElementById('modal-editar').style.display = 'flex'; // Abre o modo de edição
    };

    window.fecharEditar = function() {
        document.getElementById('modal-editar').style.display = 'none';
    };

    window.excluirAluno = function() {
        if (!alunoSelecionado) return;

        const confirmacao = confirm(`⚠️ ATENÇÃO: Você está prestes a excluir o aluno ${alunoSelecionado.nome}!\n\nEsta ação apagará a conta do aluno e TODO o seu histórico de presenças.\nTem certeza que deseja continuar?`);

        if (confirmacao) {
            fetch(`${API_BASE_URL}/api/admin/alunos/${alunoSelecionado.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            })
            .then(async response => {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    if (!response.ok) throw new Error(data.erro || "Erro no servidor.");
                    alert(data.mensagem);
                    fecharEditar();
                    carregarDados(); // Atualiza a tabela
                } catch (e) {
                    throw new Error("Erro de comunicação com o servidor.");
                }
            })
            .catch(err => {
                alert("Erro ao excluir aluno: " + err.message);
            });
        }
    };

    window.resetarSenha = function() {
        if (!alunoSelecionado) return;

        const confirmacao = confirm(`Você tem certeza que deseja redefinir a senha de ${alunoSelecionado.nome}?\n\nA nova senha temporária será "Mudar123". O aluno deverá usá-la para logar e trocá-la imediatamente.`);

        if (confirmacao) {
            fetch(`${API_BASE_URL}/api/admin/alunos/${alunoSelecionado.id}/reset-senha`, {
                method: 'POST',
                headers: { 'Authorization': token }
            })
            .then(async response => {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    if (!response.ok) throw new Error(data.erro || "Erro no servidor.");
                    alert(data.mensagem); // Exibe a mensagem de sucesso com a nova senha
                } catch (e) {
                    // Se cair aqui, o servidor devolveu HTML (Erro 404, Render dormindo, etc)
                    throw new Error("Erro de comunicação com o servidor. Verifique se o config.js está correto ou se a atualização já subiu pro Render.");
                }
            })
            .catch(err => {
                alert("Erro ao redefinir senha: " + err.message);
            });
        }
    };

    // Lida com o envio do formulário de edição do aluno
    document.getElementById('form-editar-aluno').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-aluno-id').value;
        const nome = document.getElementById('edit-aluno-nome').value;
        const email = document.getElementById('edit-aluno-email').value;
        const unidade = document.getElementById('edit-aluno-unidade').value;
        const btn = document.getElementById('btn-salvar-edicao');
        
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        fetch(`${API_BASE_URL}/api/admin/alunos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ nome, email, unidade })
        })
        .then(async response => {
            const text = await response.text(); // Lê como texto primeiro para evitar quebra
            try {
                const data = JSON.parse(text);
                if (!response.ok) throw new Error(data.erro || "Erro ao salvar.");
                alert(data.mensagem || "Dados atualizados com sucesso!");
                fecharEditar();
                carregarDados(); // Recarrega os dados da tabela silenciosamente
            } catch (e) {
                // Se cair aqui, é porque o servidor devolveu HTML (Erro 404, Render dormindo, etc)
                throw new Error("Erro de comunicação. O servidor na nuvem foi atualizado com o código novo?");
            }
        })
        .catch(err => { alert(err.message); })
        .finally(() => { btn.innerHTML = 'Salvar Alterações'; btn.disabled = false; });
    });

    carregarDados();
};