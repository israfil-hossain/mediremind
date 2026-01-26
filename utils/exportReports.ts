import * as FileSystem from "expo-file-system";
import { Share, Platform, Alert } from "react-native";
import { getMedications, getDoseHistory, getPrescriptions } from "./storage";
import { calculateAdherenceStats, getMedicationAdherenceStats, getWeeklyTrends } from "./analytics";

export interface ExportOptions {
  format: "pdf" | "csv" | "json";
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMedications?: boolean;
  includeAdherence?: boolean;
  includePrescriptions?: boolean;
}

/**
 * Generate CSV report
 */
async function generateCSVReport(): Promise<string> {
  const medications = await getMedications();
  const history = await getDoseHistory();
  const stats = await calculateAdherenceStats(30);

  let csv = "Medicine Reminder App - Report\n\n";
  csv += "MEDICATIONS\n";
  csv += "Name,Dosage,Times,Start Date,Duration,Supply\n";

  medications.forEach((med) => {
    csv += `"${med.name}","${med.dosage}","${med.times.join(", ")}","${med.startDate}","${med.duration}","${med.currentSupply}/${med.totalSupply}"\n`;
  });

  csv += "\n\nDOSE HISTORY (Last 30 Days)\n";
  csv += "Date,Time,Medication ID,Status\n";

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  history
    .filter((dose) => new Date(dose.timestamp) >= cutoffDate)
    .forEach((dose) => {
      const date = new Date(dose.timestamp);
      const medication = medications.find((m) => m.id === dose.medicationId);
      csv += `"${date.toLocaleDateString()}","${date.toLocaleTimeString()}","${medication?.name || dose.medicationId}","${dose.taken ? "Taken" : "Missed"}"\n`;
    });

  csv += "\n\nADHERENCE STATISTICS\n";
  csv += `Total Doses,${stats.totalDoses}\n`;
  csv += `Taken,${stats.takenDoses}\n`;
  csv += `Missed,${stats.missedDoses}\n`;
  csv += `Adherence Rate,${stats.adherenceRate}%\n`;
  csv += `Current Streak,${stats.currentStreak} days\n`;
  csv += `Longest Streak,${stats.longestStreak} days\n`;

  return csv;
}

/**
 * Generate JSON report
 */
async function generateJSONReport(): Promise<string> {
  const medications = await getMedications();
  const history = await getDoseHistory();
  const prescriptions = await getPrescriptions();
  const adherenceStats = await calculateAdherenceStats(30);
  const medicationStats = await getMedicationAdherenceStats(30);
  const weeklyTrends = await getWeeklyTrends(4);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const report = {
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: cutoffDate.toISOString(),
      end: new Date().toISOString(),
    },
    medications: medications,
    doseHistory: history.filter((dose) => new Date(dose.timestamp) >= cutoffDate),
    prescriptions: prescriptions,
    statistics: {
      overall: adherenceStats,
      byMedication: medicationStats,
      weeklyTrends: weeklyTrends,
    },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generate PDF-like HTML report (can be converted to PDF later)
 */
async function generateHTMLReport(): Promise<string> {
  const medications = await getMedications();
  const history = await getDoseHistory();
  const adherenceStats = await calculateAdherenceStats(30);
  const medicationStats = await getMedicationAdherenceStats(30);
  const weeklyTrends = await getWeeklyTrends(4);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medication Report</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    h1 {
      color: #1a8e2d;
      border-bottom: 3px solid #1a8e2d;
      padding-bottom: 10px;
    }
    h2 {
      color: #146922;
      margin-top: 30px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #1a8e2d;
    }
    .stat-label {
      font-weight: bold;
      color: #666;
    }
    .stat-value {
      font-size: 24px;
      color: #1a8e2d;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #1a8e2d;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .adherence-high {
      color: #4CAF50;
      font-weight: bold;
    }
    .adherence-medium {
      color: #FF9800;
      font-weight: bold;
    }
    .adherence-low {
      color: #F44336;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Medication Adherence Report</h1>
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  </div>

  <h2>📈 Overall Statistics (Last 30 Days)</h2>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
    <div class="stat-card">
      <div class="stat-label">Total Doses</div>
      <div class="stat-value">${adherenceStats.totalDoses}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Adherence Rate</div>
      <div class="stat-value">${adherenceStats.adherenceRate}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Current Streak</div>
      <div class="stat-value">${adherenceStats.currentStreak} days</div>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
    <div class="stat-card">
      <div class="stat-label">Taken</div>
      <div class="stat-value" style="color: #4CAF50;">${adherenceStats.takenDoses}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Missed</div>
      <div class="stat-value" style="color: #F44336;">${adherenceStats.missedDoses}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Longest Streak</div>
      <div class="stat-value">${adherenceStats.longestStreak} days</div>
    </div>
  </div>

  <h2>💊 Medications</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Dosage</th>
        <th>Schedule</th>
        <th>Supply</th>
      </tr>
    </thead>
    <tbody>
      ${medications
        .map(
          (med) => `
        <tr>
          <td><strong>${med.name}</strong></td>
          <td>${med.dosage}</td>
          <td>${med.times.join(", ")}</td>
          <td>${med.currentSupply}/${med.totalSupply}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <h2>📊 Adherence by Medication</h2>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Total Doses</th>
        <th>Taken</th>
        <th>Adherence Rate</th>
      </tr>
    </thead>
    <tbody>
      ${medicationStats
        .map((stat) => {
          const adherenceClass =
            stat.adherenceRate >= 90
              ? "adherence-high"
              : stat.adherenceRate >= 70
              ? "adherence-medium"
              : "adherence-low";
          return `
        <tr>
          <td><strong>${stat.medicationName}</strong></td>
          <td>${stat.totalDoses}</td>
          <td>${stat.takenDoses}</td>
          <td class="${adherenceClass}">${stat.adherenceRate}%</td>
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <h2>📅 Weekly Trends</h2>
  <table>
    <thead>
      <tr>
        <th>Week</th>
        <th>Total Doses</th>
        <th>Taken</th>
        <th>Adherence</th>
      </tr>
    </thead>
    <tbody>
      ${weeklyTrends
        .map(
          (week) => `
        <tr>
          <td>${week.week}</td>
          <td>${week.totalDoses}</td>
          <td>${week.takenDoses}</td>
          <td>${week.adherenceRate}%</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <p>📱 Medicine Reminder App</p>
    <p>This report is for personal use only. Please consult your healthcare provider for medical advice.</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Export report and share
 */
export async function exportReport(format: "csv" | "json" | "html" = "html"): Promise<void> {
  try {
    let content: string;
    let fileName: string;

    const dateStr = new Date().toISOString().split("T")[0];

    switch (format) {
      case "csv":
        content = await generateCSVReport();
        fileName = `medication-report-${dateStr}.csv`;
        break;
      case "json":
        content = await generateJSONReport();
        fileName = `medication-report-${dateStr}.json`;
        break;
      case "html":
      default:
        content = await generateHTMLReport();
        fileName = `medication-report-${dateStr}.html`;
        break;
    }

    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Use React Native Share API
    if (Platform.OS === 'android') {
      // For Android, share the content as text since file sharing is complex
      await Share.share({
        message: content,
        title: `Medication Report - ${dateStr}`,
      });

      Alert.alert(
        "Report Saved",
        `Report saved to:\n${fileUri}\n\nYou can also find it in your app's documents folder.`,
        [{ text: "OK" }]
      );
    } else {
      // For iOS, share the file URI
      await Share.share({
        url: fileUri,
        message: `Medication Report - ${dateStr}`,
      });
    }
  } catch (error: any) {
    console.error("Export error:", error);
    if (error.message === 'User did not share') {
      // User cancelled, this is ok
      return;
    }
    throw error;
  }
}
