import { AlertCircle, RotateCw } from 'lucide-react'

// Aviso vermelho discreto com botão para tentar de novo
export default function AvisoErro({ mensagem, aoTentarDeNovo }) {
    return (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20">
            <p className="flex items-center gap-2 text-sm text-red-300">
                <AlertCircle size={15} className="shrink-0" />
                {mensagem}
            </p>
            <button
                onClick={aoTentarDeNovo}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-red-200 ring-1 ring-red-400/30 transition hover:bg-red-500/15"
            >
                <RotateCw size={12} />
                Tentar de novo
            </button>
        </div>
    )
}