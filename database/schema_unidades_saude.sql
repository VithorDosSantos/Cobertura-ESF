-- Estrutura base de unidades de saude para o ESF Mapper
-- Referencia: dump unidades_saude fornecido pelo usuario

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

CREATE TABLE IF NOT EXISTS bairros (
  id int(10) unsigned NOT NULL,
  nome varchar(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bairros_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unidades_saude (
  id int(10) unsigned NOT NULL AUTO_INCREMENT,
  nome varchar(255) NOT NULL,
  tipo_id int(10) unsigned DEFAULT NULL,
  endereco varchar(255) DEFAULT NULL,
  latitude decimal(10,8) NOT NULL,
  longitude decimal(11,8) NOT NULL,
  bairro_id int(10) unsigned DEFAULT NULL COMMENT 'Chave estrangeira opcional para saber em qual bairro a unidade está',
  telefone varchar(20) DEFAULT NULL,
  ativo tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_unidades_saude_nome (nome),
  KEY idx_unidades_saude_bairro_id (bairro_id),
  KEY idx_unidades_saude_tipo_id (tipo_id),
  KEY idx_unidades_saude_ativo (ativo),
  CONSTRAINT fk_unidade_bairro FOREIGN KEY (bairro_id) REFERENCES bairros (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configuracao do app: define quais unidades aparecem no login.
-- Isso permite trabalhar somente com as unidades ESF/USF da sua cobertura real.
CREATE TABLE IF NOT EXISTS esf_mapper_unidades (
  id int(10) unsigned NOT NULL AUTO_INCREMENT,
  unidade_saude_id int(10) unsigned NOT NULL,
  nome_exibicao varchar(255) DEFAULT NULL,
  ordem int(10) unsigned NOT NULL DEFAULT 100,
  ativo tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_esf_mapper_unidades_unidade (unidade_saude_id),
  KEY idx_esf_mapper_unidades_ativo_ordem (ativo, ordem),
  CONSTRAINT fk_esf_mapper_unidades_unidade
    FOREIGN KEY (unidade_saude_id)
    REFERENCES unidades_saude (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carga minima para o aplicativo funcionar com unidades mapeaveis.
-- Mantive nomes e coordenadas do arquivo de referencia enviado.
-- Nao existe tabela de tipos no app: o sistema trabalha somente com ESF.
INSERT INTO unidades_saude (id, nome, tipo_id, endereco, latitude, longitude, bairro_id, telefone, ativo) VALUES
(12, 'USF TAPANÃ I', 3, 'CONJUNTO CORDEIRO DE FARIAS, ALAMEDA PERIMETRAL', -1.34843300, -48.46217700, 28, NULL, 1),
(17, 'USF BENGUI', 3, 'Passagem Maciel, Bengui, Belém', -1.37406100, -48.45177800, 40, NULL, 1),
(26, 'USF SACRAMENTA', 3, 'PASSAGEM MUCAJÁ, ENTRE SENADOR LEMOS E PEDRO', -1.41341800, -48.46711300, 51, NULL, 1),
(47, 'USF TELÉGRAFO', 3, 'RUA DO FIO S/N ENTRE SAO PEDRO E SAO JOAO', -1.42142600, -48.48539400, 52, NULL, 1),
(53, 'USF CONDOR', 3, 'Rua Tambes, 48', -1.47148600, -48.47964900, 58, NULL, 1),
(54, 'USF TERRA FIRME', 3, 'Estrada da Maracacuera, Area de Brasilia', -1.29788500, -48.44292100, 24, NULL, 1),
(59, 'USF PARACURI', 3, 'PASSAGEM MAURA, 218', -1.31276400, -48.48333000, 25, NULL, 1),
(60, 'USF OUTEIRO', 3, 'RUA FRANCISCO GADELHA', -1.26444100, -48.46270000, 16, NULL, 1),
(76, 'UMS ICOARACI', 2, 'RUA MANOEL BARATA', -1.30206400, -48.48745300, 20, NULL, 1),
(79, 'UMS JURUNAS', 2, 'RUA ENGENHEIRO', -1.47311600, -48.49219100, 73, NULL, 1),
(83, 'UMS GUAMÁ', 2, 'RUA BARAO DE IGARAPE MIRI', -1.46732700, -48.46425600, 57, NULL, 1),
(89, 'UMS PRATINHA', 2, 'RODOVIA ARTHUR', -1.37657300, -48.48035400, 71, NULL, 1)
ON DUPLICATE KEY UPDATE
  tipo_id = VALUES(tipo_id),
  endereco = VALUES(endereco),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  bairro_id = VALUES(bairro_id),
  telefone = VALUES(telefone),
  ativo = VALUES(ativo);

-- View util para o frontend (somente unidades ativas com coordenadas validas)
CREATE OR REPLACE VIEW vw_unidades_mapa AS
SELECT
  u.id,
  u.nome,
  u.tipo_id,
  u.latitude,
  u.longitude,
  u.endereco,
  u.bairro_id,
  u.ativo
FROM unidades_saude u
WHERE u.ativo = 1
  AND u.latitude BETWEEN -2.5 AND 0.5
  AND u.longitude BETWEEN -49.8 AND -47.5;

-- View com as unidades efetivamente habilitadas no app.
CREATE OR REPLACE VIEW vw_esf_mapper_unidades_ativas AS
SELECT
  cfg.id,
  cfg.unidade_saude_id,
  COALESCE(cfg.nome_exibicao, u.nome) AS nome,
  u.tipo_id,
  u.latitude,
  u.longitude,
  cfg.ordem,
  cfg.ativo
FROM esf_mapper_unidades cfg
INNER JOIN unidades_saude u ON u.id = cfg.unidade_saude_id
WHERE cfg.ativo = 1
  AND u.ativo = 1;

-- Exemplo inicial: habilita apenas algumas unidades para aparecer no login.
-- Ajuste essa lista conforme as unidades realmente atendidas.
INSERT INTO esf_mapper_unidades (unidade_saude_id, nome_exibicao, ordem, ativo) VALUES
  (12, NULL, 10, 1),
  (17, NULL, 20, 1),
  (26, NULL, 30, 1),
  (47, NULL, 40, 1),
  (53, NULL, 50, 1),
  (54, NULL, 60, 1)
ON DUPLICATE KEY UPDATE
  nome_exibicao = VALUES(nome_exibicao),
  ordem = VALUES(ordem),
  ativo = VALUES(ativo);

SET foreign_key_checks = 1;
