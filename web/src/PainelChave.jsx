import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    KeyRound,
    Copy,
    Check,
    CircleCheck,
    CircleX,
    X,
    Maximize2,
    Building2,
    MapPin,
    FileText,
    CalendarDays,
    Hash,
    Zap,
    Info,
} from 'lucide-react'
import Cartao from './Cartao.jsx'
import { estiloCampo, estiloBotaoIcone, estiloItem } from './compartilhado.js'

// ---------- Tabelas ----------

// Código IBGE do estado (2 primeiros números da chave): [sigla, nome]
const ESTADOS = {
    11: ['RO', 'Rondônia'], 12: ['AC', 'Acre'], 13: ['AM', 'Amazonas'], 14: ['RR', 'Roraima'],
    15: ['PA', 'Pará'], 16: ['AP', 'Amapá'], 17: ['TO', 'Tocantins'],
    21: ['MA', 'Maranhão'], 22: ['PI', 'Piauí'], 23: ['CE', 'Ceará'], 24: ['RN', 'Rio Grande do Norte'],
    25: ['PB', 'Paraíba'], 26: ['PE', 'Pernambuco'], 27: ['AL', 'Alagoas'], 28: ['SE', 'Sergipe'], 29: ['BA', 'Bahia'],
    31: ['MG', 'Minas Gerais'], 32: ['ES', 'Espírito Santo'], 33: ['RJ', 'Rio de Janeiro'], 35: ['SP', 'São Paulo'],
    41: ['PR', 'Paraná'], 42: ['SC', 'Santa Catarina'], 43: ['RS', 'Rio Grande do Sul'],
    50: ['MS', 'Mato Grosso do Sul'], 51: ['MT', 'Mato Grosso'], 52: ['GO', 'Goiás'], 53: ['DF', 'Distrito Federal'],
}

// [sigla, nome completo]
const MODELOS = {
    55: ['NF-e', 'Nota Fiscal eletrônica'],
    65: ['NFC-e', 'Nota Fiscal de Consumidor eletrônica'],
    57: ['CT-e', 'Conhecimento de Transporte eletrônico'],
    58: ['MDF-e', 'Manifesto de Documentos Fiscais eletrônico'],
    67: ['CT-e OS', 'CT-e para Outros Serviços'],
    59: ['CF-e SAT', 'Cupom Fiscal eletrônico SAT'],
}

// [nome, explicação]
const TIPOS_EMISSAO = {
    1: ['Normal', 'Autorizada pela SEFAZ no momento da emissão.'],
    2: ['Contingência FS-IA', 'Impressa em formulário de segurança; precisa ser transmitida depois.'],
    3: ['Contingência SCAN', 'Modelo antigo de contingência do Ambiente Nacional.'],
    4: ['Contingência EPEC', 'Evento prévio registrado; a nota é transmitida depois.'],
    5: ['Contingência FS-DA', 'Impressa em formulário de segurança (FS-DA); precisa ser transmitida depois.'],
    6: ['Contingência SVC-AN', 'Autorizada pela SEFAZ Virtual de Contingência do Ambiente Nacional.'],
    7: ['Contingência SVC-RS', 'Autorizada pela SEFAZ Virtual de Contingência do RS.'],
    9: ['Contingência off-line', 'Emitida sem comunicação com a SEFAZ (NFC-e); precisa ser transmitida depois.'],
}

// Partes da chave, para o mapa colorido
const PARTES = [
    { nome: 'UF', ini: 0, fim: 2, cor: 'text-sky-300' },
    { nome: 'Ano/mês', ini: 2, fim: 6, cor: 'text-amber-300' },
    { nome: 'Emissor', ini: 6, fim: 20, cor: 'text-emerald-300' },
    { nome: 'Modelo', ini: 20, fim: 22, cor: 'text-violet-300' },
    { nome: 'Série', ini: 22, fim: 25, cor: 'text-pink-300' },
    { nome: 'Número', ini: 25, fim: 34, cor: 'text-orange-300' },
    { nome: 'Tipo emissão', ini: 34, fim: 35, cor: 'text-teal-300' },
    { nome: 'Código', ini: 35, fim: 43, cor: 'text-zinc-300' },
    { nome: 'DV', ini: 43, fim: 44, cor: '' }, // cor definida depois (verde ou vermelho)
]

// ---------- Cálculos ----------

// Valor de cada caractere: código ASCII - 48 (0-9 continuam iguais; A = 17, B = 18... no CNPJ alfanumérico)
function valor(caractere) {
    return caractere.charCodeAt(0) - 48
}

// Módulo 11 com os pesos informados
function digitoMod11(base, pesos) {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += valor(base[i]) * pesos[i]
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
}

// Dígito verificador da chave: pesos de 2 a 9, da direita para a esquerda
function calcularDV(base43) {
    let soma = 0
    let peso = 2
    for (let i = base43.length - 1; i >= 0; i--) {
        soma += valor(base43[i]) * peso
        peso = peso === 9 ? 2 : peso + 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
}

function validarCnpj(c) {
    if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1+$/.test(c)) return false
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const pesos2 = [6, ...pesos1]
    const d1 = digitoMod11(c.slice(0, 12), pesos1)
    const d2 = digitoMod11(c.slice(0, 12) + d1, pesos2)
    return c.slice(12) === `${d1}${d2}`
}

function validarCpf(c) {
    if (!/^\d{11}$/.test(c) || /^(\d)\1+$/.test(c)) return false
    const d1 = digitoMod11(c.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
    const d2 = digitoMod11(c.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    return c.slice(9) === `${d1}${d2}`
}

function formatarCnpj(c) {
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

function formatarCpf(c) {
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}

// O campo do emissor tem 14 posições: CNPJ, ou CPF com "000" na frente (ex.: produtor rural)
function identificarEmissor(doc) {
    if (validarCnpj(doc)) return { tipo: 'CNPJ', texto: formatarCnpj(doc), copiar: doc, valido: true }
    const cpf = doc.slice(3)
    if (doc.startsWith('000') && validarCpf(cpf)) return { tipo: 'CPF', texto: formatarCpf(cpf), copiar: cpf, valido: true }
    return { tipo: 'CNPJ', texto: formatarCnpj(doc), copiar: doc, valido: false }
}

// Limpa o texto colado e separa as partes da chave
function lerChave(texto) {
    const chave = texto
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, '') // tira espaços, pontos, traços...
        .replace(/^(NFCE|NFE|CTE|MDFE|CFE)/, '') // tira o prefixo do XML (ex.: "NFe4319...")

    if (chave.length !== 44) {
        return { erro: `A chave tem ${chave.length} caracteres; precisa ter 44.` }
    }

    // Só números, exceto as 12 primeiras posições do emissor (7ª a 18ª), que podem ter letras
    if (!/^\d{6}[0-9A-Z]{12}\d{26}$/.test(chave)) {
        return { erro: 'Caracteres inválidos. Só o CNPJ (posições 7 a 18) pode ter letras.' }
    }

    const dvCalculado = calcularDV(chave.slice(0, 43))
    const dv = Number(chave.slice(43))

    return {
        chave,
        uf: chave.slice(0, 2),
        ano: chave.slice(2, 4),
        mes: chave.slice(4, 6),
        emissor: identificarEmissor(chave.slice(6, 20)),
        modelo: chave.slice(20, 22),
        serie: chave.slice(22, 25),
        numero: chave.slice(25, 34),
        tipoEmissao: chave.slice(34, 35),
        codigo: chave.slice(35, 43),
        dv,
        dvCalculado,
        dvOk: dv === dvCalculado,
    }
}

// ---------- Componentes ----------

// Botão de copiar com "check" verde por 1,5 s
function BotaoCopiar({ texto, titulo }) {
    const [ok, setOk] = useState(false)

    async function copiar() {
        try {
            await navigator.clipboard.writeText(texto)
            setOk(true)
            setTimeout(() => setOk(false), 1500)
        } catch {
            // navegador bloqueou a área de transferência: não faz nada
        }
    }

    return (
        <button onClick={copiar} title={titulo} className={estiloBotaoIcone}>
            {ok ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
    )
}

// Bloco de informação dentro da janela
function Bloco({ icone: Icone, rotulo, children }) {
    return (
        <div className="rounded-xl bg-elevado/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-apagado">
                <Icone size={12} />
                {rotulo}
            </p>
            <div className="mt-1 text-sm text-texto">{children}</div>
        </div>
    )
}

// Janela com todos os detalhes da chave
function JanelaChave({ r, aoFechar }) {
    // Esc fecha a janela
    useEffect(() => {
        function tecla(e) {
            if (e.key === 'Escape') aoFechar()
        }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [aoFechar])

    const estado = ESTADOS[r.uf]
    const modelo = MODELOS[r.modelo]
    const tipo = TIPOS_EMISSAO[r.tipoEmissao]
    const contingencia = r.tipoEmissao !== '1'

    const mes = Number(r.mes)
    const mesAno =
        mes >= 1 && mes <= 12
            ? new Date(2000 + Number(r.ano), mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            : `${r.mes}/20${r.ano} (mês inválido)`

    const partes = PARTES.map((p) => (p.nome === 'DV' ? { ...p, cor: r.dvOk ? 'text-emerald-300' : 'text-red-300' } : p))

    // createPortal: desenha a janela direto no <body>, por cima de tudo
    return createPortal(
        <div
            onMouseDown={aoFechar} // clicar fora fecha
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes da chave"
                onMouseDown={(e) => e.stopPropagation()} // clicar dentro não fecha
                className="animate-entrada max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-superficie p-6 shadow-2xl ring-1 ring-white/10"
            >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-apagado">{modelo ? modelo[1] : `Modelo ${r.modelo}`}</p>
                        <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                            {modelo ? modelo[0] : r.modelo} <span className="text-acento">nº {Number(r.numero).toLocaleString('pt-BR')}</span>
                        </h3>
                        <p className="mt-1 text-sm text-suave">
                            Série {Number(r.serie)} · {estado ? estado[1] : `UF ${r.uf}`}
                        </p>
                    </div>
                    <button onClick={aoFechar} title="Fechar (Esc)" className={estiloBotaoIcone}>
                        <X size={16} />
                    </button>
                </div>

                {/* Dígito verificador */}
                <div
                    className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${r.dvOk ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' : 'bg-red-500/10 text-red-300 ring-red-500/20'
                        }`}
                >
                    {r.dvOk ? <CircleCheck size={15} className="shrink-0" /> : <CircleX size={15} className="shrink-0" />}
                    {r.dvOk ? 'Chave válida: dígito verificador correto' : `Dígito verificador errado: é ${r.dv}, deveria ser ${r.dvCalculado}`}
                </div>

                {r.modelo === '59' && (
                    <p className="mt-2 text-xs text-amber-300">CF-e SAT usa outro formato de chave: série e número podem não estar corretos.</p>
                )}

                {/* Informações */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Bloco icone={Building2} rotulo={`Emissor (${r.emissor.tipo})`}>
                        <div className="flex items-center gap-1">
                            <span className="font-mono">{r.emissor.texto}</span>
                            <BotaoCopiar texto={r.emissor.copiar} titulo={`Copiar ${r.emissor.tipo} (sem pontuação)`} />
                        </div>
                        <p className={`text-xs ${r.emissor.valido ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.emissor.valido
                                ? `${r.emissor.tipo} válido${r.emissor.tipo === 'CPF' ? ' (pessoa física)' : ''}`
                                : 'Dígitos do CNPJ inválidos'}
                        </p>
                    </Bloco>

                    <Bloco icone={MapPin} rotulo="Estado">
                        {estado ? `${estado[1]} — ${estado[0]}` : 'Desconhecido'}
                        <p className="text-xs text-apagado">Código IBGE {r.uf}</p>
                    </Bloco>

                    <Bloco icone={CalendarDays} rotulo="Emissão">
                        <span className="first-letter:uppercase">{mesAno}</span>
                        <p className="text-xs text-apagado">A chave guarda só o mês e o ano</p>
                    </Bloco>

                    <Bloco icone={Zap} rotulo="Tipo de emissão">
                        <span className={contingencia ? 'text-amber-300' : ''}>{tipo ? tipo[0] : `Código ${r.tipoEmissao}`}</span>
                        {tipo && <p className="text-xs text-apagado">{tipo[1]}</p>}
                    </Bloco>

                    <Bloco icone={FileText} rotulo="Documento">
                        {modelo ? modelo[0] : 'Desconhecido'} <span className="text-apagado">(modelo {r.modelo})</span>
                        <p className="font-mono text-xs text-apagado">
                            Série {r.serie} · Nº {r.numero}
                        </p>
                    </Bloco>

                    <Bloco icone={Hash} rotulo="Código numérico">
                        <span className="font-mono">{r.codigo}</span>
                        <p className="text-xs text-apagado">Número aleatório gerado pelo sistema emissor</p>
                    </Bloco>
                </div>

                {/* Mapa colorido da chave */}
                <div className="mt-4 rounded-xl bg-fundo/60 p-4 ring-1 ring-borda">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-wider text-apagado">Mapa da chave</p>
                        <BotaoCopiar texto={r.chave} titulo="Copiar chave" />
                    </div>
                    <p className="mt-2 break-all font-mono text-[15px] leading-relaxed tracking-wide">
                        {partes.map((p) => (
                            <span key={p.nome} title={p.nome} className={`${p.cor} mr-1.5`}>
                                {r.chave.slice(p.ini, p.fim)}
                            </span>
                        ))}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                        {partes.map((p) => (
                            <span key={p.nome} className={`text-[11px] ${p.cor}`}>
                                ● {p.nome}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Aviso sobre o que a chave não tem */}
                <p className="mt-4 flex gap-2 text-xs text-apagado">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    Valor, itens, destinatário e situação (autorizada, cancelada) não ficam na chave. Para isso, só consultando a SEFAZ.
                </p>
            </div>
        </div>,
        document.body
    )
}

// ---------- Card ----------

export default function PainelChave({ ordem }) {
    const [texto, setTexto] = useState('')
    const [aberta, setAberta] = useState(false)

    const r = texto.trim() ? lerChave(texto) : null
    const valida = Boolean(r && !r.erro)

    // Ao colar/digitar: se a chave ficou completa, abre a janela sozinha
    function mudar(novoTexto) {
        setTexto(novoTexto)
        const novo = novoTexto.trim() ? lerChave(novoTexto) : null
        setAberta(Boolean(novo && !novo.erro))
    }

    return (
        <Cartao
            titulo="Leitor de chave"
            icone={KeyRound} chave="leitor-chave"
            ordem={ordem}
            acoes={
                texto && (
                    <button onClick={() => mudar('')} title="Limpar" className={estiloBotaoIcone}>
                        <X size={14} />
                    </button>
                )
            }
        >
            <input
                className={`${estiloCampo} w-full font-mono text-xs`}
                placeholder="Cole a chave de 44 números"
                value={texto}
                onChange={(e) => mudar(e.target.value)}
                spellCheck={false}
            />

            {r?.erro && <p className="mt-2 text-sm text-red-400">{r.erro}</p>}

            {/* Resumo: clicar abre a janela de novo */}
            {valida && (
                <button onClick={() => setAberta(true)} className={`${estiloItem} mt-3 flex w-full items-center gap-2 p-2.5 text-left text-sm`}>
                    {r.dvOk ? (
                        <CircleCheck size={15} className="shrink-0 text-emerald-400" />
                    ) : (
                        <CircleX size={15} className="shrink-0 text-red-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                        {MODELOS[r.modelo]?.[0] ?? `Modelo ${r.modelo}`} · {ESTADOS[r.uf]?.[0] ?? r.uf} · nº{' '}
                        {Number(r.numero).toLocaleString('pt-BR')}
                    </span>
                    <Maximize2 size={14} className="shrink-0 text-apagado" />
                </button>
            )}

            {valida && aberta && <JanelaChave r={r} aoFechar={() => setAberta(false)} />}
        </Cartao>
    )
}