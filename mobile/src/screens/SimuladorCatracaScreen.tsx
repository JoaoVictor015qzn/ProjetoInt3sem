import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  useWindowDimensions, ScrollView, Animated,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import {
  getSubestacoes, getUsers, validarAcesso,
  SubestacaoInfo, UserInfo, ValidarAcessoResponse,
} from "../services/api";
import { COLORS } from "../theme";

type ResultadoVisual = {
  acao: string;
  colaborador: string | null;
  motivo: string | null;
} | null;

export default function SimuladorCatracaScreen() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 500);

  const [subestacoes, setSubestacoes] = useState<SubestacaoInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resultado, setResultado] = useState<ResultadoVisual>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [subs, usrs] = await Promise.all([
        getSubestacoes(token),
        getUsers(token),
      ]);
      setSubestacoes(subs);
      setUsers(usrs.filter(u => u.rfid_uid));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const animateResult = (isAllowed: boolean) => {
    flashAnim.setValue(0);
    pulseAnim.setValue(1);

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ),
    ]).start();
  };

  const handleSimular = async () => {
    if (!selectedSub || !selectedUser?.rfid_uid) return;
    setProcessing(true);
    setResultado(null);

    try {
      const res: ValidarAcessoResponse = await validarAcesso({
        rfid_uid: selectedUser.rfid_uid,
        subestacao_id: selectedSub,
        tipo: "ENTRADA",
      });
      const isAllowed = res.acao === "LIBERAR";
      setResultado(res);
      animateResult(isAllowed);
    } catch (e: any) {
      setResultado({ acao: "BLOQUEAR", colaborador: null, motivo: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const resetSimulacao = () => {
    setResultado(null);
    setSelectedUser(null);
    flashAnim.setValue(0);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const isAllowed = resultado?.acao === "LIBERAR";
  const resultColor = isAllowed ? COLORS.success : COLORS.danger;
  const resultBg = isAllowed ? COLORS.successBg : COLORS.dangerBg;

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.bg, isAllowed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: resultado ? bgColor : COLORS.bg }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { width: contentWidth, alignSelf: "center" }]}>
        <Text style={styles.title}>Simulador de Catraca</Text>
        <Text style={styles.subtitle}>Simule a leitura de crachá na subestação</Text>

        {/* Resultado Visual */}
        {resultado && (
          <Animated.View style={[
            styles.resultBox,
            { borderColor: resultColor, backgroundColor: resultBg, transform: [{ scale: pulseAnim }] }
          ]}>
            <Text style={{ fontSize: 56 }}>{isAllowed ? "✅" : "🚫"}</Text>
            <Text style={[styles.resultTitle, { color: resultColor }]}>
              {isAllowed ? "ACESSO LIBERADO" : "ACESSO NEGADO"}
            </Text>
            {resultado.colaborador && (
              <Text style={styles.resultName}>{resultado.colaborador}</Text>
            )}
            {resultado.motivo && (
              <Text style={styles.resultMotivo}>{resultado.motivo}</Text>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={resetSimulacao}>
              <Text style={styles.resetBtnText}>Nova Simulação</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Seleção */}
        {!resultado && (
          <>
            {/* Subestação */}
            <Text style={styles.sectionLabel}>1. Selecione a Subestação</Text>
            <View style={styles.optionsGrid}>
              {subestacoes.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.optionCard,
                    selectedSub === sub.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedSub(sub.id)}
                >
                  <Text style={{ fontSize: 22 }}>⚡</Text>
                  <Text style={[
                    styles.optionName,
                    selectedSub === sub.id && { color: COLORS.accent },
                  ]}>{sub.nome}</Text>
                  <Text style={styles.optionDetail}>{sub.localizacao || "Sem localização"}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Colaborador */}
            <Text style={styles.sectionLabel}>2. Selecione o Colaborador (Crachá RFID)</Text>
            {users.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum colaborador com RFID cadastrado.</Text>
            ) : (
              <View style={styles.optionsGrid}>
                {users.map((usr) => (
                  <TouchableOpacity
                    key={usr.id}
                    style={[
                      styles.optionCard,
                      selectedUser?.id === usr.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedUser(usr)}
                  >
                    <Text style={{ fontSize: 22 }}>👤</Text>
                    <Text style={[
                      styles.optionName,
                      selectedUser?.id === usr.id && { color: COLORS.accent },
                    ]}>{usr.nome}</Text>
                    <Text style={styles.optionDetail}>{usr.rfid_uid}</Text>
                    <View style={[styles.roleBadge]}>
                      <Text style={styles.roleBadgeText}>{usr.role}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Botão Aproximar */}
            <TouchableOpacity
              style={[
                styles.simularBtn,
                (!selectedSub || !selectedUser) && styles.simularBtnDisabled,
              ]}
              onPress={handleSimular}
              disabled={!selectedSub || !selectedUser || processing}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <>
                  <Text style={{ fontSize: 28 }}>📡</Text>
                  <Text style={styles.simularBtnText}>Aproximar Crachá</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { paddingTop: 60, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12, marginTop: 8 },
  optionsGrid: { gap: 10, marginBottom: 20 },
  optionCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  optionCardSelected: {
    borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow,
  },
  optionName: { fontSize: 14, fontWeight: "600", color: COLORS.text, flex: 1 },
  optionDetail: { fontSize: 11, color: COLORS.textMuted },
  roleBadge: {
    backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 6,
  },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.accent, textTransform: "uppercase" },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  simularBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, marginTop: 12,
    shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  simularBtnDisabled: { opacity: 0.4 },
  simularBtnText: { fontSize: 18, fontWeight: "800", color: COLORS.bg },
  resultBox: {
    alignItems: "center", borderRadius: 20, padding: 32,
    borderWidth: 2, marginBottom: 24, marginTop: 12,
  },
  resultTitle: { fontSize: 24, fontWeight: "900", marginTop: 16, letterSpacing: 1 },
  resultName: { fontSize: 18, fontWeight: "600", color: COLORS.text, marginTop: 8 },
  resultMotivo: { fontSize: 14, color: COLORS.textMuted, marginTop: 6, textAlign: "center" },
  resetBtn: {
    marginTop: 24, backgroundColor: COLORS.card,
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  resetBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
});
