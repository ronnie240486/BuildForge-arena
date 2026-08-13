"use server";

import { db } from "@/db";
import { projects, generatedFiles, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TEMPLATES, type TemplateDef } from "@/lib/templates";

// Gera um projeto Android mínimo, real e compilável (Java puro, sem XML de layout,
// sem Kotlin/Compose) — não depende de IA nem de internet no worker além do Gradle/SDK
// já instalados. Cada template mostra uma listinha de exemplo relevante ao tema.
function buildAndroidStarter(appName: string, packageName: string, description: string, items: string[]) {
  const pkgPath = packageName.replace(/\./g, "/");
  const itemsJava = items.map((i) => `"${i.replace(/"/g, "'")}"`).join(", ");

  const files: { path: string; content: string }[] = [];

  files.push({
    path: "settings.gradle",
    content: `rootProject.name = "app"\ninclude ':app'\n`,
  });

  files.push({
    path: "build.gradle",
    content:
      `buildscript {\n` +
      `    repositories { google(); mavenCentral() }\n` +
      `    dependencies { classpath 'com.android.tools.build:gradle:8.5.0' }\n` +
      `}\n` +
      `allprojects {\n` +
      `    repositories { google(); mavenCentral() }\n` +
      `}\n`,
  });

  files.push({ path: "gradle.properties", content: `android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2048m\n` });

  files.push({
    path: "app/build.gradle",
    content:
      `apply plugin: 'com.android.application'\n\n` +
      `android {\n` +
      `    namespace '${packageName}'\n` +
      `    compileSdk 34\n` +
      `    defaultConfig {\n` +
      `        applicationId "${packageName}"\n` +
      `        minSdk 24\n` +
      `        targetSdk 34\n` +
      `        versionCode 1\n` +
      `        versionName "1.0.0"\n` +
      `    }\n` +
      `    buildTypes {\n` +
      `        release { minifyEnabled false }\n` +
      `    }\n` +
      `    compileOptions {\n` +
      `        sourceCompatibility JavaVersion.VERSION_17\n` +
      `        targetCompatibility JavaVersion.VERSION_17\n` +
      `    }\n` +
      `}\n`,
  });

  files.push({
    path: "app/src/main/AndroidManifest.xml",
    content:
      `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${packageName}">\n` +
      `    <application android:label="${appName}" android:allowBackup="true"\n` +
      `        android:theme="@android:style/Theme.Material.Light.NoActionBar">\n` +
      `        <activity android:name=".MainActivity" android:exported="true">\n` +
      `            <intent-filter>\n` +
      `                <action android:name="android.intent.action.MAIN" />\n` +
      `                <category android:name="android.intent.category.LAUNCHER" />\n` +
      `            </intent-filter>\n` +
      `        </activity>\n` +
      `    </application>\n` +
      `</manifest>\n`,
  });

  files.push({
    path: `app/src/main/java/${pkgPath}/MainActivity.java`,
    content:
      `package ${packageName};\n\n` +
      `import android.app.Activity;\n` +
      `import android.os.Bundle;\n` +
      `import android.widget.ArrayAdapter;\n` +
      `import android.widget.ListView;\n` +
      `import android.widget.LinearLayout;\n` +
      `import android.widget.TextView;\n` +
      `import android.graphics.Color;\n` +
      `import android.view.Gravity;\n\n` +
      `public class MainActivity extends Activity {\n` +
      `    @Override\n` +
      `    protected void onCreate(Bundle savedInstanceState) {\n` +
      `        super.onCreate(savedInstanceState);\n\n` +
      `        LinearLayout root = new LinearLayout(this);\n` +
      `        root.setOrientation(LinearLayout.VERTICAL);\n` +
      `        root.setBackgroundColor(Color.parseColor("#0F172A"));\n\n` +
      `        TextView title = new TextView(this);\n` +
      `        title.setText("${appName.replace(/"/g, "'")}");\n` +
      `        title.setTextColor(Color.WHITE);\n` +
      `        title.setTextSize(24);\n` +
      `        title.setGravity(Gravity.CENTER);\n` +
      `        title.setPadding(24, 56, 24, 8);\n` +
      `        root.addView(title);\n\n` +
      `        TextView subtitle = new TextView(this);\n` +
      `        subtitle.setText("${description.replace(/"/g, "'")}");\n` +
      `        subtitle.setTextColor(Color.parseColor("#94A3B8"));\n` +
      `        subtitle.setGravity(Gravity.CENTER);\n` +
      `        subtitle.setPadding(32, 0, 32, 24);\n` +
      `        root.addView(subtitle);\n\n` +
      `        String[] items = new String[] { ${itemsJava} };\n` +
      `        ListView list = new ListView(this);\n` +
      `        list.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, items));\n` +
      `        root.addView(list, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));\n\n` +
      `        setContentView(root);\n` +
      `    }\n` +
      `}\n`,
  });

  return files;
}

export async function createProjectFromTemplate(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const templateId = String(formData.get("templateId") || "");
  const customName = String(formData.get("name") || "").trim();

  const template = TEMPLATES.find((t: TemplateDef) => t.id === templateId);
  if (!template) return { error: "Template inválido." };

  const name = customName || `${template.label} App`;
  const packageName = `dev.buildforge.${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "app"}`;
  const files = buildAndroidStarter(name, packageName, template.description, template.sampleItems);

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: me.id,
      name,
      description: template.description,
      source: "manual",
      framework: "android",
      language: "Java",
      packageName,
      appName: name,
      minSdk: 24,
      targetSdk: 34,
      status: "ready",
      // Reaproveita o mesmo mecanismo de entrega dos projetos gerados por IA: o
      // código vive em generatedFiles e o worker baixa via /api/worker/.../source.
      aiGenerated: true,
      detection: {
        framework: "android",
        language: "Java",
        buildSystem: "Gradle (Groovy DSL)",
        files: files.map((f) => ({ path: f.path, role: `template:${template.id}` })),
        dependencies: [],
        missing: [],
        warnings: [],
        detectedSdk: 34,
      },
      healthScore: 100,
    })
    .returning();

  for (const f of files) {
    await db.insert(generatedFiles).values({ projectId: project.id, path: f.path, content: f.content });
  }

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Projeto criado a partir de template",
    message: `${name} foi criado usando o template "${template.label}" — ${files.length} arquivos prontos para build.`,
  });

  redirect(`/app/projects/${project.id}`);
}
