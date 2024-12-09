const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function main() {
  const email = 'adm@adm.com';
  const novaSenha = 'teste@123';

  let conexao;

  try {
    conexao = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Deixe vazio se não houver senha para o root
      database: 'controle_estoque'
    });

    console.log('Conectado ao banco de dados.');

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await conexao.execute('UPDATE usuarios SET senha = ? WHERE email = ?', [senhaHash, email]);
    console.log(`Senha atualizada para o usuário ${email}`);

  } catch (erro) {
    console.error('Ocorreu um erro:', erro);
  } finally {
    if (conexao) {
      await conexao.end();
      console.log('Conexão com o banco de dados encerrada.');
    }
  }
}

main();

