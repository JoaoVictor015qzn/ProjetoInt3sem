import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { UserInfo } from "../services/api";

interface DashboardScreenProps {
  user: UserInfo;
  onLogout: () => void;
}

export default function DashboardScreen({ user, onLogout }: DashboardScreenProps) {
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(440, Math.max(300, width - 32));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.bgOverlay,
          {
            top: -height * 0.3,
            right: -width * 0.3,
            width: height * 0.7,
            height: height * 0.7,
            borderRadius: height * 0.35,
          },
        ]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.successContainer, { width: contentWidth }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user.nome.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.welcomeTitle}>Bem-vindo!</Text>
          <Text style={styles.userName}>{user.nome}</Text>

          <View style={styles.infoCard}>
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Cargo" value={user.cargo} />
            <InfoRow label="Role" value={user.role.toUpperCase()} />
            <InfoRow label="CPF" value={maskCpf(user.cpf)} />
            <InfoRow
              label="Status"
              value={user.ativo ? "🟢 Ativo" : "🔴 Inativo"}
            />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function maskCpf(cpf: string): string {
  if (cpf.length === 11) {
    return `${cpf.slice(0, 3)}.***.*${cpf.slice(9)}`;
  }
  return cpf;
}

const COLORS = {
  bg: "#0a0e1a",
  card: "#111827",
  cardBorder: "#1e293b",
  accent: "#f59e0b",
  accentGlow: "rgba(245, 158, 11, 0.15)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  danger: "#ef4444",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bgOverlay: {
    position: "absolute",
    backgroundColor: COLORS.accentGlow,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  successContainer: {
    alignItems: "center",
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: "800",
    color: "#0a0e1a",
  },
  welcomeTitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  userName: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
    marginBottom: 28,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "700",
    maxWidth: "56%",
    textAlign: "right",
  },
  logoutBtn: {
    marginTop: 28,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
