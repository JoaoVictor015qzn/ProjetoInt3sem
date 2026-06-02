import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  StatusBar, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import {
  getSubestacoes, getUsers, getLogs,
  SubestacaoInfo, UserInfo, LogAcessoInfo,
} from "../services/api";
import { COLORS } from "../theme";
import { useNotifications } from "../hooks/useNotifications";
import { Modal, TouchableOpacity } from "react-native";

export default function DashboardScreen() {
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(500, width - 32);

  const [subestacoes, setSubestacoes] = useState<SubestacaoInfo[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [logs, setLogs] = useState<LogAcessoInfo[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [subs, users, recentLogs] = await Promise.all([
        getSubestacoes(token),
        getUsers(token).catch(() => []),
        getLogs(token, { limit: 10 }).catch(() => []),
      ]);
      setSubestacoes(subs);
      setTotalUsers(users.length);
      setLogs(recentLogs);
      const um: Record<string, string> = {};
      users.forEach((u) => (um[u.id] = u.nome));
      setUserMap(um);
      const sm: Record<string, string> = {};
      subs.forEach((s) => (sm[s.id] = s.nome));
      setSubMap(sm);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const hoje = new Date().toLocaleDateString("pt-BR");
  const acessosHoje = logs.filter((l) => {
    const d = new Date(l.data_hora).toLocaleDateString("pt-BR");
    return d === hoje;
  }).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        <View style={{ width: contentWidth, alignSelf: "center" }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Olá, {user?.nome?.split(" ")[0]} 👋</Text>
              <Text style={styles.dateText}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</Text>
            </View>
            <TouchableOpacity 
              style={styles.bellBtn} 
              onPress={() => {
                setShowNotifications(true);
                markAllAsRead();
              }}
            >
              <Text style={{ fontSize: 24 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon="👥" value={totalUsers} label="Colaboradores" />
            <StatCard icon="⚡" value={subestacoes.length} label="Subestações" />
            <StatCard icon="📋" value={acessosHoje} label="Acessos Hoje" />
          </View>

          {/* Subestações */}
          <Text style={styles.sectionTitle}>Subestações</Text>
          {subestacoes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nenhuma subestação cadastrada</Text>
            </View>
          ) : (
            subestacoes.map((sub) => (
              <View key={sub.id} style={styles.subCard}>
                <View style={styles.subHeader}>
                  <View style={[styles.statusDot, { backgroundColor: sub.ativa ? COLORS.success : COLORS.danger }]} />
                  <Text style={styles.subName}>{sub.nome}</Text>
                </View>
                {sub.localizacao && <Text style={styles.subLocation}>📍 {sub.localizacao}</Text>}
                <Text style={styles.subStatus}>{sub.ativa ? "🟢 Ativa" : "🔴 Inativa"}</Text>
              </View>
            ))
          )}

          {/* Últimos Acessos */}
          <Text style={styles.sectionTitle}>Últimos Acessos</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nenhum acesso registrado</Text>
            </View>
          ) : (
            logs.slice(0, 8).map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logIcon, log.resultado === "PERMITIDO" ? styles.logPermitido : styles.logNegado]}>
                  <Text style={{ fontSize: 16 }}>{log.resultado === "PERMITIDO" ? "✅" : "❌"}</Text>
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logName}>{userMap[log.colaborador_id ?? ""] || "Desconhecido"}</Text>
                  <Text style={styles.logSub}>{subMap[log.subestacao_id] || "—"} • {log.tipo}</Text>
                </View>
                <Text style={styles.logTime}>
                  {new Date(log.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: contentWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificações</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {notifications.length === 0 ? (
                <Text style={styles.emptyText}>Sem notificações no momento.</Text>
              ) : (
                notifications.map((notif) => (
                  <View key={notif.id} style={styles.notifCard}>
                    <Text style={{ fontSize: 18, marginRight: 10 }}>
                      {notif.resultado === "PERMITIDO" ? "✅" : "⛔"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifText}>
                        <Text style={{ fontWeight: "700" }}>{notif.colaborador}</Text> tentou acessar a subestação.
                      </Text>
                      <Text style={styles.notifTime}>
                        {new Date(notif.data_hora).toLocaleTimeString("pt-BR")}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { paddingTop: 60, paddingBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  dateText: { fontSize: 14, color: COLORS.textMuted, textTransform: "capitalize" },
  bellBtn: { padding: 8, position: "relative" },
  badgeCount: { 
    position: "absolute", top: 4, right: 4, backgroundColor: COLORS.danger, 
    borderRadius: 10, width: 20, height: 20, justifyContent: "center", alignItems: "center" 
  },
  badgeCountText: { color: COLORS.bg, fontSize: 10, fontWeight: "bold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  statValue: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginTop: 2, textAlign: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  subCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  subHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  subName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  subLocation: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  subStatus: { fontSize: 12, color: COLORS.textMuted },
  logRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card,
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  logIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  logPermitido: { backgroundColor: COLORS.successBg },
  logNegado: { backgroundColor: COLORS.dangerBg },
  logInfo: { flex: 1 },
  logName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  logSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  logTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 24, marginBottom: 10,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalContent: { backgroundColor: COLORS.bg, borderRadius: 16, padding: 20, maxHeight: "80%", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: COLORS.text },
  closeBtn: { fontSize: 20, color: COLORS.textMuted, padding: 4 },
  notifCard: { flexDirection: "row", backgroundColor: COLORS.card, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: "center" },
  notifText: { fontSize: 14, color: COLORS.text },
  notifTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
});
