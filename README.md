# ProjetoInt3sem
projeto integrador 3 semestre faculdade ads senai santa rosalia

## Como executar

### API (FastAPI)

No terminal, dentro de `api/`:

```powershell
uvicorn app:app --reload
```

### Mobile (Expo)

Você pode iniciar de duas formas:

1. Entrando na pasta `mobile/`:

```powershell
cd mobile
npx expo start
```

2. Ou direto da raiz do projeto:

```powershell
npx expo start .\mobile
```

> Se rodar `npx expo start` na raiz sem informar `mobile`, o Expo procura `package.json` em `ProjetoInt3sem/` e gera erro de configuração.
