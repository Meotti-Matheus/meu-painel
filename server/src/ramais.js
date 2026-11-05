import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql, eq, asc } from 'drizzle-orm';
import { db } from './db.js';

// Tabela de ramais
export const ramais = sqliteTable('ramais', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nome: text('nome').notNull(),
    ramal: text('ramal').notNull(),
    setor: text('setor').notNull().default(''),
});

// Cria a tabela se não existir
db.run(sql`CREATE TABLE IF NOT EXISTS ramais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  ramal TEXT NOT NULL,
  setor TEXT NOT NULL DEFAULT ''
)`);

const parametrosId = {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer', minimum: 1 } },
};

const corpoRamal = {
    type: 'object',
    required: ['nome', 'ramal'],
    additionalProperties: false,
    properties: {
        nome: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' }, // não aceita só espaços
        ramal: { type: 'string', minLength: 1, maxLength: 30, pattern: '^[0-9 ()+\\-]+$' }, // números, espaço, ( ) + -
        setor: { type: 'string', maxLength: 50 },
    },
};

// Tira espaços sobrando antes de salvar
function limpar(corpo) {
    return { nome: corpo.nome.trim(), ramal: corpo.ramal.trim(), setor: (corpo.setor ?? '').trim() };
}

export default async function rotasRamais(app) {
    app.get('/api/ramais', () =>
        db.select().from(ramais).orderBy(asc(ramais.nome)).all()
    );

    app.post('/api/ramais', { schema: { body: corpoRamal } }, async (req, reply) => {
        const novo = db.insert(ramais).values(limpar(req.body)).returning().get();
        return reply.code(201).send(novo);
    });

    app.put('/api/ramais/:id', { schema: { params: parametrosId, body: corpoRamal } }, async (req, reply) => {
        const editado = db.update(ramais).set(limpar(req.body))
            .where(eq(ramais.id, req.params.id)).returning().get();
        if (!editado) return reply.code(404).send({ erro: 'Ramal não encontrado' });
        return editado;
    });

    app.delete('/api/ramais/:id', { schema: { params: parametrosId } }, async (req, reply) => {
        const resultado = db.delete(ramais).where(eq(ramais.id, req.params.id)).run();
        if (resultado.changes === 0) return reply.code(404).send({ erro: 'Ramal não encontrado' });
        return reply.code(204).send();
    });
}