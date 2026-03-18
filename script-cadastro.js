document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault(); // Impede a página de recarregar

    // Capturando os valores dos campos
    const nome = document.querySelector('input[type="text"]').value;
    const email = document.querySelector('input[type="email"]').value;
    const senha = document.querySelector('input[type="password"]').value;
    const unidade = document.querySelector('select').value;
    const btn = document.querySelector('.btn-primary');

    // Validação simples
    if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    if (unidade === "") {
        alert("Por favor, selecione sua unidade.");
        return;
    }

    // Mostra feedback visual para o usuário
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando conta...';
    btn.disabled = true;

    // Envia os dados para o backend seguro
    fetch(`${API_BASE_URL}/api/cadastro`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome, email, senha, unidade })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.erro || 'Erro no servidor'); });
        }
        return response.json();
    })
    .then(data => {
        alert(data.mensagem);
        window.location.href = "index.html"; // Redireciona para o login após o sucesso
    })
    .catch(error => {
        console.error("Erro ao criar conta:", error);
        alert("Erro no cadastro: " + error.message);
        btn.innerHTML = 'Finalizar Cadastro';
        btn.disabled = false;
    });
});