# Sistema de Controle de Acesso e Monitoramento ⚡

Este projeto é um sistema de arquitetura robusta voltado para controle de acesso em Subestações e monitoramento de colaboradores, integrando aplicações Web e Mobile através de um padrão de **Microfrontends** gerenciado por um Gateway, além de contar com alertas em tempo real via **WebSockets**.

---

## 🚀 Como Rodar o Projeto

Todo o ambiente está containerizado via Docker, o que significa que com apenas um comando você sobe o banco de dados, o backend, os frontends e o gateway Nginx!

1. **Pré-requisitos**: Ter o [Docker](https://www.docker.com/) instalado em sua máquina.
2. Na raiz do projeto, execute o comando:
   ```bash
   docker compose up --build -d
   ```
3. Aguarde o build (pode levar alguns minutos na primeira vez para baixar as imagens).
4. Popule o banco de dados (Criação de usuários base):
   - Acesse o Swagger da API: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Vá na rota `POST /seed`, clique em "Try it out" e depois "Execute".

### 🔗 Portas e Acessos

- **Acesso ao Sistema (Gateway Unificado)**: [http://localhost:8080](http://localhost:8080)
- **Documentação da API (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Banco de Dados (PostgreSQL)**: `localhost:5432`
- **Painel de Gerência de Banco (pgAdmin)**: [http://localhost:5050](http://localhost:5050)

> **Credenciais Básicas de Teste**:
> Gestor: `carlos@sistema.com` | Senha: `senha123`
> Supervisora: `ana@sistema.com` | Senha: `senha123`

---

## 🏗️ Como Funciona os Serviços e suas Camadas

O sistema é dividido em microsserviços bem delimitados:

### 1. Gateway (Nginx)
É o "porteiro" do sistema. Em vez de o usuário acessar portas diferentes para serviços diferentes, ele acessa sempre a porta 8080. O Nginx atua como proxy reverso, redirecionando invisivelmente requisições de `/` para o site Institucional e requisições em `/app/` para o sistema de Dashboard.

### 2. Web (Vite + React)
Aplicação Frontend focada em conversão, design e estética (Vanilla CSS, Glassmorphism). Roda isolada e renderiza de forma otimizada para ser a vitrine do produto. Atua na raiz (`/`) do Gateway.

### 3. Mobile (Expo Web / React Native)
O núcleo administrativo do sistema. Construído com foco Mobile First, mas exportado para Web para rodar no navegador. É aqui que os gestores visualizarão tabelas, históricos e o painel de notificações ao vivo. Roda sob o prefixo `/app/` no Gateway.

### 4. API Backend (FastAPI + Python)
O cérebro da operação. 
- Servidor REST assíncrono hiper veloz.
- Autenticação e Autorização via tokens **JWT**.
- Controle estrito de regras de negócio de Hierarquia (Admin > Gestor > Supervisor > Operador).
- Módulo **WebSockets** nativo para emissão de alertas em tempo real.

### 5. PostgreSQL & pgAdmin
- Banco de dados relacional contendo as tabelas `colaborador`, `subestacao`, `permissao` e `log_acesso`.
- Utiliza referências circulares (`gestor_id` referencia `colaborador.id`) para traçar quem é chefe de quem.

---

## 🗣️ Quem Conversa Com O Que (Fluxo de Dados)

### Ponto de Vista do Cliente
1. O usuário final digita `http://localhost:8080` no navegador.
2. O **Nginx** percebe que a rota é `/`, e busca a interface gráfica no contêiner **Web**.
3. O usuário clica em "Acessar Sistema". A URL muda para `/app/`.
4. O **Nginx** intercepta, retira da jogada o container Web e passa a buscar os dados do contêiner **Mobile**.
5. No App administrativo, o usuário faz o login. O **Mobile** dispara um `POST /auth/login` para a porta 8000 (**API**).

### Ponto de Vista do Backend
1. A **API** valida as credenciais contra o **PostgreSQL**.
2. Devolve um Token JWT para o **Mobile**, que passa a usar esse Token no Header de todas as requisições.
3. Ao entrar no Dashboard, o **Mobile** abre um túnel contínuo com a API chamando a rota `ws://localhost:8000/ws/notifications/{id_do_usuario}` (WebSockets). Esse túnel fica aberto indefinidamente em segundo plano.

### Fluxo de Notificações Push (Tempo Real)
Quando um Operador entra (ou tenta entrar) numa Subestação:
1. Um sensor/catraca enviaria o RFID via `POST /acesso/validar` para a **API**.
2. A **API** consulta o **PostgreSQL** para checar se ele tem permissão ativa para aquela área e registra o log.
3. Se o Operador tiver um `gestor_id` vinculado, a API não encerra o trabalho. Ela procura quem é o Supervisor dele, e quem é o Gestor desse Supervisor.
4. A API pega a mensagem ("João Pedro acessou a Subestação") e injeta ela no **túnel WebSocket** previamente aberto.
5. O contêiner **Mobile** na tela do Supervisor capta a mensagem e instantaneamente sobe o alerta no *Sininho 🔔* no canto da tela, tudo isso sem recarregar a página ou precisar fazer *polling*.
