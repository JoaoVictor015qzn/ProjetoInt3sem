import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, useWindowDimensions, Image,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { BASE_URL } from "../services/api";
import { COLORS } from "../theme";

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(460, width - 32);

  if (!user) return null;

  const maskCpf = (cpf: string) =>
    cpf.length === 11 ? `${cpf.slice(0, 3)}.***.**${cpf.slice(9)}` : cpf;

  const roleLabel: Record<string, string> = {
    admin: "Administrador", gestor: "Gestor", supervisor: "Supervisor", operador: "Operador",
  };

  const memberSince = new Date(user.criado_em).toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ width: contentWidth, alignSelf: "center", alignItems: "center" }}>
          {/* Avatar */}
          {user.foto_url ? (
            <Image source={{ uri: `${BASE_URL}${user.foto_url}` }} style={styles.avatarPhoto} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user.nome.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.userName}>{user.nome}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{roleLabel[user.role] || user.role}</Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <InfoRow icon="📧" label="Email" value={user.email} />
            <InfoRow icon="💼" label="Cargo" value={user.cargo} />
            <InfoRow icon="🔑" label="Role" value={user.role.toUpperCase()} />
            <InfoRow icon="📝" label="CPF" value={maskCpf(user.cpf)} />
            <InfoRow icon="🏷" label="RFID" value={user.rfid_uid || "Não vinculado"} />
            <InfoRow icon="📅" label="Membro desde" value={memberSince} />
            <InfoRow icon={user.ativo ? "🟢" : "🔴"} label="Status" value={user.ativo ? "Ativo" : "Inativo"} last />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Sistema de Controle de Acesso — v1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: 60, paddingBottom: 40, alignItems: "center" },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.accent,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  avatarPhoto: {
    width: 96, height: 96, borderRadius: 48, marginBottom: 16,
    borderWidth: 3, borderColor: COLORS.accent,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  avatarText: { fontSize: 42, fontWeight: "800", color: COLORS.bg },
  userName: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  rolePill: {
    backgroundColor: COLORS.accentGlow, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6,
    marginBottom: 28,
  },
  roleText: { fontSize: 13, fontWeight: "700", color: COLORS.accent, letterSpacing: 1 },
  infoCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20, width: "100%",
    borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 24,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  infoIcon: { fontSize: 18, marginRight: 12, width: 28 },
  infoLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600", width: 100 },
  infoValue: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: "600", textAlign: "right" },
  logoutBtn: {
    width: "100%", backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.danger,
    borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 24,
  },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: "700" },
  footer: { fontSize: 12, color: COLORS.textMuted, letterSpacing: 0.5 },
});
