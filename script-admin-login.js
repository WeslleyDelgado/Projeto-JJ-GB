document.getElementById('admin-login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const usuario = document.getElementById('admin-user').value;
    const senha = document.getElementById('admin-senha').value;
    const btn = document.querySelector('.btn-login-main');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
    btn.disabled = true;
    
    apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ usuario: usuario, senha: senha })
    })
    .then(data => {
        if (data.erro) throw new Error(data.erro);
        if (data.token) {
            localStorage.setItem('admin_token', data.token); // Salva um token separado do aluno
            window.location.href = "admin.html";
        }
    })
    .catch(error => {
        alert(error.message || "Erro de conexão.");
        btn.innerHTML = 'Acessar Painel';
        btn.disabled = false;
    });
});