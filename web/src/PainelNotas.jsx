import { useEffect, useState } from 'react'
import { StickyNote, Pencil, X } from 'lucide-react'
import Cartao from './Cartao.jsx'
import AvisoErro from './AvisoErro.jsx'
import ControleTamanho from './ControleTamanho.jsx'
import { useTamanho } from './useTamanho.js'
import {
    estiloCampo,
    estiloBotao,
    estiloBotaoSecundario,
    estiloBotaoIcone,
    estiloItem,
    estiloAcoesItem,
    chamarServidor,
    mensagemErro,
    formatarData,
} from './compartilhado.js'

// Tamanho da letra das notas em cada nível (1 a 5), em pixels
const TAMANHOS_LETRA = [12, 14, 16, 18, 20]

export default function PainelNotas({ ordem }) {
    const [notas, setNotas] = useState([])
    const [texto, setTexto] = useState('')
    const [erro, setErro] = useState('')
    const [erroCarregar, setErroCarregar] = useState('')
    const [editandoId, setEditandoId] = useState(null) // id da nota em edição
    const [textoEdicao, setTextoEdicao] = useState('')
    const [nivel, setNivel] = useTamanho('notas', 2)

    const tamanhoLetra = TAMANHOS_LETRA[nivel - 1]

    async function carregar() {
        const resposta = await chamarServidor('/api/notas')
        if (!resposta || !resposta.ok) {
            setErroCarregar(await mensagemErro(resposta, 'carregar as notas'))
            return
        }
        setNotas(await resposta.json())
        setErroCarregar('')
    }

    useEffect(() => {
        carregar()
    }, [])

    async function adicionar(e) {
        e.preventDefault()
        setErro('')
        const limpo = texto.trim()
        if (!limpo) return

        const resposta = await chamarServidor('/api/notas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: limpo }),
        })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar a nota'))
            return
        }
        setTexto('')
        carregar()
    }

    // Abre a nota para edição
    function iniciarEdicao(n) {
        setEditandoId(n.id)
        setTextoEdicao(n.texto)
        setErro('')
    }

    function cancelarEdicao() {
        setEditandoId(null)
        setTextoEdicao('')
    }

    async function salvarEdicao() {
        setErro('')
        const limpo = textoEdicao.trim()
        if (!limpo) return

        const resposta = await chamarServidor(`/api/notas/${editandoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: limpo }),
        })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'editar a nota'))
            return
        }
        cancelarEdicao()
        carregar()
    }

    async function remover(id) {
        if (!confirm('Apagar esta nota?')) return
        const resposta = await chamarServidor(`/api/notas/${id}`, { method: 'DELETE' })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'apagar a nota'))
            return
        }
        if (id === editandoId) cancelarEdicao()
        carregar()
    }

    return (
        <Cartao titulo="Notas" icone={StickyNote} chave="notas" ordem={ordem} acoes={<ControleTamanho nivel={nivel} aoMudar={setNivel} />}>
            {/* Nova nota: começa com 1 linha e cresce quando você digita */}
            <form onSubmit={adicionar}>
                <textarea
                    className={`${estiloCampo} w-full resize-none`}
                    placeholder="Nova nota…"
                    rows={texto ? 3 : 1}
                    maxLength={5000}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) adicionar(e)
                    }}
                />
                {texto.trim() && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-apagado">Ctrl + Enter para salvar</span>
                        <button className={estiloBotao}>Salvar nota</button>
                    </div>
                )}
            </form>

            {erro && <p className="mt-2 text-sm text-red-400">{erro}</p>}

            {erroCarregar ? (
                <AvisoErro mensagem={erroCarregar} aoTentarDeNovo={carregar} />
            ) : (
                <ul className="mt-4 max-h-96 space-y-1.5 overflow-y-auto pr-1">
                    {notas.length === 0 && <li className="py-1 text-sm text-apagado">Nenhuma nota ainda.</li>}

                    {notas.map((n) =>
                        editandoId === n.id ? (
                            // Nota em modo de edição
                            <li key={n.id} className="rounded-xl bg-elevado p-3 ring-1 ring-acento/50">
                                <textarea
                                    autoFocus
                                    style={{ fontSize: tamanhoLetra }}
                                    className={`${estiloCampo} w-full resize-y`}
                                    rows={4}
                                    maxLength={5000}
                                    value={textoEdicao}
                                    onChange={(e) => setTextoEdicao(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) salvarEdicao()
                                        if (e.key === 'Escape') cancelarEdicao()
                                    }}
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                    <button onClick={cancelarEdicao} className={estiloBotaoSecundario}>
                                        Cancelar
                                    </button>
                                    <button onClick={salvarEdicao} className={estiloBotao}>
                                        Salvar
                                    </button>
                                </div>
                            </li>
                        ) : (
                            // Nota normal (duplo clique também edita)
                            <li key={n.id} onDoubleClick={() => iniciarEdicao(n)} className={`${estiloItem} group relative p-3`}>
                                <p style={{ fontSize: tamanhoLetra }} className="whitespace-pre-wrap break-words pr-14 leading-relaxed text-texto/90">
                                    {n.texto}
                                </p>
                                <span className="mt-1.5 block text-[11px] text-apagado">{formatarData(n.criadaEm)}</span>

                                <div className={`${estiloAcoesItem} absolute top-2 right-2`}>
                                    <button onClick={() => iniciarEdicao(n)} title="Editar" className={estiloBotaoIcone}>
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => remover(n.id)} title="Apagar" className={`${estiloBotaoIcone} hover:text-red-400`}>
                                        <X size={14} />
                                    </button>
                                </div>
                            </li>
                        )
                    )}
                </ul>
            )}
        </Cartao>
    )
}