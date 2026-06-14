import React, { useCallback, useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, useWindowDimensions,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { getAuditLogs, AuditLogInfo } from "../services/api";
import { COLORS } from "../theme";

const ACAO_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  CRIAR_COLABORADOR:     { icon: "👤+", color: COLORS.success, bg: COLORS.successBg },
  EDITAR_COLABORADOR:    { icon: "✏️",  color: "#f59e0b",      bg: "rgba(245,158,11,0.1)" },
  DESATIVAR_COLABORADOR: { icon: "🚫",  color: COLORS.danger,  bg: COLORS.dangerBg },
  UPLOAD_FOTO:           { icon: "📷",  color: "#8b5cf6",      bg: "rgba(139,92,246,0.1)" },
  CRIAR_SUBESTACAO:      { icon: "⚡+", color: COLORS.success, bg: COLORS.successBg },
  EDITAR_SUBESTACAO:     { icon: "⚡✏", color: "#f59e0b",      bg: "rgba(245,158,11,0.1)" },
  DESATIVAR_SUBESTACAO:  { icon: "⚡🚫",color: COLORS.danger,  bg: COLORS.dangerBg },
  CONCEDER_PERMISSAO:    { icon: "🔓",  color: COLORS.success, bg: COLORS.successBg },
  REVOGAR_PERMISSAO:     { icon: "🔒",  color: "#f97316",      bg: "rgba(249,115,22,0.1)" },
};

function getConfig(acao: string) {
  return ACAO_CONFIG[acao] || { icon: "📝", color: COLORS.textMuted, bg: "rgba(148,163,184,0.1)" };
}

export default function AuditoriaScreen() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 600);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getAuditLogs(token, { limit: 100 });
      setLogs(data);
    } catch (e) {
      console.error("Erro ao buscar auditoria:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: AuditLogInfo }) => {
    const cfg = getConfig(item.acao);
    const data = new Date(item.data_hora);
    const dataStr = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const horaStr = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return (
      <View style={[styles.card, { borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
        <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.detalhes}>{item.detalhes || item.acao}</Text>
          <Text style={styles.autor}>por {item.usuario_nome || "Sistema"}</Text>
          <Text style={styles.dataHora}>{dataStr} às {horaStr}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>
            {item.entidade}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { width: contentWidth, alignSelf: "center" }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Auditoria</Text>
            <Text style={styles.subtitle}>{logs.length} registros</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={styles.emptyText}>Nenhum registro de auditoria ainda.</Text>
            <Text style={styles.emptySubtext}>Ações administrativas aparecerão aqui.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: "center", alignItems: "center" },
  list: { paddingTop: 60, paddingBottom: 24 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card,
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  detalhes: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  autor: { fontSize: 12, color: COLORS.accent, marginBottom: 2 },
  dataHora: { fontSize: 11, color: COLORS.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
});
