
window.onload = function() {
    const nomeSalvo = localStorage.getItem('usuario_nome');
    if (nomeSalvo) {
        document.querySelector('.user-name').innerText = nomeSalvo;
    }

    // Busca a foto de perfil do usuário logado
    const token = localStorage.getItem('auth_token');
    if (token) {
        fetch(`${API_BASE_URL}/api/usuario`, {
            headers: { 'Authorization': token }
        })
        .then(response => response.json())
        .then(usuario => {
            if (usuario.erro) {
                console.warn("Sessão inválida:", usuario.erro);
                if (usuario.erro.includes("Token") || usuario.erro.includes("Acesso negado") || usuario.erro.includes("não encontrado")) {
                    localStorage.removeItem('auth_token');
                    window.location.href = "index.html";
                }
                return; // Interrompe a execução para não quebrar o script
            }

            if (usuario.foto_perfil && document.getElementById('header-foto-perfil')) {
                document.getElementById('header-foto-perfil').src = usuario.foto_perfil;
            }

            // Exibir a faixa do aluno
            const faixa = calcularFaixa(usuario.total_presencas || 0, usuario.faixa);
            const badge = document.getElementById('header-faixa');
            if (badge) {
                badge.innerText = faixa.nome + " (" + (usuario.total_presencas || 0) + " aulas)";
                badge.style.backgroundColor = faixa.cor;
                badge.style.color = faixa.texto;
                badge.style.border = `1px solid ${faixa.borda}`;
                badge.style.display = "inline-block";
            }
        })
        .catch(err => console.error("Erro ao carregar foto do header:", err));
    }
};

function calcularFaixa(total, manual) {
    if (manual) {
        const faixas = {
            "Branca": { nome: "Faixa Branca", cor: "#f8f9fa", texto: "#2d3748", borda: "#cbd5e0" },
            "Azul": { nome: "Faixa Azul", cor: "#3182ce", texto: "#ffffff", borda: "#2b6cb0" },
            "Roxa": { nome: "Faixa Roxa", cor: "#805ad5", texto: "#ffffff", borda: "#6b46c1" },
            "Marrom": { nome: "Faixa Marrom", cor: "#744210", texto: "#ffffff", borda: "#5f370e" },
            "Preta": { nome: "Faixa Preta", cor: "#1a202c", texto: "#ffffff", borda: "#000000" }
        };
        return faixas[manual] || faixas["Branca"];
    }
    if (total < 20) return { nome: "Faixa Branca", cor: "#f8f9fa", texto: "#2d3748", borda: "#cbd5e0" };
    if (total < 60) return { nome: "Faixa Azul", cor: "#3182ce", texto: "#ffffff", borda: "#2b6cb0" };
    if (total < 120) return { nome: "Faixa Roxa", cor: "#805ad5", texto: "#ffffff", borda: "#6b46c1" };
    if (total < 200) return { nome: "Faixa Marrom", cor: "#744210", texto: "#ffffff", borda: "#5f370e" };
    return { nome: "Faixa Preta", cor: "#1a202c", texto: "#ffffff", borda: "#000000" };
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

    // Reseta a tela para garantir que a câmera reapareça caso seja um novo escaneamento
    document.getElementById('reader').style.display = "block";
    resultMsg.style.display = "none";
    if (statusText) statusText.style.display = "block";

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

            html5QrCode.stop().then(() => {
                // 1. Recuperar o token seguro salvo no login
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    alert("Você precisa estar logado para registrar presença.");
                    window.location.href = "index.html";
                    return;
                }

                // 2. Enviar a presença para o backend seguro
                fetch(`${API_BASE_URL}/api/presencas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token // Envia o token para provar quem somos
                    },
                    body: JSON.stringify({ aula: decodedText })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.erro) {
                        alert(data.erro);
                    } else {
                        // 3. Mostrar sucesso na tela
                        document.getElementById('reader').style.display = "none";
                        if (document.getElementById('status')) document.getElementById('status').style.display = "none";
                        resultMsg.style.display = "block";
                        resultMsg.innerHTML = `Presença Confirmada!<br><small>${decodedText}</small>`;
                        btn.innerHTML = "Escanear Novamente";
                    }
                })
                .catch(err => {
                    console.error("Erro ao registrar presença no servidor:", err);
                    alert("Erro de conexão.");
                });
            }).catch(err => {
                console.error("Erro ao parar a câmera", err);
            });
        },
        (errorMessage) => {
            // Erro de leitura (comum enquanto procura o código)
        }
    ).catch((err) => {
        console.error("Erro ao iniciar:", err);
        alert("Erro: Certifique-se de estar em HTTPS ou Localhost.");
    });

    btn.innerHTML = "Procurando...";
    btn.style.backgroundColor = "var(--cor-primaria-hover)";
}

function simulateScan() {
    const decodedText = "Aula de Jiu-Jitsu (Simulada)";
    const resultMsg = document.getElementById('result-message');

    const token = localStorage.getItem('auth_token');
    if (!token) {
        alert("Você precisa estar logado para registrar presença.");
        window.location.href = "index.html";
        return;
    }

    // Envia a presença simulada para o backend
    fetch(`${API_BASE_URL}/api/presencas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token 
        },
        body: JSON.stringify({ aula: decodedText })
    })
    .then(response => response.json())
    .then(data => {
        if (data.erro) {
            alert(data.erro);
        } else {
            document.getElementById('reader').style.display = "none";
            if (document.getElementById('status')) document.getElementById('status').style.display = "none";
            resultMsg.style.display = "block";
            resultMsg.innerHTML = `Presença Confirmada!<br><small>${decodedText}</small>`;
        }
    })
    .catch(err => {
        console.error("Erro ao registrar presença no servidor:", err);
        alert("Erro de conexão ao simular.");
    });
}
