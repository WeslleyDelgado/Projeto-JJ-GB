window.onload = function() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    apiFetch('/api/usuario', { token })
    .then(usuario => {
        if (usuario.erro) return;

        const total = usuario.total_presencas || 0;
        const faixaAtual = calcularFaixa(total, usuario.faixa);
        
        // Determina os marcos baseados na função 'calcularFaixa' do config.js
        let progressTier;
        if (total < 150) progressTier = { curr: "Branca", next: "Azul", start: 0, end: 150 };
        else if (total < 300) progressTier = { curr: "Azul", next: "Roxa", start: 150, end: 300 };
        else if (total < 450) progressTier = { curr: "Roxa", next: "Marrom", start: 300, end: 450 };
        else if (total < 600) progressTier = { curr: "Marrom", next: "Preta", start: 450, end: 600 };
        else progressTier = { curr: "Preta", next: "Mestre", start: 600, end: 600 };

        // Cálculos matemáticos
        const isMax = total >= 600;
        const classesInThisTier = total - progressTier.start;
        const tierTotalClasses = progressTier.end - progressTier.start;
        
        // Preenche a barra com a porcentagem correspondente (limitado a 100%)
        const progressPercent = isMax ? 100 : Math.min((classesInThisTier / tierTotalClasses) * 100, 100);
        
        // Calcula os Graus (4 graus por faixa)
        const degreeStep = tierTotalClasses / 5; 
        const currentDegree = isMax ? 4 : Math.min(Math.floor(classesInThisTier / degreeStep), 4);
        const classesToNextDegree = Math.ceil(((currentDegree + 1) * degreeStep) - classesInThisTier);
        const remainingToBelt = progressTier.end - total;

        // ===== INJEÇÃO NA TELA =====
        document.getElementById('evo-faixa-nome').innerText = faixaAtual.nome;
        document.getElementById('evo-total-aulas').innerText = total;

        // Aviso se a faixa foi forçada pelo admin, pq a barra vai calcular pelo histórico total do app
        if (usuario.faixa && progressTier.curr !== usuario.faixa) {
            document.getElementById('evo-disclaimer').style.display = 'block';
        }

        // Pinta a faixa principal
        const beltGraphic = document.getElementById('evo-belt-graphic');
        beltGraphic.style.backgroundColor = faixaAtual.cor;
        beltGraphic.style.borderColor = faixaAtual.borda;
        
        // A ponta de graduação no JJ costuma ser preta pra maioria, mas Vermelha pra faixa preta
        const beltTip = document.getElementById('evo-belt-tip');
        if (faixaAtual.nome === "Faixa Preta") {
            beltTip.style.backgroundColor = "#c53030"; // Vermelho GB
        }

        // Liga as listras (graus brancos) na ponta da faixa
        for(let i=1; i<=currentDegree; i++) {
            document.getElementById(`grau-${i}`).classList.add('active');
        }

        // Barra com pequeno atraso para rodar a animação bonita no CSS
        setTimeout(() => {
            document.getElementById('evo-progress-bar').style.width = `${progressPercent}%`;
        }, 100);

        // Mensagens Motivacionais Dinâmicas
        if (isMax) {
            document.getElementById('evo-next-step').innerHTML = `<strong>Você alcançou a Faixa Preta!</strong>`;
            document.getElementById('evo-classes-left').innerText = `Jornada Completa`;
        } else if (currentDegree < 4) {
            document.getElementById('evo-next-step').innerHTML = `Faltam <strong>${classesToNextDegree} aulas</strong> para o <strong>${currentDegree + 1}º Grau</strong>.`;
            document.getElementById('evo-classes-left').innerText = `${remainingToBelt} para a próxima faixa`;
        } else {
            document.getElementById('evo-next-step').innerHTML = `Graus completos! Faltam <strong>${remainingToBelt} aulas</strong> para a Faixa ${progressTier.next}.`;
            document.getElementById('evo-classes-left').innerText = `${remainingToBelt} aulas restantes`;
        }
    }).catch(err => console.error(err));
};