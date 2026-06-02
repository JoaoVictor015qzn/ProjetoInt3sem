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
  const [permMap, setPermMap] = useState<Record<string, PermissaoInfo>>({}); // subId -> PermissaoInfo

  // Modal permissions state
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedSubestacao, setSelectedSubestacao] = useState<SubestacaoInfo | null>(null);
  const [permType, setPermType] = useState<"permanente" | "temporario">("permanente");
  const [validadeInicioStr, setValidadeInicioStr] = useState("");
  const [validadeFimStr, setValidadeFimStr] = useState("");

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

        const map: Record<string, PermissaoInfo> = {};
        userPerms.forEach((p) => (map[p.subestacao_id] = p));
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

  // ── Permissão toggle & Modal Helpers ──────────────────────────────

  const formatDateToBR = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const parseBRToISO = (brStr: string): string | null => {
    const clean = brStr.trim();
    if (!clean) return null;
    const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if (!match) return null;
    const [_, day, month, year, hour = "00", minute = "00"] = match;
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const applyShortcut = (days: number) => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);

    const pad = (n: number) => String(n).padStart(2, "0");
    const format = (d: Date) =>
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setValidadeInicioStr(format(start));
    setValidadeFimStr(format(end));
  };

  const togglePermissao = async (subId: string) => {
    if (!token || !editUser) return;
    try {
      if (permMap[subId]) {
        await deletePermissao(token, permMap[subId].id);
        const newMap = { ...permMap };
        delete newMap[subId];
        setPermMap(newMap);
      } else {
        const sub = subestacoes.find((s) => s.id === subId);
        if (sub) {
          setSelectedSubestacao(sub);
          setPermType("permanente");
          setValidadeInicioStr("");
          setValidadeFimStr("");
          setShowPermModal(true);
        }
      }
    } catch (e: any) {
      showAlert("Erro", e.message);
    }
  };

  const savePermissaoModal = async () => {
    if (!token || !editUser || !selectedSubestacao) return;

    let validade_inicio = null;
    let validade_fim = null;

    if (permType === "temporario") {
      const parsedInicio = parseBRToISO(validadeInicioStr);
      const parsedFim = parseBRToISO(validadeFimStr);

      if (!parsedInicio) {
        showAlert("Erro de Formato", "A data de início deve estar no formato DD/MM/AAAA HH:MM");
        return;
      }
      if (!parsedFim) {
        showAlert("Erro de Formato", "A data de expiração deve estar no formato DD/MM/AAAA HH:MM");
        return;
      }

      const dInicio = new Date(parsedInicio);
      const dFim = new Date(parsedFim);
      if (dFim <= dInicio) {
        showAlert("Data Inválida", "A data de expiração deve ser após a data de início.");
        return;
      }

      validade_inicio = parsedInicio;
      validade_fim = parsedFim;
    }

    try {
      setLoading(true);
      if (permMap[selectedSubestacao.id]) {
        await deletePermissao(token, permMap[selectedSubestacao.id].id);
      }

      const perm = await createPermissao(token, {
        colaborador_id: editUser.id,
        subestacao_id: selectedSubestacao.id,
        validade_inicio,
        validade_fim,
      });

      setPermMap({ ...permMap, [selectedSubestacao.id]: perm });
      setShowPermModal(false);
      setSelectedSubestacao(null);
    } catch (e: any) {
      showAlert("Erro", e.message);
    } finally {
      setLoading(false);
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
                <Text style={styles.permSubtitle}>
                  Toque na subestação ativa para configurar seu período de validade
                </Text>

                {subestacoes.map((sub) => (
                  <View key={sub.id} style={styles.permRow}>
                    <TouchableOpacity
                      style={styles.permInfo}
                      activeOpacity={permMap[sub.id] ? 0.7 : 1}
                      onPress={() => {
                        if (permMap[sub.id]) {
                          const perm = permMap[sub.id];
                          setSelectedSubestacao(sub);
                          if (perm.validade_inicio || perm.validade_fim) {
                            setPermType("temporario");
                            setValidadeInicioStr(formatDateToBR(perm.validade_inicio));
                            setValidadeFimStr(formatDateToBR(perm.validade_fim));
                          } else {
                            setPermType("permanente");
                            setValidadeInicioStr("");
                            setValidadeFimStr("");
                          }
                          setShowPermModal(true);
                        }
                      }}
                    >
                      <Text style={styles.permName}>⚡ {sub.nome}</Text>
                      {sub.localizacao && (
                        <Text style={styles.permLocation}>{sub.localizacao}</Text>
                      )}
                      {permMap[sub.id] && (
                        <Text style={styles.permPeriodText}>
                          {permMap[sub.id].validade_inicio || permMap[sub.id].validade_fim ? (
                            `⏱️ De: ${formatDateToBR(permMap[sub.id].validade_inicio) || "Início imediato"}\n⏱️ Até: ${formatDateToBR(permMap[sub.id].validade_fim) || "Sem expiração"}`
                          ) : (
                            "🟢 Acesso por tempo indeterminado"
                          )}
                        </Text>
                      )}
                    </TouchableOpacity>
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

            {/* Modal de Concessão de Acesso */}
            <Modal visible={showPermModal} animationType="fade" transparent={true}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { width: contentWidth }]}>
                  <Text style={styles.modalTitle}>🔐 Configurar Acesso</Text>
                  <Text style={styles.modalSubtitle}>
                    Defina as condições de acesso para a subestação:{"\n"}
                    <Text style={{ fontWeight: "700", color: COLORS.text }}>
                      ⚡ {selectedSubestacao?.nome}
                    </Text>
                  </Text>

                  {/* Selector de Tipo */}
                  <View style={styles.typeSelectorRow}>
                    <TouchableOpacity
                      style={[styles.typeBtn, permType === "permanente" && styles.typeBtnActive]}
                      onPress={() => setPermType("permanente")}
                    >
                      <Text style={[styles.typeBtnText, permType === "permanente" && styles.typeBtnTextActive]}>
                        Permanente
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, permType === "temporario" && styles.typeBtnActive]}
                      onPress={() => setPermType("temporario")}
                    >
                      <Text style={[styles.typeBtnText, permType === "temporario" && styles.typeBtnTextActive]}>
                        Temporário
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {permType === "temporario" && (
                    <View style={styles.dateFields}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.inputLabel}>INÍCIO (DD/MM/AAAA HH:MM)</Text>
                        <TextInput
                          style={styles.input}
                          value={validadeInicioStr}
                          onChangeText={setValidadeInicioStr}
                          placeholder="Ex: 01/06/2026 08:00"
                          placeholderTextColor="#5a6a80"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.inputLabel}>EXPIRAÇÃO (DD/MM/AAAA HH:MM)</Text>
                        <TextInput
                          style={styles.input}
                          value={validadeFimStr}
                          onChangeText={setValidadeFimStr}
                          placeholder="Ex: 08/06/2026 18:00"
                          placeholderTextColor="#5a6a80"
                        />
                      </View>

                      {/* Shortcuts */}
                      <Text style={[styles.inputLabel, { marginBottom: 6 }]}>ATALHOS DE EXPIRAÇÃO</Text>
                      <View style={styles.shortcutsRow}>
                        <TouchableOpacity style={styles.shortcutBtn} onPress={() => applyShortcut(1)}>
                          <Text style={styles.shortcutText}>+24 horas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shortcutBtn} onPress={() => applyShortcut(7)}>
                          <Text style={styles.shortcutText}>+7 Dias</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shortcutBtn} onPress={() => applyShortcut(30)}>
                          <Text style={styles.shortcutText}>+30 Dias</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.modalBtns}>
                    <TouchableOpacity
                      style={styles.modalBtnCancel}
                      onPress={() => {
                        setShowPermModal(false);
                        setSelectedSubestacao(null);
                      }}
                    >
                      <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalBtnConfirm}
                      onPress={savePermissaoModal}
                    >
                      <Text style={styles.modalBtnConfirmText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

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
  permPeriodText: { fontSize: 11, color: COLORS.accent, marginTop: 4, fontWeight: "600", lineHeight: 15 },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.cardBorder, shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },
  typeSelectorRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.cardBorder, backgroundColor: COLORS.inputBg, alignItems: "center",
  },
  typeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow },
  typeBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  typeBtnTextActive: { color: COLORS.accent },
  dateFields: { marginBottom: 20 },
  shortcutsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 },
  shortcutBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  shortcutText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalBtnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.inputBg,
    borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: "center",
  },
  modalBtnCancelText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" },
  modalBtnConfirm: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.accent,
    alignItems: "center", shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  modalBtnConfirmText: { color: COLORS.bg, fontSize: 14, fontWeight: "800" },
});
