import { useEffect, useState } from 'react'

// Guarda um "nível de tamanho" (1 a 5) no navegador, separado por cartão
export function useTamanho(chave, padrao = 2) {
    const [nivel, setNivel] = useState(() => {
        try {
            const salvo = Number(localStorage.getItem(`tamanho-${chave}`))
            if (salvo >= 1 && salvo <= 5) return salvo
        } catch {
            // navegador bloqueou: usa o padrão
        }
        return padrao
    })

    // Salva sempre que mudar
    useEffect(() => {
        try {
            localStorage.setItem(`tamanho-${chave}`, String(nivel))
        } catch {
            // se não conseguir salvar, só não lembra depois do F5
        }
    }, [chave, nivel])

    return [nivel, setNivel]
}