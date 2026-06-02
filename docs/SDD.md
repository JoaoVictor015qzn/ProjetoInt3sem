# Software Design Document (SDD) — Sistema de Controle de Acesso

Este documento serve como o **Guia Técnico de Referência e Arquitetura** para o desenvolvimento do software do **Sistema de Controle de Acesso de Subestação**. Seu objetivo é fornecer todas as especificações de banco de dados, APIs, fluxos de telas e guias de produtividade locais para a equipe de desenvolvimento.

---

## 🏛️ 1. Arquitetura do Software e Pilha Tecnológica

O sistema foi desenhado para operar totalmente offline/local na máquina de desenvolvimento, usando contêineres Docker para simular serviços de infraestrutura real.

```
┌────────────────────────────────────────────────────────┐
│               MOBILE CLIENT (Expo Web/App)             │
│   React Native (TypeScript) + React Navigation (v7)    │
└───────────────────────────┬────────────────────────────┘
                            │ (REST JSON via HTTP / WS)
                            ▼
┌────────────────────────────────────────────────────────┐
│                BACK-END API (FastAPI)                  │
│     Python 3 + SQLAlchemy ORM + Pydantic Validation    │
└───────────────────────────┬────────────────────────────┘
                            │ (SQL Connection)
                            ▼
┌────────────────────────────────────────────────────────┐
│             DATABASE ENGINE (PostgreSQL)               │
│               Hosted Locally via Docker                │
└────────────────────────────────────────────────────────┘
```

### Tecnologias Escolhidas:
- **Back-end**: FastAPI (alta performance, tipagem estática e auto-documentação via OpenAPI/Swagger).
- **Banco de Dados**: PostgreSQL (gerenciado via Docker Compose) ou SQLite (para fallback rápido de desenvolvimento de desenvolvedor único).
- **Front-end**: React Native com Expo (suporta iOS, Android e Web com a mesma base de código TypeScript).

---

## 🗄️ 2. Modelo de Banco de Dados e Esquemas ORM

Os modelos relacionais do SQLAlchemy estão localizados em [api/models/models.py](file:///c:/Users/joaov/Desktop/ProjetoInt3sem/api/models/models.py). 

### 2.1 Colaborador (`colaborador`)
Armazena as credenciais de autenticação no app e o UID RFID físico (ou simulado) usado nas catracas.

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key (Default UUID4) | Identificador do colaborador |
| `nome` | VARCHAR(120) | NOT NULL | Nome completo |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | E-mail corporativo |
| `cpf` | VARCHAR(14) | UNIQUE, NOT NULL | CPF do funcionário |
| `cargo` | VARCHAR(80) | NOT NULL | Cargo funcional |
| `rfid_uid` | VARCHAR(20) | UNIQUE, NULLABLE | Código UID da tag RFID/NFC |
| `role` | ENUM | NOT NULL (Default: 'operador') | Níveis: `operador`, `supervisor`, `gestor`, `admin` |
| `hashed_password` | VARCHAR(255) | NOT NULL | Senha criptografada (bcrypt) |
| `foto_url` | VARCHAR(500) | NULLABLE | Caminho local do arquivo de imagem |
| `ativo` | BOOLEAN | NOT NULL (Default: True) | Soft-delete status |
| `criado_em` | DATETIME | NOT NULL (Default: UTC) | Registro de criação |

### 2.2 Subestação (`subestacao`)
Representa as filiais ou cabines físicas com controle de tráfego.

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key (Default UUID4) | Identificador da subestação |
| `nome` | VARCHAR(120) | NOT NULL | Nome de identificação (ex: Subestação 02) |
| `localizacao` | VARCHAR(255) | NULLABLE | Endereço/Coordenadas |
| `ativa` | BOOLEAN | NOT NULL (Default: True) | Habilitada para tráfego |

### 2.3 Permissão (`permissao`)
Tabela associativa de muitos-para-muitos vinculando pessoas e locais autorizados.

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key (Default UUID4) | Identificador único da permissão |
| `colaborador_id` | UUID | Foreign Key -> `colaborador.id` | Colaborador associado |
| `subestacao_id` | UUID | Foreign Key -> `subestacao.id` | Subestação associada |
| `validade_inicio` | DATETIME | NULLABLE | Início da vigência da permissão |
| `validade_fim` | DATETIME | NULLABLE | Fim da vigência (Expiração) |
| `ativa` | BOOLEAN | NOT NULL (Default: True) | Status da regra |

### 2.4 Log de Acesso (`log_acesso`)
Registra cada batida de cartão nas portas e portas simuladas, gerando histórico de auditoria.

| Campo | Tipo | Restrições | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key (Default UUID4) | Código identificador único do log |
| `colaborador_id` | UUID | Foreign Key -> `colaborador.id` (NULLABLE) | ID se RFID estiver cadastrado |
| `subestacao_id` | UUID | Foreign Key -> `subestacao.id` (NOT NULL) | ID do ponto de acesso |
| `rfid_uid` | VARCHAR(20) | NOT NULL | UID que foi aproximado no leitor |
| `tipo` | ENUM | NOT NULL | Níveis: `ENTRADA` ou `SAIDA` |
| `resultado` | ENUM | NOT NULL | Níveis: `PERMITIDO` ou `NEGADO` |
| `data_hora` | DATETIME | NOT NULL (Default: UTC) | Data/Hora exata do evento |

---

## 📡 3. Especificações dos Contratos de API (Endpoints)

Todas as requisições autenticadas requerem o header: `Authorization: Bearer <JWT_TOKEN>`.

### 3.1 Autenticação (`/auth`)
*   **POST `/auth/login`**
    *   *Payload (JSON)*:
        ```json
        {
          "email": "usuario@sistema.com",
          "senha": "senha_plana_aqui"
        }
        ```
    *   *Resposta (200 OK)*:
        ```json
        {
          "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
          "token_type": "bearer"
        }
        ```

### 3.2 Validação de Acesso (`/acesso`)
Utilizado tanto por dispositivos IoT quanto por simuladores no app.

*   **POST `/acesso/validar`**
    *   *Payload (JSON)*:
        ```json
        {
          "rfid_uid": "A1B2C3D4",
          "subestacao_id": "7bf3de2a-fa67-4e58-bb12-9c104ab72314",
          "tipo": "ENTRADA"
        }
        ```
    *   *Resposta — Acesso Concedido (200 OK)*:
        ```json
        {
          "acao": "LIBERAR",
          "colaborador": "João Silva",
          "motivo": null
        }
        ```
    *   *Resposta — Acesso Negado (200 OK)*:
        ```json
        {
          "acao": "BLOQUEAR",
          "colaborador": "João Silva",
          "motivo": "Sem permissão para esta subestação"
        }
        ```

### 3.3 Gestão de Logs (`/logs`)
*   **GET `/logs`**
    *   *Parâmetros de Query (Opcionais)*: `subestacao_id`, `colaborador_id`, `resultado`, `data_inicio`, `data_fim`, `limit`.
    *   *Resposta (200 OK)*: Array de logs de acesso filtrados conforme hierarquia do usuário autenticado.

---

## 📱 4. Arquitetura de Navegação do App Mobile (Expo)

O aplicativo mobile utiliza o **React Navigation v7** e condiciona a navegação baseado no estado global de autenticação do usuário.

```
           [ Usuário Abre o Aplicativo ]
                         │
            Se Token Local Existe?
           ┌─────────────┴─────────────┐
          Não                          Sim
           ▼                            ▼
┌───────────────────────┐    ┌───────────────────────────────────┐
│     LoginScreen       │    │      Tab.Navigator (MainTabs)     │
│  Formulário de e-mail │    │  ├── Início (DashboardScreen)     │
│   e senha + feedback  │    │  ├── Equipe (ColaboradoresStack)  │
└───────────────────────┘    │  ├── Histórico (HistoricoScreen)   │
                             │  └── Perfil (PerfilScreen + Sair) │
                             └─────────────────┬─────────────────┘
                                               │
                                       Se Admin/Gestor?
                                               ▼
                                     [ Recursos Extras ]
                                     ├── FAB (+) Novo Colaborador
                                     ├── Botão [Desativar] usuário
                                     └── Cadastro/Edição de Permissões
```

### Convenções de Navegação:
- O arquivo `mobile/src/navigation/AppNavigator.tsx` gerencia as rotas principais.
- Telas que requerem fluxos de stack filhos (como a edição e cadastro de colaboradores) são encapsuladas em sub-stacks (`ColaboradoresStack`).

---

## 🛠️ 5. Guia de Produtividade do Desenvolvedor local (DX)

Para acelerar o desenvolvimento do projeto no dia a dia, siga as orientações abaixo.

### 5.1 Como Iniciar o Banco de Dados Rapidamente com Docker Compose
Na raiz do projeto integrador, existe o arquivo `docker-compose.yml`. Ele gerencia o PostgreSQL local.

```powershell
# 1. Iniciar o contêiner do banco em segundo plano (background)
docker-compose up -d

# 2. Verificar se o banco PostgreSQL está executando corretamente
docker compose ps
```

*Se preferir trabalhar sem o Docker, o backend pode ser configurado em `core/database.py` para usar um arquivo SQLite local trocando o driver da `DATABASE_URL` no arquivo `.env`.*

### 5.2 Como Resolver Problemas de Conexão entre o Expo Go e o Backend Local (IP do Computador)
Um dos problemas mais comuns em projetos com React Native é o aplicativo de celular (rodando no Expo Go) não conseguir acessar as APIs do backend que estão rodando na porta `localhost:8000`.

**Por que isso acontece?**
`localhost` no emulador ou no celular físico aponta para o próprio celular, não para o computador onde o backend FastAPI está rodando.

**Como o projeto resolve isso dinamicamente?**
No arquivo `mobile/src/services/api.ts`, a função `getApiUrl()` detecta automaticamente o IP da máquina host do Expo:
```typescript
function getApiUrl(): string {
  if (Platform.OS === "web") {
    return "http://localhost:8000";
  }
  // Expo obtém o IP dinâmico do computador na rede local
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:8000`;
  }
  return "http://localhost:8000";
}
```

**⚠️ REQUISITO PARA O CELULAR FUNCIONAR:**
O seu celular e o seu computador **devem estar conectados na mesma rede Wi-Fi**. Se a sua rede local bloquear tráfego de transmissão (redes corporativas ou públicas), inicie um ponto de acesso roteador (hotspot) no seu celular e conecte o computador nele para testar localmente de forma direta.

### 5.3 Comandos Úteis do Dia a Dia (Cheat Sheet)

#### Executar o Back-end (FastAPI)
```powershell
cd api
# Ativar o ambiente virtual (.venv) se configurado
.venv\Scripts\activate

# Iniciar o servidor com Hot Reload ativo
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
*(Usar `--host 0.0.0.0` é crucial para liberar conexões externas do Expo Go no Wi-Fi).*

#### Executar o Front-end (Expo/Mobile)
```powershell
# Executar a partir da raiz usando o caminho correto
npx expo start .\mobile

# Ou entrando no diretório
cd mobile
npx expo start
```

---

## 🧪 6. Estratégia de Simulação (Simulador de Catraca)

Como a automação física está fora de escopo no desenvolvimento local puro, o **Simulador de Catraca** será implementado no front-end como uma ferramenta interna de QA.

### Lógica do Simulador:
1. **Componente Visual**: Uma tela com fundo escuro simulando uma interface de console industrial de portaria.
2. **Escolha de Dados**: Dois dropdowns populados localmente chamando a API:
   * Dropdown 1: Lista todas as **Subestações** ativas.
   * Dropdown 2: Lista todos os **Colaboradores** ativos da equipe, mostrando o RFID cadastrado.
3. **Simulador de Tag Desconhecida**: Um campo de entrada alternativo para digitar tags não cadastradas (para simular tentativas de invasão/erros).
4. **Endpoint Consumido**: Ao clicar em "Aproximar Tag", faz um request HTTP POST para `/acesso/validar`.
5. **Comportamento da Tela**:
   ```
   [ Clique em Aproximar ] ──> Mostra status "Aguardando Leitura..."
                                       │
                         Validação Retorna AÇÃO
             ┌─────────────────────────┴────────────────────────┐
             ▼ (LIBERAR)                                        ▼ (BLOQUEAR)
     Fundo verde brilhante                              Fundo vermelho piscante
     Texto: "ACESSO PERMITIDO"                          Texto: "ACESSO NEGADO"
     Nome: João Silva                                   Motivo: Sem permissão ativa
     Tempo: 3 segundos ativo                            Tempo: 3 segundos ativo
   ```
6. **Efeito Colateral**: Isso automaticamente criará um log dinâmico na base de dados, atualizando instantaneamente os dados do Dashboard e da tela de Histórico.
