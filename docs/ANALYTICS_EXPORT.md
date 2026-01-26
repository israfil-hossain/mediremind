# Analytics Dashboard & Export Reports

Complete analytics and reporting features for tracking medication adherence.

## 📊 Analytics Dashboard

### Features

#### 1. **Overall Performance Metrics**
- **Adherence Rate**: Percentage of doses taken on time
- **Total Doses**: Total number of scheduled doses
- **Current Streak**: Consecutive days of perfect adherence
- **Longest Streak**: Best consecutive days streak

#### 2. **AI-Powered Insights** 💡
Automatically generated insights based on your data:
- Adherence level feedback (Excellent, Good, Needs Improvement)
- Streak congratulations
- Medication-specific recommendations
- Best time of day analysis
- Reminder suggestions

#### 3. **Medication-Specific Adherence**
View adherence rates for each medication:
- Visual progress bars
- Color-coded performance (Green: 90%+, Orange: 70-89%, Red: <70%)
- Doses taken vs total doses

#### 4. **Weekly Trends Chart**
- Visual bar chart showing adherence over 4 weeks
- Track improvement over time
- Identify patterns

#### 5. **Time of Day Analysis**
Discover when you're most consistent:
- Morning (6am-12pm)
- Afternoon (12pm-6pm)
- Evening (6pm-10pm)
- Night (10pm-6am)

### Access

**Location**: Profile → Analytics Dashboard (Premium Feature)

```tsx
router.push("/analytics");
```

---

## 📤 Export Reports

### Available Formats

#### 1. **HTML Report** (Recommended)
Beautiful, printable report with:
- ✅ Professional styling
- ✅ Charts and statistics
- ✅ Can be saved as PDF (print to PDF)
- ✅ Easy to share with doctors
- ✅ Readable in any browser

**Use Case**: Doctor visits, medical records

#### 2. **CSV Report**
Spreadsheet-compatible format with:
- ✅ All medications list
- ✅ Dose history (last 30 days)
- ✅ Adherence statistics
- ✅ Import into Excel/Google Sheets

**Use Case**: Data analysis, personal tracking

#### 3. **JSON Report**
Complete data export with:
- ✅ All medications data
- ✅ Full dose history
- ✅ All prescriptions
- ✅ Detailed statistics
- ✅ Weekly trends

**Use Case**: Data backup, developer use, integrations

### How to Export

**Method 1: From Profile**
1. Go to Profile tab
2. Tap "Export Reports"
3. Choose format (HTML/CSV/JSON)
4. Share or save the file

**Method 2: From Analytics**
1. Open Analytics Dashboard
2. Tap "Export Full Report" button
3. Choose format
4. Share or save

**Code Example**:
```tsx
import { exportReport } from '../utils/exportReports';

// Export as HTML
await exportReport('html');

// Export as CSV
await exportReport('csv');

// Export as JSON
await exportReport('json');
```

---

## 📋 Report Contents

### HTML Report Includes:
- **Header**: Generated date and time
- **Overall Statistics**:
  - Total doses, adherence rate, streaks
  - Taken vs missed breakdown
- **Medications Table**:
  - Name, dosage, schedule, supply levels
- **Adherence by Medication**:
  - Individual adherence rates
  - Color-coded performance
- **Weekly Trends**:
  - 4-week adherence history
  - Trend analysis
- **Footer**: App info and disclaimer

### CSV Report Includes:
```csv
MEDICATIONS
Name,Dosage,Times,Start Date,Duration,Supply

DOSE HISTORY (Last 30 Days)
Date,Time,Medication,Status

ADHERENCE STATISTICS
Total Doses,Taken,Missed,Rate,Streaks
```

### JSON Report Structure:
```json
{
  "generatedAt": "2026-01-26T...",
  "dateRange": {
    "start": "...",
    "end": "..."
  },
  "medications": [...],
  "doseHistory": [...],
  "prescriptions": [...],
  "statistics": {
    "overall": {...},
    "byMedication": [...],
    "weeklyTrends": [...]
  }
}
```

---

## 🎨 Analytics Calculations

### Adherence Rate Formula
```
Adherence Rate = (Doses Taken / Total Doses) × 100
```

### Streak Calculation
- **Current Streak**: Most recent consecutive doses taken
- **Longest Streak**: Best all-time consecutive run

### Time Analysis
Doses are categorized by hour:
- **Morning**: 6:00 AM - 11:59 AM
- **Afternoon**: 12:00 PM - 5:59 PM
- **Evening**: 6:00 PM - 9:59 PM
- **Night**: 10:00 PM - 5:59 AM

### Weekly Trends
- Shows last 4 weeks of data
- Each week: Mon-Sun
- Calculates average adherence per week

---

## 🔐 Premium Feature

Both Analytics Dashboard and Export Reports are **Premium features**.

**Free users** see:
- ❌ Disabled menu items
- 🔒 Premium badge
- 💎 Redirect to upgrade page

**Premium users** get:
- ✅ Full analytics dashboard
- ✅ Unlimited export (all formats)
- ✅ Historical data analysis
- ✅ Advanced insights

---

## 💡 Tips for Using Reports

### For Doctor Visits:
1. Export as **HTML** the day before
2. Save as PDF (print → save as PDF)
3. Bring printed copy or show on phone
4. Highlight any concerning trends

### For Personal Tracking:
1. Export **CSV** monthly
2. Import into Google Sheets
3. Create custom charts
4. Track long-term trends

### For Data Backup:
1. Export **JSON** weekly
2. Store in cloud (Google Drive, iCloud)
3. Use for recovery if needed

---

## 🐛 Troubleshooting

### "Export Failed"
- Check storage permissions
- Ensure enough storage space
- Try different format

### "Sharing Not Available"
- Some devices don't support native sharing
- File is still saved to app directory
- Try third-party file manager

### "No Data Available"
- Add medications first
- Record some doses
- Wait 24 hours for meaningful data

---

## 🚀 Future Enhancements

Planned features:
- [ ] PDF export (native)
- [ ] Email reports directly
- [ ] Scheduled automatic exports
- [ ] Cloud backup integration
- [ ] Multi-language reports
- [ ] Custom date ranges
- [ ] Compare periods
- [ ] Medication effectiveness tracking

---

## 📊 Sample Report Preview

**HTML Report Preview**:
```
┌──────────────────────────────────┐
│  📊 Medication Adherence Report  │
│  Generated: Jan 26, 2026         │
└──────────────────────────────────┘

📈 Overall Statistics (Last 30 Days)
┌─────────┬──────────┬────────┐
│ Total   │ Adherence│ Streak │
│ 60      │ 95.0%    │ 12 days│
└─────────┴──────────┴────────┘

💊 Medications
┌────────────┬────────┬────────┐
│ Name       │ Dosage │ Supply │
│ Aspirin    │ 100mg  │ 45/60  │
│ Vitamin D  │ 1000IU │ 20/30  │
└────────────┴────────┴────────┘
```

---

## 🔗 Related Documentation

- [Premium Features](./TESTING_PREMIUM.md)
- [Component Library](./PREMIUM_MODAL_USAGE.md)
- [Storage System](../utils/storage.ts)
