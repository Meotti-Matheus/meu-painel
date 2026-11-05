import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Tabela de favoritos
export const favoritos = sqliteTable('favoritos', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titulo: text('titulo').notNull(),
    url: text('url').notNull(),
    categoria: text('categoria').notNull().default('Geral'),
    posicao: integer('posicao').notNull().default(0),
});

// Tabela de notas
export const notas = sqliteTable('notas', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    texto: text('texto').notNull(),
    criadaEm: text('criada_em').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tabela de programas do Windows
export const programas = sqliteTable('programas', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nome: text('nome').notNull(),
    caminho: text('caminho').notNull(),
    posicao: integer('posicao').notNull().default(0),
});