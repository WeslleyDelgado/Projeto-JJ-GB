document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const btn = document.querySelector('.btn-login-main');

    // Simulação de verificação
    btn.innerHTML = 'Verificando...';
    
    setTimeout(() => {
        // Se houver um nome salvo no localStorage, simulamos que o login deu certo
        const usuarioExiste = localStorage.getItem('usuario_nome');

        if (usuarioExiste) {
            window.location.href = "principal.html";
        } else {
            alert("Usuário não encontrado. Por favor, cadastre-se primeiro.");
            btn.innerHTML = 'Entrar';
        }
    }, 1500);
});

function socialLogin(provider) {
    alert("Entrando com " + provider + "...");
    window.location.href = "principal.html";
}