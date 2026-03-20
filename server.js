require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '10mb' })); // Aumenta o limite de dados para aceitar fotos em Base64
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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
    } catch (error_) {
        console.error("Erro no cadastro:", error_);
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
    } catch (error_) {
        console.error("Erro no login:", error_);
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
    } catch (error_) {
        console.error("Erro na recuperação de senha:", error_);
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
    } catch (error_) {
        console.error("Erro ao registrar presença:", error_);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para buscar o histórico de presenças do usuário logado
app.get('/api/presencas', verificarToken, async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM presencas WHERE usuario_id = $1', [req.usuarioId]);
        res.json(resultado.rows);
    } catch (error_) {
        console.error("Erro ao buscar histórico:", error_);
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
    } catch (error_) {
        console.error("Erro ao buscar presenças para admin:", error_);
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
    } catch (error_) {
        console.error("Erro ao buscar alunos para admin:", error_);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para o Administrador alterar a faixa de um aluno
app.put('/api/admin/alunos/:id/faixa', verificarTokenAdmin, async (req, res) => {
    try {
        const { faixa, promovidoPor } = req.body;
        const alunoId = req.params.id;
        
        // Se vier vazio (""), gravamos como null no banco (modo automático)
        const valorFaixa = faixa === "" ? null : faixa;
        
        await pool.query('UPDATE usuarios SET faixa = $1 WHERE id = $2', [valorFaixa, alunoId]);

        // Grava no histórico se não for automático
        if (valorFaixa) {
            const mestre = promovidoPor || 'Administrador';
            try {
                await pool.query('INSERT INTO historico_graduacao (usuario_id, faixa, promovido_por) VALUES ($1, $2, $3)', [alunoId, valorFaixa, mestre]);
            } catch(e) {
                console.warn("Aviso: Tabela historico_graduacao não existe no banco.", e.message);
            }
        }

        res.json({ mensagem: "Faixa atualizada com sucesso!" });
    } catch (error_) {
        console.error("Erro ao atualizar faixa do aluno:", error_);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para buscar o histórico de graduação do aluno
app.get('/api/admin/alunos/:id/graduacao', verificarTokenAdmin, async (req, res) => {
    try {
        const alunoId = req.params.id;
        let historico = [];
        try {
            const result = await pool.query('SELECT faixa, promovido_por, data FROM historico_graduacao WHERE usuario_id = $1 ORDER BY data DESC', [alunoId]);
            historico = result.rows;
        } catch(e) {} // Fallback se a tabela ainda não foi criada
        
        res.json(historico);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar histórico." });
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
    } catch (error_) {
        console.error("Erro ao atualizar aluno:", error_);
        // Código 23505 do PostgreSQL significa "Violação de Unicidade" (E-mail já existe)
        if (error_.code === '23505') {
            return res.status(400).json({ erro: "Este e-mail já está em uso por outro aluno." });
        }
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota para o Administrador excluir um aluno
app.delete('/api/admin/alunos/:id', verificarTokenAdmin, async (req, res) => {
    try {
        const alunoId = req.params.id;
        
        // Exclui as presenças do aluno primeiro (para evitar erro de vínculo no banco)
        await pool.query('DELETE FROM presencas WHERE usuario_id = $1', [alunoId]);
        
        // Em seguida, exclui o usuário
        await pool.query('DELETE FROM usuarios WHERE id = $1', [alunoId]);

        res.json({ mensagem: "Aluno e histórico excluídos com sucesso!" });
    } catch (error_) {
        console.error("Erro ao excluir aluno:", error_);
        res.status(500).json({ erro: "Erro interno no servidor ao tentar excluir o aluno." });
    }
});

// Rota para o Administrador redefinir a senha de um aluno
app.post('/api/admin/alunos/:id/reset-senha', verificarTokenAdmin, async (req, res) => {
    try {
        const alunoId = req.params.id;
        const senhaTemporaria = 'Mudar123'; // Senha padrão

        // Criptografa a nova senha
        const senhaCriptografada = await bcrypt.hash(senhaTemporaria, 10);

        // Atualiza a senha no banco de dados
        await pool.query(
            'UPDATE usuarios SET senha = $1 WHERE id = $2',
            [senhaCriptografada, alunoId]
        );

        res.json({ mensagem: `Senha redefinida com sucesso! A nova senha temporária é: ${senhaTemporaria}` });
    } catch (error_) {
        console.error("Erro ao redefinir senha do aluno:", error_);
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
    } catch (error_) {
        console.error("Erro ao buscar dados do usuário:", error_);
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
    } catch (error_) {
        console.error("Erro ao atualizar dados:", error_);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================
// SISTEMA DE AGENDAMENTO DE AULAS
// ==========================================

// Admin: Criar uma nova aula na agenda
app.post('/api/admin/aulas-programadas', verificarTokenAdmin, async (req, res) => {
    try {
        const { titulo, dataHora, limiteVagas, unidade } = req.body;
        const resultado = await pool.query(
            'INSERT INTO aulas_programadas (titulo, data_hora, limite_vagas, unidade) VALUES ($1, $2, $3, $4) RETURNING *',
            [titulo, dataHora, limiteVagas, unidade]
        );
        res.status(201).json({ mensagem: "Aula programada com sucesso!", aula: resultado.rows[0] });
    } catch (error) {
        console.error("Erro ao criar aula programada:", error);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Admin: Buscar todas as aulas programadas (para gerenciamento)
app.get('/api/admin/aulas-programadas', verificarTokenAdmin, async (req, res) => {
    try {
        const query = `
            SELECT ap.*, 
                   (SELECT COUNT(*) FROM agendamentos ag WHERE ag.aula_id = ap.id) as vagas_ocupadas
            FROM aulas_programadas ap
            ORDER BY ap.data_hora DESC
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Admin: Deletar uma aula programada
app.delete('/api/admin/aulas-programadas/:id', verificarTokenAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM aulas_programadas WHERE id = $1', [req.params.id]);
        res.json({ mensagem: "Aula removida com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Todos: Buscar aulas programadas futuras com contagem de vagas
app.get('/api/aulas-programadas', verificarToken, async (req, res) => {
    try {
        // Retorna aulas a partir de hoje e conta quantos agendamentos existem
        const query = `
            SELECT ap.*, 
                   (SELECT COUNT(*) FROM agendamentos ag WHERE ag.aula_id = ap.id) as vagas_ocupadas,
                   EXISTS(SELECT 1 FROM agendamentos ag WHERE ag.aula_id = ap.id AND ag.usuario_id = $1) as ja_agendado
            FROM aulas_programadas ap
            WHERE ap.data_hora >= CURRENT_DATE
            ORDER BY ap.data_hora ASC
        `;
        const resultado = await pool.query(query, [req.usuarioId]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Erro ao buscar aulas programadas:", error);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Aluno: Fazer um agendamento
app.post('/api/agendamentos', verificarToken, async (req, res) => {
    try {
        const { aulaId } = req.body;
        
        // 1. Verifica se a aula existe e se tem vaga
        const aulaResult = await pool.query('SELECT limite_vagas FROM aulas_programadas WHERE id = $1', [aulaId]);
        if (aulaResult.rows.length === 0) return res.status(404).json({ erro: "Aula não encontrada." });
        const limite = aulaResult.rows[0].limite_vagas;

        const ocupadasResult = await pool.query('SELECT COUNT(*) as count FROM agendamentos WHERE aula_id = $1', [aulaId]);
        const ocupadas = parseInt(ocupadasResult.rows[0].count);

        if (ocupadas >= limite) {
            return res.status(400).json({ erro: "Esta aula já está com a capacidade máxima." });
        }

        // 2. Realiza o agendamento (o UNIQUE constraint vai barrar agendamentos duplicados)
        await pool.query('INSERT INTO agendamentos (usuario_id, aula_id) VALUES ($1, $2)', [req.usuarioId, aulaId]);
        
        res.status(201).json({ mensagem: "Vaga reservada com sucesso!" });
    } catch (error) {
        console.error("Erro ao agendar:", error);
        if (error.code === '23505') { // Código do Postgres para Violação de Unicidade
            return res.status(400).json({ erro: "Você já está agendado para esta aula." });
        }
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Aluno: Cancelar um agendamento
app.delete('/api/agendamentos/:aulaId', verificarToken, async (req, res) => {
    try {
        const { aulaId } = req.params;
        await pool.query('DELETE FROM agendamentos WHERE usuario_id = $1 AND aula_id = $2', [req.usuarioId, aulaId]);
        res.json({ mensagem: "Reserva cancelada com sucesso." });
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});