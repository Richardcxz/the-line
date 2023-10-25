-- Create Database

CREATE TABLE contas (
  id SERIAL PRIMARY KEY,
  nick VARCHAR(50) NOT NULL,
  nicktag INT NOT NULL,
  email VARCHAR(100) NOT NULL,
  senha VARCHAR(50) NOT NULL
);

-- Table: membros
CREATE TABLE membros (
  id SERIAL PRIMARY KEY,
  projtag INT NOT NULL,
  usertag INT NOT NULL
);

-- Table: notificacoes
CREATE TABLE notificacoes (
  id SERIAL PRIMARY KEY,
  projtag INT NOT NULL,
  usertag INT NOT NULL
);

-- Table: projetos
CREATE TABLE projetos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(250) NOT NULL,
  descricao VARCHAR(500) NOT NULL,
  criador INT NOT NULL,
  arqcriador INT DEFAULT NULL,
  projtag INT NOT NULL,
  arqprojtag INT DEFAULT NULL,
  log TEXT,
  tarefas_conc INT DEFAULT NULL,
  tarefas_pend INT DEFAULT NULL,
  tarefas_exc INT DEFAULT NULL
);

-- Table: tarefas
CREATE TABLE tarefas (
  id SERIAL PRIMARY KEY,
  finalizada INT NOT NULL,
  excluida INT NOT NULL,
  nome_tarefa VARCHAR(100) NOT NULL,
  desc_tarefa VARCHAR(500) NOT NULL,
  tag_tarefa INT NOT NULL,
  code TEXT NOT NULL,
  criador INT NOT NULL,
  anexos VARCHAR(1000) NOT NULL,
  projtag INT NOT NULL,
  data DATE NOT NULL
);
