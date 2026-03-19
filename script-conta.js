window.onload = function() {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        alert("Faça login para acessar sua conta.");
        window.location.href = "index.html";
        return;
    }

    // Elementos do formulário
    const inputNome = document.getElementById('edit-nome');
    const inputEmail = document.getElementById('edit-email');
    const selectUnidade = document.getElementById('edit-unidade');
    const imgPerfil = document.getElementById('img-perfil');
    const inputFoto = document.getElementById('input-foto');
    let fotoBase64 = null; // Variável para guardar a foto em texto

    // Busca os dados do usuário no servidor
    fetch(`${API_BASE_URL}/api/usuario`, {
        method: 'GET',
        headers: {
            'Authorization': token
        }
    })
    .then(response => response.json())
    .then(usuario => {
        if (usuario.erro) {
            alert(usuario.erro);
            if (usuario.erro.includes("Token") || usuario.erro.includes("Acesso negado") || usuario.erro.includes("não encontrado")) {
                localStorage.removeItem('auth_token'); // Limpa a sujeira apenas se for erro de autenticação
                window.location.href = "index.html"; // Redireciona para login
            }
        } else {
            inputNome.value = usuario.nome;
            inputEmail.value = usuario.email;
            selectUnidade.value = usuario.unidade;
            
            if (usuario.foto_perfil) {
                imgPerfil.src = usuario.foto_perfil;
            }

            // Lógica da Faixa
            const faixa = calcularFaixa(usuario.total_presencas || 0, usuario.faixa);
            const badgeFaixa = document.getElementById('conta-faixa');
            if (badgeFaixa) {
                badgeFaixa.innerText = faixa.nome + " (" + usuario.total_presencas + " aulas)";
                badgeFaixa.style.backgroundColor = faixa.cor;
                badgeFaixa.style.color = faixa.texto;
                badgeFaixa.style.border = `1px solid ${faixa.borda}`;
                badgeFaixa.style.display = "inline-block";
            }
        }
    })
    .catch(error => {
        console.error("Erro ao carregar dados da conta:", error);
        inputNome.value = "Erro ao carregar";
    });

    // Leitor de arquivo da foto de perfil
    inputFoto.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                fotoBase64 = event.target.result; // Converte em Base64
                imgPerfil.src = fotoBase64;       // Mostra a prévia na tela
            };
            reader.readAsDataURL(file);
        }
    });

    // Lógica para atualizar os dados
    document.getElementById('form-atualizar').addEventListener('submit', function(e) {
        e.preventDefault();

        const nome = inputNome.value;
        const unidade = selectUnidade.value;
        const senhaAtual = document.getElementById('edit-senha-atual').value;
        const novaSenha = document.getElementById('edit-nova-senha').value;
        const btnSalvar = document.getElementById('btn-salvar');

        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        btnSalvar.disabled = true;

        // Monta o pacote de dados. Só envia senhas se o usuário tentou alterá-las.
        const dadosAtualizados = { nome, unidade };
        if (fotoBase64) dadosAtualizados.fotoPerfil = fotoBase64; // Adiciona a foto se alterada
        
        if (novaSenha || senhaAtual) {
            dadosAtualizados.senhaAtual = senhaAtual;
            dadosAtualizados.novaSenha = novaSenha;
        }

        fetch(`${API_BASE_URL}/api/usuario`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(dadosAtualizados)
        })
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                alert(data.erro);
            } else {
                alert(data.mensagem || "Dados atualizados com sucesso!");
                // Limpa os campos de senha após o sucesso
                document.getElementById('edit-senha-atual').value = '';
                document.getElementById('edit-nova-senha').value = '';
                
                // Atualiza o nome salvo localmente para refletir na tela principal
                localStorage.setItem('usuario_nome', data.usuario.nome.split(' ')[0]);
            }
        })
        .catch(error => {
            console.error("Erro ao atualizar dados:", error);
            alert("Erro de conexão ao tentar atualizar os dados.");
        })
        .finally(() => {
            btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
            btnSalvar.disabled = false;
        });
    });

    // Lógica para sair da conta (Logout)
    document.getElementById('btn-logout').addEventListener('click', function() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('usuario_nome');
        window.location.href = "index.html";
    });
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