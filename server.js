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

// Rota para Recuperação de Senha (Simulação / MVP)
app.post('/api/recuperar-senha', async (req, res) => {
    try {
        const { email } = req.body;
        const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: "E-mail não encontrado no sistema." });
        }

        // Em um sistema real, aqui você usaria uma biblioteca (como Nodemailer) para enviar um e-mail com link de redefinição.
        res.json({ mensagem: "Simulação: As instruções para redefinir sua senha foram enviadas para o seu e-mail!" });
    } catch (erro) {
        console.error("Erro na recuperação de senha:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota de Login do Administrador
app.post('/api/admin/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    // Credenciais do administrador (você pode alterar para o que quiser)
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ mensagem: "Login autorizado", token });
    } else {
        res.status(401).json({ erro: "Usuário ou senha de administrador incorretos." });
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

// Middleware de segurança exclusivo para o Administrador
function verificarTokenAdmin(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ erro: "Acesso negado." });
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err || decoded.role !== 'admin') {
            return res.status(401).json({ erro: "Acesso restrito a administradores." });
        }
        next();
    });
}

// Rota para registrar uma nova presença lida no QR Code
app.post('/api/presencas', verificarToken, async (req, res) => {
    try {
        const { aula } = req.body;
        
        // Força o fuso horário do Brasil (Garante que aulas à noite não caiam no dia seguinte no servidor UTC)
        const opcoesData = { timeZone: 'America/Sao_Paulo' };
        const dataLocal = new Date();
        
        const dataAtual = dataLocal.toLocaleString('pt-BR', opcoesData);
        const dataHoje = dataLocal.toLocaleDateString('pt-BR', opcoesData); 
        
        // 1. Verifica se já existe uma presença deste aluno no dia de hoje
        const verificacao = await pool.query(
            'SELECT * FROM presencas WHERE usuario_id = $1 AND data LIKE $2',
            [req.usuarioId, `${dataHoje}%`]
        );
        
        if (verificacao.rows.length > 0) {
            return res.status(400).json({ erro: "Você já registrou sua presença hoje! Bom descanso e até amanhã." });
        }
        
        // 2. Se não existir, salva a nova presença
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

// Rota para o Administrador ver TODAS as presenças
app.get('/api/admin/presencas', verificarTokenAdmin, async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.aula, p.data, u.nome, u.unidade 
            FROM presencas p 
            JOIN usuarios u ON p.usuario_id = u.id 
            ORDER BY p.id DESC
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar presenças para admin:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para o Administrador ver todos os alunos e suas faixas
app.get('/api/admin/alunos', verificarTokenAdmin, async (req, res) => {
    try {
        const query = `
            SELECT id, nome, email, unidade, faixa, foto_perfil, 
                   (SELECT COUNT(*) FROM presencas p WHERE p.usuario_id = u.id) as total_presencas 
            FROM usuarios u 
            ORDER BY nome ASC
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (erro) {
        console.error("Erro ao buscar alunos para admin:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para o Administrador alterar a faixa de um aluno
app.put('/api/admin/alunos/:id/faixa', verificarTokenAdmin, async (req, res) => {
    try {
        const { faixa } = req.body;
        const alunoId = req.params.id;
        
        // Se vier vazio (""), gravamos como null no banco (modo automático)
        const valorFaixa = faixa === "" ? null : faixa;
        
        await pool.query('UPDATE usuarios SET faixa = $1 WHERE id = $2', [valorFaixa, alunoId]);
        res.json({ mensagem: "Faixa atualizada com sucesso!" });
    } catch (erro) {
        console.error("Erro ao atualizar faixa do aluno:", erro);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para o Administrador editar os dados do aluno (Nome, E-mail, Unidade)
app.put('/api/admin/alunos/:id', verificarTokenAdmin, async (req, res) => {
    try {
        const { nome, email, unidade } = req.body;
        const alunoId = req.params.id;
        
        await pool.query(
            'UPDATE usuarios SET nome = $1, email = $2, unidade = $3 WHERE id = $4',
            [nome, email, unidade, alunoId]
        );
        res.json({ mensagem: "Dados do aluno atualizados com sucesso!" });
    } catch (erro) {
        console.error("Erro ao atualizar aluno:", erro);
        // Código 23505 do PostgreSQL significa "Violação de Unicidade" (E-mail já existe)
        if (erro.code === '23505') {
            return res.status(400).json({ erro: "Este e-mail já está em uso por outro aluno." });
        }
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para buscar os dados do usuário logado
app.get('/api/usuario', verificarToken, async (req, res) => {
    try {
        // Busca os dados do usuário, mas NÃO retorna a senha por segurança
        const query = `
            SELECT id, nome, email, unidade, foto_perfil, faixa,
                   (SELECT COUNT(*) FROM presencas WHERE usuario_id = $1) as total_presencas 
            FROM usuarios u WHERE id = $1
        `;
        const resultado = await pool.query(query, [req.usuarioId]);
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