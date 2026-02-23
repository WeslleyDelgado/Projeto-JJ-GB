
window.onload = function() {
    const nomeSalvo = localStorage.getItem('usuario_nome');
    if (nomeSalvo) {
        document.querySelector('.user-name').innerText = nomeSalvo;
    }
};

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
}

body {
    background-color: #f4f4f4; /* Cor de fundo levemente cinza */
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.login-container {
    text-align: center;
    width: 100%;
    max-width: 350px;
    padding: 20px;
}

.logo img {
    width: 200px;
    margin-bottom: 30px;
}

h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 30px;
    color: #000;
}

.auth-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    background-color: #cfe2f3; /* Azul claro da imagem */
    color: #000;
    transition: background 0.3s;
}

.btn i {
    margin-right: 10px;
    font-size: 18px;
}

.btn:hover {
    background-color: #b8d4ed;
}

.signup-text {
    margin-top: 50px;
    font-size: 14px;
    color: #333;
}

.signup-text a {
    color: #3182ce;
    text-decoration: none;
}

.signup-text a:hover {
    text-decoration: underline;
}

function startCapture() {
    alert("Câmera acessada! (Simulação)");
}

// Simular troca de abas
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
    });
});

async function startCamera() {
    const video = document.getElementById('preview');
    const icon = document.getElementById('placeholder-icon');
    const statusText = document.getElementById('status-text');
    const btn = document.getElementById('btn-action');

    try {
        // Solicita acesso à câmera (preferencialmente a traseira em celulares)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });

        video.srcObject = stream;
        video.style.display = "block"; // Mostra o vídeo
        icon.style.display = "none";   // Esconde o ícone de câmera parado
        
        statusText.innerHTML = "Escaneando...";
        btn.innerHTML = "Capturando...";
        btn.style.backgroundColor = "#276749"; // Muda para verde para indicar atividade

    } catch (err) {
        console.error("Erro ao acessar a câmera: ", err);
        alert("Ops! Precisamos de permissão para usar a câmera.");
    }
}
let html5QrCode;

function startScanner() {
    const statusText = document.getElementById('status');
    const btn = document.getElementById('btn-scan');
    const resultMsg = document.getElementById('result-message');

    // Configuração do scanner
    html5QrCode = new Html5Qrcode("reader");

    const config = { 
        fps: 10, 
        qrbox: { width: 200, height: 200 } 
    };

    // Inicia a câmera traseira
    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText, decodedResult) => {
            // SUCESSO: O que fazer quando ler o código
            console.log(`Código lido: ${decodedText}`);
            
            statusText.innerHTML = "Código Lido com Sucesso!";
            resultMsg.style.display = "block";
            resultMsg.innerText = "Conteúdo: " + decodedText;
            
            // Para a câmera após a leitura
            html5QrCode.stop();
            btn.innerHTML = "Escanear Novamente";
        },
        (errorMessage) => {
            // Erro de leitura (comum enquanto procura o código)
        }
    ).catch((err) => {
        console.error("Erro ao iniciar:", err);
        alert("Erro: Certifique-se de estar em HTTPS ou Localhost.");
    });

    btn.innerHTML = "Procurando...";
    btn.style.backgroundColor = "#2c5282";
}