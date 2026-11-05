import { useEffect, useState } from 'react'
import { CalendarDays, ExternalLink, RotateCw } from 'lucide-react'
import Cartao from './Cartao.jsx'
import AvisoErro from './AvisoErro.jsx'
import { estiloBotaoIcone, chamarServidor, mensagemErro } from './compartilhado.js'

// "2026-11-03T12:00:00.000Z" -> "09:00" (no horário do seu PC)
function formatarHora(iso) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function PainelAgenda({ ordem }) {
    const [eventos, setEventos] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erroCarregar, setErroCarregar] = useState('')
    const [agora, setAgora] = useState(() => Date.now()) // usado para marcar "Agora" e eventos passados

    // forcar = true busca direto no Google, ignorando a cópia de 5 minutos do servidor
    async function carregar(forcar = false) {
        setCarregando(true)
        const resposta = await chamarServidor(`/api/agenda/hoje${forcar ? '?atualizar=1' : ''}`)
        setCarregando(false)

        if (!resposta || !resposta.ok) {
            setErroCarregar(await mensagemErro(resposta, 'carregar a agenda'))
            return
        }
        setEventos(await resposta.json())
        setErroCarregar('')
    }

    useEffect(() => {
        carregar()
        const recarregar = setInterval(() => carregar(), 5 * 60 * 1000) // busca de novo a cada 5 minutos
        const relogio = setInterval(() => setAgora(Date.now()), 60 * 1000) // atualiza "Agora" a cada minuto
        return () => {
            clearInterval(recarregar)
            clearInterval(relogio)
        }
    }, [])

    return (
        <Cartao
            titulo="Agenda de hoje"
            icone={CalendarDays} chave="agenda"
            destaque
            ordem={ordem}
            acoes={
                <>
                    <a href="https://calendar.google.com" target="_blank" rel="noreferrer" title="Abrir Google Agenda" className={estiloBotaoIcone}>
                        <ExternalLink size={14} />
                    </a>
                    <button onClick={() => carregar(true)} title="Atualizar agora" className={estiloBotaoIcone}>
                        <RotateCw size={14} className={carregando ? 'animate-spin' : ''} />
                    </button>
                </>
            }
        >
            {erroCarregar ? (
                <AvisoErro mensagem={erroCarregar} aoTentarDeNovo={() => carregar(true)} />
            ) : (
                <ul className="space-y-1">
                    {!carregando && eventos.length === 0 && <li className="text-sm text-apagado">Nenhum evento hoje.</li>}

                    {eventos.map((ev) => {
                        const inicio = new Date(ev.inicio).getTime()
                        const fim = ev.fim ? new Date(ev.fim).getTime() : inicio
                        const acontecendo = !ev.diaInteiro && agora >= inicio && agora < fim
                        const passou = !ev.diaInteiro && agora >= fim

                        return (
                            <li
                                key={ev.id}
                                className={`flex gap-3 rounded-xl p-2.5 transition ${acontecendo ? 'bg-acento/10' : 'hover:bg-elevado/60'
                                    } ${passou ? 'opacity-40' : ''}`}
                            >
                                {/* Barrinha da esquerda (roxa no evento que está acontecendo) */}
                                <span className={`w-1 shrink-0 rounded-full ${acontecendo ? 'bg-acento' : 'bg-borda'}`} />

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs tabular-nums text-suave">
                                            {ev.diaInteiro ? 'Dia inteiro' : `${formatarHora(ev.inicio)} – ${formatarHora(ev.fim ?? ev.inicio)}`}
                                        </span>
                                        {acontecendo && (
                                            <span className="rounded-full bg-acento/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-acento">
                                                Agora
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 break-words text-sm font-medium">{ev.titulo}</p>
                                    {ev.local && (
                                        <p className="mt-0.5 truncate text-xs text-apagado" title={ev.local}>
                                            {ev.local}
                                        </p>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </Cartao>
    )
}