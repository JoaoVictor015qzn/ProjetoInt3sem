import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  StatusBar, ActivityIndicator, useWindowDimensions, Alert, Platform, Image,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { getUsers, deleteUser, UserInfo, BASE_URL } from "../services/api";
import { COLORS } from "../theme";

function showAlert(title: string, msg: string) {
  Platform.OS === "web" ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);
}

interface Props {
  navigation: any;
}

export default function ColaboradoresScreen({ navigation }: Props) {
  const { token, user: currentUser } = useAuth();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(500, width - 32);

  const canEdit = currentUser?.role === "admin" || currentUser?.role === "gestor";

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getUsers(token);
      setUsers(data);
    } catch (e: any) {
      showAlert("Erro", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    const unsub = navigation.addListener("focus", fetchUsers);
    return unsub;
  }, [navigation, fetchUsers]);

  const handleDelete = (user: UserInfo) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Desativar ${user.nome}?`)) doDelete(user.id);
    } else {
      Alert.alert("Confirmar", `Desativar ${user.nome}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Desativar", style: "destructive", onPress: () => doDelete(user.id) },
      ]);
    }
  };

  const doDelete = async (id: string) => {
    try {
      await deleteUser(token!, id);
      fetchUsers();
    } catch (e: any) {
      showAlert("Erro", e.message);
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "#ef4444", gestor: "#8b5cf6", supervisor: "#3b82f6", operador: "#22c55e",
    };
    return (
      <View style={[styles.badge, { backgroundColor: (colors[role] || COLORS.textMuted) + "22" }]}>
        <Text style={[styles.badgeText, { color: colors[role] || COLORS.textMuted }]}>
          {role.toUpperCase()}
        </Text>
      </View>
    );
  };

  const getGestorName = (gestorId: string | null) => {
    if (!gestorId) return null;
    const gestor = users.find(u => u.id === gestorId);
    return gestor ? gestor.nome : "Desconhecido";
  };

  const renderItem = ({ item }: { item: UserInfo }) => {
    const gestorName = getGestorName(item.gestor_id);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={canEdit ? 0.7 : 1}
        onPress={() => canEdit && navigation.navigate("CreateColaborador", { user: item })}
        onLongPress={() => canEdit && handleDelete(item)}
      >
        {item.foto_url ? (
          <Image source={{ uri: `${BASE_URL}${item.foto_url}` }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.nome}</Text>
          <Text style={styles.cardEmail}>{item.email}</Text>
          <Text style={styles.cardCargo}>{item.cargo}</Text>
          {gestorName && (
            <Text style={styles.gestorText}>Sup/Gestor: {gestorName}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          {roleBadge(item.role)}
          {item.rfid_uid && (
            <Text style={styles.rfidText}>🏷 {item.rfid_uid}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Colaboradores</Text>
        <Text style={styles.subtitle}>{users.length} cadastrados</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: (width - contentWidth) / 2, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={COLORS.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>Nenhum colaborador</Text></View>
        }
      />
      {canEdit && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CreateColaborador")}
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
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.accent,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  avatarImg: {
    width: 46, height: 46, borderRadius: 23, marginRight: 12,
    borderWidth: 2, borderColor: COLORS.accent,
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: COLORS.bg },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardEmail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardCargo: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  cardRight: { alignItems: "flex-end" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  rfidText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  gestorText: { fontSize: 11, color: COLORS.accent, marginTop: 4, fontWeight: "600" },
  fab: {
    position: "absolute", bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 16, backgroundColor: COLORS.accent, justifyContent: "center",
    alignItems: "center", shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabText: { fontSize: 28, fontWeight: "700", color: COLORS.bg, marginTop: -2 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
