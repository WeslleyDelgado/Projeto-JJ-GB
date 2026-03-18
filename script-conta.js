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
        } else {
            inputNome.value = usuario.nome;
            inputEmail.value = usuario.email;
            selectUnidade.value = usuario.unidade;
            
            if (usuario.foto_perfil) {
                imgPerfil.src = usuario.foto_perfil;
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