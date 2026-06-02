import React, { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { createSubestacao, updateSubestacao, SubestacaoInfo } from "../services/api";
import { COLORS } from "../theme";

function showAlert(t: string, m: string) {
  Platform.OS === "web" ? window.alert(`${t}: ${m}`) : Alert.alert(t, m);
}

interface Props {
  navigation: any;
  route: any;
}

export default function CreateSubestacaoScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const editSub: SubestacaoInfo | undefined = route.params?.subestacao;
  const isEdit = !!editSub;
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(460, width - 32);

  const [nome, setNome] = useState(editSub?.nome || "");
  const [localizacao, setLocalizacao] = useState(editSub?.localizacao || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) {
      showAlert("Atenção", "O nome da subestação é obrigatório");
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await updateSubestacao(token!, editSub!.id, {
          nome: nome.trim(),
          localizacao: localizacao.trim() || undefined,
        });
      } else {
        await createSubestacao(token!, {
          nome: nome.trim(),
          localizacao: localizacao.trim() || undefined,
        });
      }
      showAlert("Sucesso", isEdit ? "Subestação atualizada" : "Subestação criada");
      navigation.goBack();
    } catch (e: any) {
      showAlert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ width: contentWidth, alignSelf: "center" }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backBtn}>← Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{isEdit ? "Editar" : "Nova"} Subestação</Text>
            </View>

            {/* Icon */}
            <View style={styles.iconSection}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>⚡</Text>
              </View>
              <Text style={styles.iconHint}>
                {isEdit ? "Atualize os dados da subestação" : "Cadastre uma nova subestação no sistema"}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>NOME DA SUBESTAÇÃO *</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Subestação Centro"
                  placeholderTextColor="#5a6a80"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>LOCALIZAÇÃO</Text>
                <TextInput
                  style={styles.input}
                  value={localizacao}
                  onChangeText={setLocalizacao}
                  placeholder="Ex: Rua Principal, 123 - Centro"
                  placeholderTextColor="#5a6a80"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isEdit ? "Salvar Alterações" : "Criar Subestação"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backBtn: { fontSize: 15, color: COLORS.accent, fontWeight: "600", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },

  iconSection: {
    alignItems: "center", marginBottom: 24, backgroundColor: COLORS.card,
    borderRadius: 20, padding: 28, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accentGlow,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.accent + "44",
  },
  iconEmoji: { fontSize: 36 },
  iconHint: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },

  formCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  fieldGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 8, shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  saveBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: "800" },
});
