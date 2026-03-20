globalThis.onload = function() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        alert("Acesso restrito ao Administrador.");
        globalThis.location.href = "admin-login.html";
        return;
    }

    // Lógica para sair do Painel
    document.getElementById('btn-sair-admin').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('admin_token');
        globalThis.location.href = "index.html";
    });
};

// Função chamada ao clicar em "Gerar QR Code na Tela"
globalThis.gerarQRCode = function() {
    const aulaSelect = document.getElementById('aula-select').value;
    
    if (!aulaSelect) {
        alert("Por favor, selecione o tipo de aula antes de gerar o QR Code!");
        return;
    }

    // Pega a data de hoje no formato Brasileiro "DD/MM/YYYY" para incorporar no código
    const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    // Cria uma string única. Ex: "Jiu-Jitsu Iniciantes (25/10/2023)"
    const textoQrCode = `${aulaSelect} (${dataHoje})`;

    // Usa uma API pública rápida para desenhar o QR Code e insere na imagem
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(textoQrCode)}`;
    
    document.getElementById('qr-code-img').src = url;
    document.getElementById('qr-code-img').style.display = 'block';
    document.getElementById('aula-titulo').innerText = textoQrCode;
    document.getElementById('qr-instrucoes').style.display = 'block';
};