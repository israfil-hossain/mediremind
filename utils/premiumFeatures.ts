import { getMedications, getDoseHistory, DoseHistory, Medication } from "./storage";
import { isPremium } from "./subscription";

export interface AdherenceStats {
  adherenceRate: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  period: "week" | "month" | "year";
}

export async function getAdherenceStats(period: "week" | "month" | "year" = "month"): Promise<AdherenceStats | null> {
  const premium = await isPremium();
  if (!premium) {
    return null;
  }

  try {
    const history = await getDoseHistory();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const filteredHistory = history.filter(
      (dose) => new Date(dose.timestamp) >= startDate
    );

    const totalDoses = filteredHistory.length;
    const takenDoses = filteredHistory.filter((dose) => dose.taken).length;
    const missedDoses = totalDoses - takenDoses;
    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    return {
      adherenceRate: Math.round(adherenceRate * 100) / 100,
      totalDoses,
      takenDoses,
      missedDoses,
      period,
    };
  } catch (error) {
    console.error("Error calculating adherence stats:", error);
    return null;
  }
}

export async function exportDataAsText(): Promise<string> {
  const premium = await isPremium();
  if (!premium) {
    throw new Error("Premium feature: Data export requires Premium subscription");
  }

  try {
    const [medications, history] = await Promise.all([
      getMedications(),
      getDoseHistory(),
    ]);

    let exportText = "MedRemind Data Export\n";
    exportText += "Generated: " + new Date().toLocaleString() + "\n\n";
    exportText += "=".repeat(50) + "\n\n";

    exportText += "MEDICATIONS\n";
    exportText += "=".repeat(50) + "\n\n";
    medications.forEach((med, index) => {
      exportText += `${index + 1}. ${med.name}\n`;
      exportText += `   Dosage: ${med.dosage}\n`;
      exportText += `   Times: ${med.times.join(", ")}\n`;
      exportText += `   Duration: ${med.duration}\n`;
      exportText += `   Start Date: ${new Date(med.startDate).toLocaleDateString()}\n`;
      if (med.notes) {
        exportText += `   Notes: ${med.notes}\n`;
      }
      exportText += "\n";
    });

    exportText += "\n" + "=".repeat(50) + "\n\n";
    exportText += "DOSE HISTORY\n";
    exportText += "=".repeat(50) + "\n\n";

    // Group by date
    const groupedByDate = history.reduce((acc, dose) => {
      const date = new Date(dose.timestamp).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(dose);
      return acc;
    }, {} as Record<string, typeof history>);

    Object.entries(groupedByDate)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .forEach(([date, doses]) => {
        exportText += `${date}\n`;
        doses.forEach((dose) => {
          const medication = medications.find((m) => m.id === dose.medicationId);
          const time = new Date(dose.timestamp).toLocaleTimeString();
          const status = dose.taken ? "✓ Taken" : "✗ Missed";
          exportText += `  ${time} - ${medication?.name || "Unknown"} - ${status}\n`;
        });
        exportText += "\n";
      });

    return exportText;
  } catch (error) {
    console.error("Error exporting data:", error);
    throw error;
  }
}
