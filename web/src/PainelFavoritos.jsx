import { useEffect, useRef, useState } from 'react'
import { Bookmark, Plus, Pencil, X, Undo2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
    pegarOrigem,
} from './compartilhado.js'

const OPCAO_NOVA = '__nova__' // valor especial da opção "+ Nova categoria"

// Tamanhos de cada nível (1 a 5): ícone, largura mínima do card e letra (em pixels)
const TAMANHOS = [
    { icone: 32, card: 90, texto: 11 },
    { icone: 40, card: 110, texto: 12 },
    { icone: 48, card: 130, texto: 13 },
    { icone: 56, card: 150, texto: 14 },
    { icone: 64, card: 170, texto: 15 },
]

// Cores das letras (quando o site não tem ícone)
const CORES_LETRA = [
    'bg-violet-500/15 text-violet-300',
    'bg-sky-500/15 text-sky-300',
    'bg-emerald-500/15 text-emerald-300',
    'bg-amber-500/15 text-amber-300',
    'bg-rose-500/15 text-rose-300',
    'bg-teal-500/15 text-teal-300',
    'bg-orange-500/15 text-orange-300',
    'bg-fuchsia-500/15 text-fuchsia-300',
]

// Mesma cor sempre para o mesmo nome
function corDaLetra(texto) {
    let soma = 0
    for (const caractere of texto) soma += caractere.charCodeAt(0)
    return CORES_LETRA[soma % CORES_LETRA.length]
}

// Site interno (IP, "localhost", nome sem ponto, .local...): o Google não conhece, então não pergunta a ele
function ehEnderecoInterno(hostname) {
    return (
        !hostname.includes('.') ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
        /\.(local|lan|internal|intranet|corp)$/i.test(hostname)
    )
}

// Ícone do site: tenta o favicon do próprio site, depois o do Google (só sites públicos), e por último a letra colorida
function IconeSite({ url, titulo, tamanho }) {
    const [tentativa, setTentativa] = useState(0)
    const origem = pegarOrigem(url)

    let fontes = []
    if (origem) {
        const hostname = new URL(origem).hostname
        fontes = [`${origem}/favicon.ico`]
        if (!ehEnderecoInterno(hostname)) {
            fontes.push(`/api/icone-site?dominio=${encodeURIComponent(hostname)}`)
        }
    }

    const animacao = 'transition-transform duration-300 ease-out group-hover:scale-110'
    const medidas = { width: tamanho, height: tamanho }

    if (tentativa >= fontes.length) {
        return (
            <div
                style={{ ...medidas, fontSize: tamanho * 0.42 }}
                className={`flex items-center justify-center rounded-lg font-semibold ${corDaLetra(titulo)} ${animacao}`}
            >
                {titulo.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <img
            src={fontes[tentativa]}
            onError={() => setTentativa(tentativa + 1)}
            alt=""
            draggable={false}
            style={medidas}
            className={`rounded-lg bg-white/5 object-contain p-1.5 ${animacao}`}
        />
    )
}

// Bloco de uma categoria: só a alça (⋮⋮) ao lado do nome arrasta a categoria inteira
function BlocoCategoria({ nome, children }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: nome,
    })

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
                zIndex: isDragging ? 20 : undefined,
                position: 'relative',
            }}
            className={`group/cat mt-8 ${isDragging ? 'opacity-70' : ''}`}
        >
            <div className="mb-3 flex items-center gap-1">
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    title="Arraste para mudar a ordem da categoria"
                    className="-ml-1.5 flex h-5 w-5 cursor-grab touch-none items-center justify-center rounded text-apagado opacity-0 transition hover:bg-elevado hover:text-texto focus-visible:opacity-100 active:cursor-grabbing group-hover/cat:opacity-100"
                >
                    <GripVertical size={13} />
                </button>
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-apagado">{nome}</h3>
                {/* Linha fina separando as categorias */}
                <div className="ml-2 h-px flex-1 bg-borda/70" />
            </div>
            {children}
        </div>
    )
}

export default function PainelFavoritos({ ordem }) {
    const [favoritos, setFavoritos] = useState([])
    const [ordemCategorias, setOrdemCategorias] = useState([]) // nomes das categorias na ordem salva
    const [titulo, setTitulo] = useState('')
    const [url, setUrl] = useState('')
    const [categoria, setCategoria] = useState('') // '' = Geral
    const [criandoCategoria, setCriandoCategoria] = useState(false)
    const [erro, setErro] = useState('')
    const [erroCarregar, setErroCarregar] = useState('')
    const [editandoId, setEditandoId] = useState(null) // null = criando um novo
    const [mostrarFormulario, setMostrarFormulario] = useState(false)
    const [nivel, setNivel] = useTamanho('favoritos', 2)

    const sensores = useSensoresArraste()
    const arrastouRef = useRef(false) // true logo depois de um arraste (para não abrir o link ao soltar)

    const tamanho = TAMANHOS[nivel - 1]

    // Busca os favoritos e a ordem das categorias ao mesmo tempo
    async function carregar() {
        const [resposta, respostaOrdem] = await Promise.all([
            chamarServidor('/api/favoritos'),
            chamarServidor('/api/categorias/ordem'),
        ])
        if (!resposta || !resposta.ok) {
            setErroCarregar(await mensagemErro(resposta, 'carregar os favoritos'))
            return
        }
        setFavoritos(await resposta.json())
        // Se a ordem das categorias falhar, usa a ordem alfabética (não é motivo para mostrar erro)
        if (respostaOrdem?.ok) setOrdemCategorias(await respostaOrdem.json())
        setErroCarregar('')
    }

    useEffect(() => {
        carregar()
    }, [])

    // Lista de categorias já usadas (sem repetir, sem "Geral", em ordem alfabética) — usada no formulário
    const categorias = [...new Set(favoritos.map((f) => f.categoria))]
        .filter((c) => c !== 'Geral')
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))

    // Mostra o campo de texto se o usuário pediu, ou se ainda não existe nenhuma categoria
    const mostrarCampoNova = criandoCategoria || categorias.length === 0

    // Fecha e limpa o formulário
    function limparFormulario() {
        setTitulo('')
        setUrl('')
        setCategoria('')
        setCriandoCategoria(false)
        setEditandoId(null)
        setMostrarFormulario(false)
        setErro('')
    }

    function abrirFormularioNovo() {
        limparFormulario()
        setMostrarFormulario(true)
    }

    // Preenche o formulário com o favorito escolhido
    function iniciarEdicao(f) {
        setEditandoId(f.id)
        setTitulo(f.titulo)
        setUrl(f.url)
        setCategoria(f.categoria === 'Geral' ? '' : f.categoria)
        setCriandoCategoria(false)
        setMostrarFormulario(true)
        setErro('')
    }

    // Quando escolhe algo na lista de categorias
    function escolherCategoria(valor) {
        if (valor === OPCAO_NOVA) {
            setCriandoCategoria(true)
            setCategoria('')
        } else {
            setCategoria(valor)
        }
    }

    // Volta do campo de texto para a lista
    function voltarParaLista() {
        setCriandoCategoria(false)
        setCategoria('')
    }

    // Cria um novo ou salva a edição
    async function salvar(e) {
        e.preventDefault()
        setErro('')

        const editando = editandoId !== null
        const dados = { titulo, url, categoria: categoria.trim() || 'Geral' }

        const resposta = await chamarServidor(editando ? `/api/favoritos/${editandoId}` : '/api/favoritos', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
        })

        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar o favorito'))
            return
        }

        limparFormulario()
        carregar()
    }

    // Remove (só atualiza a tela se o servidor confirmar)
    async function remover(id) {
        if (!confirm('Remover este favorito?')) return
        const resposta = await chamarServidor(`/api/favoritos/${id}`, { method: 'DELETE' })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'remover o favorito'))
            return
        }
        if (id === editandoId) limparFormulario()
        carregar()
    }

    // ---------- Arrastar favoritos (dentro da categoria) ----------

    // Soltou: reordena a categoria na tela e salva no servidor
    async function fimArraste(evento, nomeCategoria) {
        setTimeout(() => {
            arrastouRef.current = false
        }, 150)

        const { active, over } = evento
        if (!over || active.id === over.id) return

        const itens = favoritos.filter((f) => f.categoria === nomeCategoria)
        const de = itens.findIndex((f) => f.id === active.id)
        const para = itens.findIndex((f) => f.id === over.id)
        if (de < 0 || para < 0) return
        const novos = arrayMove(itens, de, para)

        // Troca só os itens desta categoria, mantendo o resto igual
        let i = 0
        setFavoritos(favoritos.map((f) => (f.categoria === nomeCategoria ? novos[i++] : f)))

        const resposta = await chamarServidor('/api/favoritos/ordem', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: novos.map((f) => f.id) }),
        })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar a nova ordem'))
            carregar() // volta para a ordem que está salva
        }
    }

    // ---------- Arrastar categorias ----------

    // Agrupa os favoritos por categoria
    const grupos = favoritos.reduce((acc, f) => {
        ; (acc[f.categoria] ??= []).push(f)
        return acc
    }, {})

    // Ordem de exibição: primeiro as que têm posição salva; as novas vão para o fim (em ordem alfabética)
    const posicaoSalva = (nome) => {
        const indice = ordemCategorias.indexOf(nome)
        return indice < 0 ? Infinity : indice
    }
    const nomesOrdenados = Object.keys(grupos).sort(
        (a, b) => posicaoSalva(a) - posicaoSalva(b) || a.localeCompare(b, 'pt-BR')
    )

    // Soltou uma categoria: reordena e salva
    async function fimArrasteCategoria({ active, over }) {
        if (!over || active.id === over.id) return
        const de = nomesOrdenados.indexOf(active.id)
        const para = nomesOrdenados.indexOf(over.id)
        if (de < 0 || para < 0) return
        const novos = arrayMove(nomesOrdenados, de, para)
        setOrdemCategorias(novos)

        const resposta = await chamarServidor('/api/categorias/ordem', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nomes: novos }),
        })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar a ordem das categorias'))
            carregar() // volta para a ordem que está salva
        }
    }

    return (
        <Cartao
            titulo={editandoId !== null ? 'Editando favorito' : 'Favoritos'}
            icone={Bookmark}
            chave="favoritos"
            ordem={ordem}
            acoes={<ControleTamanho nivel={nivel} aoMudar={setNivel} />}
        >
            {/* Botão que abre o formulário, ou o próprio formulário */}
            {!mostrarFormulario ? (
                <button onClick={abrirFormularioNovo} className={estiloBotaoAdicionar}>
                    <Plus size={15} />
                    Adicionar favorito
                </button>
            ) : (
                <form onSubmit={salvar} className="flex flex-wrap gap-2">
                    <input
                        autoFocus
                        className={estiloCampo}
                        placeholder="Nome"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        required
                    />
                    <input className={estiloCampo} placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required />

                    {/* Categoria: campo de texto (nova) ou lista (existentes) */}
                    {mostrarCampoNova ? (
                        <div className="flex min-w-40 flex-1 gap-1">
                            <input
                                className={estiloCampo}
                                placeholder="Nova categoria (opcional)"
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value)}
                                maxLength={50}
                            />
                            {categorias.length > 0 && (
                                <button type="button" onClick={voltarParaLista} title="Voltar para a lista" className={estiloBotaoSecundario}>
                                    <Undo2 size={15} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <select
                            className={`${estiloCampo} [&>option]:bg-superficie`}
                            value={categoria}
                            onChange={(e) => escolherCategoria(e.target.value)}
                        >
                            <option value="">Geral (padrão)</option>
                            {categorias.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                            <option value={OPCAO_NOVA}>+ Nova categoria</option>
                        </select>
                    )}

                    <button className={estiloBotao}>{editandoId !== null ? 'Salvar' : 'Adicionar'}</button>
                    <button type="button" onClick={limparFormulario} className={estiloBotaoSecundario}>
                        Cancelar
                    </button>
                </form>
            )}

            {erro && <p className="mt-2 text-sm text-red-400">{erro}</p>}

            {/* Se não conseguiu carregar, mostra o aviso em vez da lista */}
            {erroCarregar ? (
                <AvisoErro mensagem={erroCarregar} aoTentarDeNovo={carregar} />
            ) : (
                <>
                    {favoritos.length === 0 && <p className="mt-4 text-sm text-apagado">Nenhum favorito ainda.</p>}

                    {/* Área de fora: arrasta categorias (pela alça) */}
                    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={fimArrasteCategoria}>
                        <SortableContext items={nomesOrdenados} strategy={verticalListSortingStrategy}>
                            {nomesOrdenados.map((nomeCategoria) => {
                                const itens = grupos[nomeCategoria]
                                return (
                                    <BlocoCategoria key={nomeCategoria} nome={nomeCategoria}>
                                        {/* Área de dentro: arrasta favoritos desta categoria */}
                                        <DndContext
                                            sensors={sensores}
                                            collisionDetection={closestCenter}
                                            onDragStart={() => {
                                                arrastouRef.current = true
                                            }}
                                            onDragEnd={(evento) => fimArraste(evento, nomeCategoria)}
                                            onDragCancel={() => {
                                                arrastouRef.current = false
                                            }}
                                        >
                                            <SortableContext items={itens.map((f) => f.id)} strategy={rectSortingStrategy}>
                                                {/* Cabem quantos cards couberem na largura; o tamanho mínimo depende do nível */}
                                                <ul
                                                    className="grid gap-3"
                                                    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tamanho.card}px, 1fr))` }}
                                                >
                                                    {itens.map((f) => (
                                                        <ItemArrastavel key={f.id} id={f.id} className="group relative">
                                                            {/* O cartão inteiro é o link (não abre se você acabou de arrastar) */}
                                                            <a
                                                                href={f.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                title={f.url}
                                                                draggable={false}
                                                                onClick={(e) => {
                                                                    if (arrastouRef.current) e.preventDefault()
                                                                }}
                                                                className={`${estiloItem} flex h-full flex-col items-center gap-2 p-3 text-center hover:shadow-[0_10px_30px_-12px_rgba(124,58,237,0.5)] ${editandoId === f.id ? 'ring-1 ring-acento' : ''
                                                                    }`}
                                                            >
                                                                <IconeSite key={f.url} url={f.url} titulo={f.titulo} tamanho={tamanho.icone} />
                                                                {/* Nome em até 2 linhas antes de cortar */}
                                                                <span
                                                                    style={{ fontSize: tamanho.texto }}
                                                                    className="line-clamp-2 w-full break-words leading-tight text-texto/85 transition-colors duration-300 group-hover:text-texto"
                                                                >
                                                                    {f.titulo}
                                                                </span>
                                                            </a>

                                                            {/* Botões que aparecem ao passar o mouse */}
                                                            <div className={`${estiloAcoesItem} absolute top-1 right-1`}>
                                                                <button onClick={() => iniciarEdicao(f)} title="Editar" className={estiloBotaoIcone}>
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => remover(f.id)}
                                                                    title="Remover"
                                                                    className={`${estiloBotaoIcone} hover:text-red-400`}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </ItemArrastavel>
                                                    ))}
                                                </ul>
                                            </SortableContext>
                                        </DndContext>
                                    </BlocoCategoria>
                                )
                            })}
                        </SortableContext>
                    </DndContext>
                </>
            )}
        </Cartao>
    )
}