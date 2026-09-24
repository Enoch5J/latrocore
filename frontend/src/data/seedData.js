import { daysAgo, daysFromNow, getDemoToday, toISODateTime } from './demoDate';

let _idCounter = 1000;
export function genId(prefix = 'id') {
  return `${prefix}_${++_idCounter}_${Date.now().toString(36)}`;
}

function makeDate(daysOffset, hours = 9, minutes = 0) {
  const d = getDemoToday();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// ── Users ───────────────────────────────────────────────────────────────
export const USERS = {
  'pat-001': { id: 'pat-001', name: 'Priya Sharma', role: 'patient', email: 'priya.sharma@demo.lc', phone: '+91 98765 43210', age: 42, gender: 'Female', bloodGroup: 'B+', diabetesType: 'Type 2', diagnosedYear: 2019, avatar: 'PS', assignedDoctor: 'doc-001', assignedPharmacist: 'pharm-001' },
  'pat-002': { id: 'pat-002', name: 'Rajesh Kumar', role: 'patient', email: 'rajesh.kumar@demo.lc', phone: '+91 98765 43211', age: 55, gender: 'Male', bloodGroup: 'O+', diabetesType: 'Type 2', diagnosedYear: 2015, avatar: 'RK', assignedDoctor: 'doc-001', assignedPharmacist: 'pharm-001' },
  'pat-003': { id: 'pat-003', name: 'Lakshmi Devi', role: 'patient', email: 'lakshmi.devi@demo.lc', phone: '+91 98765 43212', age: 38, gender: 'Female', bloodGroup: 'A+', diabetesType: 'Type 1', diagnosedYear: 2012, avatar: 'LD', assignedDoctor: 'doc-001', assignedPharmacist: 'pharm-002' },
  'pat-004': { id: 'pat-004', name: 'Mohammed Farooq', role: 'patient', email: 'mohammed.farooq@demo.lc', phone: '+91 98765 43213', age: 60, gender: 'Male', bloodGroup: 'AB+', diabetesType: 'Type 2', diagnosedYear: 2010, avatar: 'MF', assignedDoctor: 'doc-002', assignedPharmacist: 'pharm-002' },
  'pat-005': { id: 'pat-005', name: 'Ananya Patel', role: 'patient', email: 'ananya.patel@demo.lc', phone: '+91 98765 43214', age: 34, gender: 'Female', bloodGroup: 'B-', diabetesType: 'Type 2', diagnosedYear: 2021, avatar: 'AP', assignedDoctor: 'doc-002', assignedPharmacist: 'pharm-001' },
  'pat-006': { id: 'pat-006', name: 'Suresh Menon', role: 'patient', email: 'suresh.menon@demo.lc', phone: '+91 98765 43215', age: 48, gender: 'Male', bloodGroup: 'O-', diabetesType: 'Type 2', diagnosedYear: 2017, avatar: 'SM', assignedDoctor: 'doc-002', assignedPharmacist: 'pharm-002' },
  'doc-001': { id: 'doc-001', name: 'Dr. Arun Krishnamurthy', role: 'doctor', email: 'dr.arun@demo.lc', phone: '+91 98765 43220', specialization: 'Diabetology & Endocrinology', qualification: 'MD, DM (Endocrinology)', avatar: 'AK', assignedPatients: ['pat-001', 'pat-002', 'pat-003'] },
  'doc-002': { id: 'doc-002', name: 'Dr. Meena Sundaram', role: 'doctor', email: 'dr.meena@demo.lc', phone: '+91 98765 43221', specialization: 'Internal Medicine & Diabetes', qualification: 'MD (Internal Medicine)', avatar: 'MS', assignedPatients: ['pat-004', 'pat-005', 'pat-006'] },
  'pharm-001': { id: 'pharm-001', name: 'Kavitha Rajan (Pharm D)', role: 'pharmacist', email: 'kavitha.rajan@demo.lc', phone: '+91 98765 43230', qualification: 'Pharm D, Clinical Pharmacy', avatar: 'KR', assignedPatients: ['pat-001', 'pat-002', 'pat-005'] },
  'pharm-002': { id: 'pharm-002', name: 'Vikram Desai (Pharm D)', role: 'pharmacist', email: 'vikram.desai@demo.lc', phone: '+91 98765 43231', qualification: 'Pharm D, Drug Information', avatar: 'VD', assignedPatients: ['pat-003', 'pat-004', 'pat-006'] },
  'admin-001': { id: 'admin-001', name: 'Demo Administrator', role: 'admin', email: 'admin@demo.lc', avatar: 'DA' },
};

// ── Prescriptions ───────────────────────────────────────────────────────
export function generatePrescriptions() {
  return [
    { id: 'rx-001', patientId: 'pat-001', doctorId: 'doc-001', status: 'active', authorizedAt: makeDate(-25, 10, 0), createdAt: makeDate(-25, 9, 0),
      medicines: [
        { id: 'med-001', name: 'Metformin 500mg', dose: '500mg', route: 'Oral', frequency: 'Twice daily', times: ['08:00', '20:00'], foodInstruction: 'After food', startDate: makeDate(-25), reviewDate: makeDate(5), instructions: 'Take with a full glass of water after meals.' },
        { id: 'med-002', name: 'Glimepiride 1mg', dose: '1mg', route: 'Oral', frequency: 'Once daily', times: ['07:30'], foodInstruction: 'Before food', startDate: makeDate(-25), reviewDate: makeDate(5), instructions: 'Take 15-30 minutes before breakfast.' },
        { id: 'med-003', name: 'Atorvastatin 10mg', dose: '10mg', route: 'Oral', frequency: 'Once daily', times: ['21:00'], foodInstruction: 'With or without food', startDate: makeDate(-25), reviewDate: makeDate(35), instructions: 'Take at bedtime for best effect.' },
      ],
      notes: 'Continue current regimen. Review glucose logs at next visit.',
      versions: [
        { version: 1, date: makeDate(-25, 9, 0), action: 'Created', authorId: 'doc-001', changes: 'Initial prescription' },
        { version: 2, date: makeDate(-25, 10, 0), action: 'Authorized', authorId: 'doc-001', changes: 'Authorized for dispensing' },
      ],
    },
    { id: 'rx-002', patientId: 'pat-001', doctorId: 'doc-001', status: 'active', authorizedAt: makeDate(-10, 11, 0), createdAt: makeDate(-10, 10, 30),
      medicines: [
        { id: 'med-004', name: 'Telmisartan 40mg', dose: '40mg', route: 'Oral', frequency: 'Once daily', times: ['08:00'], foodInstruction: 'With or without food', startDate: makeDate(-10), reviewDate: makeDate(20), instructions: 'For blood pressure management.' },
      ],
      notes: 'Added for BP control. Monitor at next visit.',
      versions: [
        { version: 1, date: makeDate(-10, 10, 30), action: 'Created', authorId: 'doc-001', changes: 'Added Telmisartan for BP control' },
        { version: 2, date: makeDate(-10, 11, 0), action: 'Authorized', authorId: 'doc-001', changes: 'Authorized' },
      ],
    },
    { id: 'rx-003', patientId: 'pat-002', doctorId: 'doc-001', status: 'active', authorizedAt: makeDate(-20, 10, 0), createdAt: makeDate(-20, 9, 30),
      medicines: [
        { id: 'med-005', name: 'Metformin 1000mg', dose: '1000mg', route: 'Oral', frequency: 'Twice daily', times: ['08:00', '20:00'], foodInstruction: 'After food', startDate: makeDate(-20), reviewDate: makeDate(10), instructions: 'Take with meals.' },
        { id: 'med-006', name: 'Insulin Glargine 16 units', dose: '16 units', route: 'Subcutaneous', frequency: 'Once daily', times: ['22:00'], foodInstruction: 'N/A', startDate: makeDate(-20), reviewDate: makeDate(10), instructions: 'Inject subcutaneously at bedtime. Rotate injection sites.', isInsulin: true },
      ],
      notes: 'Added basal insulin due to inadequate glycemic control.',
      versions: [{ version: 1, date: makeDate(-20, 9, 30), action: 'Created & Authorized', authorId: 'doc-001', changes: 'Initial' }],
    },
    { id: 'rx-004', patientId: 'pat-003', doctorId: 'doc-001', status: 'active', authorizedAt: makeDate(-15, 9, 0), createdAt: makeDate(-15, 8, 30),
      medicines: [
        { id: 'med-007', name: 'Insulin Aspart (NovoRapid)', dose: 'Per sliding scale', route: 'Subcutaneous', frequency: 'Three times daily', times: ['07:30', '12:30', '19:30'], foodInstruction: 'Before food', startDate: makeDate(-15), reviewDate: makeDate(15), instructions: 'Inject 10-15 min before meals. Follow prescribed sliding scale.', isInsulin: true },
        { id: 'med-008', name: 'Insulin Glargine 22 units', dose: '22 units', route: 'Subcutaneous', frequency: 'Once daily', times: ['22:00'], foodInstruction: 'N/A', startDate: makeDate(-15), reviewDate: makeDate(15), instructions: 'Basal insulin at bedtime.', isInsulin: true },
      ],
      notes: 'Type 1 - basal-bolus regimen.',
      versions: [{ version: 1, date: makeDate(-15, 8, 30), action: 'Created & Authorized', authorId: 'doc-001', changes: 'Initial' }],
    },
    { id: 'rx-hist-001', patientId: 'pat-001', doctorId: 'doc-001', status: 'discontinued', authorizedAt: makeDate(-180, 10, 0), createdAt: makeDate(-185, 9, 0),
      medicines: [
        { id: 'med-hist-001', name: 'Glibenclamide 2.5mg', dose: '2.5mg', route: 'Oral', frequency: 'Once daily', times: ['07:30'], foodInstruction: 'Before breakfast', startDate: makeDate(-185), reviewDate: makeDate(-60), instructions: 'Take 30 mins before breakfast.' },
        { id: 'med-hist-002', name: 'Metformin 250mg (Initial Titration)', dose: '250mg', route: 'Oral', frequency: 'Once daily', times: ['08:00'], foodInstruction: 'After food', startDate: makeDate(-185), reviewDate: makeDate(-90), instructions: 'Initial tolerance test dose.' },
      ],
      notes: 'Discontinued Glibenclamide due to mild afternoon hypoglycemia episodes. Titrated Metformin upward to 500mg BID.',
      versions: [
        { version: 1, date: makeDate(-185, 9, 0), action: 'Created', authorId: 'doc-001', changes: 'Initiated early diabetes dual therapy' },
        { version: 2, date: makeDate(-180, 10, 0), action: 'Authorized', authorId: 'doc-001', changes: 'Authorized for dispensing' },
        { version: 3, date: makeDate(-60, 14, 0), action: 'Discontinued', authorId: 'doc-001', changes: 'Switched Glibenclamide to Glimepiride 1mg due to hypoglycemia risk' },
      ],
    },
    { id: 'rx-hist-002', patientId: 'pat-002', doctorId: 'doc-001', status: 'superseded', authorizedAt: makeDate(-120, 11, 0), createdAt: makeDate(-125, 10, 0),
      medicines: [
        { id: 'med-hist-003', name: 'Metformin 500mg', dose: '500mg', route: 'Oral', frequency: 'Twice daily', times: ['08:00', '20:00'], foodInstruction: 'After food', startDate: makeDate(-125), reviewDate: makeDate(-20), instructions: 'Standard oral regimen.' },
        { id: 'med-hist-004', name: 'Glipizide 5mg', dose: '5mg', route: 'Oral', frequency: 'Twice daily', times: ['07:30', '19:30'], foodInstruction: 'Before food', startDate: makeDate(-125), reviewDate: makeDate(-20), instructions: 'Take before major meals.' },
      ],
      notes: 'Superseded by Insulin Glargine + Metformin 1000mg BID due to secondary oral agent failure and elevated HbA1c (8.5%).',
      versions: [
        { version: 1, date: makeDate(-125, 10, 0), action: 'Created', authorId: 'doc-001', changes: 'Dual oral regimen' },
        { version: 2, date: makeDate(-120, 11, 0), action: 'Authorized', authorId: 'doc-001', changes: 'Authorized by Dr. Arun' },
        { version: 3, date: makeDate(-20, 10, 0), action: 'Superseded', authorId: 'doc-001', changes: 'Upgraded to basal insulin Glargine regimen (Rx-003)' },
      ],
    },
    { id: 'rx-hist-003', patientId: 'pat-001', doctorId: 'doc-001', status: 'discontinued', authorizedAt: makeDate(-90, 11, 0), createdAt: makeDate(-92, 10, 0),
      medicines: [
        { id: 'med-hist-005', name: 'Voglibose 0.2mg', dose: '0.2mg', route: 'Oral', frequency: 'Three times daily', times: ['08:00', '13:00', '20:00'], foodInstruction: 'With first bite of meal', startDate: makeDate(-92), reviewDate: makeDate(-30), instructions: 'Alpha-glucosidase inhibitor for post-prandial spikes.' },
      ],
      notes: 'Discontinued due to persistent gastrointestinal discomfort and bloating reported by patient.',
      versions: [
        { version: 1, date: makeDate(-92, 10, 0), action: 'Created', authorId: 'doc-001', changes: 'Added for post-prandial glucose control' },
        { version: 2, date: makeDate(-30, 9, 30), action: 'Discontinued', authorId: 'doc-001', changes: 'Patient intolerance / GI distress' },
      ],
    },
  ];
}

// ── Glucose readings (30 days for primary patient) ──────────────────────
export function generateGlucoseReadings() {
  const readings = [];
  const contexts = ['fasting', 'pre-meal', 'post-meal', 'random'];
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const symptoms = ['None', 'Slight dizziness', 'Fatigue', 'Blurred vision', 'Sweating', 'None', 'None', 'None'];

  for (let day = 30; day >= 0; day--) {
    // Fasting reading
    const fastingBase = 100 + Math.sin(day * 0.3) * 20 + (Math.random() - 0.5) * 30;
    readings.push({
      id: `gl-f-${day}`, patientId: 'pat-001', value: Math.round(fastingBase),
      unit: 'mg/dL', dateTime: makeDate(-day, 6, 30), context: 'fasting',
      mealContext: '', medicineTaken: day % 7 !== 3, activity: 'None',
      symptoms: symptoms[day % symptoms.length], notes: day === 5 ? 'Felt slightly low before breakfast' : '',
    });
    // Post-breakfast
    const postBfBase = 155 + Math.sin(day * 0.25) * 25 + (Math.random() - 0.5) * 40;
    readings.push({
      id: `gl-pb-${day}`, patientId: 'pat-001', value: Math.round(postBfBase),
      unit: 'mg/dL', dateTime: makeDate(-day, 10, 0), context: 'post-meal',
      mealContext: 'Breakfast', medicineTaken: true, activity: day % 3 === 0 ? '30 min walk' : 'None',
      symptoms: 'None', notes: '',
    });
    // Pre-lunch
    if (day % 2 === 0) {
      readings.push({
        id: `gl-pl-${day}`, patientId: 'pat-001', value: Math.round(110 + Math.random() * 30),
        unit: 'mg/dL', dateTime: makeDate(-day, 12, 30), context: 'pre-meal',
        mealContext: 'Lunch', medicineTaken: true, activity: 'None', symptoms: 'None', notes: '',
      });
    }
    // Post-dinner
    if (day % 3 !== 2) {
      readings.push({
        id: `gl-pd-${day}`, patientId: 'pat-001', value: Math.round(140 + Math.sin(day * 0.2) * 20 + Math.random() * 35),
        unit: 'mg/dL', dateTime: makeDate(-day, 21, 30), context: 'post-meal',
        mealContext: 'Dinner', medicineTaken: day % 5 !== 4, activity: 'None', symptoms: 'None', notes: '',
      });
    }
  }

  // Add some readings for pat-002
  for (let day = 14; day >= 0; day--) {
    readings.push({
      id: `gl-r2-${day}`, patientId: 'pat-002', value: Math.round(120 + Math.random() * 50),
      unit: 'mg/dL', dateTime: makeDate(-day, 7, 0), context: 'fasting',
      mealContext: '', medicineTaken: true, activity: 'None', symptoms: 'None', notes: '',
    });
  }

  return readings;
}

// ── Dose events ─────────────────────────────────────────────────────────
export function generateDoseEvents() {
  const events = [];
  const medIds = ['med-001', 'med-002', 'med-003', 'med-004'];
  const times = { 'med-001': ['08:00', '20:00'], 'med-002': ['07:30'], 'med-003': ['21:00'], 'med-004': ['08:00'] };
  const names = { 'med-001': 'Metformin 500mg', 'med-002': 'Glimepiride 1mg', 'med-003': 'Atorvastatin 10mg', 'med-004': 'Telmisartan 40mg' };

  for (let day = 25; day >= 0; day--) {
    for (const medId of medIds) {
      if (medId === 'med-004' && day > 10) continue; // Started 10 days ago
      for (const time of times[medId]) {
        const [h, m] = time.split(':').map(Number);
        const scheduledTime = makeDate(-day, h, m);
        const isFuture = day < 0;
        const isMissed = !isFuture && ((day === 18 && medId === 'med-001' && time === '20:00') || (day === 12 && medId === 'med-002') || (day === 7 && medId === 'med-003') || (day === 3 && medId === 'med-001' && time === '08:00'));
        const isPending = day === 0 && new Date() < new Date(scheduledTime);

        let status = 'taken';
        if (isPending) status = 'pending';
        else if (isMissed) status = 'missed';

        events.push({
          id: `dose-${medId}-${day}-${time.replace(':', '')}`,
          patientId: 'pat-001', prescriptionId: medId === 'med-004' ? 'rx-002' : 'rx-001',
          medicineId: medId, medicineName: names[medId],
          scheduledTime, status,
          actualTime: status === 'taken' ? makeDate(-day, h + (Math.random() > 0.5 ? 0 : 0), m + Math.floor(Math.random() * 15)) : null,
          note: isMissed ? 'Missed dose' : '',
          recordedAt: status !== 'pending' ? makeDate(-day, h, m + 5) : null,
        });
      }
    }
  }

  return events;
}

// ── Investigations ──────────────────────────────────────────────────────
export function generateInvestigations() {
  return [
    { id: 'inv-001', patientId: 'pat-001', type: 'HbA1c', value: '7.8', unit: '%', date: makeDate(-90), labName: 'City Labs', notes: 'Baseline HbA1c', reviewedBy: 'doc-001', reviewDate: makeDate(-88) },
    { id: 'inv-002', patientId: 'pat-001', type: 'HbA1c', value: '7.2', unit: '%', date: makeDate(-5), labName: 'City Labs', notes: 'Improved from previous', reviewedBy: 'doc-001', reviewDate: makeDate(-3) },
    { id: 'inv-003', patientId: 'pat-001', type: 'Fasting Glucose (Lab)', value: '118', unit: 'mg/dL', date: makeDate(-5), labName: 'City Labs', notes: '', reviewedBy: 'doc-001', reviewDate: makeDate(-3) },
    { id: 'inv-004', patientId: 'pat-001', type: 'Lipid Profile', value: 'TC:210, LDL:130, HDL:45, TG:175', unit: 'mg/dL', date: makeDate(-5), labName: 'City Labs', notes: 'LDL slightly above target', reviewedBy: 'doc-001', reviewDate: makeDate(-3) },
    { id: 'inv-005', patientId: 'pat-001', type: 'Creatinine/eGFR', value: 'Cr:0.9, eGFR:92', unit: 'mg/dL, mL/min', date: makeDate(-60), labName: 'City Labs', notes: 'Normal kidney function', reviewedBy: 'doc-001', reviewDate: makeDate(-58) },
    { id: 'inv-006', patientId: 'pat-001', type: 'Urine Albumin/ACR', value: '18', unit: 'mg/g', date: makeDate(-60), labName: 'City Labs', notes: 'Normal range', reviewedBy: 'doc-001', reviewDate: makeDate(-58) },
    { id: 'inv-007', patientId: 'pat-002', type: 'HbA1c', value: '8.5', unit: '%', date: makeDate(-30), labName: 'Metro Diagnostics', notes: 'Suboptimal control', reviewedBy: 'doc-001', reviewDate: makeDate(-28) },
    { id: 'inv-008', patientId: 'pat-001', type: 'HbA1c', value: '8.1', unit: '%', date: makeDate(-180), labName: 'City Labs', notes: 'At diagnosis review', reviewedBy: 'doc-001', reviewDate: makeDate(-178) },
  ];
}

// ── Health entries ──────────────────────────────────────────────────────
export function generateHealthEntries() {
  const entries = [];
  for (let day = 30; day >= 0; day--) {
    // BP
    if (day % 3 === 0) {
      entries.push({
        id: `bp-${day}`, patientId: 'pat-001', type: 'blood_pressure',
        systolic: 120 + Math.floor(Math.random() * 20), diastolic: 75 + Math.floor(Math.random() * 10),
        date: makeDate(-day, 8, 0), notes: '',
      });
    }
    // Weight
    if (day % 7 === 0) {
      entries.push({
        id: `wt-${day}`, patientId: 'pat-001', type: 'weight',
        value: 72 + Math.sin(day * 0.1) * 1.5, unit: 'kg',
        date: makeDate(-day, 7, 0), notes: '',
      });
    }
    // Activity
    if (day % 2 === 0) {
      const activities = ['Walking', 'Yoga', 'Cycling', 'Light exercises'];
      entries.push({
        id: `act-${day}`, patientId: 'pat-001', type: 'activity',
        activityType: activities[day % activities.length], duration: 20 + Math.floor(Math.random() * 25),
        date: makeDate(-day, 17, 0), notes: '',
      });
    }
    // Sleep
    entries.push({
      id: `sleep-${day}`, patientId: 'pat-001', type: 'sleep',
      duration: 6 + Math.random() * 2, date: makeDate(-day, 6, 0), notes: '',
    });
    // Meals
    const mealItems = [
      { meal: 'Breakfast', items: 'Idli with sambar, coffee', calories: 350 },
      { meal: 'Lunch', items: 'Rice, dal, vegetables, curd', calories: 550 },
      { meal: 'Dinner', items: 'Roti, paneer curry, salad', calories: 450 },
    ];
    for (const mi of mealItems) {
      const mealHours = { 'Breakfast': 8, 'Lunch': 13, 'Dinner': 20 };
      entries.push({
        id: `meal-${mi.meal.toLowerCase()}-${day}`, patientId: 'pat-001', type: 'meal',
        mealType: mi.meal, items: mi.items, calories: mi.calories + Math.floor(Math.random() * 100 - 50),
        date: makeDate(-day, mealHours[mi.meal], 0), notes: '',
      });
    }
  }
  return entries;
}

// ── Screening reminders ─────────────────────────────────────────────────
export function generateScreenings() {
  return [
    { id: 'scr-001', patientId: 'pat-001', type: 'Eye Examination', status: 'due', dueDate: makeDate(5), lastDone: makeDate(-360), nextDue: makeDate(5), notes: 'Annual dilated eye exam', assignedTo: 'doc-001' },
    { id: 'scr-002', patientId: 'pat-001', type: 'Foot Examination', status: 'overdue', dueDate: makeDate(-10), lastDone: makeDate(-380), nextDue: makeDate(-10), notes: 'Check for neuropathy and circulation', assignedTo: 'doc-001' },
    { id: 'scr-003', patientId: 'pat-001', type: 'Kidney Assessment', status: 'completed', dueDate: makeDate(-60), lastDone: makeDate(-60), completedDate: makeDate(-60), nextDue: makeDate(305), notes: 'eGFR and urine albumin done', assignedTo: 'doc-001' },
    { id: 'scr-004', patientId: 'pat-001', type: 'Cardiovascular/BP Review', status: 'upcoming', dueDate: makeDate(15), lastDone: makeDate(-90), nextDue: makeDate(15), notes: 'Lipid and BP review', assignedTo: 'doc-001' },
    { id: 'scr-005', patientId: 'pat-001', type: 'Dental/Oral Health', status: 'upcoming', dueDate: makeDate(30), lastDone: makeDate(-180), nextDue: makeDate(30), notes: 'Routine dental checkup', assignedTo: 'doc-001' },
    { id: 'scr-006', patientId: 'pat-001', type: 'Vaccinations', status: 'due', dueDate: makeDate(2), lastDone: makeDate(-365), nextDue: makeDate(2), notes: 'Annual flu vaccination', assignedTo: 'doc-001' },
    { id: 'scr-007', patientId: 'pat-002', type: 'Eye Examination', status: 'overdue', dueDate: makeDate(-20), lastDone: makeDate(-400), nextDue: makeDate(-20), notes: 'Overdue for annual eye exam', assignedTo: 'doc-001' },
  ];
}

// ── Appointments ────────────────────────────────────────────────────────
export function generateAppointments() {
  return [
    { id: 'apt-001', patientId: 'pat-001', doctorId: 'doc-001', date: makeDate(3, 10, 0), duration: 30, type: 'Follow-up', status: 'scheduled', notes: 'Review glucose logs and HbA1c', location: 'Clinic Room 3' },
    { id: 'apt-002', patientId: 'pat-001', doctorId: 'doc-001', date: makeDate(-14, 10, 0), duration: 30, type: 'Regular Check-up', status: 'completed', notes: 'Discussed medication adherence. Added Telmisartan.', location: 'Clinic Room 3' },
    { id: 'apt-003', patientId: 'pat-002', doctorId: 'doc-001', date: makeDate(5, 14, 0), duration: 30, type: 'Follow-up', status: 'scheduled', notes: 'Review insulin adjustment', location: 'Clinic Room 1' },
    { id: 'apt-004', patientId: 'pat-001', pharmacistId: 'pharm-001', date: makeDate(7, 11, 0), duration: 20, type: 'Medication Counselling', status: 'scheduled', notes: 'Discuss new BP medication', location: 'Pharmacy Office' },
    { id: 'apt-005', patientId: 'pat-004', doctorId: 'doc-002', date: makeDate(2, 9, 0), duration: 30, type: 'Regular Check-up', status: 'scheduled', notes: '', location: 'Clinic Room 2' },
    { id: 'apt-006', patientId: 'pat-001', doctorId: 'doc-001', date: makeDate(-30, 10, 0), duration: 30, type: 'Initial Assessment', status: 'completed', notes: 'Started on Metformin and Glimepiride.', location: 'Clinic Room 3' },
  ];
}

// ── Messages ────────────────────────────────────────────────────────────
export function generateMessages() {
  return [
    { id: 'msg-001', threadId: 'thread-001', senderId: 'pat-001', receiverId: 'doc-001', content: 'Dr. Krishnamurthy, I noticed my fasting glucose has been slightly higher this week. Should I be concerned?', timestamp: makeDate(-2, 9, 15), read: true },
    { id: 'msg-002', threadId: 'thread-001', senderId: 'doc-001', receiverId: 'pat-001', content: 'Hi Priya, I can see your readings. A slight variation is normal, but let\'s keep monitoring. Please ensure you\'re taking Glimepiride 30 minutes before breakfast. We\'ll review at your upcoming appointment.', timestamp: makeDate(-2, 11, 30), read: true },
    { id: 'msg-003', threadId: 'thread-001', senderId: 'pat-001', receiverId: 'doc-001', content: 'Thank you, Doctor. I will make sure to take it on time. See you on the 3rd.', timestamp: makeDate(-2, 12, 0), read: false },
    { id: 'msg-004', threadId: 'thread-002', senderId: 'pat-001', receiverId: 'pharm-001', content: 'Hello Kavitha, I sometimes feel slight nausea after taking Metformin. Is this normal?', timestamp: makeDate(-1, 14, 0), read: true },
    { id: 'msg-005', threadId: 'thread-002', senderId: 'pharm-001', receiverId: 'pat-001', content: 'Hi Priya, mild nausea can occur with Metformin, especially initially. Taking it with food helps. If it persists or worsens, please let me know and I\'ll discuss with Dr. Krishnamurthy.', timestamp: makeDate(-1, 15, 30), read: false },
    { id: 'msg-006', threadId: 'thread-003', senderId: 'pat-002', receiverId: 'doc-001', content: 'Doctor, I need guidance on my insulin injection technique. Can we discuss at next visit?', timestamp: makeDate(-3, 10, 0), read: true },
    { id: 'msg-007', threadId: 'thread-003', senderId: 'doc-001', receiverId: 'pat-002', content: 'Of course, Rajesh. I\'ll also refer you to our Pharm D team for a detailed counselling session. They can demonstrate the proper technique.', timestamp: makeDate(-3, 14, 0), read: true },
  ];
}

// ── Counselling requests ────────────────────────────────────────────────
export function generateCounsellingRequests() {
  return [
    { id: 'cr-001', patientId: 'pat-001', requestedBy: 'pat-001', type: 'patient_request', topic: 'Medication Use', status: 'requested', priority: 'normal', requestedAt: makeDate(-1, 16, 0), assignedTo: null, scheduledAt: null, notes: 'Would like to understand more about Telmisartan side effects.', outcome: null },
    { id: 'cr-002', patientId: 'pat-002', requestedBy: 'doc-001', type: 'doctor_referral', topic: 'Adherence', status: 'assigned', priority: 'high', requestedAt: makeDate(-3, 14, 30), assignedTo: 'pharm-001', scheduledAt: makeDate(1, 10, 0), notes: 'Patient needs insulin technique guidance and adherence counselling.', outcome: null },
    { id: 'cr-003', patientId: 'pat-001', requestedBy: 'pharm-001', type: 'pharmacist_initiated', topic: 'Lifestyle', status: 'completed', priority: 'normal', requestedAt: makeDate(-15, 10, 0), assignedTo: 'pharm-001', scheduledAt: makeDate(-13, 14, 0), completedAt: makeDate(-13, 14, 45), notes: 'Discussed dietary modifications for better glucose control.', outcome: 'Patient counselled on low glycemic index foods and meal timing. Follow-up in 2 weeks.', sessionDuration: 25 },
    { id: 'cr-004', patientId: 'pat-005', requestedBy: 'pat-005', type: 'patient_request', topic: 'Disease Understanding', status: 'requested', priority: 'normal', requestedAt: makeDate(-1, 10, 0), assignedTo: null, scheduledAt: null, notes: 'Newly diagnosed, wants to understand Type 2 diabetes better.', outcome: null },
  ];
}

// ── Medication review items ─────────────────────────────────────────────
export function generateMedicationReviews() {
  return [
    { id: 'mr-001', patientId: 'pat-001', type: 'side_effect', status: 'open', priority: 'medium', medicine: 'Metformin 500mg', concern: 'Patient reported mild GI discomfort. Simulated review flag.', flaggedBy: 'pharm-001', flaggedAt: makeDate(-2, 9, 0), notes: '', resolution: null },
    { id: 'mr-002', patientId: 'pat-002', type: 'adherence', status: 'open', priority: 'high', medicine: 'Insulin Glargine', concern: 'Adherence below 80% in past 7 days. Simulated review flag.', flaggedBy: 'pharm-001', flaggedAt: makeDate(-1, 10, 0), notes: '', resolution: null },
    { id: 'mr-003', patientId: 'pat-004', type: 'duplicate_therapy', status: 'escalated', priority: 'high', medicine: 'Metformin', concern: 'Two prescriptions containing metformin noted. Simulated review flag.', flaggedBy: 'pharm-002', flaggedAt: makeDate(-5, 11, 0), notes: 'Escalated to Dr. Sundaram for review.', escalatedTo: 'doc-002', escalatedAt: makeDate(-4, 9, 0), resolution: null },
    { id: 'mr-004', patientId: 'pat-001', type: 'interaction', status: 'resolved', priority: 'low', medicine: 'Atorvastatin + Supplement', concern: 'Patient taking OTC supplement alongside statin. Simulated review flag.', flaggedBy: 'pharm-001', flaggedAt: makeDate(-20, 8, 0), notes: '', resolution: 'No significant interaction. Patient counselled.', resolvedAt: makeDate(-18, 10, 0), resolvedBy: 'pharm-001' },
    { id: 'mr-005', patientId: 'pat-005', type: 'refill', status: 'open', priority: 'normal', medicine: 'Metformin 500mg', concern: 'Patient requested refill.', flaggedBy: 'pat-005', flaggedAt: makeDate(-1, 8, 0), notes: '', resolution: null },
  ];
}

// ── Safety events ───────────────────────────────────────────────────────
export function generateSafetyEvents() {
  return [
    { id: 'se-001', patientId: 'pat-001', type: 'low_glucose', triggerValue: 62, unit: 'mg/dL', triggerTime: makeDate(-8, 6, 0), acknowledged: true, acknowledgedAt: makeDate(-8, 6, 5), acknowledgedBy: 'pat-001', resolved: true, resolvedAt: makeDate(-8, 8, 0), resolvedBy: 'doc-001', resolution: 'Patient consumed glucose tablets. Follow-up glucose was 95 mg/dL.', notes: 'Pre-breakfast low. Patient had skipped evening snack.' },
    { id: 'se-002', patientId: 'pat-001', type: 'high_glucose', triggerValue: 285, unit: 'mg/dL', triggerTime: makeDate(-15, 22, 0), acknowledged: true, acknowledgedAt: makeDate(-15, 22, 10), acknowledgedBy: 'pat-001', resolved: true, resolvedAt: makeDate(-14, 10, 0), resolvedBy: 'doc-001', resolution: 'Post-celebration meal spike. Resolved within 12 hours with medication.', notes: 'Occurred after a family celebration dinner.' },
  ];
}

// ── Notifications ───────────────────────────────────────────────────────
export function generateNotifications() {
  return [
    { id: 'notif-001', userId: 'pat-001', type: 'prescription', title: 'Prescription Updated', message: 'Dr. Krishnamurthy has authorized a new prescription for Telmisartan 40mg.', relatedId: 'rx-002', read: false, createdAt: makeDate(-10, 11, 0) },
    { id: 'notif-002', userId: 'pat-001', type: 'appointment', title: 'Upcoming Appointment', message: 'You have an appointment with Dr. Krishnamurthy in 3 days.', relatedId: 'apt-001', read: false, createdAt: makeDate(0, 8, 0) },
    { id: 'notif-003', userId: 'pat-001', type: 'screening', title: 'Screening Due', message: 'Your annual eye examination is due soon.', relatedId: 'scr-001', read: false, createdAt: makeDate(-1, 8, 0) },
    { id: 'notif-004', userId: 'pat-001', type: 'message', title: 'New Message', message: 'Kavitha Rajan sent you a message about Metformin.', relatedId: 'msg-005', read: false, createdAt: makeDate(-1, 15, 30) },
    { id: 'notif-005', userId: 'doc-001', type: 'message', title: 'Patient Message', message: 'Priya Sharma sent a follow-up message.', relatedId: 'msg-003', read: false, createdAt: makeDate(-2, 12, 0) },
    { id: 'notif-006', userId: 'doc-001', type: 'escalation', title: 'Medication Review Escalation', message: 'Pharm D flagged an adherence concern for Rajesh Kumar.', relatedId: 'mr-002', read: false, createdAt: makeDate(-1, 10, 0) },
    { id: 'notif-007', userId: 'pharm-001', type: 'counselling', title: 'New Counselling Request', message: 'Priya Sharma has requested medication counselling.', relatedId: 'cr-001', read: false, createdAt: makeDate(-1, 16, 0) },
    { id: 'notif-008', userId: 'pharm-001', type: 'refill', title: 'Refill Request', message: 'Ananya Patel has requested a medication refill.', relatedId: 'mr-005', read: false, createdAt: makeDate(-1, 8, 0) },
    { id: 'notif-009', userId: 'pat-001', type: 'safety', title: 'Low Glucose Alert Recorded', message: 'A low glucose event (62 mg/dL) has been recorded and acknowledged.', relatedId: 'se-001', read: true, createdAt: makeDate(-8, 6, 5) },
    { id: 'notif-010', userId: 'pat-001', type: 'counselling', title: 'Counselling Completed', message: 'Your lifestyle counselling session has been completed.', relatedId: 'cr-003', read: true, createdAt: makeDate(-13, 14, 45) },
  ];
}

// ── Audit log ───────────────────────────────────────────────────────────
export function generateAuditLog() {
  return [
    { id: 'audit-001', actor: 'doc-001', actorRole: 'doctor', action: 'prescription_created', patientId: 'pat-001', recordId: 'rx-001', timestamp: makeDate(-25, 9, 0), details: 'Created prescription with Metformin, Glimepiride, Atorvastatin' },
    { id: 'audit-002', actor: 'doc-001', actorRole: 'doctor', action: 'prescription_authorized', patientId: 'pat-001', recordId: 'rx-001', timestamp: makeDate(-25, 10, 0), details: 'Authorized prescription rx-001' },
    { id: 'audit-003', actor: 'doc-001', actorRole: 'doctor', action: 'prescription_created', patientId: 'pat-001', recordId: 'rx-002', timestamp: makeDate(-10, 10, 30), details: 'Added Telmisartan for BP control' },
    { id: 'audit-004', actor: 'doc-001', actorRole: 'doctor', action: 'prescription_authorized', patientId: 'pat-001', recordId: 'rx-002', timestamp: makeDate(-10, 11, 0), details: 'Authorized prescription rx-002' },
    { id: 'audit-005', actor: 'pat-001', actorRole: 'patient', action: 'glucose_reading_added', patientId: 'pat-001', recordId: 'gl-f-0', timestamp: makeDate(0, 6, 35), details: 'Added fasting glucose reading' },
    { id: 'audit-006', actor: 'pharm-001', actorRole: 'pharmacist', action: 'medication_review_created', patientId: 'pat-001', recordId: 'mr-001', timestamp: makeDate(-2, 9, 0), details: 'Flagged side effect concern for Metformin' },
    { id: 'audit-007', actor: 'pat-001', actorRole: 'patient', action: 'counselling_requested', patientId: 'pat-001', recordId: 'cr-001', timestamp: makeDate(-1, 16, 0), details: 'Requested medication counselling' },
    { id: 'audit-008', actor: 'pharm-001', actorRole: 'pharmacist', action: 'counselling_completed', patientId: 'pat-001', recordId: 'cr-003', timestamp: makeDate(-13, 14, 45), details: 'Completed lifestyle counselling session' },
  ];
}

// ── Clinician targets (demo) ────────────────────────────────────────────
export function generateClinicalTargets() {
  return [
    { id: 'tgt-001', patientId: 'pat-001', setBy: 'doc-001', setAt: makeDate(-25, 10, 0), fastingGlucoseMin: 80, fastingGlucoseMax: 130, postMealGlucoseMax: 180, hba1cTarget: 7.0, bpSystolicMax: 130, bpDiastolicMax: 80, notes: 'Individualized targets for Priya' },
    { id: 'tgt-002', patientId: 'pat-002', setBy: 'doc-001', setAt: makeDate(-20, 10, 0), fastingGlucoseMin: 80, fastingGlucoseMax: 140, postMealGlucoseMax: 200, hba1cTarget: 7.5, bpSystolicMax: 140, bpDiastolicMax: 85, notes: 'More relaxed targets given age and duration' },
  ];
}

// ── Availability slots ──────────────────────────────────────────────────
export function generateAvailability() {
  const slots = [];
  for (let day = 1; day <= 14; day++) {
    const dayOfWeek = new Date(daysFromNow(day)).getDay();
    if (dayOfWeek === 0) continue; // Sunday off
    const hours = dayOfWeek === 6 ? [9, 10, 11] : [9, 10, 11, 14, 15, 16];
    for (const h of hours) {
      slots.push({ doctorId: 'doc-001', date: makeDate(day, h, 0), duration: 30, booked: false });
      slots.push({ doctorId: 'doc-002', date: makeDate(day, h, 0), duration: 30, booked: false });
    }
  }
  return slots;
}

// ── Assemble all seed data ──────────────────────────────────────────────
export function createSeedData() {
  return {
    users: { ...USERS },
    prescriptions: generatePrescriptions(),
    glucoseReadings: generateGlucoseReadings(),
    doseEvents: generateDoseEvents(),
    investigations: generateInvestigations(),
    healthEntries: generateHealthEntries(),
    screenings: generateScreenings(),
    appointments: generateAppointments(),
    messages: generateMessages(),
    counsellingRequests: generateCounsellingRequests(),
    medicationReviews: generateMedicationReviews(),
    safetyEvents: generateSafetyEvents(),
    notifications: generateNotifications(),
    auditLog: generateAuditLog(),
    clinicalTargets: generateClinicalTargets(),
    availability: generateAvailability(),
    progressions: {},
  };
}
