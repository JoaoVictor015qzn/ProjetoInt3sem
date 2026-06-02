import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator, useWindowDimensions, Alert, Platform,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { getSubestacoes, deleteSubestacao, SubestacaoInfo } from "../services/api";
import { COLORS } from "../theme";

function showAlert(title: string, msg: string) {
  Platform.OS === "web" ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);
}

interface Props {
  navigation: any;
}

export default function SubestacoesScreen({ navigation }: Props) {
  const { token, user: currentUser } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(500, width - 32);

  const canEdit = currentUser?.role === "admin" || currentUser?.role === "gestor";

  const [subs, setSubs] = useState<SubestacaoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getSubestacoes(token);
      setSubs(data);
    } catch (e: any) {
      showAlert("Erro", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);
  useEffect(() => {
    const unsub = navigation.addListener("focus", fetchSubs);
    return unsub;
  }, [navigation, fetchSubs]);

  const handleDelete = (sub: SubestacaoInfo) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Desativar "${sub.nome}"?`)) doDelete(sub.id);
    } else {
      Alert.alert("Confirmar", `Desativar "${sub.nome}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Desativar", style: "destructive", onPress: () => doDelete(sub.id) },
      ]);
    }
  };

  const doDelete = async (id: string) => {
    try {
      await deleteSubestacao(token!, id);
      fetchSubs();
    } catch (e: any) {
      showAlert("Erro", e.message);
    }
  };

  const renderItem = ({ item }: { item: SubestacaoInfo }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={canEdit ? 0.7 : 1}
      onPress={() => canEdit && navigation.navigate("CreateSubestacao", { subestacao: item })}
      onLongPress={() => canEdit && handleDelete(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>⚡</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.nome}</Text>
        {item.localizacao ? (
          <Text style={styles.cardLocation}>📍 {item.localizacao}</Text>
        ) : (
          <Text style={styles.cardLocation}>Sem localização definida</Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: item.ativa ? COLORS.successBg : COLORS.dangerBg }]}>
          <View style={[styles.statusDot, { backgroundColor: item.ativa ? COLORS.success : COLORS.danger }]} />
          <Text style={[styles.statusText, { color: item.ativa ? COLORS.success : COLORS.danger }]}>
            {item.ativa ? "Ativa" : "Inativa"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
      <View style={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={styles.title}>Subestações</Text>
        <Text style={styles.subtitle}>{subs.length} cadastradas</Text>
      </View>
      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: (width - contentWidth) / 2, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubs(); }} tintColor={COLORS.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚡</Text>
            <Text style={styles.emptyText}>Nenhuma subestação cadastrada</Text>
            {canEdit && (
              <Text style={styles.emptyHint}>Toque no botão + para adicionar</Text>
            )}
          </View>
        }
      />
      {canEdit && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CreateSubestacao")}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card,
    borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  iconContainer: {
    width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.accentGlow,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  iconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  cardLocation: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  cardRight: { alignItems: "flex-end" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 8, gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  fab: {
    position: "absolute", bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 16, backgroundColor: COLORS.accent, justifyContent: "center",
    alignItems: "center", shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabText: { fontSize: 28, fontWeight: "700", color: COLORS.bg, marginTop: -2 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: "600" },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
});
