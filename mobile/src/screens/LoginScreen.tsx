import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { login, getMe, UserInfo } from "../services/api";

interface LoginScreenProps {
  onLoginSuccess: (user: UserInfo) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const { width, height } = useWindowDimensions();
  const contentWidth = Math.min(440, Math.max(300, width - 32));

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert("Atenção", "Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      const tokenData = await login(email.trim(), senha);
      const user = await getMe(tokenData.access_token);
      onLoginSuccess(user);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  // ── Tela de login ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.bgOverlay,
          {
            top: -height * 0.3,
            right: -width * 0.3,
            width: height * 0.7,
            height: height * 0.7,
            borderRadius: height * 0.35,
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, { width: contentWidth }]}> 
            {/* Logo / Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <View style={styles.logoBadge}>
                  <Text style={styles.logoIcon}>⚡</Text>
                </View>
              </View>
              <Text style={styles.title}>Controle de Acesso</Text>
              <Text style={styles.subtitle}>Subestação</Text>
            </Animated.View>

            {/* Card de login */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }],
                },
              ]}
            >
              <Text style={styles.cardTitle}>Entrar</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#5a6a80"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SENHA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  placeholderTextColor="#5a6a80"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Acessar</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            <Animated.Text
              style={[
                styles.footer,
                {
                  opacity: cardFade,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              Sistema de Controle de Acesso — v1.0
            </Animated.Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ──

const COLORS = {
  bg: "#0a0e1a",
  card: "#111827",
  cardBorder: "#1e293b",
  accent: "#f59e0b",
  accentDark: "#d97706",
  accentGlow: "rgba(245, 158, 11, 0.15)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  inputBg: "#0f172a",
  inputBorder: "#1e293b",
  inputFocus: "#f59e0b",
  danger: "#ef4444",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bgOverlay: {
    position: "absolute",
    backgroundColor: COLORS.accentGlow,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  content: {
    justifyContent: "center",
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoIcon: {
    fontSize: 34,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 24,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },

  // Button
  loginBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: "#0a0e1a",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 32,
    letterSpacing: 0.5,
  },
});
