require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors()); // Permite que seu frontend HTML se comunique com esta API

const SECRET_KEY = process.env.SECRET_KEY; 

if (!SECRET_KEY) {
    console.error("ERRO FATAL: SECRET_KEY não está definida no arquivo .env!");
    process.exit(1); // Encerra o servidor para evitar falhas de segurança
}

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Obrigatório para acessar bancos na nuvem com segurança
    }
});

// Rota de Cadastro Seguro
app.post('/api/cadastro', async (req, res) => {
    console.log("\n=== NOVA TENTATIVA DE CADASTRO ===");
    console.log("Dados recebidos do site:", req.body);
    try {
        const { nome, email, senha, unidade } = req.body;
        
        // Verifica se já existe um usuário com este e-mail no PostgreSQL
        const usuarioExistente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
        }

        // Criptografa a senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        
        // Salva no PostgreSQL
        await pool.query(
            'INSERT INTO usuarios (nome, email, senha, unidade) VALUES ($1, $2, $3, $4)',
            [nome, email, senhaCriptografada, unidade]
        );
        
        res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota de Login Seguro
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (resultado.rows.length === 0) {
            return res.status(401).json({ erro: "Usuário não encontrado." });
        }

        const usuario = resultado.rows[0];

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: "Senha incorreta." });
        }

        const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, SECRET_KEY, { expiresIn: '24h' });
        
        res.json({ mensagem: "Login efetuado", token, nome: usuario.nome });
    } catch (erro) {
        console.error("Erro no login:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Middleware para verificar se o usuário está logado (tem um token válido)
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ erro: "Acesso negado. Token não fornecido." });
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ erro: "Token inválido ou expirado." });
        req.usuarioId = decoded.id; // Salva o ID do usuário na requisição para as próximas funções usarem
        next();
    });
}

// Rota para registrar uma nova presença lida no QR Code
app.post('/api/presencas', verificarToken, async (req, res) => {
    try {
        const { aula } = req.body;
        const dataAtual = new Date().toLocaleString('pt-BR');
        
        const resultado = await pool.query(
            'INSERT INTO presencas (usuario_id, aula, data) VALUES ($1, $2, $3) RETURNING *',
            [req.usuarioId, aula, dataAtual]
        );
        
        res.status(201).json({ mensagem: "Presença registrada com sucesso!", presenca: resultado.rows[0] });
    } catch (erro) {
        console.error("Erro ao registrar presença:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para buscar o histórico de presenças do usuário logado
app.get('/api/presencas', verificarToken, async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM presencas WHERE usuario_id = $1', [req.usuarioId]);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar histórico:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para buscar os dados do usuário logado
app.get('/api/usuario', verificarToken, async (req, res) => {
    try {
        // Busca os dados do usuário, mas NÃO retorna a senha por segurança
        const resultado = await pool.query('SELECT id, nome, email, unidade, foto_perfil FROM usuarios WHERE id = $1', [req.usuarioId]);
        if (resultado.rows.length === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
        
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao buscar dados do usuário:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para atualizar os dados ou a senha do usuário
app.put('/api/usuario', verificarToken, async (req, res) => {
    try {
        const { nome, unidade, senhaAtual, novaSenha, fotoPerfil } = req.body;

        // 1. Busca os dados atuais do usuário no banco
        const usuarioResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.usuarioId]);
        if (usuarioResult.rows.length === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
        const usuario = usuarioResult.rows[0];

        // 2. Prepara os dados para atualização (mantém o dado antigo se não for enviado um novo)
        let nomeAtualizado = nome || usuario.nome;
        let unidadeAtualizada = unidade || usuario.unidade;
        let fotoAtualizada = fotoPerfil || usuario.foto_perfil; // Mantém a foto se não mudar
        let senhaAtualizada = usuario.senha; // Mantém a senha criptografada atual como padrão

        // 3. Se o usuário enviou uma nova senha, fazemos a verificação de segurança
        if (novaSenha) {
            if (!senhaAtual) return res.status(400).json({ erro: "Para alterar a senha, informe a senha atual." });
            
            const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
            if (!senhaValida) return res.status(401).json({ erro: "Senha atual incorreta." });
            
            senhaAtualizada = await bcrypt.hash(novaSenha, 10);
        }

        // 4. Salva tudo no banco de dados
        const updateResult = await pool.query(
            'UPDATE usuarios SET nome = $1, unidade = $2, senha = $3, foto_perfil = $4 WHERE id = $5 RETURNING id, nome, email, unidade, foto_perfil',
            [nomeAtualizado, unidadeAtualizada, senhaAtualizada, fotoAtualizada, req.usuarioId]
        );

        res.json({ mensagem: "Dados atualizados com sucesso!", usuario: updateResult.rows[0] });
    } catch (erro) {
        console.error("Erro ao atualizar dados:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});