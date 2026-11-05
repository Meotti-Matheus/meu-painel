import { useEffect, useRef, useState } from 'react'
import { Search, Globe, AppWindow, CornerDownLeft } from 'lucide-react'
import { chamarServidor, normalizar } from './compartilhado.js'

// Busca no topo: procura favoritos e programas. Ctrl + K foca, setas escolhem, Enter abre, Esc fecha
export default function Busca() {
    const [texto, setTexto] = useState('')
    const [itens, setItens] = useState([])
    const [aberto, setAberto] = useState(false)
    const [selecionado, setSelecionado] = useState(0)
    const [aviso, setAviso] = useState('')
    const campo = useRef(null)

    // Atalho Ctrl + K em qualquer lugar da página
    useEffect(() => {
        function atalho(e) {
            if (e.ctrlKey && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                campo.current?.focus()
            }
        }
        window.addEventListener('keydown', atalho)
        return () => window.removeEventListener('keydown', atalho)
    }, [])

    // Pega a lista atualizada sempre que a busca ganha foco
    async function carregar() {
        const [respFavoritos, respProgramas] = await Promise.all([
            chamarServidor('/api/favoritos'),
            chamarServidor('/api/programas'),
        ])
        const favoritos = respFavoritos?.ok ? await respFavoritos.json() : []
        const programas = respProgramas?.ok ? await respProgramas.json() : []

        setItens([
            ...favoritos.map((f) => ({ chave: `f${f.id}`, tipo: 'favorito', nome: f.titulo, detalhe: f.categoria, url: f.url })),
            ...programas.map((p) => ({ chave: `p${p.id}`, tipo: 'programa', nome: p.nome, detalhe: 'Programa', id: p.id })),
        ])
    }

    const procurado = normalizar(texto.trim())
    const resultados = procurado
        ? itens.filter((i) => normalizar(`${i.nome} ${i.detalhe} ${i.url ?? ''}`).includes(procurado)).slice(0, 8)
        : []

    // Abre o favorito numa aba nova ou pede ao servidor para abrir o programa
    async function abrir(item) {
        if (!item) return

        if (item.tipo === 'favorito') {
            window.open(item.url, '_blank', 'noopener,noreferrer')
        } else {
            const resposta = await chamarServidor(`/api/programas/${item.id}/abrir`, { method: 'POST' })
            setAviso(resposta?.ok ? `Abrindo ${item.nome}...` : `Não foi possível abrir ${item.nome}`)
            setTimeout(() => setAviso(''), 2500)
        }

        setTexto('')
        campo.current?.blur()
    }

    function teclas(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelecionado((s) => Math.min(s + 1, resultados.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelecionado((s) => Math.max(s - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            abrir(resultados[selecionado])
        } else if (e.key === 'Escape') {
            setTexto('')
            campo.current?.blur()
        }
    }

    return (
        <div className="relative w-full">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-apagado" />
            <input
                ref={campo}
                value={texto}
                onChange={(e) => {
                    setTexto(e.target.value)
                    setSelecionado(0)
                }}
                onFocus={() => {
                    setAberto(true)
                    carregar()
                }}
                onBlur={() => setAberto(false)}
                onKeyDown={teclas}
                placeholder="Buscar favorito ou programa…"
                className="w-full rounded-xl bg-superficie/80 py-2.5 pr-16 pl-10 text-sm text-texto ring-1 ring-borda outline-none backdrop-blur transition placeholder:text-apagado focus:ring-acento/60"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-elevado px-1.5 py-0.5 font-sans text-[10px] text-apagado ring-1 ring-borda">
                Ctrl K
            </kbd>

            {/* Lista de resultados */}
            {aberto && procurado && (
                <ul className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl bg-superficie p-1 shadow-2xl ring-1 ring-borda">
                    {resultados.length === 0 && <li className="px-3 py-2 text-sm text-apagado">Nada encontrado.</li>}

                    {resultados.map((item, i) => {
                        const Icone = item.tipo === 'favorito' ? Globe : AppWindow
                        const ativo = i === selecionado
                        return (
                            <li key={item.chave}>
                                <button
                                    onMouseDown={(e) => e.preventDefault()} // evita fechar a lista antes do clique
                                    onClick={() => abrir(item)}
                                    onMouseEnter={() => setSelecionado(i)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${ativo ? 'bg-acento/15 text-texto' : 'text-suave'
                                        }`}
                                >
                                    <Icone size={15} className={`shrink-0 ${ativo ? 'text-acento' : 'text-apagado'}`} />
                                    <span className="min-w-0 flex-1 truncate">{item.nome}</span>
                                    <span className="shrink-0 text-[11px] text-apagado">{item.detalhe}</span>
                                    {ativo && <CornerDownLeft size={13} className="shrink-0 text-acento" />}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}

            {aviso && <p className="absolute top-full left-0 mt-2 text-xs text-acento">{aviso}</p>}
        </div>
    )
}