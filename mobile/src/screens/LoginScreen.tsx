import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, Animated,
  ActivityIndicator, Alert, useWindowDimensions, StatusBar,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../theme";

function showAlert(t: string, m: string) {
  Platform.OS === "web" ? window.alert(`${t}: ${m}`) : Alert.alert(t, m);
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(440, Math.max(300, width - 32));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cardFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      showAlert("Atenção", "Preencha email e senha");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), senha);
    } catch (err: any) {
      showAlert("Erro", err.message || "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.bgOverlay, {
        top: -height * 0.3, right: -width * 0.3,
        width: height * 0.7, height: height * 0.7, borderRadius: height * 0.35,
      }]} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.content, { width: contentWidth }]}>
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoBadge}><Text style={{ fontSize: 34 }}>⚡</Text></View>
              <Text style={styles.title}>Controle de Acesso</Text>
              <Text style={styles.subtitle}>SUBESTAÇÃO</Text>
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
              <Text style={styles.cardTitle}>Entrar</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput style={styles.input} placeholder="seu@email.com" placeholderTextColor="#5a6a80"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SENHA</Text>
                <TextInput style={styles.input} placeholder="••••••" placeholderTextColor="#5a6a80"
                  value={senha} onChangeText={setSenha} secureTextEntry />
              </View>
              <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loginBtnText}>Acessar</Text>}
              </TouchableOpacity>
            </Animated.View>

            <Animated.Text style={[styles.footer, { opacity: cardFade, transform: [{ translateY: slideAnim }] }]}>
              Sistema de Controle de Acesso — v1.0
            </Animated.Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  bgOverlay: { position: "absolute", backgroundColor: COLORS.accentGlow },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 24 },
  content: { justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 36 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.accent,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: COLORS.accent, fontWeight: "600", letterSpacing: 3, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text,
  },
  loginBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16,
    alignItems: "center", marginTop: 8, shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  loginBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  footer: { textAlign: "center", color: COLORS.textMuted, fontSize: 12, marginTop: 32, letterSpacing: 0.5 },
});
