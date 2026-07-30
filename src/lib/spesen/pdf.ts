import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DayEntry, DayEntryDraft, RateProfile } from "./types";
import { STATUS_LABEL } from "./types";
import { calcDay, MONTHS, rateFor } from "./calc";

const money = (n: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    n || 0,
  ) + " €";

const HEAD_FILL: [number, number, number] = [31, 45, 74];

function docHeader(doc: jsPDF, title: string, owner: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(owner, 14, 22);
  doc.text(`Erstellt am ${new Date().toLocaleDateString("de-DE")}`, 14, 27);
  doc.setTextColor(0);
}

export type PdfRow = { date: string; weekday: string; entry: DayEntry | DayEntryDraft };

export function exportMonthPdf(
  rows: PdfRow[],
  rates: RateProfile[],
  year: number,
  month: number,
  owner: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  docHeader(doc, `Verpflegungsmehraufwand ${MONTHS[month]} ${year}`, owner);

  let total = 0;
  let reduction = 0;
  const body = rows.map((r) => {
    const res = calcDay(r.entry, rateFor(r.entry, rates));
    total += res.amount;
    reduction += res.reduction;
    const [y, m, d] = r.date.split("-");
    return [
      `${r.weekday} ${d}.${m}.${y}`,
      STATUS_LABEL[r.entry.status],
      r.entry.start_time ?? "",
      r.entry.end_time ?? "",
      r.entry.hours ? String(r.entry.hours).replace(".", ",") : "",
      r.entry.destination ?? "",
      [r.entry.breakfast && "F", r.entry.lunch && "M", r.entry.dinner && "A"]
        .filter(Boolean)
        .join(" "),
      res.base ? money(res.base) : "–",
      res.reduction ? money(res.reduction) : "–",
      res.amount ? money(res.amount) : "–",
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [["Datum", "Art", "Von", "Bis", "Std.", "Ziel", "Mahlz.", "Pauschale", "Kürzung", "Betrag"]],
    body,
    foot: [["Summe", "", "", "", "", "", "", "", money(reduction), money(total)]],
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: HEAD_FILL, textColor: 255 },
    footStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      4: { halign: "right" },
    },
  });

  doc.save(`Spesen_${year}-${String(month + 1).padStart(2, "0")}.pdf`);
}

export function exportYearPdf(
  entries: DayEntry[],
  rates: RateProfile[],
  year: number,
  owner: string,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  docHeader(doc, `Jahresübersicht Verpflegungsmehraufwand ${year}`, owner);

  const statuses = ["travel", "vacation", "holiday", "sick", "office"] as const;
  let total = 0;
  let reduction = 0;
  const body = MONTHS.map((name, m) => {
    const list = entries.filter((e) => Number(e.entry_date.slice(5, 7)) === m + 1);
    let amount = 0;
    let red = 0;
    const counts: Record<string, number> = {};
    for (const e of list) {
      const r = calcDay(e, rateFor(e, rates));
      amount += r.amount;
      red += r.reduction;
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    }
    total += amount;
    reduction += red;
    return [
      name,
      ...statuses.map((s) => String(counts[s] ?? 0)),
      red ? money(red) : "–",
      amount ? money(amount) : "–",
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [["Monat", ...statuses.map((s) => STATUS_LABEL[s]), "Kürzung", "Betrag"]],
    body,
    foot: [
      [
        "Summe",
        ...statuses.map((s) =>
          String(entries.filter((e) => e.status === s).length),
        ),
        money(reduction),
        money(total),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: HEAD_FILL, textColor: 255 },
    footStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: "bold" },
    columnStyles: { 6: { halign: "right" }, 7: { halign: "right" } },
  });

  doc.save(`Spesen_Jahr_${year}.pdf`);
}
