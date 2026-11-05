import IcalExpander from 'ical-expander';

// Guarda cada agenda baixada por 5 minutos, para não baixar do Google a cada pedido
const CINCO_MINUTOS = 5 * 60 * 1000;
const cache = new Map(); // link -> { horario, ics }

// ---------- Funções auxiliares ----------

// Lê os links do .env (vários separados por vírgula)
function lerLinks() {
    return (process.env.AGENDA_ICAL_URL || '')
        .split(',')
        .map((link) => link.trim())
        .filter(Boolean);
}

async function buscarAgenda(link, forcar) {
    const agora = Date.now();
    const salvo = cache.get(link);
    if (!forcar && salvo && agora - salvo.horario < CINCO_MINUTOS) {
        return salvo.ics;
    }

    const resposta = await fetch(link, { signal: AbortSignal.timeout(15000) });
    if (!resposta.ok) throw new Error(`Google respondeu ${resposta.status}`);

    const ics = await resposta.text();
    cache.set(link, { horario: agora, ics });
    return ics;
}

// Pega os eventos de um arquivo de agenda dentro do intervalo
function eventosDoIntervalo(ics, inicio, fim) {
    // "events" = eventos únicos; "occurrences" = repetições de eventos recorrentes
    const expansor = new IcalExpander({ ics, maxIterations: 100000 });
    const { events, occurrences } = expansor.between(inicio, fim);

    return [
        ...events.map((e) => ({ uid: e.uid, titulo: e.summary, local: e.location, inicio: e.startDate, fim: e.endDate })),
        ...occurrences.map((o) => ({ uid: o.item.uid, titulo: o.item.summary, local: o.item.location, inicio: o.startDate, fim: o.endDate })),
    ].map((ev) => ({
        id: `${ev.uid}-${ev.inicio.toString()}`,
        titulo: ev.titulo || '(sem título)',
        local: ev.local || '',
        diaInteiro: ev.inicio.isDate, // evento sem horário (dia inteiro)
        inicio: ev.inicio.toJSDate().toISOString(),
        fim: ev.fim ? ev.fim.toJSDate().toISOString() : null,
    }));
}

// Baixa todas as agendas e junta os eventos do intervalo (sem repetidos)
async function eventosDeTodasAsAgendas(inicio, fim, forcar, log) {
    const links = lerLinks();
    if (links.length === 0) throw new Error('Link da agenda não configurado no arquivo .env');

    // Baixa todas ao mesmo tempo; se uma falhar, as outras continuam
    const resultados = await Promise.allSettled(
        links.map(async (link) => eventosDoIntervalo(await buscarAgenda(link, forcar), inicio, fim))
    );

    const falhas = resultados.filter((r) => r.status === 'rejected');
    falhas.forEach((r) => log.error(`Falha numa agenda: ${r.reason?.message}`)); // não registra o link
    if (falhas.length === links.length) throw new Error('Não foi possível baixar a agenda do Google');

    const unicos = new Map();
    for (const r of resultados) {
        if (r.status !== 'fulfilled') continue;
        for (const ev of r.value) unicos.set(ev.id, ev);
    }
    return [...unicos.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function inicioDeHoje() {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    return data;
}

function somarDias(data, dias) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    return nova;
}

// Data no formato "2026-11-28", no horário do seu PC
function dataLocal(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Tira acentos e deixa minúsculo, para comparar textos ("Sábado" = "sabado")
function normalizar(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ---------- Rotas ----------

export default async function rotasAgenda(app) {
    // Eventos de hoje (de 00:00 até 23:59 no horário do seu PC)
    app.get('/api/agenda/hoje', async (req, reply) => {
        try {
            const hoje = inicioDeHoje();
            return await eventosDeTodasAsAgendas(hoje, somarDias(hoje, 1), req.query.atualizar === '1', req.log);
        } catch (e) {
            return reply.code(500).send({ erro: e.message });
        }
    });

    // Próximos sábados de trabalho (procura nos próximos 6 meses)
    app.get('/api/agenda/escala', async (req, reply) => {
        const texto = (process.env.ESCALA_TEXTO || '').trim();
        if (!texto) {
            return reply.code(500).send({ erro: 'Texto da escala (ESCALA_TEXTO) não configurado no arquivo .env' });
        }

        let eventos;
        try {
            const hoje = inicioDeHoje();
            eventos = await eventosDeTodasAsAgendas(hoje, somarDias(hoje, 180), req.query.atualizar === '1', req.log);
        } catch (e) {
            return reply.code(500).send({ erro: e.message });
        }

        const procurado = normalizar(texto);
        const sabados = new Map(); // data -> evento (um por sábado, mesmo se estiver em duas agendas)

        for (const ev of eventos) {
            if (new Date(ev.inicio).getDay() !== 6) continue; // 6 = sábado
            if (!normalizar(ev.titulo).includes(procurado)) continue;

            const data = dataLocal(ev.inicio);
            if (!sabados.has(data)) sabados.set(data, { data, titulo: ev.titulo });
        }

        return [...sabados.values()].slice(0, 4); // o próximo + os 3 seguintes
    });
}