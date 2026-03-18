document.getElementById('form-recuperar').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('recuperar-email').value;
    const btn = document.querySelector('.btn-login-main');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    fetch(`${API_BASE_URL}/api/recuperar-senha`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.erro || 'Erro na solicitação'); });
        }
        return response.json();
    })
    .then(data => {
        alert(data.mensagem); // Mensagem de sucesso vinda do backend
        window.location.href = "index.html"; // Joga o usuário de volta pro login
    })
    .catch(error => {
        console.error("Erro na requisição:", error);
        alert(error.message || "Erro ao conectar com o servidor.");
        btn.innerHTML = 'Enviar Instruções';
        btn.disabled = false;
    });
});