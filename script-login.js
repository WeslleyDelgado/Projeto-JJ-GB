document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const btn = document.querySelector('.btn-login-main');

    // Simulação de verificação
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
    btn.disabled = true;
    
    // Comunicação com o Backend Seguro
    fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, senha: senha })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.erro || 'Falha no login'); });
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            // Salva o token seguro e o nome do usuário
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('usuario_nome', data.nome);
            window.location.href = "principal.html";
        }
    })
    .catch(error => {
        console.error("Erro na requisição:", error);
        alert(error.message || "Erro ao conectar com o servidor.");
        btn.innerHTML = 'Entrar';
        btn.disabled = false;
    });
});

function socialLogin(provider) {
    alert("Entrando com " + provider + "...");
    window.location.href = "principal.html";
}