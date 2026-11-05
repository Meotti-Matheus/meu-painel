// Busca o ícone de sites públicos no Google, pelo servidor.
// Se o Google não conhecer o site (erro, ou devolve o "globo padrão"), responde 404 e o painel mostra a letra.

const UM_DIA = 24 * 60 * 60 * 1000;
const cache = new Map(); // domínio -> { imagem, tipo, horario } (imagem null = sem ícone de verdade)

const parametros = {
    type: 'object',
    required: ['dominio'],
    properties: {
        dominio: { type: 'string', minLength: 1, maxLength: 253, pattern: '^[A-Za-z0-9.-]+$' },
    },
};

// Pede o ícone ao Google. Devolve { imagem, tipo } ou null (se deu erro ou não veio imagem)
async function buscarNoGoogle(dominio) {
    const resposta = await fetch(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dominio)}&sz=64`,
        { signal: AbortSignal.timeout(8000) }
    );
    const tipo = resposta.headers.get('content-type') || '';
    if (!resposta.ok || !tipo.startsWith('image/')) return null;
    return { imagem: Buffer.from(await resposta.arrayBuffer()), tipo };
}

// "Globo padrão": o que o Google devolve para um site que não existe (busca uma vez só)
let globoPadrao = null;
async function pegarGloboPadrao() {
    if (globoPadrao) return globoPadrao;
    try {
        const resultado = await buscarNoGoogle('site-que-nao-existe-painel-12345.invalid');
        if (resultado) globoPadrao = resultado.imagem;
    } catch {
        // sem internet: tenta de novo na próxima vez
    }
    return globoPadrao;
}

function semIcone(reply) {
    return reply.code(404).send({ erro: 'Sem ícone' });
}

function enviarImagem(reply, salvo) {
    return reply.type(salvo.tipo).header('Cache-Control', 'public, max-age=86400').send(salvo.imagem);
}

export default async function rotasIcones(app) {
    app.get('/api/icone-site', { schema: { querystring: parametros } }, async (req, reply) => {
        const dominio = req.query.dominio.toLowerCase();

        // Já perguntou nas últimas 24 horas? Usa a resposta guardada
        const salvo = cache.get(dominio);
        if (salvo && Date.now() - salvo.horario < UM_DIA) {
            return salvo.imagem ? enviarImagem(reply, salvo) : semIcone(reply);
        }

        try {
            const [resultado, globo] = await Promise.all([buscarNoGoogle(dominio), pegarGloboPadrao()]);

            // Sem imagem, ou a imagem é igual ao globo padrão: trata como "sem ícone"
            if (!resultado || (globo && resultado.imagem.equals(globo))) {
                cache.set(dominio, { imagem: null, horario: Date.now() });
                return semIcone(reply);
            }

            const novo = { ...resultado, horario: Date.now() };
            cache.set(dominio, novo);
            return enviarImagem(reply, novo);
        } catch (e) {
            // Sem internet/bloqueado: não guarda, tenta de novo da próxima vez
            req.log.error(`Falha ao buscar ícone: ${e.message}`);
            return semIcone(reply);
        }
    });
}