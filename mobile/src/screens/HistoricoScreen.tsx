import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { getLogs, getUsers, getSubestacoes, LogAcessoInfo } from "../services/api";
import { COLORS } from "../theme";

type Filtro = "TODOS" | "PERMITIDO" | "NEGADO";

export default function HistoricoScreen() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(500, width - 32);

  const [logs, setLogs] = useState<LogAcessoInfo[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const params: any = { limit: 200 };
      if (filtro !== "TODOS") params.resultado = filtro;

      const [logsData, users, subs] = await Promise.all([
        getLogs(token, params),
        getUsers(token).catch(() => []),
        getSubestacoes(token).catch(() => []),
      ]);
      setLogs(logsData);
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
  }, [token, filtro]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const renderItem = ({ item }: { item: LogAcessoInfo }) => (
    <View style={styles.logCard}>
      <View style={[styles.resultBar, item.resultado === "PERMITIDO" ? styles.barGreen : styles.barRed]} />
      <View style={styles.logContent}>
        <View style={styles.logTop}>
          <Text style={styles.logName}>{userMap[item.colaborador_id ?? ""] || "RFID não cadastrado"}</Text>
          <Text style={[
            styles.logResult,
            { color: item.resultado === "PERMITIDO" ? COLORS.success : COLORS.danger },
          ]}>
            {item.resultado === "PERMITIDO" ? "✅ LIBERADO" : "❌ NEGADO"}
          </Text>
        </View>
        <Text style={styles.logDetail}>
          ⚡ {subMap[item.subestacao_id] || "—"} • {item.tipo} • 🏷 {item.rfid_uid}
        </Text>
        <Text style={styles.logDate}>{formatDate(item.data_hora)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={styles.title}>Histórico de Acessos</Text>
        <Text style={styles.subtitle}>{logs.length} registros</Text>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(["TODOS", "PERMITIDO", "NEGADO"] as Filtro[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filtro === f && styles.filterBtnActive]}
              onPress={() => setFiltro(f)}
            >
              <Text style={[styles.filterText, filtro === f && styles.filterTextActive]}>
                {f === "TODOS" ? "📋 Todos" : f === "PERMITIDO" ? "✅ Permitidos" : "❌ Negados"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.accent} /></View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: (width - contentWidth) / 2, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyText}>Nenhum registro</Text></View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  filterBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  filterText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  filterTextActive: { color: COLORS.accent },
  logCard: {
    flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 14,
    marginBottom: 8, overflow: "hidden", borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  resultBar: { width: 4 },
  barGreen: { backgroundColor: COLORS.success },
  barRed: { backgroundColor: COLORS.danger },
  logContent: { flex: 1, padding: 14 },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  logName: { fontSize: 14, fontWeight: "700", color: COLORS.text, flex: 1 },
  logResult: { fontSize: 12, fontWeight: "700" },
  logDetail: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  logDate: { fontSize: 11, color: COLORS.textMuted },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
