const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuração do CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'a3dfe50b08c90f7e492e6e3c43a912f0',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Configuração do banco de dados
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

// Middleware para verificar autenticação
const verificarAutenticacao = (req, res, next) => {
  console.log('Verificando autenticação. Session:', req.session);
  if (req.session.usuarioId) {
    console.log('Usuário autenticado:', req.session.usuarioId);
    next();
  } else {
    console.log('Usuário não autenticado');
    res.status(401).json({ error: 'Não autenticado' });
  }
};

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login
app.post('/api/login', (req, res) => {
  console.log('Requisição de login recebida:', req.body);

  const { email, senha } = req.body;
  if (!email || !senha) {
    console.warn('Login falhou: Email ou senha ausentes.');
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const query = 'SELECT * FROM usuarios WHERE email = ?';
  console.log('Executando query:', query, 'com email:', email);
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    console.log('Resultados da query:', results);

    if (results.length === 0) {
      console.warn('Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const usuario = results[0];
    console.log('Usuário encontrado:', usuario);

    try {
      console.log('Comparando senhas...');
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
      console.log('Senha correta?', senhaCorreta);
      if (!senhaCorreta) {
        console.warn('Senha incorreta para usuário:', email);
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      req.session.usuarioId = usuario.id;
      console.log('Sessão criada para o usuário:', usuario.id);
      console.log('Sessão completa:', req.session);
      res.json({ message: 'Login realizado com sucesso' });
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
});

// Rota para verificar autenticação
app.get('/api/verificar-auth', (req, res) => {
  console.log('Verificando autenticação. Session:', req.session);
  if (req.session.usuarioId) {
    console.log('Usuário autenticado:', req.session.usuarioId);
    res.json({ autenticado: true });
  } else {
    console.log('Usuário não autenticado');
    res.status(401).json({ autenticado: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  console.log('Requisição de logout recebida');
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    console.log('Logout realizado com sucesso');
    res.json({ message: 'Logout realizado com sucesso' });
  });
});

// Cadastro de usuário
app.post('/api/usuarios', async (req, res) => {
  console.log('Requisição de cadastro recebida:', req.body);
  const { email, senha } = req.body;

  if (!email || !senha) {
    console.warn('Cadastro falhou: Email ou senha ausentes.');
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    const query = 'INSERT INTO usuarios (email, senha) VALUES (?, ?)';
    console.log('Tentando inserir usuário:', email);
    db.query(query, [email, hashedSenha], (err, result) => {
      if (err) {
        console.error('Erro ao inserir usuário:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }
        return res.status(500).json({ error: err.message });
      }
      console.log('Usuário inserido com sucesso:', result);
      res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
    });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Fornecedores
app.post('/api/fornecedores', verificarAutenticacao, (req, res) => {
  console.log('Requisição para cadastrar fornecedor recebida:', req.body);
  const { razao_social, cpf_cnpj } = req.body;

  if (!razao_social || !cpf_cnpj) {
    console.warn('Cadastro de fornecedor falhou: Dados incompletos.');
    return res.status(400).json({ error: 'Razão social e CPF/CNPJ são obrigatórios' });
  }

  const query = 'INSERT INTO fornecedores (razao_social, cpf_cnpj) VALUES (?, ?)';
  db.query(query, [razao_social, cpf_cnpj], (err, result) => {
    if (err) {
      console.error('Erro ao inserir fornecedor:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'CPF/CNPJ já cadastrado' });
      }
      return res.status(500).json({ error: err.message });
    }
    console.log('Fornecedor inserido com sucesso:', result);
    res.status(201).json({ message: 'Fornecedor cadastrado com sucesso' });
  });
});

// Produtos
app.post('/api/produtos', verificarAutenticacao, (req, res) => {
  console.log('Requisição para cadastrar produto recebida:', req.body);
  const { codigo, descricao, tipo, valor_estimado } = req.body;

  if (!codigo || !descricao || !tipo || !valor_estimado) {
    console.warn('Cadastro de produto falhou: Dados incompletos.');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const query = 'INSERT INTO produtos (codigo, descricao, tipo, valor_estimado) VALUES (?, ?, ?, ?)';
  db.query(query, [codigo, descricao, tipo, valor_estimado], (err, result) => {
    if (err) {
      console.error('Erro ao inserir produto:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Código de produto já cadastrado' });
      }
      return res.status(500).json({ error: err.message });
    }
    console.log('Produto inserido com sucesso:', result);
    res.status(201).json({ message: 'Produto cadastrado com sucesso' });
  });
});

// Estoque
app.post('/api/estoque', verificarAutenticacao, (req, res) => {
  console.log('Requisição para atualizar estoque recebida:', req.body);
  const { produto_id, local, quantidade } = req.body;

  if (!produto_id || !local || !quantidade) {
    console.warn('Atualização de estoque falhou: Dados incompletos.');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const query = 'INSERT INTO estoque (produto_id, local, quantidade) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantidade = quantidade + VALUES(quantidade)';
  db.query(query, [produto_id, local, quantidade], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar estoque:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Estoque atualizado com sucesso:', result);
    res.status(201).json({ message: 'Estoque atualizado com sucesso' });
  });
});

app.get('/api/estoque', verificarAutenticacao, (req, res) => {
  console.log('Requisição para consultar estoque recebida');
  const query = `
    SELECT e.*, p.codigo, p.descricao
    FROM estoque e
    JOIN produtos p ON e.produto_id = p.id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar estoque:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Consulta de estoque bem-sucedida');
    res.json(results);
  });
});

// Movimentações
app.post('/api/movimentacoes', verificarAutenticacao, (req, res) => {
  console.log('Requisição para registrar movimentação recebida:', req.body);
  const { produto_id, local, tipo, quantidade } = req.body;

  if (!produto_id || !local || !tipo || !quantidade) {
    console.warn('Registro de movimentação falhou: Dados incompletos.');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const queryMovimentacao = 'INSERT INTO movimentacoes (produto_id, local, tipo, quantidade) VALUES (?, ?, ?, ?)';
  const queryEstoque = 'UPDATE estoque SET quantidade = quantidade + ? WHERE produto_id = ? AND local = ?';

  db.beginTransaction((err) => {
    if (err) {
      console.error('Erro ao iniciar transação:', err);
      return res.status(500).json({ error: err.message });
    }

    db.query(queryMovimentacao, [produto_id, local, tipo, quantidade], (err, result) => {
      if (err) {
        console.error('Erro ao inserir movimentação:', err);
        return db.rollback(() => {
          res.status(500).json({ error: err.message });
        });
      }

      const quantidadeAtualizada = tipo === 'entrada' ? quantidade : -quantidade;
      db.query(queryEstoque, [quantidadeAtualizada, produto_id, local], (err, result) => {
        if (err) {
          console.error('Erro ao atualizar estoque:', err);
          return db.rollback(() => {
            res.status(500).json({ error: err.message });
          });
        }

        db.commit((err) => {
          if (err) {
            console.error('Erro ao finalizar transação:', err);
            return db.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }
          console.log('Movimentação registrada com sucesso');
          res.status(201).json({ message: 'Movimentação registrada com sucesso' });
        });
      });
    });
  });
});

// Consultas
app.get('/api/consultas/produtos', verificarAutenticacao, (req, res) => {
  console.log('Requisição para consultar produtos recebida');
  const query = 'SELECT * FROM produtos';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar produtos:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Consulta de produtos bem-sucedida');
    res.json(results);
  });
});

app.get('/api/consultas/fornecedores', verificarAutenticacao, (req, res) => {
  console.log('Requisição para consultar fornecedores recebida');
  const query = 'SELECT * FROM fornecedores';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar fornecedores:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Consulta de fornecedores bem-sucedida');
    res.json(results);
  });
});

app.get('/api/consultas/movimentacoes', verificarAutenticacao, (req, res) => {
  console.log('Requisição para consultar movimentações recebida:', req.query);
  const { data_inicio, data_fim } = req.query;

  if (!data_inicio || !data_fim) {
    console.warn('Consulta de movimentações falhou: Datas não fornecidas.');
    return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
  }

  const query = `
    SELECT m.*, p.codigo, p.descricao
    FROM movimentacoes m
    JOIN produtos p ON m.produto_id = p.id
    WHERE m.data_movimentacao BETWEEN ? AND ?
  `;
  db.query(query, [data_inicio, data_fim], (err, results) => {
    if (err) {
      console.error('Erro ao consultar movimentações:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Consulta de movimentações bem-sucedida');
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

