import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
  useWindowDimensions, Image, Switch, Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "../contexts/AuthContext";
import {
  createUser, updateUser, uploadFoto, deleteFoto,
  getSubestacoes, getPermissoes, createPermissao, deletePermissao,
  UserInfo, SubestacaoInfo, PermissaoInfo, BASE_URL,
} from "../services/api";
import { COLORS } from "../theme";

function showAlert(t: string, m: string) {
  Platform.OS === "web" ? window.alert(`${t}: ${m}`) : Alert.alert(t, m);
}

const ROLES = ["operador", "supervisor", "gestor", "admin"];

interface Props {
  navigation: any;
  route: any;
}

export default function CreateColaboradorScreen({ navigation, route }: Props) {
  const { token, user: currentUser } = useAuth();
  const editUser: UserInfo | undefined = route.params?.user;
  const isEdit = !!editUser;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "gestor";
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(460, width - 32);

  // Form state
  const [nome, setNome] = useState(editUser?.nome || "");
  const [email, setEmail] = useState(editUser?.email || "");
  const [cpf, setCpf] = useState(editUser?.cpf || "");
  const [cargo, setCargo] = useState(editUser?.cargo || "");
  const [rfidUid, setRfidUid] = useState(editUser?.rfid_uid || "");
  const [role, setRole] = useState(editUser?.role || "operador");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(editUser?.foto_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Permissions state
  const [subestacoes, setSubestacoes] = useState<SubestacaoInfo[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoInfo[]>([]);
  const [permMap, setPermMap] = useState<Record<string, string>>({}); // subId -> permId

  // Fetch subestações e permissões do usuário
  useEffect(() => {
    if (!token || !isEdit) return;
    (async () => {
      try {
        const [subs, perms] = await Promise.all([
          getSubestacoes(token),
          getPermissoes(token),
        ]);
        setSubestacoes(subs);

        const userPerms = perms.filter((p) => p.colaborador_id === editUser!.id && p.ativa);
        setPermissoes(userPerms);

        const map: Record<string, string> = {};
        userPerms.forEach((p) => (map[p.subestacao_id] = p.id));
        setPermMap(map);
      } catch {}
    })();
  }, [token, isEdit]);

  // ── Câmera / Galeria ──────────────────────────────────────────────

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const { status } = await requestCameraPermission();
      if (status !== "granted") {
        showAlert("Permissão negada", "Precisamos de acesso à câmera para tirar a foto.");
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        if (photo && photo.uri) {
          setPhotoUri(photo.uri);
          setShowCamera(false);
        }
      } catch (e: any) {
        showAlert("Erro", "Não foi possível tirar a foto.");
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const removePhoto = async () => {
    if (isEdit && existingPhoto && token) {
      try {
        await deleteFoto(token, editUser!.id);
        setExistingPhoto(null);
      } catch (e: any) {
        showAlert("Erro", e.message);
      }
    }
    setPhotoUri(null);
  };

  // ── Permissão toggle ──────────────────────────────────────────────

  const togglePermissao = async (subId: string) => {
    if (!token || !editUser) return;
    try {
      if (permMap[subId]) {
        await deletePermissao(token, permMap[subId]);
        const newMap = { ...permMap };
        delete newMap[subId];
        setPermMap(newMap);
      } else {
        const perm = await createPermissao(token, {
          colaborador_id: editUser.id,
          subestacao_id: subId,
        });
        setPermMap({ ...permMap, [subId]: perm.id });
      }
    } catch (e: any) {
      showAlert("Erro", e.message);
    }
  };

  // ── Salvar ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!nome.trim() || !email.trim() || !cpf.trim() || !cargo.trim()) {
      showAlert("Atenção", "Preencha todos os campos obrigatórios");
      return;
    }
    if (!isEdit && senha.length < 6) {
      showAlert("Atenção", "Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      let savedUser: UserInfo;

      if (isEdit) {
        const data: Record<string, any> = { nome, email, cpf, cargo, role };
        if (rfidUid.trim()) data.rfid_uid = rfidUid.trim();
        if (senha.trim()) data.senha = senha;
        savedUser = await updateUser(token!, editUser!.id, data);
      } else {
        savedUser = await createUser(token!, {
          nome, email, cpf, cargo, role, senha,
          rfid_uid: rfidUid.trim() || undefined,
        });
      }

      if (photoUri && token) {
        setUploadingPhoto(true);
        await uploadFoto(token, savedUser.id, photoUri);
        setUploadingPhoto(false);
      }

      showAlert("Sucesso", isEdit ? "Colaborador atualizado" : "Colaborador criado");
      navigation.goBack();
    } catch (e: any) {
      showAlert("Erro", e.message);
    } finally {
      setLoading(false);
      setUploadingPhoto(false);
    }
  };

  // ── Foto display ──────────────────────────────────────────────────

  const getPhotoSource = () => {
    if (photoUri) return { uri: photoUri };
    if (existingPhoto) return { uri: `${BASE_URL}${existingPhoto}` };
    return null;
  };

  const photoSource = getPhotoSource();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Modal da Câmera (Tela cheia) */}
      <Modal visible={showCamera} animationType="slide" transparent={false}>
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing="front" ref={cameraRef}>
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraCloseBtn}>
                  <Text style={styles.cameraCloseText}>✕ Cancelar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cameraFooter}>
                <TouchableOpacity onPress={takePicture} style={styles.captureBtn}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ width: contentWidth, alignSelf: "center" }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backBtn}>← Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{isEdit ? "Editar" : "Novo"} Colaborador</Text>
            </View>

            {/* Foto Section */}
            <View style={styles.photoSection}>
              <View style={styles.photoWrapper}>
                {photoSource ? (
                  <Image source={photoSource} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>
                      {nome ? nome.charAt(0).toUpperCase() : "📷"}
                    </Text>
                  </View>
                )}
              </View>
              {isAdmin && (
                <View style={styles.photoBtns}>
                  <TouchableOpacity style={styles.photoBtn} onPress={openCamera}>
                    <Text style={styles.photoBtnText}>📸 Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
                    <Text style={styles.photoBtnText}>🖼 Galeria</Text>
                  </TouchableOpacity>
                  {(photoUri || existingPhoto) && (
                    <TouchableOpacity style={[styles.photoBtn, styles.photoBtnDanger]} onPress={removePhoto}>
                      <Text style={[styles.photoBtnText, { color: COLORS.danger }]}>🗑 Remover</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {uploadingPhoto && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text style={styles.uploadingText}>Enviando foto...</Text>
                </View>
              )}
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <FormField label="NOME *" value={nome} onChangeText={setNome} placeholder="Nome completo" />
              <FormField label="EMAIL *" value={email} onChangeText={setEmail} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
              <FormField label="CPF *" value={cpf} onChangeText={setCpf} placeholder="00000000000" keyboardType="numeric" />
              <FormField label="CARGO *" value={cargo} onChangeText={setCargo} placeholder="Ex: Eletricista" />
              <FormField label="RFID UID" value={rfidUid} onChangeText={setRfidUid} placeholder="Ex: A1B2C3D4 (opcional)" autoCapitalize="characters" />

              {/* Role Selector */}
              <Text style={styles.inputLabel}>ROLE</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormField
                label={isEdit ? "NOVA SENHA (opcional)" : "SENHA *"}
                value={senha} onChangeText={setSenha}
                placeholder={isEdit ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{isEdit ? "Salvar Alterações" : "Criar Colaborador"}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Permissões (só no edit mode, admin only) */}
            {isEdit && isAdmin && subestacoes.length > 0 && (
              <View style={styles.permCard}>
                <Text style={styles.permTitle}>🔐 Permissões de Acesso</Text>
                <Text style={styles.permSubtitle}>Subestações que este colaborador pode acessar</Text>

                {subestacoes.map((sub) => (
                  <View key={sub.id} style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Text style={styles.permName}>⚡ {sub.nome}</Text>
                      {sub.localizacao && (
                        <Text style={styles.permLocation}>{sub.localizacao}</Text>
                      )}
                    </View>
                    <Switch
                      value={!!permMap[sub.id]}
                      onValueChange={() => togglePermissao(sub.id)}
                      trackColor={{ false: COLORS.cardBorder, true: COLORS.accent + "66" }}
                      thumbColor={permMap[sub.id] ? COLORS.accent : COLORS.textMuted}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormField({ label, ...inputProps }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#5a6a80" {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backBtn: { fontSize: 15, color: COLORS.accent, fontWeight: "600", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },

  // Câmera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "space-between", padding: 20 },
  cameraHeader: { paddingTop: Platform.OS === "ios" ? 40 : 20, alignItems: "flex-end" },
  cameraCloseBtn: { padding: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8 },
  cameraCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cameraFooter: { alignItems: "center", paddingBottom: 40 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  captureBtnInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff" },

  // Photo section
  photoSection: {
    alignItems: "center", marginBottom: 20, backgroundColor: COLORS.card,
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  photoWrapper: { marginBottom: 16 },
  photo: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: COLORS.accent },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.inputBg,
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.cardBorder, borderStyle: "dashed",
  },
  photoPlaceholderText: { fontSize: 40, color: COLORS.textMuted },
  photoBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  photoBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  photoBtnDanger: { borderColor: COLORS.danger + "44" },
  photoBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.accent },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  uploadingText: { fontSize: 13, color: COLORS.textMuted },

  // Form
  formCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 16,
  },
  fieldGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: COLORS.text,
  },
  roleRow: { flexDirection: "row", gap: 6, marginBottom: 18, flexWrap: "wrap" },
  roleBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.inputBg,
  },
  roleBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  roleBtnText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 },
  roleBtnTextActive: { color: COLORS.accent },
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 8, shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  saveBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: "800" },

  // Permissões
  permCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  permTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  permSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  permRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  permInfo: { flex: 1 },
  permName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  permLocation: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
