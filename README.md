# Meu Painel

Painel pessoal que roda no próprio computador e reúne em uma tela só as coisas que uso o dia todo no trabalho de suporte: favoritos, programas do Windows, agenda, escala, notas, ramais e um leitor de chave de NF-e/NFC-e.

## Funcionalidades

- **Favoritos** organizados em categorias, com ícone de cada site. Arrastar para reorganizar os itens e as próprias categorias.
- **Programas do Windows** que abrem com um clique, com o ícone real de cada programa.
- **Busca rápida (Ctrl + K)** em favoritos e programas.
- **Agenda de hoje**, lida do Google Agenda (uma ou mais agendas), com destaque para o evento que está acontecendo agora.
- **Próximo sábado de trabalho**, encontrado automaticamente na agenda.
- **Próximo feriado nacional**, calculado no próprio painel (inclusive Carnaval, Sexta-feira Santa e Corpus Christi).
- **Notas** rápidas, com edição.
- **Ramais** da equipe, com cópia em um clique.
- **Leitor de chave de NF-e/NFC-e**: separa estado, CNPJ, modelo, série, número e tipo de emissão, e confere o dígito verificador (já preparado para o CNPJ alfanumérico).
- Colunas com largura ajustável, cards com altura ajustável e tamanho dos ícones configurável.

## Tecnologias

- **Front-end:** React, Vite, Tailwind CSS, dnd-kit (arrastar e soltar), Lucide (ícones)
- **Back-end:** Node.js, Fastify
- **Banco de dados:** SQLite com Drizzle ORM
- **Agenda:** leitura do formato iCal (ical-expander)

## Segurança

O painel foi pensado para rodar só na máquina do usuário:

- O servidor escuta apenas em `127.0.0.1`: ninguém na rede consegue acessar.
- Pedidos que alteram dados precisam vir do próprio painel (checagem de origem e de cabeçalho), o que impede que outros sites abertos no navegador enviem comandos.
- Programas são abertos só pelo número do cadastro, nunca por um caminho enviado na hora, e sem passar pelo `cmd`.
- Todos os dados recebidos são validados antes de chegar ao banco.
- Links da agenda e dados pessoais ficam no arquivo `.env` e no banco local, fora do Git.

## Como rodar

Requisitos: **Windows** e **Node.js 24**.

```powershell
git clone https://github.com/Meotti-Matheus/meu-painel.git
cd meu-painel

cd web
npm install
cd ..\server
npm install
```

Copie `server/.env.example` para `server/.env` e preencha (opcional: sem ele, só a agenda e a escala ficam sem dados).

Depois, dê dois cliques em **`iniciar-painel.bat`**: ele prepara o site, liga o servidor e abre `http://localhost:3001`.

Para deixar rodando sem janela, use `iniciar-oculto.vbs` (dá para colocá-lo na inicialização do Windows) e `parar-painel.bat` para desligar.

### Modo de desenvolvimento

Em dois terminais:

```powershell
cd server
npm run dev
```

```powershell
cd web
npm run dev
```

E abra `http://localhost:5173`.

## Estrutura

```
server/                     API (Fastify) e banco de dados (SQLite)
  src/index.js              rotas principais, segurança e programas do Windows
  src/db.js                 conexão e criação das tabelas
  src/schema.js             estrutura das tabelas
  src/agenda.js             agenda e escala (Google Agenda via iCal)
  src/ordem.js              ordem de favoritos, programas e categorias
  src/ramais.js             ramais
  src/icones.js             ícones dos sites
  .env.example              modelo das configurações

web/                        interface (React + Vite + Tailwind)
  index.html                página base
  vite.config.js            configuração do Vite (Tailwind e ligação com a API)
  public/                   ícone da aba
  src/main.jsx              ponto de entrada
  src/index.css             tema (cores, fonte, animações)
  src/App.jsx               layout: topo, busca, relógio e colunas
  src/Busca.jsx             busca rápida (Ctrl + K)
  src/Cartao.jsx            card padrão (título, botões e altura ajustável)
  src/PainelFavoritos.jsx   favoritos e categorias
  src/PainelProgramas.jsx   programas do Windows
  src/PainelAgenda.jsx      agenda de hoje
  src/PainelEscala.jsx      próximo sábado de trabalho
  src/PainelFeriados.jsx    próximo feriado
  src/PainelNotas.jsx       notas
  src/PainelRamais.jsx      ramais
  src/PainelChave.jsx       leitor de chave de NF-e/NFC-e
  src/ItemArrastavel.jsx    arrastar e soltar (dnd-kit)
  src/DivisorColuna.jsx     ajuste de largura das colunas
  src/ControleTamanho.jsx   botões de tamanho (− +)
  src/AvisoErro.jsx         aviso de erro com "tentar de novo"
  src/useTamanho.js         guarda o tamanho escolhido de cada card
  src/compartilhado.js      estilos e funções usados em vários cards

iniciar-painel.bat          prepara o site e liga o painel
iniciar-oculto.vbs          liga o painel sem janela
parar-painel.bat            desliga o painel
```

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).