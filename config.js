// Arquivo de configuração global
const API_BASE_URL = 'https://projeto-jj-gb.onrender.com'; // Sem a barra / no final

// Registra o Service Worker para tornar o app instalável (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('Service Worker registrado com sucesso!');
        }).catch(err => {
            console.warn('Erro ao registrar Service Worker:', err);
        });
    });
}

// Função global para cálculo de faixas (Reutilizada em vários scripts)
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
    if (total < 150) return { nome: "Faixa Branca", cor: "#f8f9fa", texto: "#2d3748", borda: "#cbd5e0" };
    if (total < 300) return { nome: "Faixa Azul", cor: "#3182ce", texto: "#ffffff", borda: "#2b6cb0" };
    if (total < 450) return { nome: "Faixa Roxa", cor: "#805ad5", texto: "#ffffff", borda: "#6b46c1" };
    if (total < 600) return { nome: "Faixa Marrom", cor: "#744210", texto: "#ffffff", borda: "#5f370e" };
    return { nome: "Faixa Preta", cor: "#1a202c", texto: "#ffffff", borda: "#000000" };
}

// Função global para requisições na API (Simplifica o fetch e trata o "despertar" do Render)
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...options.headers };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (options.token) {
        headers['Authorization'] = options.token;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        const text = await response.text();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            // Se o Render devolver HTML em vez de JSON (servidor dormindo/reiniciando)
            throw new Error("O servidor está reiniciando ou indisponível. Aguarde um instante e tente de novo.");
        }
    } catch (error) {
        console.error(`Erro na requisição para ${endpoint}:`, error);
        throw error;
    }
}