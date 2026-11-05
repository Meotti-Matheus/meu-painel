import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eq, asc, desc } from 'drizzle-orm';
import { db } from './db.js';
import { favoritos, notas, programas } from './schema.js';
import rotasAgenda from './agenda.js';
import rotasRamais from './ramais.js';
import rotasOrdem from './ordem.js';

const app = Fastify({ logger: true });

// ---------- Proteção: só o seu painel pode dar comandos ----------

// Endereços pelos quais o servidor pode ser acessado (bloqueia o ataque "DNS rebinding")
const hostsPermitidos = ['localhost:5173', '127.0.0.1:5173', 'localhost:3001', '127.0.0.1:3001'];
// Sites que podem mandar pedidos (só o próprio painel: modo programação :5173 e modo uso :3001)
const origensPermitidas = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
];

app.addHook('onRequest', async (req, reply) => {
    if (!hostsPermitidos.includes(req.headers.host)) {
        return reply.code(403).send({ erro: 'Endereço não permitido' });
    }

    // O navegador sempre informa a "origem" quando outro site tenta mandar algo
    const origem = req.headers.origin;
    if (origem && !origensPermitidas.includes(origem)) {
        return reply.code(403).send({ erro: 'Origem não permitida' });
    }

    // Pedidos que alteram algo precisam do cabeçalho do painel (outros sites não conseguem enviá-lo)
    if (req.method !== 'GET' && req.headers['x-painel'] !== '1') {
        return reply.code(403).send({ erro: 'Pedido sem identificação do painel' });
    }
});

// ---------- Regras de validação ----------

const parametrosId = {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'integer', minimum: 1 } },
};

const corpoFavorito = {
    type: 'object',
    required: ['titulo', 'url'],
    additionalProperties: false,
    properties: {
        titulo: { type: 'string', minLength: 1, maxLength: 100 },
        url: { type: 'string', pattern: '^https?://', maxLength: 2000 }, // só aceita http/https
        categoria: { type: 'string', minLength: 1, maxLength: 50 },
    },
};

const corpoNota = {
    type: 'object',
    required: ['texto'],
    additionalProperties: false,
    properties: {
        texto: { type: 'string', minLength: 1, maxLength: 5000, pattern: '\\S' }, // não aceita só espaços
    },
};

const corpoPrograma = {
    type: 'object',
    required: ['nome', 'caminho'],
    additionalProperties: false,
    properties: {
        nome: { type: 'string', minLength: 1, maxLength: 100 },
        // Caminho completo do Windows terminando em .exe ou .lnk (ex.: C:\Pasta\app.exe)
        caminho: { type: 'string', maxLength: 500, pattern: '^[A-Za-z]:\\\\.+\\.([eE][xX][eE]|[lL][nN][kK])$' },
    },
};

// ---------- Favoritos ----------

app.get('/api/favoritos', () =>
    db.select().from(favoritos)
        .orderBy(asc(favoritos.categoria), asc(favoritos.posicao), asc(favoritos.id))
        .all()
);

app.post('/api/favoritos', { schema: { body: corpoFavorito } }, async (req, reply) => {
    const novo = db.insert(favoritos).values(req.body).returning().get();
    return reply.code(201).send(novo);
});

app.put('/api/favoritos/:id', { schema: { params: parametrosId, body: corpoFavorito } }, async (req, reply) => {
    const editado = db.update(favoritos).set(req.body)
        .where(eq(favoritos.id, req.params.id)).returning().get();
    if (!editado) return reply.code(404).send({ erro: 'Favorito não encontrado' });
    return editado;
});

app.delete('/api/favoritos/:id', { schema: { params: parametrosId } }, async (req, reply) => {
    const resultado = db.delete(favoritos).where(eq(favoritos.id, req.params.id)).run();
    if (resultado.changes === 0) return reply.code(404).send({ erro: 'Favorito não encontrado' });
    return reply.code(204).send();
});

// ---------- Notas ----------

app.get('/api/notas', () =>
    db.select().from(notas).orderBy(desc(notas.id)).all()
);

app.post('/api/notas', { schema: { body: corpoNota } }, async (req, reply) => {
    const nova = db.insert(notas).values({ texto: req.body.texto.trim() }).returning().get();
    return reply.code(201).send(nova);
});

app.put('/api/notas/:id', { schema: { params: parametrosId, body: corpoNota } }, async (req, reply) => {
    const editada = db.update(notas).set({ texto: req.body.texto.trim() })
        .where(eq(notas.id, req.params.id)).returning().get();
    if (!editada) return reply.code(404).send({ erro: 'Nota não encontrada' });
    return editada;
});

app.delete('/api/notas/:id', { schema: { params: parametrosId } }, async (req, reply) => {
    const resultado = db.delete(notas).where(eq(notas.id, req.params.id)).run();
    if (resultado.changes === 0) return reply.code(404).send({ erro: 'Nota não encontrada' });
    return reply.code(204).send();
});

// ---------- Programas do Windows ----------

app.get('/api/programas', () =>
    db.select().from(programas).orderBy(asc(programas.nome)).all()
);

app.post('/api/programas', { schema: { body: corpoPrograma } }, async (req, reply) => {
    if (!existsSync(req.body.caminho)) {
        return reply.code(400).send({ erro: 'Arquivo não encontrado nesse caminho' });
    }
    const novo = db.insert(programas).values(req.body).returning().get();
    return reply.code(201).send(novo);
});

app.put('/api/programas/:id', { schema: { params: parametrosId, body: corpoPrograma } }, async (req, reply) => {
    if (!existsSync(req.body.caminho)) {
        return reply.code(400).send({ erro: 'Arquivo não encontrado nesse caminho' });
    }
    const editado = db.update(programas).set(req.body)
        .where(eq(programas.id, req.params.id)).returning().get();
    if (!editado) return reply.code(404).send({ erro: 'Programa não encontrado' });
    return editado;
});

app.delete('/api/programas/:id', { schema: { params: parametrosId } }, async (req, reply) => {
    const resultado = db.delete(programas).where(eq(programas.id, req.params.id)).run();
    if (resultado.changes === 0) return reply.code(404).send({ erro: 'Programa não encontrado' });
    return reply.code(204).send();
});

// Abre um programa já cadastrado (pelo número, nunca por um caminho enviado na hora)
app.post('/api/programas/:id/abrir', { schema: { params: parametrosId } }, async (req, reply) => {
    const programa = db.select().from(programas).where(eq(programas.id, req.params.id)).get();
    if (!programa) return reply.code(404).send({ erro: 'Programa não encontrado' });
    if (!existsSync(programa.caminho)) {
        return reply.code(400).send({ erro: 'O arquivo não existe mais nesse caminho' });
    }

    // Abre pelo Explorer: funciona com .exe e atalhos .lnk e não passa pelo "cmd" (evita injeção de comandos)
    const processo = spawn('explorer.exe', [programa.caminho], { detached: true, stdio: 'ignore' });
    processo.on('error', (e) => req.log.error(e));
    processo.unref(); // o programa continua aberto mesmo se o servidor desligar

    return { ok: true };
});

// ---------- Ícone dos programas ----------

// Guarda os ícones já extraídos para não chamar o PowerShell toda vez
const cacheIcones = new Map();

// Script do PowerShell que pega o ícone e devolve como texto (base64).
// O caminho vem pela variável de ambiente CAMINHO_ICONE, nunca colado no comando (evita injeção)
const scriptIcone = [
    'Add-Type -AssemblyName System.Drawing',
    '$alvo = $env:CAMINHO_ICONE',
    // Se for atalho .lnk, usa o programa para onde ele aponta (ícone sem a setinha)
    "if ($alvo.ToLower().EndsWith('.lnk')) { $atalho = (New-Object -ComObject WScript.Shell).CreateShortcut($alvo); if ($atalho.TargetPath -and (Test-Path $atalho.TargetPath)) { $alvo = $atalho.TargetPath } }",
    '$icone = [System.Drawing.Icon]::ExtractAssociatedIcon($alvo)',
    '$imagem = $icone.ToBitmap()',
    '$memoria = New-Object System.IO.MemoryStream',
    '$imagem.Save($memoria, [System.Drawing.Imaging.ImageFormat]::Png)',
    '[Convert]::ToBase64String($memoria.ToArray())',
].join('; ');

function extrairIcone(caminho) {
    return new Promise((resolve, reject) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', scriptIcone],
            { env: { ...process.env, CAMINHO_ICONE: caminho }, timeout: 10000, windowsHide: true },
            (erro, saida) => {
                if (erro) return reject(erro);
                const base64 = saida.trim();
                if (!base64) return reject(new Error('Ícone vazio'));
                resolve(Buffer.from(base64, 'base64'));
            }
        );
    });
}

app.get('/api/programas/:id/icone', { schema: { params: parametrosId } }, async (req, reply) => {
    const programa = db.select().from(programas).where(eq(programas.id, req.params.id)).get();
    if (!programa || !existsSync(programa.caminho)) {
        return reply.code(404).send({ erro: 'Ícone não encontrado' });
    }

    const chave = `${programa.id}|${programa.caminho}`;
    let png = cacheIcones.get(chave);

    if (!png) {
        try {
            png = await extrairIcone(programa.caminho);
            cacheIcones.set(chave, png);
        } catch (e) {
            req.log.error(e);
            return reply.code(404).send({ erro: 'Não foi possível extrair o ícone' });
        }
    }

    return reply.type('image/png').send(png);
});

// ---------- Agenda (Google) ----------
await app.register(rotasAgenda);
await app.register(rotasRamais);
await app.register(rotasOrdem);

// ---------- Site pronto (modo de uso diário) ----------
// Se existir a pasta web/dist (criada pelo "npm run build"), o servidor entrega o site.
// Assim tudo funciona em http://localhost:3001, sem precisar do Vite.
const pastaSite = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist');
if (existsSync(pastaSite)) {
    await app.register(fastifyStatic, { root: pastaSite });
}

// 127.0.0.1 = só o seu PC acessa
await app.listen({ port: 3001, host: '127.0.0.1' });