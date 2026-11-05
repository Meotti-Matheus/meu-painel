import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql, eq, asc } from 'drizzle-orm';
import { db } from './db.js';
import { favoritos, programas } from './schema.js';

// Tabela com a ordem das categorias de favoritos
export const ordemCategorias = sqliteTable('ordem_categorias', {
    nome: text('nome').primaryKey(),
    posicao: integer('posicao').notNull(),
});

db.run(sql`CREATE TABLE IF NOT EXISTS ordem_categorias (
  nome TEXT PRIMARY KEY,
  posicao INTEGER NOT NULL
)`);

// O site manda a lista de ids na nova ordem: [7, 3, 12, ...]
const corpoOrdem = {
    type: 'object',
    required: ['ids'],
    additionalProperties: false,
    properties: {
        ids: { type: 'array', maxItems: 2000, uniqueItems: true, items: { type: 'integer', minimum: 1 } },
    },
};

// O site manda os nomes das categorias na nova ordem: ["Ferramentas", "Geral", ...]
const corpoOrdemCategorias = {
    type: 'object',
    required: ['nomes'],
    additionalProperties: false,
    properties: {
        nomes: {
            type: 'array',
            maxItems: 500,
            uniqueItems: true,
            items: { type: 'string', minLength: 1, maxLength: 50 },
        },
    },
};

// Grava a posição de cada item (tudo de uma vez: ou salva tudo, ou nada)
function salvarOrdem(tabela, ids) {
    db.transaction((tx) => {
        ids.forEach((id, indice) => {
            tx.update(tabela).set({ posicao: indice + 1 }).where(eq(tabela.id, id)).run();
        });
    });
}

export default async function rotasOrdem(app) {
    app.put('/api/favoritos/ordem', { schema: { body: corpoOrdem } }, async (req) => {
        salvarOrdem(favoritos, req.body.ids);
        return { ok: true };
    });

    app.put('/api/programas/ordem', { schema: { body: corpoOrdem } }, async (req) => {
        salvarOrdem(programas, req.body.ids);
        return { ok: true };
    });

    // Ordem das categorias: devolve só os nomes, na ordem salva
    app.get('/api/categorias/ordem', () =>
        db.select().from(ordemCategorias).orderBy(asc(ordemCategorias.posicao)).all().map((c) => c.nome)
    );

    // Salva a ordem nova (apaga a antiga e grava a lista inteira)
    app.put('/api/categorias/ordem', { schema: { body: corpoOrdemCategorias } }, async (req) => {
        db.transaction((tx) => {
            tx.delete(ordemCategorias).run();
            req.body.nomes.forEach((nome, indice) => {
                tx.insert(ordemCategorias).values({ nome, posicao: indice + 1 }).run();
            });
        });
        return { ok: true };
    });
}