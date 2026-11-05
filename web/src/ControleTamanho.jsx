import { Minus, Plus } from 'lucide-react'

// Botões "−" e "+" para mudar o tamanho (nível de 1 a 5)
export default function ControleTamanho({ nivel, aoMudar }) {
    const estiloBotao =
        'flex h-6 w-6 items-center justify-center text-suave transition hover:text-texto disabled:cursor-not-allowed disabled:opacity-30'

    return (
        <div className="flex items-center rounded-md ring-1 ring-borda" title="Tamanho">
            <button type="button" onClick={() => aoMudar(nivel - 1)} disabled={nivel <= 1} title="Diminuir" className={estiloBotao}>
                <Minus size={12} />
            </button>
            <span className="w-4 text-center text-[11px] tabular-nums text-apagado">{nivel}</span>
            <button type="button" onClick={() => aoMudar(nivel + 1)} disabled={nivel >= 5} title="Aumentar" className={estiloBotao}>
                <Plus size={12} />
            </button>
        </div>
    )
}