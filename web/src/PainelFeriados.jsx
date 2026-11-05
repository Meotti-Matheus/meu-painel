import { useEffect, useState } from 'react'
import { PartyPopper } from 'lucide-react'
import Cartao from './Cartao.jsx'

// Data da Páscoa (algoritmo de Meeus/Jones/Butcher)
function pascoa(ano) {
    const a = ano % 19
    const b = Math.floor(ano / 100)
    const c = ano % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const mes = Math.floor((h + l - 7 * m + 114) / 31)
    const dia = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(ano, mes - 1, dia)
}

function somarDias(data, dias) {
    const nova = new Date(data)
    nova.setDate(nova.getDate() + dias)
    return nova
}

// Feriados nacionais do ano (Carnaval e Corpus Christi são ponto facultativo)
function feriadosDoAno(ano) {
    const p = pascoa(ano)
    const fixo = (mes, dia, nome) => ({ data: new Date(ano, mes - 1, dia), nome, facultativo: false })

    return [
        fixo(1, 1, 'Confraternização Universal'),
        { data: somarDias(p, -48), nome: 'Carnaval', facultativo: true },
        { data: somarDias(p, -47), nome: 'Carnaval', facultativo: true },
        { data: somarDias(p, -2), nome: 'Sexta-feira Santa', facultativo: false },
        fixo(4, 21, 'Tiradentes'),
        fixo(5, 1, 'Dia do Trabalho'),
        { data: somarDias(p, 60), nome: 'Corpus Christi', facultativo: true },
        fixo(9, 7, 'Independência do Brasil'),
        fixo(10, 12, 'Nossa Senhora Aparecida'),
        fixo(11, 2, 'Finados'),
        fixo(11, 15, 'Proclamação da República'),
        fixo(11, 20, 'Dia da Consciência Negra'),
        fixo(12, 25, 'Natal'),
    ]
}

function inicioDeHoje() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return hoje
}

function textoFalta(dias) {
    if (dias === 0) return 'Hoje!'
    if (dias === 1) return 'Amanhã'
    return `Em ${dias} dias`
}

export default function PainelFeriados({ ordem }) {
    const [hoje, setHoje] = useState(inicioDeHoje)

    // Confere a cada hora se o dia virou
    useEffect(() => {
        const relogio = setInterval(() => setHoje(inicioDeHoje()), 60 * 60 * 1000)
        return () => clearInterval(relogio)
    }, [])

    // Feriados deste ano e do próximo, a partir de hoje
    const ano = hoje.getFullYear()
    const proximos = [...feriadosDoAno(ano), ...feriadosDoAno(ano + 1)]
        .filter((f) => f.data >= hoje)
        .sort((a, b) => a.data - b.data)
        .slice(0, 4)

    const [proximo, ...seguintes] = proximos
    const dias = Math.round((proximo.data - hoje) / 86400000)

    return (
        <Cartao titulo="Próximo feriado" icone={PartyPopper} chave="feriados" ordem={ordem}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{proximo.nome}</p>
                    <p className="text-xs text-suave first-letter:uppercase">
                        {proximo.data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </p>
                    {proximo.facultativo && (
                        <span className="mt-1.5 inline-block rounded-md bg-elevado px-1.5 py-0.5 text-[10px] text-suave">Ponto facultativo</span>
                    )}
                </div>
                <span className="shrink-0 text-sm font-medium text-acento">{textoFalta(dias)}</span>
            </div>

            {/* Os seguintes, menores */}
            <ul className="mt-3 space-y-1">
                {seguintes.map((f) => (
                    <li key={`${f.nome}-${f.data.toISOString()}`} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-suave">
                            {f.nome}
                            {f.facultativo && <span className="text-apagado"> · facultativo</span>}
                        </span>
                        <span className="shrink-0 tabular-nums text-apagado">
                            {f.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                    </li>
                ))}
            </ul>
        </Cartao>
    )
}