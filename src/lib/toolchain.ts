export interface ToolDefault {
  tool: string;
  label: string;
  version: string;
  required: boolean;
  state: "installed" | "missing" | "required" | "optional";
  env: Record<string, string>;
}

// Phase 3 — default toolchain catalog
export const DEFAULT_TOOLCHAIN: ToolDefault[] = [
  {
    tool: "git",
    label: "Git",
    version: "2.44.0",
    required: true,
    state: "installed",
    env: {},
  },
  {
    tool: "jdk",
    label: "Java Development Kit",
    version: "17.0.11",
    required: true,
    state: "installed",
    env: { JAVA_HOME: "/usr/lib/jvm/java-17-openjdk" },
  },
  {
    tool: "android-sdk",
    label: "Android SDK (Platform Tools)",
    version: "34.0.0",
    required: true,
    state: "installed",
    env: { ANDROID_HOME: "/opt/android-sdk", ANDROID_SDK_ROOT: "/opt/android-sdk" },
  },
  {
    tool: "gradle",
    label: "Gradle",
    version: "8.7",
    required: true,
    state: "installed",
    env: { GRADLE_HOME: "/opt/gradle-8.7" },
  },
  {
    tool: "flutter",
    label: "Flutter SDK",
    version: "3.19.6",
    required: false,
    state: "optional",
    env: { FLUTTER_ROOT: "/opt/flutter" },
  },
  {
    tool: "node",
    label: "Node.js (React Native)",
    version: "20.12.0",
    required: false,
    state: "optional",
    env: { NODE_HOME: "/usr/local/node" },
  },
];
