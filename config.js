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