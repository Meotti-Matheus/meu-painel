import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';

// Cria a pasta "data" se não existir
mkdirSync('data', { recursive: true });

const sqlite = new Database('data/app.db');
sqlite.pragma('journal_mode = WAL'); // mais rápido e seguro contra corrupção

// Cria as tabelas se não existirem
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS favoritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    url TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Geral',
    posicao INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS programas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    caminho TEXT NOT NULL,
    posicao INTEGER NOT NULL DEFAULT 0
  );
`);

// Bancos antigos: a tabela de programas foi criada sem a coluna "posicao"; adiciona agora
const colunasProgramas = sqlite.prepare('PRAGMA table_info(programas)').all();
if (!colunasProgramas.some((coluna) => coluna.name === 'posicao')) {
  sqlite.exec('ALTER TABLE programas ADD COLUMN posicao INTEGER NOT NULL DEFAULT 0');
}

// Item novo vai para o fim da fila (o banco faz isso sozinho a cada cadastro)
sqlite.exec(`
  CREATE TRIGGER IF NOT EXISTS favoritos_fim_da_fila AFTER INSERT ON favoritos WHEN NEW.posicao = 0
  BEGIN
    UPDATE favoritos SET posicao = (SELECT COALESCE(MAX(posicao), 0) + 1 FROM favoritos) WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS programas_fim_da_fila AFTER INSERT ON programas WHEN NEW.posicao = 0
  BEGIN
    UPDATE programas SET posicao = (SELECT COALESCE(MAX(posicao), 0) + 1 FROM programas) WHERE id = NEW.id;
  END;
`);

export const db = drizzle({ client: sqlite });