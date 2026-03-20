document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault(); // Impede a página de recarregar

    // Capturando os valores dos campos
    const nomeInput = document.getElementById('cad-nome');
    const emailInput = document.getElementById('cad-email');
    const senhaInput = document.getElementById('cad-senha');
    const unidadeInput = document.getElementById('cad-unidade');
    
    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    const unidade = unidadeInput.value;
    const btn = document.querySelector('.btn-primary');

    // Limpa erros anteriores da tela
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    let temErro = false;

    // Função auxiliar para pintar a borda e mostrar o texto de erro
    function mostrarErro(inputId, errorId) {
        document.getElementById(inputId).classList.add('input-error');
        document.getElementById(errorId).style.display = 'block';
        temErro = true;
    }

    // Sequência de Validações
    if (nome === "") {
        mostrarErro('cad-nome', 'err-nome');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email === "" || !emailRegex.test(email)) {
        mostrarErro('cad-email', 'err-email');
    }

    if (senha.length < 6) {
        mostrarErro('cad-senha', 'err-senha');
    }

    if (unidade === "") {
        mostrarErro('cad-unidade', 'err-unidade');
    }

    if (temErro) return; // Interrompe o envio se algum erro for encontrado

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
        globalThis.location.href = "index.html"; // Redireciona para o login após o sucesso
    })
    .catch(error => {
        console.error("Erro ao criar conta:", error);
        alert("Erro no cadastro: " + error.message);
        btn.innerHTML = 'Finalizar Cadastro';
        btn.disabled = false;
    });
});