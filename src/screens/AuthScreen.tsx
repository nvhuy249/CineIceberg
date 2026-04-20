import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppScreen from "@/src/components/AppScreen";
import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
} from "@/src/constants/designTokens";
import { useAuth } from "@/src/context/AuthContext";

type AuthMode = "login" | "signup";
type TabFrame = { x: number; width: number };

const SWIPE_THRESHOLD = 40;
const TAB_UNDERLINE_PAD = 15;
const TICKET_SIDE_WIDTH = 88;
const FIELD_CLEARANCE_ANDROID = 72;
const FIELD_CLEARANCE_IOS = 40;
const FONT_TICKET_DISPLAY = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});
const FONT_TICKET_SCRIPT = Platform.select({
  ios: "Snell Roundhand",
  android: "serif",
  default: "serif",
});
const FONT_TICKET_META = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export default function AuthScreen() {
  const { signIn, signUp, configError } = useAuth();
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [mode, setMode] = useState<AuthMode>("login");
  const [formWidth, setFormWidth] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccessVisible, setSignupSuccessVisible] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState("");
  const [tabFrames, setTabFrames] = useState<Partial<Record<AuthMode, TabFrame>>>({});
  const [tabLabelFrames, setTabLabelFrames] = useState<Partial<Record<AuthMode, TabFrame>>>({});

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const modeValue = useRef(new Animated.Value(0)).current;
  const underlineLeft = useRef(new Animated.Value(0)).current;
  const underlineWidth = useRef(new Animated.Value(64)).current;
  const keyboardInset = useRef(new Animated.Value(0)).current;
  const keyboardBaseSpace = useRef(new Animated.Value(SPACING["3xl"])).current;
  const keyboardBottomSpace = useMemo(
    () => Animated.add(keyboardInset, keyboardBaseSpace),
    [keyboardBaseSpace, keyboardInset],
  );

  const setModeAnimated = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setFeedback(null);
    Animated.spring(modeValue, {
      toValue: nextMode === "login" ? 0 : 1,
      useNativeDriver: true,
      tension: 92,
      friction: 10,
    }).start();
  }, [modeValue]);

  useEffect(() => {
    const frame = tabFrames[mode];
    if (!frame) return;
    const labelFrame = tabLabelFrames[mode];
    const baseWidth = labelFrame?.width ?? frame.width;
    const baseLeft = frame.x + (labelFrame?.x ?? 0);
    const targetWidth = baseWidth + TAB_UNDERLINE_PAD;
    const targetLeft = baseLeft - TAB_UNDERLINE_PAD / 2;

    Animated.parallel([
      Animated.timing(underlineLeft, {
        toValue: targetLeft,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(underlineWidth, {
        toValue: targetWidth,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [mode, tabFrames, tabLabelFrames, underlineLeft, underlineWidth]);

  const handleTabLayout = (tab: AuthMode, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabFrames((prev) => ({ ...prev, [tab]: { x, width } }));
  };

  const handleTabLabelLayout = (tab: AuthMode, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLabelFrames((prev) => ({ ...prev, [tab]: { x, width } }));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -SWIPE_THRESHOLD) {
            setModeAnimated("signup");
            return;
          }
          if (gesture.dx > SWIPE_THRESHOLD) {
            setModeAnimated("login");
          }
        },
      }),
    [setModeAnimated],
  );

  const formTranslateX = formWidth > 0 ? Animated.multiply(modeValue, -formWidth) : 0;

  const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());
  const ensureFocusedInputVisible = useCallback((delayMs = 0) => {
    setTimeout(() => {
      const focusedInput = TextInput.State.currentlyFocusedInput?.() as
        | { measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void }
        | null;
      if (!focusedInput?.measureInWindow) return;
      if (keyboardHeightRef.current <= 0) return;

      focusedInput.measureInWindow((_, y, __, height) => {
        const windowHeight = Dimensions.get("window").height;
        const keyboardTop = windowHeight - keyboardHeightRef.current;
        const clearance = Platform.OS === "android" ? FIELD_CLEARANCE_ANDROID : FIELD_CLEARANCE_IOS;
        const fieldBottom = y + height;
        const overlap = fieldBottom - (keyboardTop - clearance);

        if (overlap <= 0) return;
        const targetOffset = Math.max(0, scrollOffsetRef.current + overlap + SPACING.md);
        scrollRef.current?.scrollTo({ y: targetOffset, animated: true });
      });
    }, delayMs);
  }, []);

  const handleFieldFocus = useCallback(() => {
    if (keyboardHeightRef.current > 0) {
      ensureFocusedInputVisible(20);
    }
  }, [ensureFocusedInputVisible]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (event) => {
      const nextInset = Math.max(0, event.endCoordinates.height);
      keyboardHeightRef.current = event.endCoordinates.height;
      Animated.timing(keyboardInset, {
        toValue: nextInset,
        duration: event.duration ?? 220,
        useNativeDriver: false,
      }).start();
      ensureFocusedInputVisible(24);
    });

    const onHide = Keyboard.addListener(hideEvent, (event) => {
      keyboardHeightRef.current = 0;
      Animated.timing(keyboardInset, {
        toValue: 0,
        duration: event.duration ?? 180,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [ensureFocusedInputVisible, keyboardInset]);

  const submitLogin = async () => {
    const email = loginEmail.trim();
    if (!validateEmail(email) || loginPassword.length < 6) {
      setFeedback("Use a valid email and a password with at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const { error } = await signIn({ email, password: loginPassword });
      if (error) {
        setFeedback(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSignup = async () => {
    const name = signupName.trim();
    const email = signupEmail.trim();
    if (!name) {
      setFeedback("Add a display name to continue.");
      return;
    }
    if (!validateEmail(email)) {
      setFeedback("Use a valid email address.");
      return;
    }
    if (signupPassword.length < 6) {
      setFeedback("Use a password with at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setFeedback("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const { error } = await signUp({
        email,
        password: signupPassword,
        displayName: name,
      });
      if (error) {
        setFeedback(error);
      } else {
        Keyboard.dismiss();
        setSignupSuccessEmail(email);
        setSignupSuccessVisible(true);
        setSignupName("");
        setSignupEmail("");
        setSignupPassword("");
        setSignupConfirmPassword("");
        setFeedback(null);
        setModeAnimated("login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (configError) {
      setFeedback(configError);
    }
  }, [configError]);

  return (
    <AppScreen
      title="CineIceberg"
      subtitle="Taste-first discovery starts with your account"
      scroll={false}
    >
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? SPACING.sm : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.keyboardScroll}
          contentContainerStyle={styles.keyboardScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <View style={styles.container}>
            <View style={styles.ticketHero}>
              <View style={styles.ticketBorder}>
                <View pointerEvents="none" style={styles.ticketInnerBorder}>
                  <View style={styles.ticketInnerEdgeTop} />
                  <View style={styles.ticketInnerEdgeBottom} />
                  <View style={styles.ticketInnerEdgeLeft} />
                  <View style={styles.ticketInnerEdgeRight} />
                  <View style={[styles.ticketInnerCornerCut, styles.ticketInnerCornerTopLeft]} />
                  <View style={[styles.ticketInnerCornerCut, styles.ticketInnerCornerTopRight]} />
                  <View style={[styles.ticketInnerCornerCut, styles.ticketInnerCornerBottomLeft]} />
                  <View style={[styles.ticketInnerCornerCut, styles.ticketInnerCornerBottomRight]} />
                  <View style={[styles.ticketInnerCornerStroke, styles.ticketInnerCornerTopLeft]} />
                  <View style={[styles.ticketInnerCornerStroke, styles.ticketInnerCornerTopRight]} />
                  <View style={[styles.ticketInnerCornerStroke, styles.ticketInnerCornerBottomLeft]} />
                  <View style={[styles.ticketInnerCornerStroke, styles.ticketInnerCornerBottomRight]} />
                </View>
                <View style={styles.ticketEdgeTop} />
                <View style={styles.ticketEdgeBottom} />
                <View style={styles.ticketEdgeLeft} />
                <View style={styles.ticketEdgeRight} />
                <View style={[styles.ticketCornerCut, styles.ticketCornerTopLeft]} />
                <View style={[styles.ticketCornerCut, styles.ticketCornerTopRight]} />
                <View style={[styles.ticketCornerCut, styles.ticketCornerBottomLeft]} />
                <View style={[styles.ticketCornerCut, styles.ticketCornerBottomRight]} />
                <View style={[styles.ticketCornerStroke, styles.ticketCornerTopLeft]} />
                <View style={[styles.ticketCornerStroke, styles.ticketCornerTopRight]} />
                <View style={[styles.ticketCornerStroke, styles.ticketCornerBottomLeft]} />
                <View style={[styles.ticketCornerStroke, styles.ticketCornerBottomRight]} />
                <View style={[styles.ticketGuide, styles.ticketGuideLeft]} />
                <View style={[styles.ticketGuide, styles.ticketGuideRight]} />

                <View style={styles.ticketInner}>
                  <View style={styles.ticketSide}>
                    <Text style={styles.ticketSideText}>ADMIT{"\n"}ONE</Text>
                  </View>
                  <View style={styles.ticketCenter}>
                    <View style={styles.ticketLogoWatermark}>
                      <Image
                        source={require("../../assets/images/icon.png")}
                        style={styles.ticketLogoImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.ticketSubline}>Movie night special entry</Text>
                    <Text style={styles.ticketTitle} numberOfLines={1} adjustsFontSizeToFit>
                      TICKET
                    </Text>
                    <Text style={styles.ticketCaption}>GOOD FOR ONE ADMISSION</Text>
                  </View>
                  <View style={styles.ticketMeta}>
                    <Text style={styles.ticketMetaText}>SEAT: B12{"\n"}NO: 001245</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.formTicket}>
              <View
                style={styles.tabRow}
              >
                <Pressable
                  style={styles.tabButton}
                  onLayout={(event) => handleTabLayout("login", event)}
                  onPress={() => setModeAnimated("login")}
                >
                  <Text
                    onLayout={(event) => handleTabLabelLayout("login", event)}
                    style={[styles.tabLabel, mode === "login" && styles.tabLabelActive]}
                  >
                    Log In
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.tabButton}
                  onLayout={(event) => handleTabLayout("signup", event)}
                  onPress={() => setModeAnimated("signup")}
                >
                  <Text
                    onLayout={(event) => handleTabLabelLayout("signup", event)}
                    style={[styles.tabLabel, mode === "signup" && styles.tabLabelActive]}
                  >
                    Sign Up
                  </Text>
                </Pressable>
                <Animated.View
                  style={[
                    styles.tabUnderline,
                    {
                      left: underlineLeft,
                      width: underlineWidth,
                    },
                  ]}
                />
              </View>
              <Text style={styles.swipeHintText}>Swipe to switch mode.</Text>

              <View
                style={styles.formViewport}
                onLayout={(event) => setFormWidth(event.nativeEvent.layout.width)}
                {...panResponder.panHandlers}
              >
                <Animated.View
                  style={[
                    styles.formsRow,
                    {
                      width: formWidth > 0 ? formWidth * 2 : "200%",
                      transform: [{ translateX: formTranslateX }],
                    },
                  ]}
                >
                  <View style={[styles.formPanel, formWidth > 0 ? { width: formWidth } : styles.halfPanel]}>
                    <Field
                      label="Email"
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      placeholder="you@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={handleFieldFocus}
                  />
                  <Field
                    label="Password"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="Minimum 6 characters"
                    secureTextEntry
                    onFocus={handleFieldFocus}
                  />
                    <Pressable
                      onPress={submitLogin}
                      disabled={isSubmitting}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        isSubmitting && styles.primaryButtonDisabled,
                        pressed && styles.primaryButtonPressed,
                      ]}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {isSubmitting ? "Signing In..." : "Log In"}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={[styles.formPanel, formWidth > 0 ? { width: formWidth } : styles.halfPanel]}>
                    <Field
                      label="Display Name"
                      value={signupName}
                      onChangeText={setSignupName}
                      placeholder="How should we call you?"
                      onFocus={handleFieldFocus}
                    />
                    <Field
                      label="Email"
                      value={signupEmail}
                      onChangeText={setSignupEmail}
                      placeholder="you@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={handleFieldFocus}
                    />
                    <Field
                      label="Password"
                      value={signupPassword}
                      onChangeText={setSignupPassword}
                      placeholder="Minimum 6 characters"
                      secureTextEntry
                      onFocus={handleFieldFocus}
                    />
                    <Field
                      label="Confirm Password"
                      value={signupConfirmPassword}
                      onChangeText={setSignupConfirmPassword}
                      placeholder="Repeat password"
                      secureTextEntry
                      onFocus={handleFieldFocus}
                    />
                    <Pressable
                      onPress={submitSignup}
                      disabled={isSubmitting}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        isSubmitting && styles.primaryButtonDisabled,
                        pressed && styles.primaryButtonPressed,
                      ]}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {isSubmitting ? "Creating..." : "Create Account"}
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>

              {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
            </View>
          </View>
          <Animated.View style={{ height: keyboardBottomSpace }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        animationType="fade"
        visible={signupSuccessVisible}
        onRequestClose={() => setSignupSuccessVisible(false)}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Account created</Text>
            <Text style={styles.successText}>
              {`Your account for ${signupSuccessEmail} is ready.`}
            </Text>
            <Text style={styles.successTextMuted}>
              If email verification is enabled, check your inbox before logging in.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.successButton, pressed && styles.primaryButtonPressed]}
              onPress={() => setSignupSuccessVisible(false)}
            >
              <Text style={styles.successButtonLabel}>Continue to Log In</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onFocus?: () => void;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  onFocus,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.foreground.tertiary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={onFocus}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  keyboardScrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING["3xl"],
  },
  container: {
    flexGrow: 1,
    gap: SPACING.md,
    paddingBottom: SPACING["2xl"],
  },
  ticketHero: {
    position: "relative",
    borderRadius: 0,
    padding: 0,
  },
  ticketBorder: {
    backgroundColor: "#ece2cd",
    borderRadius: 0,
    overflow: "hidden",
    minHeight: 160,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.24)",
  },
  ticketEdgeTop: {
    position: "absolute",
    top: 0,
    left: 17,
    right: 17,
    height: 2,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.8),
    zIndex: 4,
  },
  ticketEdgeBottom: {
    position: "absolute",
    bottom: 0,
    left: 17,
    right: 17,
    height: 2,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.8),
    zIndex: 4,
  },
  ticketEdgeLeft: {
    position: "absolute",
    left: 0,
    top: 17,
    bottom: 17,
    width: 2,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.8),
    zIndex: 4,
  },
  ticketEdgeRight: {
    position: "absolute",
    right: 0,
    top: 17,
    bottom: 17,
    width: 2,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.8),
    zIndex: 4,
  },
  ticketInnerBorder: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    bottom: 8,
    borderRadius: 0,
    overflow: "hidden",
    zIndex: 2,
  },
  ticketInnerEdgeTop: {
    position: "absolute",
    top: 0,
    left: 11,
    right: 11,
    height: 1.5,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.58),
    zIndex: 3,
  },
  ticketInnerEdgeBottom: {
    position: "absolute",
    bottom: 0,
    left: 11,
    right: 11,
    height: 1.5,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.58),
    zIndex: 3,
  },
  ticketInnerEdgeLeft: {
    position: "absolute",
    left: 0,
    top: 11,
    bottom: 11,
    width: 1.5,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.58),
    zIndex: 3,
  },
  ticketInnerEdgeRight: {
    position: "absolute",
    right: 0,
    top: 11,
    bottom: 11,
    width: 1.5,
    backgroundColor: withOpacity(COLORS.theater.curtainHighlight, 0.58),
    zIndex: 3,
  },
  ticketInnerCornerCut: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ece2cd",
    zIndex: 4,
  },
  ticketInnerCornerStroke: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: withOpacity(COLORS.theater.curtainHighlight, 0.58),
    backgroundColor: "transparent",
    zIndex: 5,
  },
  ticketInnerCornerTopLeft: {
    left: -11,
    top: -11,
  },
  ticketInnerCornerTopRight: {
    right: -11,
    top: -11,
  },
  ticketInnerCornerBottomLeft: {
    left: -11,
    bottom: -11,
  },
  ticketInnerCornerBottomRight: {
    right: -11,
    bottom: -11,
  },
  ticketCornerCut: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background.primary,
    zIndex: 6,
  },
  ticketCornerStroke: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: withOpacity(COLORS.theater.curtainHighlight, 0.84),
    backgroundColor: "transparent",
    zIndex: 7,
  },
  ticketCornerTopLeft: {
    left: -17,
    top: -17,
  },
  ticketCornerTopRight: {
    right: -17,
    top: -17,
  },
  ticketCornerBottomLeft: {
    left: -17,
    bottom: -17,
  },
  ticketCornerBottomRight: {
    right: -17,
    bottom: -17,
  },
  ticketGuide: {
    position: "absolute",
    top: 8,
    bottom: 8,
    width: 0,
    borderLeftWidth: 2,
    borderLeftColor: withOpacity(COLORS.theater.curtainHighlight, 0.55),
    borderStyle: "dashed",
    zIndex: 3,
  },
  ticketGuideLeft: {
    left: TICKET_SIDE_WIDTH,
  },
  ticketGuideRight: {
    right: TICKET_SIDE_WIDTH,
  },
  ticketInner: {
    minHeight: 156,
    flexDirection: "row",
    alignItems: "center",
  },
  ticketSide: {
    width: TICKET_SIDE_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketSideText: {
    color: "#302a25",
    transform: [{ rotate: "-90deg" }],
    textTransform: "uppercase",
    fontFamily: FONT_TICKET_DISPLAY,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1.1,
  },
  ticketCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  ticketSubline: {
    color: "#4f443a",
    fontFamily: FONT_TICKET_SCRIPT,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontStyle: "italic",
    letterSpacing: 0.3,
    transform: [{ rotate: Platform.select({ android: "-2deg", default: "-4deg" }) as string }],
    textAlign: "center",
    width: "100%",
    includeFontPadding: false,
  },
  ticketTitle: {
    color: COLORS.theater.curtainHighlight,
    fontFamily: FONT_TICKET_DISPLAY,
    fontSize: 76,
    lineHeight: 82,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textShadowColor: withOpacity(COLORS.background.primary, 0.15),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
    textAlign: "center",
    width: "100%",
    includeFontPadding: false,
  },
  ticketCaption: {
    color: "#362f29",
    textTransform: "uppercase",
    fontFamily: FONT_TICKET_META,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.6,
    textAlign: "center",
    width: "100%",
    includeFontPadding: false,
  },
  ticketMeta: {
    width: TICKET_SIDE_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  ticketMetaText: {
    color: "#302a25",
    transform: [{ rotate: "-90deg" }],
    textTransform: "uppercase",
    fontFamily: FONT_TICKET_META,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.5,
    textAlign: "center",
    includeFontPadding: false,
  },
  ticketLogoWatermark: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.16,
    zIndex: 0,
  },
  ticketLogoImage: {
    width: 84,
    height: 84,
  },
  formTicket: {
    flexGrow: 1,
    backgroundColor: withOpacity(COLORS.theater.stage, 0.62),
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.28),
    padding: SPACING.padding.card,
    gap: SPACING.md,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(COLORS.theater.marqueeGold, 0.35),
    position: "relative",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.xs,
  },
  tabButton: {
    minHeight: 34,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: SPACING.xs,
  },
  tabLabel: {
    color: withOpacity(COLORS.foreground.secondary, 0.9),
    fontFamily: FONT_TICKET_META,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: COLORS.foreground.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    height: 2.5,
    backgroundColor: COLORS.theater.marqueeGold,
  },
  swipeHintText: {
    color: withOpacity(COLORS.foreground.secondary, 0.86),
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: 0.2,
  },
  formViewport: {
    flex: 1,
    minHeight: 320,
    overflow: "hidden",
  },
  formsRow: {
    flexDirection: "row",
  },
  formPanel: {
    gap: SPACING.sm,
  },
  halfPanel: {
    width: "50%",
  },
  field: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    color: withOpacity(COLORS.theater.marqueeGold, 0.95),
    fontFamily: FONT_TICKET_META,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 40,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(COLORS.theater.marqueeGold, 0.28),
    backgroundColor: withOpacity("#0b0b0e", 0.36),
    paddingHorizontal: SPACING.sm,
    color: COLORS.foreground.primary,
    fontFamily: FONT_TICKET_META,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  primaryButton: {
    marginTop: SPACING.sm,
    minHeight: 42,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.52),
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.2),
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonLabel: {
    color: COLORS.foreground.primary,
    fontFamily: FONT_TICKET_META,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  feedbackText: {
    color: COLORS.status.warning,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(COLORS.background.overlay, 0.9),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.padding.page,
  },
  successCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.4),
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.padding.card,
    gap: SPACING.sm,
  },
  successTitle: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  successText: {
    color: COLORS.foreground.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  successTextMuted: {
    color: COLORS.foreground.secondary,
    fontFamily: TYPOGRAPHY.fontFamily.sans,
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  successButton: {
    marginTop: SPACING.xs,
    minHeight: 40,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
    borderColor: withOpacity(COLORS.theater.marqueeGold, 0.52),
    backgroundColor: withOpacity(COLORS.theater.marqueeGold, 0.2),
    justifyContent: "center",
    alignItems: "center",
  },
  successButtonLabel: {
    color: COLORS.foreground.primary,
    fontFamily: FONT_TICKET_META,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
