import { Platform } from "react-native";

export function blurActiveElementOnWeb() {
  if (Platform.OS !== "web") return;

  const activeElement = globalThis.document?.activeElement;
  if (activeElement && "blur" in activeElement && typeof activeElement.blur === "function") {
    activeElement.blur();
  }
}
