globalThis.onload = function() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        globalThis.location.href = "index.html";
        return;
    }
    carregarAulas();
};

function carregarAulas() {
    const token = localStorage.getItem('auth_token');
    const listaContainer = document.getElementById('lista-aulas');
    listaContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Buscando grade de horários...</div>';

    apiFetch('/api/aulas-programadas', { token })
    .then(aulas => {
        if (aulas.erro) throw new Error(aulas.erro);

        if (!Array.isArray(aulas) || aulas.length === 0) {
            listaContainer.innerHTML = '<div class="empty-state" style="margin-top: 50px;">O professor ainda não abriu vagas para esta semana. Tente novamente mais tarde! 🥋</div>';
            return;
        }

        listaContainer.innerHTML = '';
        aulas.forEach(aula => {
            // Transforma a data do banco em um formato legível Brasileiro
            const dataInscricao = new Date(aula.data_hora);
            const dataFormatada = dataInscricao.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
            const horaFormatada = dataInscricao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const ocupadas = parseInt(aula.vagas_ocupadas);
            const limite = aula.limite_vagas;
            const disponiveis = limite - ocupadas;
            const lotado = disponiveis <= 0;
            
            let btnHTML = '';
            if (aula.ja_agendado) {
                btnHTML = `<button class="btn-cancelar" onclick="cancelarReserva(${aula.id})"><i class="fa-solid fa-xmark"></i> Cancelar Reserva</button>`;
            } else if (lotado) {
                btnHTML = `<button class="btn-reservar" disabled>Lotado (${limite} alunos)</button>`;
            } else {
                btnHTML = `<button class="btn-reservar" onclick="reservarVaga(${aula.id})"><i class="fa-solid fa-check"></i> Reservar Vaga</button>`;
            }

            const mapUnidade = { 'cascatinha': 'Cascatinha', 'benfica': 'Benfica', 'centro': 'Centro', 'gb-matriz': 'Centro (Legado)', 'gb-local': 'Rio (Legado)' };
            const nomeUnidade = mapUnidade[aula.unidade] || aula.unidade;

            const card = `
                <div class="aula-card">
                    <div class="aula-header">
                        <div class="aula-title">${aula.titulo}</div>
                        <div class="aula-unidade">${nomeUnidade}</div>
                    </div>
                    <div class="aula-info"><i class="fa-regular fa-calendar"></i> <span style="text-transform: capitalize;">${dataFormatada}</span> às ${horaFormatada}</div>
                    <div class="aula-info ${lotado ? 'vagas-esgotadas' : 'vagas-disponiveis'}"><i class="fa-solid fa-users"></i> ${ocupadas}/${limite} vagas preenchidas</div>
                    ${btnHTML}
                </div>
            `;
            listaContainer.innerHTML += card;
        });
    })
    .catch(error => {
        console.error(error);
        listaContainer.innerHTML = '<div class="empty-state">Erro ao carregar a agenda de aulas. Verifique sua conexão.</div>';
    });
}

globalThis.reservarVaga = function(aulaId) {
    const token = localStorage.getItem('auth_token');
    apiFetch('/api/agendamentos', { method: 'POST', token, body: JSON.stringify({ aulaId }) })
    .then(res => { if (res.erro) alert(res.erro); else carregarAulas(); })
    .catch(() => alert("Erro ao reservar vaga."));
};

globalThis.cancelarReserva = function(aulaId) {
    if (!confirm("Tem certeza que deseja liberar sua vaga para outro aluno?")) return;
    const token = localStorage.getItem('auth_token');
    apiFetch(`/api/agendamentos/${aulaId}`, { method: 'DELETE', token })
    .then(res => { if (res.erro) alert(res.erro); else carregarAulas(); })
    .catch(() => alert("Erro ao cancelar reserva."));
};