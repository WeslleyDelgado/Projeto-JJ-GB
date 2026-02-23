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

    // Simulando o processo de salvamento
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando conta...';
    btn.disabled = true;
    btn.style.opacity = "0.7";

    setTimeout(() => {
        // Salva o nome do usuário para usar na tela principal depois
        localStorage.setItem('usuario_nome', nome.split(' ')[0]); // Salva apenas o primeiro nome
        
        alert("Conta criada com sucesso, " + nome.split(' ')[0] + "!");
        
        // Redireciona para a tela principal (ou login)
        window.location.href = "principal.html"; 
    }, 2000);
});