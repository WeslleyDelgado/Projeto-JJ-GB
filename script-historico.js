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
            
            historico.reverse().forEach(item => {
                const card = `
                    <div class="card-presenca">
                        <div class="card-info">
                            <h3>${item.aula}</h3>
                            <p><i class="fa-regular fa-clock"></i> ${item.data}</p>
                        </div>
                        <i class="fa-solid fa-circle-check" style="color: #276749;"></i>
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
