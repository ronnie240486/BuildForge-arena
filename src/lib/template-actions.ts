"use server";

import { db } from "@/db";
import { projects, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { detectFramework, healthFromDetection } from "@/lib/engine";
import { redirect } from "next/navigation";
import { TEMPLATES } from "@/lib/templates";

export async function createProjectFromTemplate(prevState: unknown, formData: FormData) {
  const me = await requireUser();
  const templateId = String(formData.get("templateId") || "");
  const customName = String(formData.get("name") || "").trim();

  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return { error: "Template inválido." };

  const name = customName || `${template.label} App`;
  const detection = detectFramework(`template:${template.id}`, name);
  // Force the template's intended framework instead of the generic detector guess.
  detection.framework = template.framework;

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: me.id,
      name,
      description: template.description,
      source: "manual",
      framework: template.framework,
      language: template.framework === "flutter" ? "Dart" : template.framework === "reactnative" ? "TypeScript" : "Kotlin",
      packageName: `dev.buildforge.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      minSdk: 21,
      targetSdk: 34,
      detection,
      healthScore: healthFromDetection(detection),
      status: "ready",
    })
    .returning();

  await db.insert(notifications).values({
    userId: me.id,
    type: "system",
    title: "Projeto criado a partir de template",
    message: `${name} foi criado usando o template "${template.label}".`,
  });

  redirect(`/app/projects/${project.id}`);
}
