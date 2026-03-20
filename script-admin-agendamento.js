globalThis.onload = function() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        alert("Acesso restrito ao Administrador.");
        globalThis.location.href = "admin-login.html";
        return;
    }

    document.getElementById('btn-sair-admin').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('admin_token');
        globalThis.location.href = "index.html";
    });

    document.getElementById('form-aula').addEventListener('submit', function(e) {
        e.preventDefault();
        const titulo = document.getElementById('aula-titulo').value;
        const dataHora = document.getElementById('aula-data').value;
        const unidade = document.getElementById('aula-unidade').value;
        const limiteVagas = document.getElementById('aula-vagas').value;
        const btn = document.getElementById('btn-salvar-aula');

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        apiFetch('/api/admin/aulas-programadas', {
            method: 'POST',
            token: token,
            body: JSON.stringify({ titulo, dataHora, unidade, limiteVagas: parseInt(limiteVagas) })
        })
        .then(res => {
            if (res.erro) throw new Error(res.erro);
            alert("Aula cadastrada com sucesso!");
            document.getElementById('aula-data').value = ''; // Limpa a data para facilitar a próxima
            carregarAulas();
        })
        .catch(err => alert("Erro ao criar aula: " + err.message))
        .finally(() => {
            btn.innerHTML = 'Adicionar à Grade';
            btn.disabled = false;
        });
    });

    carregarAulas();
};

function carregarAulas() {
    const token = localStorage.getItem('admin_token');
    const tbody = document.getElementById('tabela-aulas');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>';

    apiFetch('/api/admin/aulas-programadas', { token })
    .then(aulas => {
        if (aulas.erro) throw new Error(aulas.erro);
        tbody.innerHTML = '';
        
        if (aulas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #718096;">Nenhuma aula programada.</td></tr>';
            return;
        }

        aulas.forEach(aula => {
            const dataObj = new Date(aula.data_hora);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Destaca aulas que já passaram clareando a cor do texto
            const isPassada = dataObj < new Date();
            const corLinha = isPassada ? 'color: #a0aec0;' : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="${corLinha}"><strong>${dataFormatada}</strong> às ${horaFormatada}</td>
                <td style="${corLinha}">${aula.titulo}</td>
                <td style="${corLinha}"><span class="badge">${aula.unidade === 'gb-matriz' ? 'Centro' : 'Rio'}</span></td>
                <td style="font-weight: bold; color: ${aula.vagas_ocupadas >= aula.limite_vagas ? '#c53030' : '#276749'};">
                    ${aula.vagas_ocupadas} / ${aula.limite_vagas}
                </td>
                <td>
                    <button onclick="deletarAula(${aula.id})" class="btn-delete" title="Excluir Aula"><i class="fa-solid fa-trash"></i> Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro ao carregar os dados.</td></tr>';
    });
}

globalThis.deletarAula = function(id) {
    if (!confirm("Tem certeza que deseja apagar esta aula? Todos os alunos agendados perderão a vaga.")) return;
    
    const token = localStorage.getItem('admin_token');
    apiFetch(`/api/admin/aulas-programadas/${id}`, { method: 'DELETE', token })
    .then(res => {
        if (res.erro) throw new Error(res.erro);
        carregarAulas();
    })
    .catch(err => alert("Erro ao deletar: " + err.message));
};