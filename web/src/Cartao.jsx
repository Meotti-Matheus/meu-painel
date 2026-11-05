import { useEffect, useRef, useState } from 'react'
import { estiloCartao } from './compartilhado.js'

const ALTURA_MINIMA = 90 // em pixels

// Lê a altura salva deste card (null = automática)
function lerAltura(chave) {
    if (!chave) return null
    try {
        const salvo = Number(localStorage.getItem(`altura-${chave}`))
        return salvo >= ALTURA_MINIMA ? salvo : null
    } catch {
        return null
    }
}

// Card padrão do painel.
// icone = ícone do título | destaque = card com mais ênfase | ordem = posição na animação de entrada
// chave = nome único do card (usado para salvar a altura)
export default function Cartao({ titulo, icone: Icone, acoes, destaque = false, ordem = 0, chave, children }) {
    const [altura, setAltura] = useState(() => lerAltura(chave))
    const cartao = useRef(null)

    // Salva a altura no navegador (ou apaga, se voltou para automática)
    useEffect(() => {
        if (!chave) return
        try {
            if (altura) localStorage.setItem(`altura-${chave}`, String(Math.round(altura)))
            else localStorage.removeItem(`altura-${chave}`)
        } catch {
            // se não conseguir salvar, só não lembra depois do F5
        }
    }, [chave, altura])

    // Arrastar a borda de baixo muda a altura
    function iniciarArraste(e) {
        e.preventDefault()
        const inicioY = e.clientY
        const alturaInicial = cartao.current.getBoundingClientRect().height

        function mover(ev) {
            setAltura(Math.max(ALTURA_MINIMA, alturaInicial + ev.clientY - inicioY))
        }

        function soltar() {
            window.removeEventListener('pointermove', mover)
            window.removeEventListener('pointerup', soltar)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
        document.body.style.cursor = 'row-resize'
        document.body.style.userSelect = 'none' // evita selecionar texto enquanto arrasta
    }

    return (
        <section
            ref={cartao}
            style={{ animationDelay: `${ordem * 70}ms`, height: altura ?? undefined }}
            className={`${estiloCartao} animate-entrada flex flex-col ${destaque ? 'bg-linear-to-b from-acento-forte/[0.09] to-superficie ring-acento/20' : 'ring-white/[0.05]'
                }`}
        >
            <div className="mb-4 flex h-7 shrink-0 items-center justify-between gap-2">
                <h2
                    className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] ${destaque ? 'text-texto' : 'text-suave'
                        }`}
                >
                    {Icone && <Icone size={15} strokeWidth={2} className="text-acento" />}
                    {titulo}
                </h2>

                {/* Botões do card: só aparecem ao passar o mouse */}
                {acoes && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/cartao:opacity-100">
                        {acoes}
                    </div>
                )}
            </div>

            {/* Conteúdo: com altura definida, rola por dentro */}
            <div className={`min-h-0 flex-1 ${altura ? '-mr-2 overflow-y-auto pr-2' : ''}`}>{children}</div>

            {/* Barrinha na borda de baixo para mudar a altura */}
            {chave && (
                <div
                    onPointerDown={iniciarArraste}
                    onDoubleClick={() => setAltura(null)}
                    title="Arraste para mudar a altura (duplo clique volta ao automático)"
                    className="group/alca absolute inset-x-6 -bottom-1.5 z-10 flex h-3 cursor-row-resize items-center justify-center"
                >
                    <div className="h-1 w-10 rounded-full bg-transparent transition-colors group-hover/cartao:bg-suave/50 group-hover/alca:bg-acento/70" />
                </div>
            )}
        </section>
    )
}