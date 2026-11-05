import { useEffect, useState } from 'react'
import { CalendarCheck, RotateCw } from 'lucide-react'
import Cartao from './Cartao.jsx'
import AvisoErro from './AvisoErro.jsx'
import { estiloBotaoIcone, chamarServidor, mensagemErro } from './compartilhado.js'

// "2026-11-28" -> data no horário local (sem risco de virar o dia anterior)
function lerData(texto) {
    const [ano, mes, dia] = texto.split('-').map(Number)
    return new Date(ano, mes - 1, dia)
}

// Quantos dias faltam de hoje até a data
function diasAte(data) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return Math.round((data - hoje) / 86400000)
}

function textoFalta(dias) {
    if (dias === 0) return 'É hoje!'
    if (dias === 1) return 'É amanhã'
    return `Daqui a ${dias} dias`
}

export default function PainelEscala({ ordem }) {
    const [sabados, setSabados] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erroCarregar, setErroCarregar] = useState('')

    async function carregar(forcar = false) {
        setCarregando(true)
        const resposta = await chamarServidor(`/api/agenda/escala${forcar ? '?atualizar=1' : ''}`)
        setCarregando(false)

        if (!resposta || !resposta.ok) {
            setErroCarregar(await mensagemErro(resposta, 'carregar a escala'))
            return
        }
        setSabados(await resposta.json())
        setErroCarregar('')
    }

    useEffect(() => {
        carregar()
        const recarregar = setInterval(() => carregar(), 30 * 60 * 1000) // a cada 30 minutos
        return () => clearInterval(recarregar)
    }, [])

    const [proximo, ...seguintes] = sabados

    return (
        <Cartao
            titulo="Próximo sábado a trabalhar"
            icone={CalendarCheck} chave="escala"
            destaque
            ordem={ordem}
            acoes={
                <button onClick={() => carregar(true)} title="Atualizar agora" className={estiloBotaoIcone}>
                    <RotateCw size={14} className={carregando ? 'animate-spin' : ''} />
                </button>
            }
        >
            {erroCarregar ? (
                <AvisoErro mensagem={erroCarregar} aoTentarDeNovo={() => carregar(true)} />
            ) : !proximo ? (
                !carregando && <p className="text-sm text-apagado">Nenhum sábado na escala nos próximos 6 meses.</p>
            ) : (
                <>
                    {/* Próximo sábado em destaque */}
                    <div className="rounded-xl bg-linear-to-br from-acento/20 to-acento/5 p-4 ring-1 ring-acento/25">
                        <p className="text-xl font-semibold tracking-tight">
                            Sábado, {lerData(proximo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </p>
                        <p className="mt-1 text-sm font-medium text-acento">{textoFalta(diasAte(lerData(proximo.data)))}</p>
                        <p className="mt-2 truncate text-xs text-apagado" title={proximo.titulo}>
                            {proximo.titulo}
                        </p>
                    </div>

                    {/* Os seguintes, menores */}
                    {seguintes.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-[11px] text-apagado">Depois</span>
                            {seguintes.map((s) => (
                                <span key={s.data} className="rounded-md bg-elevado px-2 py-1 text-xs tabular-nums text-suave">
                                    {lerData(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Cartao>
    )
}