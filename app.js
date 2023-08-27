const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const port = process.env.PORT || 8000;
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const { query } = require('express');

app.use(express.static('www'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// variáveis usadas nas outras páginas do projeto
var nometarefa = "";
var arqproj;
var nomeproj = "";
var descproj = "";
//

const publicDirectoryPath = path.join(__dirname, 'www');

app.use(express.static(publicDirectoryPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor está executando`);
});

const pool = mysql.createPool({
  host: 'containers-us-west-91.railway.app',
  user: 'root',
  password: 'GnmUmmYf7h8IINotqiR3',
  port: 7380,
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 0,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conexão estabelecida com o banco de dados.');
  connection.release();
});

app.post('/salvar-conta', function(req, res) {
  const usucad = req.body.usuario;
  const emailcad = req.body.email;
  const sencad = req.body.senha;
  const tag = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);
  
  pool.query("SELECT COUNT(*) AS count FROM contas WHERE nick = ? OR email = ?", [usucad, emailcad], (err, result) => {
    if (err) {
      res.status(500).send('Erro ao verificar a existência do usuário ou e-mail no banco de dados.');
      return;
    }

    if (result[0].count > 0) {
      res.status(500).send('Usuário ou e-mail já cadastrados.');
      return;
    }

    pool.query("INSERT INTO contas (nick, nicktag, email, senha) VALUES (?, ?, ?, ?)", [usucad, tag, emailcad, sencad], (err, result) => {
      if (err) {
        res.status(500).send('Erro ao salvar a conta no banco de dados.');
        return;
      }

      res.send('Conta salva com sucesso!');
    });
  });
});

app.post('/fazer-login', function (req, res) {
  const usu = req.body.usu;
  const sen = req.body.sen;

  pool.getConnection((err, conn) => {
    if (err) {
      console.error('Erro ao se conectar ao banco de dados:', err);
      res.status(500).send('Erro ao se conectar ao banco de dados.');
      return;
    }

    conn.query('SELECT * FROM contas WHERE nick = ? AND senha = ?', [usu, sen], (err, result) => {

      if (err) {
        console.error('Erro ao realizar a consulta ao banco de dados:', err);
        res.status(500).send('Erro ao realizar a consulta ao banco de dados.');
        return;
      }

      if (result.length > 0) {
        usertag = result[0].nicktag;
        islogged = 1;
        usuario = usu;
        res.redirect('index3.html');
      } else {
        res.status(401).send('Usuário ou senha inválidos');
      }
    });
  });
});

app.post('/salvar-projeto', async (req, res) => {
  const usertag = req.query.usertag;
  const descproj = req.body.descproj;
  const tag = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);
  const nomeproj = req.body.nomeproj + "#" + tag;

  pool.query("SELECT COUNT(*) AS count FROM projetos WHERE criador = ? AND nome = ?", [usertag, nomeproj], (error, result) => {
    if (error) {
      console.error('Erro ao consultar o banco de dados.', error);
      return res.status(500).send('Erro ao consultar o banco de dados.');
    } 
    if (result[0].count > 0) {
      return res.send('Um projeto com o mesmo nome já existe!');
    } else {
      try {
        pool.query("INSERT INTO projetos (nome, descricao, criador, projtag) VALUES (?, ?, ?, ?)", [nomeproj, descproj, usertag, tag], (error) => {
          if (error) {
            console.error('Erro ao salvar o projeto no banco de dados.', error);
            return res.status(500).send('Erro ao salvar o projeto no banco de dados.');
          }
          
          return res.send('Projeto salvo com sucesso!');
        });
      } catch (error) {
        console.error('Erro ao salvar o projeto no banco de dados.', error);
        return res.status(500).send('Erro ao salvar o projeto no banco de dados.');
      }
    }
  });
});


app.post('/mudar-info', function (req, res) {

  const usertag = req.query.usertag;
  const usuchg = req.body.usuchg;
  const emailchg = req.body.emailchg;
  const senchg = req.body.senchg;
  let sql = "UPDATE contas SET";

  const params = [];

  if (usuchg) {
    sql += " nick = ?";
    params.push(usuchg);
  }
  if (emailchg) {
    sql += " email = ?";
    params.push(emailchg);
  }
  if (senchg) {
    sql += " senha = ?";
    params.push(senchg);
  }
  if (!usuchg && !emailchg && !senchg) {
    res.status(400).send('Nenhum dado foi fornecido para atualização.');
    return;
  }

  sql += " WHERE nicktag = ?";
  params.push(usertag);
 
      const result = pool.query(sql, params);

      res.send('Informação atualizada com sucesso!');
});

app.post('/verificar-login', function (req, res) {
  const usu = req.body.usuario;

  pool.getConnection((err, conn) => {
    if (err) {
      console.error('Error getting database connection:', err);
      const data = {
        islogged: 0
      };
      res.json(data);
      return;
    }

    conn.query('SELECT nicktag FROM contas WHERE nick = ?', [usu], (err, result) => {
      conn.release();

      if (err) {
        console.error('Error executing query:', err);
        const data = {
          islogged: 0
        };
        res.json(data);
        return;
      }

      if (result.length > 0) {
        const data = {
          username: result[0].nicktag
        };
        res.json(data);
      } else {
        const data = {
          islogged: 0
        };
        res.json(data);
      }
    });
  });
});


app.get('/carregar-projetos', async function (req, res) {
  const usertag = req.query.usertag;
  try {
    const projetos = [];
    pool.query("SELECT nome FROM projetos WHERE criador = ? UNION SELECT projetos.nome FROM projetos INNER JOIN membros ON projetos.projtag = membros.projtag WHERE membros.usertag = ?", [usertag, usertag], (error, result) => {
      if (error) {
        console.error('Erro ao consultar o banco de dados.', error);
        return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
      }
      
      result.forEach(row => {
        projetos.push(row.nome);
      });

      res.send(projetos);
    });
  } catch (error) {
    console.error('Erro ao buscar os projetos no banco de dados.', error);
    res.status(500).send('Erro ao buscar os projetos no banco de dados.');
  }
});

app.get('/carregar-solicitacoes', async function(req, res) {
  var solicitacoes = [];
  const usertag = req.query.usertag;

  try {
    const result = await conn.query("SELECT projtag FROM notificacoes WHERE usertag = ?", [usertag]);
    
    const results = await Promise.all(result.map(row => {
      return conn.query("SELECT projetos.nome FROM projetos WHERE projtag = ?", [row.projtag]);
    }));

    results.forEach(result => {
      if (result.length > 0) {
        var linhasolicitacao = "Convite para o projeto " + result[0].nome;
        solicitacoes.push(linhasolicitacao);
      }
    });

    res.send(solicitacoes);
    conn.release();
  } catch (error) {
    res.status(500).send('Erro ao buscar as solicitações no banco de dados.');
  }
});

  app.post('/selecao-proj', async function (req, res) {
    const prj = req.body.prj;
    const usertag = req.query.usertag;
    try {
      pool.query('SELECT nome, descricao, projtag, criador FROM projetos WHERE nome = ?', [prj], (error, result) => {
        if (error) {
          console.error('Erro ao consultar o banco de dados.', error);
          return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
        }
  
      const nomeproj = result[0].nome;
      const descproj = result[0].descricao;
      const projtag = result[0].projtag;
  
      let iscriador = "0";
  
      if (usertag == result[0].criador) {
      iscriador = "1";
      }
  
      res.json({ nomeproj, descproj, projtag, iscriador });
    })
    } catch (error) {
      res.status(500).send('Erro ao salvar o texto no banco de dados.');
    }
  });  
  
  app.post('/info-proj', async function(req, res) {
    try {
      const conn = await pool.getConnection();
      const data = {
        nome: nomeproj,
        descricao: descproj,
        iscriador: iscriador
      };
      res.json(data);
      conn.release();
    } catch (error) {
      res.status(500).send('Erro ao buscar informações do projeto no banco de dados.');
    }
  });  

  app.post('/cad-tarefa', async function (req, res) {
    try {
      const tardesc = req.body.tardesc;
      const tagtarefa = req.body.tagtarefa;
      const projtag = req.query.projtag;
      const usertag = req.query.usertag;
      const tarnome = req.body.tarnome + "#" + tagtarefa;
      const datatarefa = req.body.datatarefa;

      pool.query('SELECT tarefas_pend, log FROM projetos WHERE projtag = ?', [projtag], (error, result) => {
        if (error) {
          console.error('Erro ao consultar o banco de dados.', error);
          return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
        }
  
      const newTarefasPend = result[0].tarefas_pend + 1;
      let logText = result[0].log;
  
      if (logText) {
        logText += '\nUsuário #' + usertag + ' criou a tarefa ' + tarnome;
      } else {
        logText = '\nUsuário #' + usertag + ' criou a tarefa ' + tarnome;
      }
  
      pool.query('UPDATE projetos SET tarefas_pend = ?, log = ? WHERE projtag = ?', [newTarefasPend, logText, projtag]);
  
      pool.query("INSERT INTO tarefas (nome_tarefa, desc_tarefa, tag_tarefa, projtag, criador, finalizada, excluida, data) VALUES (?, ?, ?, ?, ?, 0, 0, ?)", [tarnome, tardesc, tagtarefa, projtag, usertag, datatarefa]);
  
      res.send('Tarefa salva com sucesso!');
    } 
      )}
      catch (error) {
      console.error('Erro ao cadastrar tarefa:', error);
      res.status(500).send('Erro ao cadastrar tarefa');
    }
  });  

  app.post('/get-tarefas', async (req, res) => {
    const projtag = req.query.projtag;
    try {
      pool.query('SELECT nome_tarefa, desc_tarefa, criador, data FROM tarefas WHERE projtag = ? AND finalizada = 0 AND excluida = 0',[projtag], (error, result) => {
        if (error) {
          console.error('Erro ao consultar o banco de dados.', error);
          return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
        }
  
      const data = result.map(row => ({
        tarefa: row.nome_tarefa,
        desctarefa: row.desc_tarefa,
        criador: row.criador,
        data: row.data
      }));
      res.json(data);
    } 
      )}
    catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  });  

    app.post('/get-tarefasarq', async function (req, res) {
      const projtag = req.query.projtag;
      try {
        pool.query('SELECT nome_tarefa, desc_tarefa, criador FROM tarefas WHERE projtag = ? AND finalizada = 1 AND excluida = 0', [projtag], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
    
        const data = result.map(row => ({
          tarefa: row.nome_tarefa,
          desctarefa: row.desc_tarefa,
          criador: row.criador
        }));
    
        res.json(data);
      } 
        )}
      catch (error) {
        console.error(error);
        res.sendStatus(500);
      }
    });    
    
    app.post('/escolher-tarefa', async (req, res) => {
      const nometarefa = req.query.selectext;
    
      try {
        pool.query('SELECT nome_tarefa, desc_tarefa, criador, code FROM tarefas WHERE nome_tarefa = ?', [nometarefa], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
        
        const data = result.map(row => {
          return {
            tarefa: row.nome_tarefa,
            desctarefa: row.desc_tarefa,
            criador: row.criador,
            code: row.code
          };
        });
        
        res.json(data);
      } 
        )}
        catch (error) {
        console.log(error);
        res.sendStatus(500);
      }
    });    

    app.post('/salvar-tarefa', async function(req, res) {
      const code = req.body.code;
      const nometrf = req.body.nometrf;
      const projtag = req.query.projtag;
      const usertag = req.query.usertag;
    
      try {
        pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }

        if (result.length > 0 && result[0].log) {
          let logText = '';
          logText = result[0].log + '\n';
          logText += `Usuário #${usertag} alterou detalhes da tarefa ${nometrf}`;
        }
        
        
        pool.query('UPDATE projetos SET log = ? WHERE projtag = ?', [logText, projtag]);
        pool.query('UPDATE tarefas SET code = ? WHERE nome_tarefa = ?', [code, nometrf]);
    
        res.send('Tarefa salva com sucesso!');
      } 
        )}
      catch (error) {
        res.status(500).send('Erro ao salvar a tarefa.');
      }
    });    
    

    app.post('/excluir-tarefa', function(req, res) {
      const nometrf = req.body.nometrf;
      const projtag = req.query.projtag;
      const usertag = req.query.usertag;
    
      try {

        pool.query('UPDATE projetos SET tarefas_pend = tarefas_pend - 1, tarefas_exc = tarefas_exc + 1 WHERE projtag = ?', [projtag]);
    
        pool.query('UPDATE tarefas SET excluida = 1 WHERE nome_tarefa = ?', [nometrf]);

        pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
        let log = result[0].log || '';
    
        log += '\nUsuário #' + usertag + ' excluiu a tarefa ' + nometrf;

        pool.query('UPDATE projetos SET log = ? WHERE projtag = ?', [log, projtag]);
    
        pool.query('DELETE FROM tarefas WHERE nome_tarefa = ?', [nometrf]);
    
        res.send('Tarefa excluída com sucesso!');        
      })
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        res.status(500).send('Ocorreu um erro ao excluir a tarefa.');
      }
    });
    
    app.post('/finalizar-projeto', function(req, res) {
          const projtag = req.query.projtag;
          const usertag = req.query.usertag;
          pool.query('UPDATE projetos SET criador = 0000, projtag = 0000, arqcriador = ?, arqprojtag = ? WHERE projtag = ?', [usertag, projtag, projtag])
          pool.query('DELETE FROM membros WHERE projtag = ?', [projtag])
          res.send('Projeto finalizado com sucesso!');
    });
      
    app.post('/finalizar-tarefa', async function(req, res) {
      try {
        const nometrf = req.body.nometrf;
        const projtag = req.query.projtag;
        const usertag = req.query.usertag;
    
        pool.query('UPDATE projetos SET tarefas_pend = tarefas_pend - 1, tarefas_conc = tarefas_conc + 1 WHERE projtag = ?', [projtag]);
        pool.query('UPDATE tarefas SET finalizada = 1 WHERE nome_tarefa = ?', [nometrf]);
    
        const logResult = pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag]);
        const log = logResult.log;
        const message = `Usuário #${usertag} finalizou a tarefa ${nometrf}`;
    
        if (log) {
          pool.query('UPDATE projetos SET log = CONCAT(log, "\n", ?) WHERE projtag = ?', [message, projtag]);
        } else {
          pool.query('UPDATE projetos SET log = ? WHERE projtag = ?', [message, projtag]);
        }
    
        res.send('Tarefa finalizada com sucesso!');
      } catch (error) {
        console.error('Erro ao finalizar a tarefa:', error);
        res.status(500).send('Erro ao finalizar a tarefa.');
      }
    });
    
    
      
    app.post('/dados-tarefas', function (req, res) {
      const projtag = req.query.projtag;
    
      pool.query('SELECT tarefas_conc, tarefas_pend, tarefas_exc FROM projetos WHERE projtag = ?', [projtag], function(error, result) {
        if (error) {
          console.log(error);
          return res.sendStatus(500);
        }
    
        const data = result.map(row => {
          return {
            tarefas_conc: row.tarefas_conc,
            tarefas_pend: row.tarefas_pend,
            tarefas_exc: row.tarefas_exc
          };
        });
    
        res.json(data);
      });
    });
    
      
    app.post('/aceitar-convite', async function(req, res) {
      const usertag = req.query.usertag;
      const nomeprojeto = req.body.nomeproj;
      var projtag = 0;
    
      try {
        const result1 = await pool.query('SELECT projtag FROM projetos WHERE nome = ?', [nomeprojeto]);
        projtag = result1[0].projtag;
    
        await pool.query('INSERT INTO membros (projtag, usertag) VALUES (?, ?)', [projtag, usertag]);
        await pool.query('DELETE FROM notificacoes WHERE projtag = ? AND usertag = ?', [projtag, usertag]);
    
        res.send('Adicionado com sucesso!');
      } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).send(error.message);
      }
    });       
      
    app.post('/recusar-convite', async function(req, res) {
      const usertag = req.query.usertag;
      const nomeprojeto = req.body.nomeproj;
      var projtag = 0;
      var logText;
    
      try {
        const result = await pool.query('SELECT projtag FROM projetos WHERE nome = ?', [nomeprojeto]);
        projtag = result[0].projtag;
    
        await pool.query('DELETE FROM notificacoes WHERE projtag = ? AND usertag = ?', [projtag, usertag]);
    
        res.send('Recusado com sucesso!');
      } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).send(error.message);
      }
    });    
    
    app.post('/add-membro', async function(req, res) {
      const projtag = req.query.projtag;
      const mbr1 = req.body.mbr1;
    
      try {
        pool.query('SELECT * FROM notificacoes WHERE projtag = ? AND usertag = ?',[projtag, mbr1], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
        if (result.length > 0) {
          res.status(500).send('Erro: essa combinação de informações já existe na tabela!');
        } else {
          pool.query("INSERT INTO notificacoes (projtag, usertag) VALUES (?, ?)", [projtag, mbr1]);
    
          pool.query("SELECT log FROM projetos WHERE projtag = ?", [projtag]);
    
          res.send('Solicitação enviada com sucesso!');
        }
      })
      } catch (error) {
        console.error('Erro:', error);
        res.status(500).send('Ocorreu um erro ao processar a solicitação.');
      }
    });    

    app.post('/rmv-membro', async function(req, res) {
      const projtag = req.query.projtag;
      const mbr1 = req.body.mbr2;
    
      try {
        pool.query('SELECT nick FROM contas WHERE nicktag = ?', [mbr1], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
        
        if (result.length === 0) {
          res.status(500).send('Usuário não encontrado!');
          return;
        }
    
        pool.query('DELETE FROM membros WHERE usertag = ? AND projtag = ?', [mbr1, projtag]);
    
        let log = pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag]);
        log = log[0].log || '';
        log += `\nUsuário #" + usertag + " removeu o membro ${mbr1} do projeto.`;
    
        pool.query('UPDATE projetos SET log = ? WHERE projtag = ?', [log, projtag]);
    
        res.send('Membro removido com sucesso!');
      })
      } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao executar a operação.');
      }
    });      

    app.post('/get-membros', async function(req, res) {
      const projtag = req.query.projtag;
      try {
        pool.query('SELECT usertag FROM membros WHERE projtag = ?', [projtag], async (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
          
          const usertags = result.map(row => row.usertag);
    
          const nicks = await Promise.all(usertags.map(async usertag => {
            try {
              const [nickResult] = await pool.query('SELECT nick FROM contas WHERE nicktag = ?', [usertag]);
    
              if (nickResult.length > 0) {
                return nickResult[0].nick + '#' + usertag;
              } else {
                return '';
              }
            } catch (error) {
              console.error(error);
              return '';
            }
          }));
    
          const data = nicks.filter(nick => nick !== '');
          res.json(data);
        });
      } catch (error) {
        console.error(error);
        res.json([]);
      }
    });    

    app.post('/sair-projeto', async function(req, res) {
      const projtag = req.query.projtag;
      const usertag = req.query.usertag;
      try {
        pool.query('DELETE FROM membros WHERE projtag = ? AND usertag = ?', [projtag, usertag]);
        pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
        const logText = result[0].log || '';
        const newLogText = `${logText}\nUsuário #${usertag} saiu do projeto`;

        pool.query('UPDATE projetos SET log = ? WHERE projtag = ?', [newLogText, projtag]);
    
        res.sendStatus(200);
        })
      } catch (error) {
        console.error(error);
        res.sendStatus(500);
      }
    });    

    app.post('/add-anexo', async function(req, res) {
      const projtag = req.query.projtag;
      const usertag = req.query.usertag;
      const link = req.body.link;
      const texto = req.body.texto;
      const nometarefa = req.query.selectext;
    
      const novaLinha = `<a href="${link}">${texto}</a>`;
    
      try {
        pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
    
          let log = result[0].log;
    
          if (log === undefined || log === null || log === '') {
            log = `Usuario #${usertag} adicionou um anexo na tarefa ${nometarefa} do projeto.`;
          } else {
            log += `\nUsuario #${usertag} adicionou um anexo na tarefa ${nometarefa} do projeto.`;
          }
    
          pool.query('UPDATE projetos SET log = ? WHERE projtag = ?', [log, projtag], (error, result) => {
            if (error) {
              console.error('Erro ao atualizar o banco de dados.', error);
              return res.status(500).send('Erro ao atualizar os projetos no banco de dados.');
            }
    
            pool.query('SELECT anexos FROM tarefas WHERE nome_tarefa = ?', [nometarefa], (error, result) => {
              if (error) {
                console.error('Erro ao consultar o banco de dados.', error);
                return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
              }
    
              if (result[0] && result[0].anexos) {
                let textHtml = result[0].anexos;
    
                if (textHtml === undefined || textHtml === null || textHtml === '') {
                  textHtml = novaLinha;
                } else {
                  textHtml += `|${novaLinha}`;
                }
    
                pool.query('UPDATE tarefas SET anexos = ? WHERE nome_tarefa = ?', [textHtml, nometarefa], (error, result) => {
                  if (error) {
                    console.error('Erro ao atualizar o banco de dados.', error);
                    return res.status(500).send('Erro ao atualizar as tarefas no banco de dados.');
                  }
    
                  res.send('Link adicionado com sucesso!');
                });
              } else {
                res.status(404).send('Tarefa não encontrada.');
              }
            });
          });
        });
      } catch (error) {
        console.error('Erro:', error);
        res.status(500).send('Ocorreu um erro ao adicionar o anexo.');
      }
    });    

    app.post('/get-anexos', async (req, res) => {
      const projtag = req.query.projtag;
      const nometarefa = req.query.selectext;

      try {
        pool.query('SELECT anexos FROM tarefas WHERE projtag = ? AND nome_tarefa = ?', [projtag, nometarefa], (error, result) => {
          if (error) {
            console.error('Erro ao consultar o banco de dados.', error);
            return res.status(500).send('Erro ao buscar os projetos no banco de dados.');
          }
    
          const data = [];
          if (result.length > 0 && result[0].anexos !== null) {
            const links = result[0].anexos.split('</a>');
            links.forEach(link => {
              if (link) {
                const $ = cheerio.load(link);
                const name = $('a').text();
                const href = $('a').attr('href');
                data.push({
                  link: href,
                  name: name
                });
              }
            });
          }
          res.json(data);
        });
      } catch (error) {
        res.status(500).json({ error: 'Erro ao obter anexos.' });
      }
    });    

app.post('/get-arqproj', async function(req, res) {
  const usertag = req.query.usertag;
  try {
      pool.query('SELECT nome FROM projetos WHERE arqcriador = ?', [usertag], function(error, result) {
        if (error) {
          console.log(error);
          res.sendStatus(500);
          return;
        }

        const data = result.map(row => {
          return {
            nome: row.nome
          };
        });
        console.log(data)
        res.json(data);
      });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});


app.post('/get-infoarqproj', function(req, res) {
  const data2 = req.body.selectext;
  nometarefa = data2
  try{
      pool.query('SELECT nome, descricao, arqprojtag, log FROM projetos WHERE nome = ?', [data2], function(error, result) {
        if (error) {
          console.log(error);
          res.sendStatus(500);
          return;
        }
          const data = result.map(row => {
            return {
              nome: row.nome,
              desc: row.descricao,
              tag: row.arqprojtag,
              log: row.log,
            }
           
          });
          res.json(data);
        });
      }
        catch(error) {
          console.log(error);
          res.sendStatus(500);
        }
});

app.post('/get-arqtarefas', function(req, res) {
  const projtag = req.query.projtag;
  try{
      pool.query('SELECT nome_tarefa FROM tarefas WHERE projtag = ?', [projtag], function(error, result) {
        if (error) {
          console.log(error);
          res.sendStatus(500);
          return;
        }
          const data2 = result.map(row => {
            return {
              tarefa: row.nome_tarefa
            }
          });
          res.json(data2);
        })
        }
        catch(error) {
          console.log(error);
          res.sendStatus(500);
        }
});

app.post('/get-infoarqtar', function(req, res) {
  const projtag = req.query.projtag;
  const data2 = req.body.selectext;
  nometarefa = data2
  try{
      pool.query('SELECT nome_tarefa, desc_tarefa, criador, IFNULL(code, "") AS code FROM tarefas WHERE nome_tarefa = ? AND projtag = ?', [data2, projtag], function(error, result) {
        if (error) {
          console.log(error);
          res.sendStatus(500);
          return;
        }
          const data = result.map(row => {
            return {
              tarefa: row.nome_tarefa,
              desctarefa: row.desc_tarefa,
              code: row.code
            }
          });
          res.json(data);
        })
      }
        catch(error){
          console.log(error);
          res.sendStatus(500);
        }
    });


app.post('/get-log', function(req, res) {
  const projtag = req.query.projtag;
  try{
      pool.query('SELECT log FROM projetos WHERE projtag = ?', [projtag], function(error, result) {

          const data = result.map(row => {
            return {
              log: row.log
            }
          });
          res.json(data);
        });
        }
        catch(error){
          console.log(error);
          res.sendStatus(500);
        };
});
