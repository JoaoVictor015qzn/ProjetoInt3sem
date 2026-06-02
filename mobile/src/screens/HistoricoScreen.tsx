import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator, useWindowDimensions, Modal, ScrollView,
  Linking, Platform
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from "../contexts/AuthContext";
import { getLogs, getUsers, getSubestacoes, LogAcessoInfo, BASE_URL } from "../services/api";
import { COLORS } from "../theme";

type Filtro = "TODOS" | "PERMITIDO" | "NEGADO";

const WebDatePicker = ({ value, onChange }: any) => {
  if (Platform.OS !== 'web') return null;
  return (React as any).createElement('input', {
    type: 'date',
    value: value ? value.toISOString().split('T')[0] : '',
    onChange: (e: any) => {
      if (e.target.value) {
        const dateParts = e.target.value.split('-');
        onChange(new Date(dateParts[0], dateParts[1] - 1, dateParts[2]));
      } else {
        onChange(null);
      }
    },
    style: {
      flex: 1, backgroundColor: COLORS.inputBg, borderColor: COLORS.inputBorder,
      borderWidth: 1, borderStyle: 'solid', borderRadius: 8, padding: '10px 12px',
      color: COLORS.text, fontSize: 12, fontWeight: '600', outline: 'none', fontFamily: 'inherit'
    }
  });
};

function SelectModal({ visible, onClose, title, items, onSelect, selectedId }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <TouchableOpacity 
              style={[styles.modalItem, !selectedId && styles.modalItemActive]}
              onPress={() => { onSelect(null); onClose(); }}
            >
              <Text style={[styles.modalItemText, !selectedId && {color: COLORS.accent}]}>Todos</Text>
            </TouchableOpacity>
            {items.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.modalItem, selectedId === item.id && styles.modalItemActive]}
                onPress={() => { onSelect(item.id); onClose(); }}
              >
                <Text style={[styles.modalItemText, selectedId === item.id && {color: COLORS.accent}]}>
                  {item.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function HistoricoScreen() {
  const { token, user: currentUser } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(500, width - 32);

  const [logs, setLogs] = useState<LogAcessoInfo[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [filtroUser, setFiltroUser] = useState<string | null>(null);
  const [filtroSub, setFiltroSub] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState<"inicio" | "fim" | null>(null);
  
  const [users, setUsersList] = useState<any[]>([]);
  const [subs, setSubsList] = useState<any[]>([]);
  
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [subMap, setSubMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [modalUserVisible, setModalUserVisible] = useState(false);
  const [modalSubVisible, setModalSubVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const params: any = { limit: 200 };
      if (filtro !== "TODOS") params.resultado = filtro;
      if (filtroUser) params.colaborador_id = filtroUser;
      if (filtroSub) params.subestacao_id = filtroSub;
      if (dataInicio) params.data_inicio = dataInicio.toISOString();
      if (dataFim) params.data_fim = dataFim.toISOString();

      const [logsData, usersData, subsData] = await Promise.all([
        getLogs(token, params),
        getUsers(token).catch(() => []),
        getSubestacoes(token).catch(() => []),
      ]);
      setLogs(logsData);
      
      setUsersList(usersData);
      setSubsList(subsData);
      
      const um: Record<string, string> = {};
      usersData.forEach((u: any) => (um[u.id] = u.nome));
      setUserMap(um);
      
      const sm: Record<string, string> = {};
      subsData.forEach((s: any) => (sm[s.id] = s.nome));
      setSubMap(sm);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filtro, filtroUser, filtroSub, dataInicio, dataFim]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };
  
  const handleExport = (type: "excel" | "pdf") => {
    let url = `${BASE_URL}/logs/export/${type}?token=${token}`;
    if (filtro !== "TODOS") url += `&resultado=${filtro}`;
    if (filtroUser) url += `&colaborador_id=${filtroUser}`;
    if (filtroSub) url += `&subestacao_id=${filtroSub}`;
    if (dataInicio) url += `&data_inicio=${dataInicio.toISOString()}`;
    if (dataFim) url += `&data_fim=${dataFim.toISOString()}`;
    Linking.openURL(url);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.title}>Histórico</Text>
            <Text style={styles.subtitle}>{logs.length} registros</Text>
          </View>
          {currentUser?.role !== 'operador' && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport("excel")}>
                <Text style={styles.exportBtnText}>📊 Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport("pdf")}>
                <Text style={styles.exportBtnText}>📄 PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filtros Status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
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
        </ScrollView>
        
        {/* Filtros Avançados */}
        {currentUser?.role !== 'operador' && (
          <>
            <View style={styles.advancedFilters}>
              <TouchableOpacity style={styles.advFilterBtn} onPress={() => setModalSubVisible(true)}>
                <Text style={styles.advFilterText} numberOfLines={1}>
                  ⚡ {filtroSub ? subMap[filtroSub] : "Subestação"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.advFilterBtn} onPress={() => setModalUserVisible(true)}>
                <Text style={styles.advFilterText} numberOfLines={1}>
                  👥 {filtroUser ? userMap[filtroUser] : "Colaborador"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.advancedFilters}>
              {Platform.OS === 'web' ? (
                <>
                  <WebDatePicker value={dataInicio} onChange={setDataInicio} />
                  <View style={{ width: 8 }} />
                  <WebDatePicker value={dataFim} onChange={setDataFim} />
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.advFilterBtn} onPress={() => setShowPicker("inicio")}>
                    <Text style={styles.advFilterText} numberOfLines={1}>
                      📅 {dataInicio ? `De: ${dataInicio.toLocaleDateString("pt-BR")}` : "Data Início"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.advFilterBtn} onPress={() => setShowPicker("fim")}>
                    <Text style={styles.advFilterText} numberOfLines={1}>
                      📅 {dataFim ? `Até: ${dataFim.toLocaleDateString("pt-BR")}` : "Data Fim"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {(dataInicio || dataFim || filtroSub || filtroUser) && (
                <TouchableOpacity style={[styles.clearBtn, {marginLeft: 8}]} onPress={() => { setDataInicio(null); setDataFim(null); setFiltroSub(null); setFiltroUser(null); }}>
                  <Text style={styles.clearBtnText}>X</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
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
            <View style={styles.empty}><Text style={styles.emptyText}>Nenhum registro encontrado</Text></View>
          }
        />
      )}
      
      <SelectModal 
        visible={modalSubVisible} onClose={() => setModalSubVisible(false)}
        title="Filtrar por Subestação" items={subs} selectedId={filtroSub} onSelect={setFiltroSub}
      />
      <SelectModal 
        visible={modalUserVisible} onClose={() => setModalUserVisible(false)}
        title="Filtrar por Colaborador" items={users} selectedId={filtroUser} onSelect={setFiltroUser}
      />

      {showPicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={showPicker === "inicio" ? (dataInicio || new Date()) : (dataFim || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(null);
            if (event.type === "set" && selectedDate) {
              if (showPicker === "inicio") setDataInicio(selectedDate);
              else setDataFim(selectedDate);
            }
          }}
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
  exportBtn: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.accent,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10
  },
  exportBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 13 },
  filterRow: { flexDirection: "row", marginTop: 16, marginBottom: 12, paddingBottom: 4 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  filterBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  filterText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  filterTextActive: { color: COLORS.accent },
  advancedFilters: { flexDirection: "row", gap: 8, marginBottom: 8 },
  advFilterBtn: {
    flex: 1, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8,
  },
  advFilterText: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
  clearBtn: {
    backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, justifyContent: "center"
  },
  clearBtnText: { color: "#fff", fontWeight: "bold" },
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
  
  // Modal styles
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.cardBorder },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 16, textAlign: "center" },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  modalItemActive: { backgroundColor: COLORS.accentGlow, borderRadius: 8 },
  modalItemText: { fontSize: 15, color: COLORS.text, textAlign: "center", fontWeight: "600" },
  modalCloseBtn: { marginTop: 16, backgroundColor: COLORS.inputBg, padding: 14, borderRadius: 10, alignItems: "center" },
  modalCloseText: { color: COLORS.text, fontWeight: "700" }
});
