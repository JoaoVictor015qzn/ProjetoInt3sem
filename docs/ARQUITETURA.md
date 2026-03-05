# Arquitetura — Sistema de Controle de Acesso de Subestação

> Documento complementar ao [PRD](./PRD.md)

---

## 1. Visão Geral das Camadas

O sistema é dividido em **4 camadas**, seguindo o modelo de integração vertical (do chão de fábrica à aplicação):

| Camada | Descrição | Tecnologias |
|---|---|---|
| **Campo (OT)** | Dispositivos físicos na subestação | Leitor RFID, sensores, CLP, trava eletromagnética |
| **Borda (Edge/IoT)** | Gateway que conecta campo à nuvem | ESP32 / Raspberry Pi |
| **Nuvem (AWS)** | Backend, banco de dados, broker MQTT | EC2, RDS, IoT Core, S3, SNS, CloudWatch |
| **Aplicação** | Interface do usuário final | React Native (Expo) |

---

## 2. Diagrama de Arquitetura

```mermaid
graph TB
    subgraph "Camada de Campo (OT)"
        RFID["Leitor RFID/NFC"]
        SENSOR["Sensores (Porta/Presença)"]
        CLP["CLP / PLC"]
        TRAVA["Trava Eletromagnética"]
    end

    subgraph "Camada de Borda (Edge/IoT)"
        GW["Gateway IoT<br/>(ESP32 / Raspberry Pi)"]
    end

    subgraph "Camada de Nuvem (AWS Academy)"
        IOT["AWS IoT Core<br/>(MQTT Broker)"]
        API["EC2 / API Gateway<br/>(Backend Node.js)"]
        DB["Amazon RDS<br/>(PostgreSQL)"]
        S3["Amazon S3<br/>(Relatórios/Logs)"]
        SNS["Amazon SNS<br/>(Notificações)"]
        COGNITO["AWS Cognito<br/>(Autenticação)"]
    end

    subgraph "Camada de Aplicação"
        MOBILE["App React Native<br/>(Supervisor/Gestor)"]
    end

    RFID -->|Leitura do crachá| GW
    SENSOR -->|Status porta/presença| GW
    GW -->|MQTT| IOT
    IOT -->|Evento| API
    API -->|CRUD| DB
    API -->|Armazena logs| S3
    API -->|Alerta| SNS
    SNS -->|Push| MOBILE
    API -->|REST API| MOBILE
    COGNITO -->|Auth| MOBILE
    API -->|Comando liberar/bloquear| IOT
    IOT -->|MQTT| GW
    GW -->|Modbus TCP / GPIO| CLP
    CLP -->|Aciona| TRAVA
```

---

## 3. Diagrama de Integração Vertical

```mermaid
graph LR
    subgraph "Nível 0 — Campo"
        A["Sensores / RFID / Trava"]
    end
    subgraph "Nível 1 — Controle"
        B["CLP / PLC<br/>(Modbus TCP)"]
    end
    subgraph "Nível 2 — Borda"
        C["Gateway IoT<br/>(ESP32)"]
    end
    subgraph "Nível 3 — Nuvem"
        D["AWS<br/>(IoT Core + Backend + DB)"]
    end
    subgraph "Nível 4 — Aplicação"
        E["App Mobile<br/>(React Native)"]
    end

    A --> B --> C -->|MQTT| D -->|REST API| E
```

---

## 4. Diagrama de Integração Horizontal

```mermaid
graph LR
    SCADA["SCADA /<br/>Supervisório"]
    RH["Sistema de RH<br/>(API Mock)"]
    BACKEND["Backend<br/>(EC2 / API Gateway)"]
    IOT["AWS IoT Core"]
    APP["App Mobile"]

    SCADA -->|"Status subestação"| BACKEND
    RH -->|"Consulta colaboradores"| BACKEND
    IOT -->|"Eventos IoT"| BACKEND
    BACKEND -->|"REST API"| APP
```

---

## 5. Fluxo Principal — Acesso à Subestação

```mermaid
sequenceDiagram
    participant COL as Colaborador
    participant RFID as Leitor RFID
    participant GW as Gateway (ESP32)
    participant IOT as AWS IoT Core
    participant API as Backend (EC2)
    participant DB as RDS (PostgreSQL)
    participant CLP as CLP / PLC
    participant TRAVA as Trava
    participant APP as App Mobile

    COL->>RFID: Aproxima crachá
    RFID->>GW: UID do crachá
    GW->>IOT: Publica via MQTT (topic: acesso/request)
    IOT->>API: Trigger evento
    API->>DB: Consulta permissão do colaborador
    
    alt Autorizado
        DB-->>API: Permissão OK
        API->>IOT: Publica comando LIBERAR
        IOT->>GW: MQTT (topic: acesso/response)
        GW->>CLP: Modbus TCP — liberar trava
        CLP->>TRAVA: Aciona abertura
        API->>DB: Registra log (PERMITIDO)
    else Negado
        DB-->>API: Sem permissão
        API->>IOT: Publica comando BLOQUEAR
        IOT->>GW: MQTT (topic: acesso/response)
        API->>DB: Registra log (NEGADO)
        API->>APP: Push notification (alerta)
    end
```

---

## 6. Detalhamento por Camada

### 6.1 Camada de Campo (OT)

| Componente | Função | Protocolo |
|---|---|---|
| Leitor RFID MFRC522 | Lê UID do crachá NFC/RFID | SPI (com ESP32) |
| Sensor de porta | Detecta porta aberta/fechada | GPIO digital |
| Sensor de presença | Detecta pessoa na área | GPIO digital |
| CLP / PLC | Controla trava eletromagnética | Modbus TCP |
| Trava eletromagnética | Libera/bloqueia acesso físico | Acionada via CLP |

### 6.2 Camada de Borda (Gateway IoT)

| Aspecto | Detalhe |
|---|---|
| **Hardware** | ESP32 (ou Raspberry Pi) |
| **Firmware** | MicroPython ou Arduino (C++) |
| **Comunicação nuvem** | MQTT com TLS (AWS IoT Core) |
| **Comunicação campo** | SPI (RFID), GPIO (sensores), Modbus TCP (CLP) |
| **Modo offline** | Fila local de eventos, sincroniza ao reconectar |
| **Cache** | Tabela local de permissões para validação offline |

### 6.3 Camada de Nuvem (AWS Academy)

| Serviço AWS | Função | Custo |
|---|---|---|
| **IoT Core** | Broker MQTT para comunicação com gateways | AWS Academy |
| **EC2** | Servidor backend (Node.js + Express) | AWS Academy |
| **API Gateway** | Exposição de APIs REST para o app mobile | AWS Academy |
| **RDS (PostgreSQL)** | Banco relacional (colaboradores, permissões, logs) | AWS Academy |
| **S3** | Armazenamento de relatórios e logs de longo prazo | AWS Academy |
| **SNS** | Envio de notificações push | AWS Academy |
| **Cognito** | Autenticação e autorização de usuários do app | AWS Academy |
| **CloudWatch** | Monitoramento e alertas de infraestrutura | AWS Academy |

### 6.4 Camada de Aplicação (Mobile)

| Aspecto | Detalhe |
|---|---|
| **Framework** | React Native (Expo) |
| **Plataformas** | Android e iOS |
| **Autenticação** | AWS Cognito (login/signup) |
| **Comunicação** | REST API (backend EC2) |
| **Notificações** | Push via SNS + FCM |
| **Telas principais** | Login, Dashboard, Histórico, Gerenciamento, Relatórios |

---

## 7. Modelo de Dados (Simplificado)

```mermaid
erDiagram
    COLABORADOR {
        uuid id PK
        string nome
        string cpf
        string cargo
        string rfid_uid
        boolean ativo
        datetime criado_em
    }

    SUBESTACAO {
        uuid id PK
        string nome
        string localizacao
        boolean ativa
    }

    PERMISSAO {
        uuid id PK
        uuid colaborador_id FK
        uuid subestacao_id FK
        datetime validade_inicio
        datetime validade_fim
        boolean ativa
    }

    LOG_ACESSO {
        uuid id PK
        uuid colaborador_id FK
        uuid subestacao_id FK
        string rfid_uid
        string tipo "ENTRADA|SAIDA"
        string resultado "PERMITIDO|NEGADO"
        datetime data_hora
    }

    COLABORADOR ||--o{ PERMISSAO : "possui"
    SUBESTACAO ||--o{ PERMISSAO : "concede"
    COLABORADOR ||--o{ LOG_ACESSO : "gera"
    SUBESTACAO ||--o{ LOG_ACESSO : "registra"
```

---

## 8. Tópicos MQTT

| Tópico | Direção | Payload (exemplo) |
|---|---|---|
| `subestacao/{id}/acesso/request` | Gateway → Nuvem | `{"rfid_uid": "A1B2C3D4", "timestamp": "..."}` |
| `subestacao/{id}/acesso/response` | Nuvem → Gateway | `{"acao": "LIBERAR", "colaborador": "João"}` |
| `subestacao/{id}/sensor/porta` | Gateway → Nuvem | `{"status": "ABERTA", "timestamp": "..."}` |
| `subestacao/{id}/sensor/presenca` | Gateway → Nuvem | `{"detectado": true, "timestamp": "..."}` |
| `subestacao/{id}/status` | Gateway → Nuvem | `{"online": true, "ultima_sync": "..."}` |

---

## 9. Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/login` | Login (via Cognito) |
| `GET` | `/colaboradores` | Lista colaboradores |
| `POST` | `/colaboradores` | Cadastra colaborador |
| `PUT` | `/colaboradores/:id` | Atualiza colaborador |
| `DELETE` | `/colaboradores/:id` | Remove colaborador |
| `GET` | `/permissoes` | Lista permissões |
| `POST` | `/permissoes` | Concede permissão |
| `DELETE` | `/permissoes/:id` | Revoga permissão |
| `GET` | `/logs` | Lista logs de acesso (com filtros) |
| `GET` | `/relatorios` | Gera relatório por período |
| `GET` | `/subestacoes` | Lista subestações |
| `GET` | `/subestacoes/:id/status` | Status ao vivo da subestação |