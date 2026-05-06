import { Platform } from "react-native";
import Constants from "expo-constants";

// ── URL da API ──────────────────────────────────────────────────────

function getApiUrl(): string {
  if (Platform.OS === "web") {
    return "http://localhost:8000";
  }
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:8000`;
  }
  return "http://localhost:8000";
}

const BASE_URL = getApiUrl();
export { BASE_URL };

// ── Types ───────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  rfid_uid: string | null;
  role: string;
  foto_url: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface SubestacaoInfo {
  id: string;
  nome: string;
  localizacao: string | null;
  ativa: boolean;
}

export interface PermissaoInfo {
  id: string;
  colaborador_id: string;
  subestacao_id: string;
  validade_inicio: string | null;
  validade_fim: string | null;
  ativa: boolean;
}

export interface LogAcessoInfo {
  id: string;
  colaborador_id: string | null;
  subestacao_id: string;
  rfid_uid: string;
  tipo: string;
  resultado: string;
  data_hora: string;
}

export interface ValidarAcessoResponse {
  acao: string;
  colaborador: string | null;
  motivo: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────

function decodeBase64(str: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  for (let i = 0; i < str.length; i += 4) {
    const a = chars.indexOf(str[i]);
    const b = chars.indexOf(str[i + 1]);
    const c = chars.indexOf(str[i + 2]);
    const d = chars.indexOf(str[i + 3]);
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    output += String.fromCharCode((n >> 16) & 0xff);
    if (str[i + 2] !== "=") output += String.fromCharCode((n >> 8) & 0xff);
    if (str[i + 3] !== "=") output += String.fromCharCode(n & 0xff);
  }
  return output;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    let errMsg = `Erro ${response.status}`;
    if (error.detail) {
      if (Array.isArray(error.detail)) {
        errMsg = error.detail.map((e: any) => `${e.loc?.[e.loc.length - 1] || "Campo"}: ${e.msg}`).join("\n");
      } else {
        errMsg = error.detail;
      }
    }
    throw new Error(errMsg);
  }
  return response.json();
}

// ── Auth ────────────────────────────────────────────────────────────

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function getMe(token: string): Promise<UserInfo> {
  const payload = JSON.parse(decodeBase64(token.split(".")[1]));
  const res = await fetch(`${BASE_URL}/users/${payload.user_id}`, {
    headers: authHeaders(token),
  });
  return handleResponse<UserInfo>(res);
}

// ── Users ───────────────────────────────────────────────────────────

export async function getUsers(token: string): Promise<UserInfo[]> {
  const res = await fetch(`${BASE_URL}/users/`, { headers: authHeaders(token) });
  return handleResponse<UserInfo[]>(res);
}

export async function createUser(
  token: string,
  data: { nome: string; email: string; cpf: string; cargo: string; rfid_uid?: string; role: string; senha: string }
): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/users/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<UserInfo>(res);
}

export async function updateUser(
  token: string,
  userId: string,
  data: Record<string, any>
): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<UserInfo>(res);
}

export async function deleteUser(token: string, userId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Erro ao desativar");
  }
}

// ── Subestações ─────────────────────────────────────────────────────

export async function getSubestacoes(token: string): Promise<SubestacaoInfo[]> {
  const res = await fetch(`${BASE_URL}/subestacoes/`, { headers: authHeaders(token) });
  return handleResponse<SubestacaoInfo[]>(res);
}

export async function createSubestacao(
  token: string,
  data: { nome: string; localizacao?: string }
): Promise<SubestacaoInfo> {
  const res = await fetch(`${BASE_URL}/subestacoes/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<SubestacaoInfo>(res);
}

// ── Permissões ──────────────────────────────────────────────────────

export async function getPermissoes(token: string): Promise<PermissaoInfo[]> {
  const res = await fetch(`${BASE_URL}/permissoes/`, { headers: authHeaders(token) });
  return handleResponse<PermissaoInfo[]>(res);
}

export async function createPermissao(
  token: string,
  data: { colaborador_id: string; subestacao_id: string }
): Promise<PermissaoInfo> {
  const res = await fetch(`${BASE_URL}/permissoes/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<PermissaoInfo>(res);
}

export async function deletePermissao(token: string, permId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/permissoes/${permId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Erro ao revogar permissão");
}

// ── Logs ────────────────────────────────────────────────────────────

export async function getLogs(
  token: string,
  params?: { resultado?: string; limit?: number }
): Promise<LogAcessoInfo[]> {
  const query = new URLSearchParams();
  if (params?.resultado) query.set("resultado", params.resultado);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const res = await fetch(`${BASE_URL}/logs${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
  return handleResponse<LogAcessoInfo[]>(res);
}

// ── Validar Acesso ──────────────────────────────────────────────────

export async function validarAcesso(
  data: { rfid_uid: string; subestacao_id: string; tipo?: string }
): Promise<ValidarAcessoResponse> {
  const res = await fetch(`${BASE_URL}/acesso/validar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "ENTRADA", ...data }),
  });
  return handleResponse<ValidarAcessoResponse>(res);
}

// ── Upload Foto ─────────────────────────────────────────────────────

export async function uploadFoto(
  token: string,
  userId: string,
  imageUri: string
): Promise<UserInfo> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    // Na web, o URI é um blob URL ou data URI
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append("file", blob, "foto.jpg");
  } else {
    // No mobile, usar o formato { uri, name, type }
    formData.append("file", {
      uri: imageUri,
      name: "foto.jpg",
      type: "image/jpeg",
    } as any);
  }

  const res = await fetch(`${BASE_URL}/users/${userId}/foto`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return handleResponse<UserInfo>(res);
}

export async function deleteFoto(
  token: string,
  userId: string
): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/users/${userId}/foto`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return handleResponse<UserInfo>(res);
}
