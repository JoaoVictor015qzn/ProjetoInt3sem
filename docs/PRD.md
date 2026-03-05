# PRD — Sistema de Controle de Acesso de Subestação

> **Projeto Integrador — 3º Semestre**
> **Versão:** 1.1 | **Data:** 05/03/2026
> **Custo do projeto:** R$ 0,00 — todas as ferramentas e serviços utilizados são gratuitos (AWS Academy, open-source, free tier)

---

## 1. Visão Geral

### 1.1 Problema

Atualmente o acesso às subestações elétricas ocorre com controle limitado, sem identificação precisa de quem entrou, em que horário e com qual autorização. Em áreas críticas com equipamentos energizados, isso representa risco elevado à segurança operacional e potencial de acidentes graves.

### 1.2 Solução Proposta

Sistema de controle de acesso automatizado capaz de:

- **Identificar** colaboradores via credencial eletrônica (crachá RFID / NFC)
- **Validar** permissões em tempo real
- **Liberar** entrada apenas para pessoas autorizadas
- **Registrar** automaticamente entradas e saídas
- **Monitorar** acessos em tempo real com dashboards e alertas
- **Gerar** relatórios de conformidade (NR-10, NR-12)

### 1.3 Benefícios Esperados

| Benefício | Descrição |
|---|---|
| **Rastreabilidade** | Registro completo de quem acessou, quando e por quanto tempo |
| **Segurança** | Restrição de acesso somente a autorizados |
| **Tempo real** | Dados imediatos sobre presença na subestação |
| **Conformidade** | Aderência às NR-10, NR-12 e normas de concessionárias |
| **LGPD** | Tratamento adequado de dados pessoais |

---

## 2. Stakeholders

| Papel | Responsabilidade |
|---|---|
| Operador de campo | Usa crachá para acessar a subestação |
| Supervisor de segurança | Monitora acessos em tempo real pelo app mobile |
| Gestor de manutenção | Consulta relatórios e gerencia permissões |
| Equipe de TI/Automação | Administra o sistema, integra com SCADA/CLP |

---

## 3. Integração das Disciplinas

> [!IMPORTANT]
> Cada disciplina do semestre deve ser coberta pelo projeto. A tabela abaixo mapeia disciplinas → funcionalidades do sistema.

| Disciplina | Onde se aplica no projeto |
|---|---|
| **Computação em Nuvem (AWS)** | Toda a infraestrutura de backend hospedada na AWS via **AWS Academy** (créditos educacionais gratuitos): EC2, RDS, IoT Core, S3, CloudWatch |
| **Desenvolvimento Mobile (React Native)** | App mobile para supervisores: monitoramento em tempo real, push notifications de alertas, consulta de logs e gerenciamento de permissões |
| **Interfaces Industriais** | Integração com CLP/PLC para acionamento de travas eletromagnéticas e leitura de sensores (portas, presença). Protocolo Modbus TCP / OPC-UA |
| **Integração IoT e IIoT** | Dispositivos de borda (ESP32 / Raspberry Pi) com leitores RFID/NFC coletando dados e enviando via MQTT para o AWS IoT Core. Sensores industriais (IIoT) reportando status de portas e condições ambientais |
| **Integração Horizontal e Vertical** | **Vertical:** dados fluem do chão de fábrica (sensores/CLPs) → borda (gateway IoT) → nuvem (backend) → aplicação (mobile). **Horizontal:** integração entre sistemas existentes (SCADA, ERP de RH para validação de colaboradores, sistema de supervisão) |

---

## 4. Arquitetura de Alto Nível

> 📐 Documento completo de arquitetura: **[ARQUITETURA.md](./ARQUITETURA.md)**
>
> Inclui: diagrama de arquitetura, integração vertical e horizontal, diagrama de sequência, modelo de dados, tópicos MQTT e endpoints da API REST.

---

## 5. Requisitos Funcionais

### 5.1 Módulo IoT / IIoT (Borda)
| ID | Requisito |
|---|---|
| RF-01 | Leitura de crachá RFID/NFC e envio do UID via MQTT |
| RF-02 | Leitura de sensores de porta (aberta/fechada) e presença |
| RF-03 | Recebimento de comandos de liberação/bloqueio da nuvem |
| RF-04 | Operação offline com fila local em caso de perda de conectividade |

### 5.2 Módulo de Interfaces Industriais (CLP)
| ID | Requisito |
|---|---|
| RF-05 | Comunicação Modbus TCP ou OPC-UA com CLP |
| RF-06 | Acionamento de trava eletromagnética via CLP |
| RF-07 | Leitura de status de intertravamento do CLP |

### 5.3 Módulo Backend (AWS)
| ID | Requisito |
|---|---|
| RF-08 | API REST para CRUD de colaboradores e permissões |
| RF-09 | Validação de acesso em tempo real (< 2s de latência) |
| RF-10 | Registro de log de todas as tentativas de acesso (permitidas e negadas) |
| RF-11 | Geração de relatórios de acesso por período, subestação e colaborador |
| RF-12 | Envio de notificações push para acessos negados e alertas de segurança |
| RF-13 | Dashboard de monitoramento em tempo real |

### 5.4 Módulo Mobile (React Native)
| ID | Requisito |
|---|---|
| RF-14 | Tela de login com autenticação segura (AWS Cognito) |
| RF-15 | Dashboard com status ao vivo de cada subestação (quem está dentro, porta aberta/fechada) |
| RF-16 | Tela de gerenciamento de colaboradores e permissões |
| RF-17 | Tela de histórico de acessos com filtros |
| RF-18 | Recebimento de push notifications para alertas |
| RF-19 | Tela de relatórios com exportação em PDF |

### 5.5 Integração Horizontal e Vertical
| ID | Requisito |
|---|---|
| RF-20 | Integração vertical completa: sensor → gateway → nuvem → app |
| RF-21 | Integração horizontal com sistema de RH (consulta de colaboradores ativos) |
| RF-22 | Integração horizontal com SCADA/supervisório existente (status da subestação) |

---

## 6. Requisitos Não-Funcionais

| ID | Requisito | Categoria |
|---|---|---|
| RNF-01 | Latência máxima de 2 segundos entre leitura do crachá e liberação da trava | Performance |
| RNF-02 | Disponibilidade de 99,5% do backend na AWS | Disponibilidade |
| RNF-03 | Operação offline do gateway por no mínimo 4 horas com sincronização posterior | Resiliência |
| RNF-04 | Conformidade com NR-10 e NR-12 | Regulatória |
| RNF-05 | Conformidade com LGPD para dados pessoais dos colaboradores | Privacidade |
| RNF-06 | Comunicação criptografada (TLS) entre todos os componentes | Segurança |
| RNF-07 | Sistema operável em ambientes com poeira, calor e interferência eletromagnética | Confiabilidade |
| RNF-08 | App mobile compatível com Android e iOS | Compatibilidade |
| RNF-09 | Logs de acesso retidos por no mínimo 5 anos | Auditoria |

---

## 7. Escopo de MVP (Mínimo Produto Viável)

> [!TIP]
> Para viabilizar a entrega no semestre, o MVP foca nas funcionalidades essenciais de cada disciplina.

### Incluído no MVP

- [ ] **IoT:** 1 gateway (ESP32) + 1 leitor RFID simulando uma subestação
- [ ] **Interfaces Industriais:** Simulação de CLP via Modbus TCP (pode usar simulador como OpenPLC ou ModRSsim)
- [ ] **AWS:** Backend via **AWS Academy** (créditos educacionais) — EC2 + API Gateway + RDS PostgreSQL + IoT Core
- [ ] **Mobile:** App React Native com login, dashboard ao vivo e histórico de acessos
- [ ] **Integração Vertical:** Fluxo completo sensor → nuvem → app
- [ ] **Integração Horizontal:** Mock de API de RH para consulta de colaboradores

### Fora do MVP (Evolução Futura)

- Integração real com SCADA
- Reconhecimento facial como segundo fator
- Múltiplas subestações com geolocalização
- App para o colaborador (self-service de solicitação de acesso)

---

## 8. Restrições e Riscos

| Risco | Mitigação |
|---|---|
| Conectividade instável na subestação | Gateway com modo offline e fila local (MQTT persistente) |
| Latência na validação via nuvem | Cache local de permissões no gateway; sincronização periódica |
| Interferência eletromagnética nos leitores RFID | Uso de leitores industriais blindados; testes em campo |
| Custo de infraestrutura AWS | **Custo zero** — uso de AWS Academy (créditos educacionais gratuitos) |
| Limite de serviços no AWS Academy | Verificar quais serviços estão disponíveis no Learner Lab; adaptar se necessário |
| Complexidade de integração com CLP real | MVP usa simulador gratuito (OpenPLC); integração real como evolução |
| LGPD e anonimização | Criptografia em repouso e em trânsito; acesso restrito ao banco |

---

## 9. Tecnologias e Ferramentas

| Camada | Tecnologia | Custo |
|---|---|---|
| **Dispositivo de borda** | ESP32 + Leitor RFID MFRC522 | Componentes da faculdade/lab |
| **Protocolo IoT** | MQTT (AWS IoT Core) | AWS Academy (grátis) |
| **Protocolo Industrial** | Modbus TCP | Open-source (grátis) |
| **Backend** | Node.js (EC2) + API Gateway | AWS Academy (grátis) |
| **Banco de Dados** | Amazon RDS (PostgreSQL) | AWS Academy (grátis) |
| **Autenticação** | AWS Cognito | AWS Academy (grátis) |
| **Notificações** | Amazon SNS + Firebase Cloud Messaging | Grátis (free tier) |
| **Storage** | Amazon S3 | AWS Academy (grátis) |
| **Monitoramento** | Amazon CloudWatch | AWS Academy (grátis) |
| **Mobile** | React Native (Expo) | Grátis (open-source) |
| **Simulador CLP** | OpenPLC / ModRSsim | Grátis (open-source) |
| **Versionamento** | Git + GitHub | Grátis |

---

## 10. Cronograma Sugerido (Macro)

| Fase | Duração Estimada | Entregáveis |
|---|---|---|
| **1. Planejamento** | 2 semanas | PRD aprovado, arquitetura definida, ambiente AWS configurado |
| **2. IoT + Hardware** | 3 semanas | Gateway funcional, leitor RFID integrado, MQTT publicando |
| **3. Backend + Cloud** | 3 semanas | APIs REST, IoT Core configurado, banco populado |
| **4. Interfaces Industriais** | 2 semanas | Simulador CLP integrado via Modbus, trava simulada |
| **5. Mobile** | 3 semanas | App com login, dashboard e histórico |
| **6. Integração E2E** | 2 semanas | Fluxo completo ponta-a-ponta testado |
| **7. Testes e Ajustes** | 1 semana | Testes de carga, segurança e UX |
| **8. Apresentação** | 1 semana | Demo funcional, documentação final |