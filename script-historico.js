window.onload = function() {
    const listaContainer = document.getElementById('lista-historico');
    const token = localStorage.getItem('auth_token');

    if (!token) {
        alert("Faça login para ver seu histórico.");
        window.location.href = "index.html";
        return;
    }

    // Busca o histórico diretamente do servidor seguro
    fetch(`${API_BASE_URL}/api/presencas`, {
        method: 'GET',
        headers: {
            'Authorization': token // O servidor sabe quem somos por causa do token
        }
    })
    .then(response => response.json())
    .then(historico => {
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
        }
    })
    .catch(error => {
        console.error("Erro ao carregar o histórico:", error);
        listaContainer.innerHTML = '<div class="empty-state">Erro ao carregar os dados do servidor.</div>';
    });
};
