import { useEffect, useRef, useState } from 'react'
import { AppWindow, Plus, Pencil, X } from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import Cartao from './Cartao.jsx'
import AvisoErro from './AvisoErro.jsx'
import ControleTamanho from './ControleTamanho.jsx'
import ItemArrastavel, { useSensoresArraste } from './ItemArrastavel.jsx'
import { useTamanho } from './useTamanho.js'
import {
    estiloCampo,
    estiloBotao,
    estiloBotaoSecundario,
    estiloBotaoIcone,
    estiloBotaoAdicionar,
    estiloItem,
    estiloAcoesItem,
    chamarServidor,
    mensagemErro,
} from './compartilhado.js'

// Tamanhos de cada nível (1 a 5): ícone e letra (em pixels)
const TAMANHOS = [
    { icone: 28, texto: 12 },
    { icone: 36, texto: 14 },
    { icone: 44, texto: 15 },
    { icone: 52, texto: 16 },
    { icone: 60, texto: 17 },
]

// Ícone real do programa (vem do servidor). Se falhar, mostra a primeira letra
function IconePrograma({ programa, tamanho }) {
    const [falhou, setFalhou] = useState(false)
    const animacao = 'transition-transform duration-300 ease-out group-hover:scale-110'
    const medidas = { width: tamanho, height: tamanho }

    if (falhou) {
        return (
            <div
                style={{ ...medidas, fontSize: tamanho * 0.42 }}
                className={`flex shrink-0 items-center justify-center rounded-lg bg-acento/15 font-semibold text-acento ${animacao}`}
            >
                {programa.nome.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <img
            // O "?c=" muda quando o caminho muda, para o navegador não mostrar o ícone antigo
            src={`/api/programas/${programa.id}/icone?c=${encodeURIComponent(programa.caminho)}`}
            onError={() => setFalhou(true)}
            alt=""
            draggable={false}
            style={medidas}
            className={`shrink-0 rounded-lg bg-white/5 object-contain p-1.5 ${animacao}`}
        />
    )
}

export default function PainelProgramas({ ordem }) {
    const [programas, setProgramas] = useState([])
    const [nome, setNome] = useState('')
    const [caminho, setCaminho] = useState('')
    const [erro, setErro] = useState('')
    const [erroCarregar, setErroCarregar] = useState('')
    const [editandoId, setEditandoId] = useState(null) // null = cadastrando um novo
    const [mostrarFormulario, setMostrarFormulario] = useState(false)
    const [aviso, setAviso] = useState('') // mensagem "Abrindo..."
    const [nivel, setNivel] = useTamanho('programas', 2)

    const sensores = useSensoresArraste()
    const arrastouRef = useRef(false) // true logo depois de um arraste (para não abrir o programa ao soltar)

    const tamanho = TAMANHOS[nivel - 1]

    // Busca os programas e ordena pela posição salva (empate: ordem alfabética)
    async function carregar() {
        const resposta = await chamarServidor('/api/programas')
        if (!resposta || !resposta.ok) {
            setErroCarregar(await mensagemErro(resposta, 'carregar os programas'))
            return
        }
        const lista = await resposta.json()
        lista.sort((a, b) => a.posicao - b.posicao || a.nome.localeCompare(b.nome, 'pt-BR'))
        setProgramas(lista)
        setErroCarregar('')
    }

    useEffect(() => {
        carregar()
    }, [])

    // Fecha e limpa o formulário
    function limparFormulario() {
        setNome('')
        setCaminho('')
        setEditandoId(null)
        setMostrarFormulario(false)
        setErro('')
    }

    function abrirFormularioNovo() {
        limparFormulario()
        setMostrarFormulario(true)
    }

    function iniciarEdicao(p) {
        setEditandoId(p.id)
        setNome(p.nome)
        setCaminho(p.caminho)
        setMostrarFormulario(true)
        setErro('')
    }

    // Cadastra um novo ou salva a edição
    async function salvar(e) {
        e.preventDefault()
        setErro('')

        // Tira as aspas que o Windows coloca ao usar "Copiar como caminho"
        const caminhoLimpo = caminho.trim().replace(/^"+|"+$/g, '')
        const editando = editandoId !== null

        const resposta = await chamarServidor(editando ? `/api/programas/${editandoId}` : '/api/programas', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome.trim(), caminho: caminhoLimpo }),
        })

        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar o programa'))
            return
        }

        limparFormulario()
        carregar()
    }

    async function remover(id) {
        if (!confirm('Remover este programa da lista? (o programa não é desinstalado)')) return
        const resposta = await chamarServidor(`/api/programas/${id}`, { method: 'DELETE' })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'remover o programa'))
            return
        }
        if (id === editandoId) limparFormulario()
        carregar()
    }

    // Pede ao servidor para abrir o programa (não abre se você acabou de arrastar)
    async function abrir(p) {
        if (arrastouRef.current) return
        setErro('')
        const resposta = await chamarServidor(`/api/programas/${p.id}/abrir`, { method: 'POST' })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, `abrir ${p.nome}`))
            return
        }
        setAviso(`Abrindo ${p.nome}...`)
        setTimeout(() => setAviso(''), 2500)
    }

    // ---------- Arrastar para reorganizar ----------

    // Soltou: reordena na tela e salva no servidor
    async function fimArraste({ active, over }) {
        setTimeout(() => {
            arrastouRef.current = false
        }, 150)

        if (!over || active.id === over.id) return
        const de = programas.findIndex((p) => p.id === active.id)
        const para = programas.findIndex((p) => p.id === over.id)
        if (de < 0 || para < 0) return
        const novos = arrayMove(programas, de, para)
        setProgramas(novos)

        const resposta = await chamarServidor('/api/programas/ordem', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: novos.map((p) => p.id) }),
        })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar a nova ordem'))
            carregar() // volta para a ordem que está salva
        }
    }

    return (
        <Cartao
            titulo={editandoId !== null ? 'Editando programa' : 'Programas'}
            icone={AppWindow}
            chave="programas"
            ordem={ordem}
            acoes={<ControleTamanho nivel={nivel} aoMudar={setNivel} />}
        >
            {/* Botão que abre o formulário, ou o próprio formulário */}
            {!mostrarFormulario ? (
                <button onClick={abrirFormularioNovo} className={estiloBotaoAdicionar}>
                    <Plus size={15} />
                    {programas.length > 0 ? 'Adicionar outro' : 'Adicionar programa'}
                </button>
            ) : (
                <form onSubmit={salvar} className="grid gap-2">
                    <input
                        autoFocus
                        className={estiloCampo}
                        placeholder="Nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        maxLength={100}
                        required
                    />
                    <input
                        className={estiloCampo}
                        placeholder="C:\Caminho\programa.exe ou .lnk"
                        value={caminho}
                        onChange={(e) => setCaminho(e.target.value)}
                        maxLength={500}
                        required
                    />
                    <div className="flex gap-2">
                        <button className={`${estiloBotao} flex-1`}>{editandoId !== null ? 'Salvar' : 'Adicionar'}</button>
                        <button type="button" onClick={limparFormulario} className={`${estiloBotaoSecundario} flex-1`}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {erro && <p className="mt-2 text-sm text-red-400">{erro}</p>}
            {aviso && <p className="mt-2 text-sm text-acento">{aviso}</p>}

            {erroCarregar ? (
                <AvisoErro mensagem={erroCarregar} aoTentarDeNovo={carregar} />
            ) : (
                <>
                    {programas.length === 0 && <p className="mt-4 text-sm text-apagado">Nenhum programa ainda.</p>}

                    <DndContext
                        sensors={sensores}
                        collisionDetection={closestCenter}
                        onDragStart={() => {
                            arrastouRef.current = true
                        }}
                        onDragEnd={fimArraste}
                        onDragCancel={() => {
                            arrastouRef.current = false
                        }}
                    >
                        <SortableContext items={programas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                            {/* Um programa por linha */}
                            <ul className="mt-4 space-y-1.5">
                                {programas.map((p) => (
                                    <ItemArrastavel key={p.id} id={p.id} className="group relative">
                                        {/* A linha inteira abre o programa */}
                                        <button
                                            onClick={() => abrir(p)}
                                            title={p.caminho}
                                            className={`${estiloItem} flex w-full items-center gap-3 p-2.5 text-left ${editandoId === p.id ? 'ring-1 ring-acento' : ''
                                                }`}
                                        >
                                            {/* "key" faz o ícone recarregar se o caminho for editado */}
                                            <IconePrograma key={`${p.id}-${p.caminho}`} programa={p} tamanho={tamanho.icone} />
                                            <span
                                                style={{ fontSize: tamanho.texto }}
                                                className="min-w-0 flex-1 truncate pr-16 text-texto/85 transition-colors duration-300 group-hover:text-texto"
                                            >
                                                {p.nome}
                                            </span>
                                        </button>

                                        {/* Botões que aparecem ao passar o mouse */}
                                        <div className={`${estiloAcoesItem} absolute top-1/2 right-2 -translate-y-1/2`}>
                                            <button onClick={() => iniciarEdicao(p)} title="Editar" className={estiloBotaoIcone}>
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => remover(p.id)} title="Remover" className={`${estiloBotaoIcone} hover:text-red-400`}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </ItemArrastavel>
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                </>
            )}
        </Cartao>
    )
}