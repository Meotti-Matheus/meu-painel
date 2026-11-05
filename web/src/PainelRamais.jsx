import { useEffect, useState } from 'react'
import { Phone, Plus, Pencil, X, Copy, Check, Search } from 'lucide-react'
import Cartao from './Cartao.jsx'
import AvisoErro from './AvisoErro.jsx'
import {
    estiloCampo,
    estiloBotao,
    estiloBotaoSecundario,
    estiloBotaoIcone,
    estiloBotaoAdicionar,
    estiloItem,
    chamarServidor,
    mensagemErro,
    normalizar,
} from './compartilhado.js'

export default function PainelRamais({ ordem }) {
    const [ramais, setRamais] = useState([])
    const [nome, setNome] = useState('')
    const [ramal, setRamal] = useState('')
    const [setor, setSetor] = useState('')
    const [filtro, setFiltro] = useState('')
    const [erro, setErro] = useState('')
    const [erroCarregar, setErroCarregar] = useState('')
    const [editandoId, setEditandoId] = useState(null) // null = cadastrando um novo
    const [mostrarFormulario, setMostrarFormulario] = useState(false)
    const [copiadoId, setCopiadoId] = useState(null) // qual ramal acabou de ser copiado

    async function carregar() {
        const resposta = await chamarServidor('/api/ramais')
        if (!resposta || !resposta.ok) {
            setErroCarregar(await mensagemErro(resposta, 'carregar os ramais'))
            return
        }
        setRamais(await resposta.json())
        setErroCarregar('')
    }

    useEffect(() => {
        carregar()
    }, [])

    // Fecha e limpa o formulário
    function limparFormulario() {
        setNome('')
        setRamal('')
        setSetor('')
        setEditandoId(null)
        setMostrarFormulario(false)
        setErro('')
    }

    function abrirFormularioNovo() {
        limparFormulario()
        setMostrarFormulario(true)
    }

    function iniciarEdicao(r) {
        setEditandoId(r.id)
        setNome(r.nome)
        setRamal(r.ramal)
        setSetor(r.setor)
        setMostrarFormulario(true)
        setErro('')
    }

    // Cadastra um novo ou salva a edição
    async function salvar(e) {
        e.preventDefault()
        setErro('')
        const editando = editandoId !== null

        const resposta = await chamarServidor(editando ? `/api/ramais/${editandoId}` : '/api/ramais', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome.trim(), ramal: ramal.trim(), setor: setor.trim() }),
        })

        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'salvar o ramal'))
            return
        }

        limparFormulario()
        carregar()
    }

    async function remover(id) {
        if (!confirm('Remover este ramal?')) return
        const resposta = await chamarServidor(`/api/ramais/${id}`, { method: 'DELETE' })
        if (!resposta || !resposta.ok) {
            setErro(await mensagemErro(resposta, 'remover o ramal'))
            return
        }
        if (id === editandoId) limparFormulario()
        carregar()
    }

    // Copia o número do ramal
    async function copiar(r) {
        try {
            await navigator.clipboard.writeText(r.ramal)
            setCopiadoId(r.id)
            setTimeout(() => setCopiadoId(null), 1500)
        } catch {
            // navegador bloqueou a área de transferência: não faz nada
        }
    }

    // Ordem alfabética + filtro por nome, setor ou número
    const procurado = normalizar(filtro.trim())
    const lista = [...ramais]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .filter((r) => !procurado || normalizar(`${r.nome} ${r.setor} ${r.ramal}`).includes(procurado))

    return (
        <Cartao titulo={editandoId !== null ? 'Editando ramal' : 'Ramais'} icone={Phone} chave="ramais" ordem={ordem}>
            {/* Botão que abre o formulário, ou o próprio formulário */}
            {!mostrarFormulario ? (
                <button onClick={abrirFormularioNovo} className={estiloBotaoAdicionar}>
                    <Plus size={15} />
                    Adicionar ramal
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
                    <div className="flex gap-2">
                        <input
                            className={`${estiloCampo} min-w-0`}
                            placeholder="Ramal"
                            value={ramal}
                            onChange={(e) => setRamal(e.target.value)}
                            maxLength={30}
                            required
                        />
                        <input
                            className={`${estiloCampo} min-w-0`}
                            placeholder="Setor (opcional)"
                            value={setor}
                            onChange={(e) => setSetor(e.target.value)}
                            maxLength={50}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className={`${estiloBotao} flex-1`}>{editandoId !== null ? 'Salvar' : 'Adicionar'}</button>
                        <button type="button" onClick={limparFormulario} className={`${estiloBotaoSecundario} flex-1`}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {erro && <p className="mt-2 text-sm text-red-400">{erro}</p>}

            {erroCarregar ? (
                <AvisoErro mensagem={erroCarregar} aoTentarDeNovo={carregar} />
            ) : (
                <>
                    {/* Filtro: só aparece quando a lista fica grande */}
                    {ramais.length > 6 && (
                        <div className="relative mt-3">
                            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-apagado" />
                            <input
                                className={`${estiloCampo} w-full pl-8`}
                                placeholder="Filtrar ramais…"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                            />
                        </div>
                    )}

                    {ramais.length === 0 && <p className="mt-4 text-sm text-apagado">Nenhum ramal ainda.</p>}
                    {ramais.length > 0 && lista.length === 0 && <p className="mt-4 text-sm text-apagado">Nada encontrado.</p>}

                    <ul className="mt-3 space-y-1.5">
                        {lista.map((r) => (
                            <li
                                key={r.id}
                                className={`${estiloItem} group flex items-center gap-2 p-2.5 ${editandoId === r.id ? 'ring-1 ring-acento' : ''}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-texto/90">{r.nome}</p>
                                    {r.setor && <p className="truncate text-[11px] text-apagado">{r.setor}</p>}
                                </div>

                                {/* Editar/remover: aparecem ao passar o mouse */}
                                <div className="flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                    <button onClick={() => iniciarEdicao(r)} title="Editar" className={estiloBotaoIcone}>
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => remover(r.id)} title="Remover" className={`${estiloBotaoIcone} hover:text-red-400`}>
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* Clicar no número copia */}
                                <button
                                    onClick={() => copiar(r)}
                                    title="Copiar ramal"
                                    className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm text-acento transition hover:bg-acento/10"
                                >
                                    {copiadoId === r.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={12} className="opacity-60" />}
                                    {r.ramal}
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Cartao>
    )
}