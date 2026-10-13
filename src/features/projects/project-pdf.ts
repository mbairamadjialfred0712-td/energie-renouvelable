import type { ProjectRecord } from "@/lib/projects.functions";

const cleanFileName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export async function exportProjectPdf(record: ProjectRecord) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const addHeader = () => {
    doc.setFillColor(17, 37, 58);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text("ÉNERGIE RENOUVELABLE — FICHE PROJET", 14, 11);
    doc.setFontSize(9);
    doc.text(`Export vérifiable • ${new Date().toLocaleString("fr-FR")}`, 14, 18);
    doc.setTextColor(30, 41, 59);
  };
  addHeader();
  doc.setFontSize(18);
  doc.text(record.project.name, 14, 36);
  doc.setFontSize(10);
  const description = record.project.description || "Aucune description fournie.";
  doc.text(doc.splitTextToSize(description, 180), 14, 43);

  autoTable(doc, {
    startY: 55,
    head: [["Section", "Champ", "Valeur", "Unité", "Nature", "Source / période", "Qualité"]],
    body: record.fields.map((field) => [field.section, field.label, field.value, field.unit || "—", field.fieldKind === "provided" ? "Donnée fournie" : "Hypothèse", [field.source, field.dataPeriod].filter(Boolean).join(" • ") || "Non renseignée", field.quality || "Non renseignée"]),
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [17, 37, 58] },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 17 }, 4: { cellWidth: 23 }, 5: { cellWidth: 40 }, 6: { cellWidth: 25 } },
    didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) addHeader(); },
    margin: { top: 30, left: 10, right: 10 },
  });

  const latest = record.analyses[0];
  let y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
  const ensureSpace = (needed = 35) => { if (y + needed > 280) { doc.addPage(); addHeader(); y = 34; } };
  ensureSpace(45);
  doc.setFontSize(13); doc.text("Dernière pré-analyse", 14, y + 10); y += 15;
  if (!latest || latest.status !== "completed") {
    doc.setFontSize(9); doc.text("Aucune pré-analyse terminée n’est enregistrée.", 14, y); y += 8;
  } else {
    const groups = [["Informations manquantes", latest.missingInformation], ["Hypothèses déclarées", latest.declaredAssumptions], ["Points à vérifier", latest.verificationPoints]] as const;
    for (const [title, items] of groups) {
      ensureSpace(); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(title, 14, y); doc.setFont("helvetica", "normal"); y += 5;
      for (const item of items) { const lines = doc.splitTextToSize(`• ${item.title} — ${item.explanation}`, 176); ensureSpace(lines.length * 4 + 3); doc.setFontSize(8); doc.text(lines, 16, y); y += lines.length * 4 + 2; }
      if (items.length === 0) { doc.setFontSize(8); doc.text("Aucun élément signalé.", 16, y); y += 6; }
    }
  }

  for (const production of [...record.productions, ...record.energyProductions]) {
    ensureSpace(40); doc.setFontSize(13); doc.text("technology" in production ? `Estimation ${production.technology === "wind" ? "éolienne" : "biomasse"} indicative` : "Estimation photovoltaïque indicative", 14, y + 7); y += 12;
    const snapshot = production.input_snapshot && typeof production.input_snapshot === "object" && !Array.isArray(production.input_snapshot) ? production.input_snapshot : {};
    autoTable(doc, { startY: y, body: [["Production estimée", `${production.production_kwh} kWh/an`], ["Date / version", `${production.created_at} / ${production.engine_version}`], ["Méthode", production.method], ...Object.entries(snapshot).map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")])], styles: { fontSize: 8, overflow: "linebreak" }, margin: { top: 30, left: 14, right: 14 }, didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) addHeader(); } });
    y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  }
  ensureSpace(30); doc.setFontSize(13); doc.text("Historique des modifications", 14, y + 7); y += 12;
  autoTable(doc, {
    startY: y,
    head: [["Date", "Action", "Résumé"]],
    body: record.history.map((event) => [new Date(event.createdAt).toLocaleString("fr-FR"), event.action, event.summary]),
    styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [17, 37, 58] },
    margin: { top: 30, left: 14, right: 14 }, didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) addHeader(); },
  });
  doc.setProperties({ title: `Fiche projet — ${record.project.name}`, subject: "Données, hypothèses, sources et historique", creator: "Énergie Renouvelable" });
  doc.save(`fiche-projet-${cleanFileName(record.project.name) || "projet"}.pdf`);
}