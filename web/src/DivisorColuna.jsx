// Área invisível na borda de uma coluna que pode ser arrastada para mudar a largura.
// "lado" diz em qual borda ela fica: "esquerda" ou "direita"
export default function DivisorColuna({ lado, aoArrastar, aoResetar }) {
    function iniciarArraste(e) {
        e.preventDefault()
        let ultimoX = e.clientX

        // Enquanto o mouse se move, avisa quanto andou desde a última vez
        function mover(ev) {
            aoArrastar(ev.clientX - ultimoX)
            ultimoX = ev.clientX
        }

        // Soltou o botão: para de acompanhar o mouse
        function soltar() {
            window.removeEventListener('pointermove', mover)
            window.removeEventListener('pointerup', soltar)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        window.addEventListener('pointermove', mover)
        window.addEventListener('pointerup', soltar)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none' // evita selecionar texto enquanto arrasta
    }

    // A área tem 24px: metade dentro da coluna, metade para fora (no espaço entre colunas)
    const posicao = lado === 'esquerda' ? '-left-3' : '-right-3'

    return (
        <div
            onPointerDown={iniciarArraste}
            onDoubleClick={aoResetar}
            title="Arraste para mudar a largura (duplo clique volta ao padrão)"
            className={`group absolute inset-y-0 ${posicao} z-10 hidden w-6 cursor-col-resize justify-center lg:flex`}
        >
            {/* Linha que só aparece ao passar o mouse */}
            <div className="h-full w-px bg-transparent transition-colors duration-200 group-hover:bg-acento/60" />
        </div>
    )
}