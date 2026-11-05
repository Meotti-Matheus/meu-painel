// ---------- Estilos reutilizados ----------

// Card: luz fina na borda de cima + sombra leve (profundidade sutil)
export const estiloCartao =
    'group/cartao relative rounded-2xl bg-superficie p-5 ring-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_16px_40px_-20px_rgba(0,0,0,0.8)]'

export const estiloCampo =
    'min-w-40 flex-1 rounded-lg bg-fundo/70 px-3 py-2 text-sm text-texto placeholder:text-apagado ring-1 ring-borda outline-none transition focus:ring-acento/60'

export const estiloBotao =
    'rounded-lg bg-acento-forte px-3.5 py-2 text-sm font-medium text-white transition hover:bg-acento-forte/85'

export const estiloBotaoSecundario =
    'flex items-center justify-center rounded-lg px-3.5 py-2 text-sm text-suave ring-1 ring-borda transition hover:bg-elevado hover:text-texto'

export const estiloBotaoIcone =
    'flex h-7 w-7 items-center justify-center rounded-md text-suave transition hover:bg-elevado hover:text-texto'

// Botão tracejado "+ Adicionar..."
export const estiloBotaoAdicionar =
    'flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-borda py-2 text-sm text-suave transition hover:border-acento/50 hover:text-acento'

// Item dentro de um card (favorito, programa, nota)
export const estiloItem = 'rounded-xl bg-elevado/50 transition-all duration-300 ease-out hover:bg-elevado'

// Caixinha com os botões de editar/remover que aparece ao passar o mouse no item
export const estiloAcoesItem =
    'flex gap-0.5 rounded-lg bg-superficie/90 p-0.5 opacity-0 shadow-lg backdrop-blur transition-opacity duration-200 group-hover:opacity-100'

// ---------- Funções ----------

// Chama o servidor sempre com o cabeçalho do painel.
// Se não conseguir conectar, devolve null em vez de quebrar a página
export async function chamarServidor(caminho, opcoes = {}) {
    try {
        return await fetch(caminho, {
            ...opcoes,
            headers: { ...opcoes.headers, 'X-Painel': '1' },
        })
    } catch {
        return null
    }
}

// Monta a mensagem de erro. 502/503/504 = o Vite não conseguiu falar com o servidor (desligado)
export async function mensagemErro(resposta, acao) {
    if (!resposta || resposta.status >= 502) {
        return `Servidor desligado — não foi possível ${acao}.`
    }

    // Tenta pegar a mensagem que o servidor mandou
    const texto = await resposta.text()
    let detalhe = texto
    try {
        const json = JSON.parse(texto)
        detalhe = json.erro || json.message || texto
    } catch {
        // não era JSON, usa o texto como veio
    }
    return `Erro ${resposta.status} ao ${acao}: ${detalhe}`
}

// Pega só o começo da URL (ex.: https://google.com)
export function pegarOrigem(url) {
    try {
        return new URL(url).origin
    } catch {
        return null
    }
}

// O banco salva a data em UTC ("2026-11-03 17:45:00"); aqui converte para o horário local
export function formatarData(texto) {
    const data = new Date(texto.replace(' ', 'T') + 'Z')
    if (isNaN(data)) return texto
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Tira acentos e deixa minúsculo, para comparar textos ("Sábado" = "sabado")
export function normalizar(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}