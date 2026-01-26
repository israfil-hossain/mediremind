import { getMedications, getDoseHistory, DoseHistory, Medication } from "./storage";

export interface AdherenceStats {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherenceRate: number;
  currentStreak: number;
  longestStreak: number;
}

export interface MedicationAdherence {
  medicationId: string;
  medicationName: string;
  totalDoses: number;
  takenDoses: number;
  adherenceRate: number;
  color: string;
}

export interface WeeklyStats {
  week: string;
  adherenceRate: number;
  totalDoses: number;
  takenDoses: number;
}

export interface TimeAnalysis {
  morning: number; // 6am-12pm
  afternoon: number; // 12pm-6pm
  evening: number; // 6pm-10pm
  night: number; // 10pm-6am
}

/**
 * Calculate overall adherence statistics
 */
export async function calculateAdherenceStats(days: number = 30): Promise<AdherenceStats> {
  const history = await getDoseHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentHistory = history.filter(
    (dose) => new Date(dose.timestamp) >= cutoffDate
  );

  const totalDoses = recentHistory.length;
  const takenDoses = recentHistory.filter((d) => d.taken).length;
  const missedDoses = totalDoses - takenDoses;
  const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

  // Calculate streaks
  const sortedHistory = recentHistory.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const dose of sortedHistory) {
    if (dose.taken) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Current streak is the most recent consecutive taken doses
  for (let i = sortedHistory.length - 1; i >= 0; i--) {
    if (sortedHistory[i].taken) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    totalDoses,
    takenDoses,
    missedDoses,
    adherenceRate: Math.round(adherenceRate * 10) / 10,
    currentStreak,
    longestStreak,
  };
}

/**
 * Get adherence stats per medication
 */
export async function getMedicationAdherenceStats(
  days: number = 30
): Promise<MedicationAdherence[]> {
  const medications = await getMedications();
  const history = await getDoseHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const stats: MedicationAdherence[] = [];

  for (const med of medications) {
    const medHistory = history.filter(
      (dose) =>
        dose.medicationId === med.id &&
        new Date(dose.timestamp) >= cutoffDate
    );

    const totalDoses = medHistory.length;
    const takenDoses = medHistory.filter((d) => d.taken).length;
    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    stats.push({
      medicationId: med.id,
      medicationName: med.name,
      totalDoses,
      takenDoses,
      adherenceRate: Math.round(adherenceRate * 10) / 10,
      color: med.color,
    });
  }

  return stats.sort((a, b) => b.adherenceRate - a.adherenceRate);
}

/**
 * Get weekly adherence trends
 */
export async function getWeeklyTrends(weeks: number = 4): Promise<WeeklyStats[]> {
  const history = await getDoseHistory();
  const stats: WeeklyStats[] = [];

  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekHistory = history.filter((dose) => {
      const doseDate = new Date(dose.timestamp);
      return doseDate >= weekStart && doseDate <= weekEnd;
    });

    const totalDoses = weekHistory.length;
    const takenDoses = weekHistory.filter((d) => d.taken).length;
    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

    stats.unshift({
      week: weekLabel,
      adherenceRate: Math.round(adherenceRate * 10) / 10,
      totalDoses,
      takenDoses,
    });
  }

  return stats;
}

/**
 * Analyze best time of day for taking medications
 */
export async function getTimeOfDayAnalysis(days: number = 30): Promise<TimeAnalysis> {
  const history = await getDoseHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentHistory = history.filter(
    (dose) => dose.taken && new Date(dose.timestamp) >= cutoffDate
  );

  const timeStats: TimeAnalysis = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  for (const dose of recentHistory) {
    const hour = new Date(dose.timestamp).getHours();

    if (hour >= 6 && hour < 12) {
      timeStats.morning++;
    } else if (hour >= 12 && hour < 18) {
      timeStats.afternoon++;
    } else if (hour >= 18 && hour < 22) {
      timeStats.evening++;
    } else {
      timeStats.night++;
    }
  }

  return timeStats;
}

/**
 * Get insights and recommendations based on adherence data
 */
export async function getInsights(): Promise<string[]> {
  const stats = await calculateAdherenceStats(30);
  const medStats = await getMedicationAdherenceStats(30);
  const timeAnalysis = await getTimeOfDayAnalysis(30);
  const insights: string[] = [];

  // Adherence insights
  if (stats.adherenceRate >= 90) {
    insights.push("🎉 Excellent adherence! You're taking your medications consistently.");
  } else if (stats.adherenceRate >= 75) {
    insights.push("👍 Good adherence! Keep up the consistency.");
  } else if (stats.adherenceRate >= 50) {
    insights.push("⚠️ Your adherence could be better. Try setting more reminders.");
  } else {
    insights.push("❗ Low adherence detected. Consider reviewing your medication schedule.");
  }

  // Streak insights
  if (stats.currentStreak >= 7) {
    insights.push(`🔥 You're on a ${stats.currentStreak}-day streak! Amazing!`);
  } else if (stats.currentStreak >= 3) {
    insights.push(`✨ ${stats.currentStreak}-day streak! Keep it going!`);
  }

  // Medication-specific insights
  const poorAdherence = medStats.filter((m) => m.adherenceRate < 70);
  if (poorAdherence.length > 0) {
    insights.push(`📊 ${poorAdherence[0].medicationName} has lower adherence. Consider adjusting reminder times.`);
  }

  // Time of day insights
  const totalTaken = timeAnalysis.morning + timeAnalysis.afternoon + timeAnalysis.evening + timeAnalysis.night;
  if (totalTaken > 0) {
    const bestTime = Object.entries(timeAnalysis).reduce((a, b) => (b[1] > a[1] ? b : a));
    const timeLabel = bestTime[0].charAt(0).toUpperCase() + bestTime[0].slice(1);
    insights.push(`⏰ You take medications most consistently in the ${timeLabel.toLowerCase()}.`);
  }

  // Missed doses insights
  if (stats.missedDoses > stats.takenDoses * 0.2) {
    insights.push("📱 Consider enabling more reminder notifications.");
  }

  return insights;
}
