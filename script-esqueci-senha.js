document.getElementById('form-recuperar').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('recuperar-email').value;
    const btn = document.querySelector('.btn-login-main');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    apiFetch('/api/recuperar-senha', {
        method: 'POST',
        body: JSON.stringify({ email: email })
    })
    .then(data => {
        if (data.erro) throw new Error(data.erro);
        alert(data.mensagem); // Mensagem de sucesso vinda do backend
        globalThis.location.href = "index.html"; // Joga o usuário de volta pro login
    })
    .catch(error => {
        console.error("Erro na requisição:", error);
        alert(error.message || "Erro ao conectar com o servidor.");
        btn.innerHTML = 'Enviar Instruções';
        btn.disabled = false;
    });
});