import Constants from "expo-constants";

// Expo Go no celular físico: usa o debuggerHost (IP:porta do bundler)
// para descobrir o IP da máquina na rede local automaticamente.
function getApiUrl(): string {
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:8000`;
  }
  return "http://localhost:8000";
}

const BASE_URL = getApiUrl();

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  rfid_uid: string | null;
  role: string;
  ativo: boolean;
  criado_em: string;
}

// Base64 decode que funciona no React Native (não tem atob)
function decodeBase64(str: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  // Pad string
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

export async function login(
  email: string,
  senha: string
): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Falha na autenticação");
  }

  return response.json();
}

export async function getMe(token: string): Promise<UserInfo> {
  // Decodifica o JWT pra pegar o user_id (payload é a parte do meio)
  const payload = JSON.parse(decodeBase64(token.split(".")[1]));
  const userId = payload.user_id;

  const response = await fetch(`${BASE_URL}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Falha ao buscar dados do usuário");
  }

  return response.json();
}

export function getBaseUrl(): string {
  return BASE_URL;
}
