globalThis.onload = function() {
    const listaContainer = document.getElementById('lista-historico');
    const token = localStorage.getItem('auth_token');

    if (!token) {
        alert("Faça login para ver seu histórico.");
        globalThis.location.href = "index.html";
        return;
    }

    // Busca o histórico diretamente do servidor seguro
    apiFetch('/api/presencas', { token })
    .then(historico => {
        if (historico.erro) {
            alert(historico.erro);
            // Expulsa o usuário apenas se for erro de autenticação
            if (historico.erro.includes("Token") || historico.erro.includes("Acesso negado") || historico.erro.includes("não encontrado")) {
                localStorage.removeItem('auth_token');
                globalThis.location.href = "index.html";
            }
            return;
        }
        
        // Se não for um array, não podemos usar o .reverse(), então verificamos:
        if (!Array.isArray(historico)) return;

        if (historico.length > 0) {
            listaContainer.innerHTML = ''; // Limpa o "Vazio"
            
            historico.reverse().forEach((item, index) => {
                const delay = index * 0.1; // Adiciona um pequeno atraso (0.1s, 0.2s...) para cada card
                const card = `
                    <div class="card-presenca" style="animation-delay: ${delay}s">
                        <div class="card-icon">
                            <i class="fa-solid fa-circle-check" style="color: #276749; font-size: 24px;"></i>
                        </div>
                        <div class="card-info">
                            <h3>${item.aula}</h3>
                            <p><i class="fa-regular fa-clock"></i> ${item.data}</p>
                        </div>
                    </div>
                `;
                listaContainer.innerHTML += card;
            });
        } else {
            listaContainer.innerHTML = '<div class="empty-state">Nenhuma presença registrada ainda. Vá treinar! 🥋</div>';
        }
    })
    .catch(error => {
        console.error("Erro ao carregar o histórico:", error);
        listaContainer.innerHTML = '<div class="empty-state">Erro ao carregar os dados do servidor.</div>';
    });
};
