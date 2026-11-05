import { useEffect, useState } from 'react'
import Busca from './Busca.jsx'
import PainelFavoritos from './PainelFavoritos.jsx'
import PainelProgramas from './PainelProgramas.jsx'
import PainelChave from './PainelChave.jsx'
import PainelRamais from './PainelRamais.jsx'
import PainelNotas from './PainelNotas.jsx'
import PainelAgenda from './PainelAgenda.jsx'
import PainelEscala from './PainelEscala.jsx'
import PainelFeriados from './PainelFeriados.jsx'
import DivisorColuna from './DivisorColuna.jsx'

const NOME = 'Matheus'

// Larguras padrão (em pixels) e limites mínimo/máximo de cada coluna
const LARGURAS_PADRAO = { programas: 280, direita: 380 }
const LIMITES = { programas: [200, 600], direita: [280, 600] }
const CHAVE_SALVA = 'larguras-colunas'

// Lê as larguras salvas no navegador (se não tiver, usa o padrão)
function lerLarguras() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_SALVA))
    if (salvo?.programas && salvo?.direita) return salvo
  } catch {
    // navegador bloqueou ou dado inválido: usa o padrão
  }
  return LARGURAS_PADRAO
}

function limitar(valor, [minimo, maximo]) {
  return Math.min(maximo, Math.max(minimo, valor))
}

function saudacao(hora) {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// "terça-feira" -> "Terça-feira"
function primeiraMaiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Relógio separado: só ele se redesenha a cada segundo
function Relogio() {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(relogio)
  }, [])

  const horaMinuto = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const segundos = String(agora.getSeconds()).padStart(2, '0')

  return (
    <p className="font-light tabular-nums leading-none">
      <span className="text-4xl text-texto">{horaMinuto}</span>
      <span className="text-xl text-apagado">:{segundos}</span>
    </p>
  )
}

// Topo: data + saudação | busca | relógio
function Cabecalho() {
  const hoje = new Date()
  const diaDaSemana = primeiraMaiuscula(hoje.toLocaleDateString('pt-BR', { weekday: 'long' }))
  const dataCurta = hoje.toLocaleDateString('pt-BR') // 03/11/2026

  return (
    <header className="grid grid-cols-1 items-center gap-4 px-6 pt-8 pb-2 lg:grid-cols-[1fr_minmax(0,30rem)_1fr] lg:px-8">
      <div>
        <p className="text-sm text-suave">
          {diaDaSemana} <span className="text-apagado">·</span> <span className="tabular-nums">{dataCurta}</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {saudacao(hoje.getHours())}, <span className="text-acento">{NOME}</span>
        </h1>
      </div>

      <Busca />

      <div className="lg:justify-self-end">
        <Relogio />
      </div>
    </header>
  )
}

export default function App() {
  const [larguras, setLarguras] = useState(lerLarguras)

  // Salva as larguras no navegador sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_SALVA, JSON.stringify(larguras))
    } catch {
      // se não conseguir salvar, só não lembra depois do F5
    }
  }, [larguras])

  // Arrastar para a esquerda (dx negativo) alarga a coluna que fica à direita da divisa
  function ajustar(coluna, dx) {
    setLarguras((atual) => ({ ...atual, [coluna]: limitar(atual[coluna] - dx, LIMITES[coluna]) }))
  }

  function resetar(coluna) {
    setLarguras((atual) => ({ ...atual, [coluna]: LARGURAS_PADRAO[coluna] }))
  }

  // Atalhos para não repetir código
  const divisaProgramas = {
    aoArrastar: (dx) => ajustar('programas', dx),
    aoResetar: () => resetar('programas'),
  }
  const divisaDireita = {
    aoArrastar: (dx) => ajustar('direita', dx),
    aoResetar: () => resetar('direita'),
  }

  return (
    <div className="min-h-screen">
      <Cabecalho />

      {/* Favoritos (espaço que sobrar) | Programas | coluna da direita */}
      <main
        className="grid items-start gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_var(--larg-programas)_var(--larg-direita)] lg:px-8"
        style={{
          '--larg-programas': `${larguras.programas}px`,
          '--larg-direita': `${larguras.direita}px`,
        }}
      >
        {/* Coluna 1: Favoritos */}
        <div className="relative min-w-0 self-stretch">
          <PainelFavoritos ordem={0} />
          <DivisorColuna lado="direita" {...divisaProgramas} />
        </div>

        {/* Coluna 2: Programas e Leitor de chave */}
        <div className="relative min-w-0 space-y-6 self-stretch">
          <DivisorColuna lado="esquerda" {...divisaProgramas} />
          <PainelProgramas ordem={1} />
          <PainelRamais ordem={3} />
          <DivisorColuna lado="direita" {...divisaDireita} />
        </div>

        {/* Coluna 3: Agenda, Escala, Feriados e Notas */}
        <div className="relative min-w-0 space-y-6 self-stretch">
          <DivisorColuna lado="esquerda" {...divisaDireita} />
          <PainelAgenda ordem={3} />
          <PainelEscala ordem={4} />
          <PainelFeriados ordem={5} />
          <PainelNotas ordem={6} />
          <PainelChave ordem={7} />
        </div>
      </main>
    </div>
  )
}