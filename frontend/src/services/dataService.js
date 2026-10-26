import { createSeedData, genId } from '../data/seedData';
import api from './api';

const STORAGE_KEY = 'latrocore_data';
const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

function sanitizeData(data) {
  if (!data || !data.users) return data;
  let modified = false;
  for (const user of Object.values(data.users)) {
    if (!user.avatar || /[\p{Extended_Pictographic}]/u.test(user.avatar) || user.avatar.length > 3) {
      user.avatar = (user.name || 'User').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
      modified = true;
    }
  }

  // Ensure progressions dictionary exists
  if (!data.progressions) {
    data.progressions = {};
    modified = true;
  }

  if (modified) saveData(data);
  return data;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Automatically purge legacy fake demo records (Priya Sharma, pat-001, demo.lc)
      const hasFakeData =
        parsed?.users?.['pat-001'] ||
        parsed?.prescriptions?.some(p => p.id === 'rx-001') ||
        parsed?.appointments?.some(a => a.doctorId === 'doc-001' && a.patientId === 'pat-001') ||
        (parsed?.progressions && Object.values(parsed.progressions).some(pr => pr.tablets?.some(t => t.name === 'Metformin 500mg' && t.slot === 'Morning')));

      if (hasFakeData) {
        try {
          const userStr = localStorage.getItem('latrocore_user');
          if (userStr && (userStr.includes('pat-001') || userStr.includes('Priya Sharma') || userStr.includes('demo.lc'))) {
            localStorage.removeItem('latrocore_user');
          }
        } catch (ue) { /* ignore */ }
        const fresh = createSeedData();
        saveData(fresh);
        return fresh;
      }
      return sanitizeData(parsed);
    }
  } catch (e) { console.error('Failed to load data:', e); }
  return null;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.error('Failed to save data:', e); }
}

export function initializeData() {
  let data = loadData();
  if (!data) {
    data = createSeedData();
    saveData(data);
  } else {
    data = sanitizeData(data);
  }
  return data;
}

export function resetData() {
  const data = createSeedData();
  saveData(data);
  return data;
}

function getAll() {
  return loadData() || createSeedData();
}

function update(updater) {
  const data = getAll();
  updater(data);
  saveData(data);
  return data;
}

// ── Patients ────────────────────────────────────────────────────────────
export async function getPatients() {
  await delay();
  const data = getAll();
  return Object.values(data.users).filter(u => u.role === 'patient');
}

export async function getPatient(id) {
  await delay(100);
  const data = getAll();
  return data.users[id] || null;
}

export async function getUser(id) {
  await delay(50);
  const data = getAll();
  return data.users[id] || null;
}

export async function getAllUsers() {
  await delay();
  return Object.values(getAll().users);
}

export async function updateUser(id, updates) {
  await delay(150);
  return update(d => { if (d.users[id]) Object.assign(d.users[id], updates); });
}

export async function addUser(user) {
  await delay(150);
  const id = genId(user.role);
  const newUser = { ...user, id };
  return update(d => { d.users[id] = newUser; });
}

// ── Glucose readings ────────────────────────────────────────────────────
export async function getGlucoseReadings(patientId) {
  await delay();
  return getAll().glucoseReadings.filter(r => r.patientId === patientId);
}

export async function addGlucoseReading(reading) {
  await delay(150);
  const id = genId('gl');
  const newReading = { ...reading, id };
  update(d => d.glucoseReadings.push(newReading));

  // Sync to backend observations API if available
  try {
    const patientId = reading.patientId || 'pat-001';
    api.addObservation(patientId, {
      patient_id: patientId,
      type: 'blood_glucose',
      value: parseFloat(reading.value),
      unit: reading.unit || 'mg/dL',
      context: reading.mealContext || 'random',
      recorded_at: reading.timestamp || new Date().toISOString(),
    }).catch(e => console.warn('Observation API sync error:', e.message));
  } catch (err) {
    console.warn('API observation dispatch error:', err);
  }

  return newReading;
}

export async function updateGlucoseReading(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.glucoseReadings.findIndex(r => r.id === id);
    if (idx !== -1) Object.assign(d.glucoseReadings[idx], updates);
  });
}

export async function deleteGlucoseReading(id) {
  await delay(150);
  update(d => { d.glucoseReadings = d.glucoseReadings.filter(r => r.id !== id); });
}

// ── Prescriptions ───────────────────────────────────────────────────────
export async function getPrescriptions(patientId) {
  await delay();
  return getAll().prescriptions.filter(p => p.patientId === patientId);
}

export async function getAllPrescriptions() {
  await delay();
  return getAll().prescriptions;
}

export async function addPrescription(rx) {
  await delay(200);
  const id = genId('rx');
  const newRx = { ...rx, id, status: 'draft', versions: [{ version: 1, date: new Date().toISOString(), action: 'Created', authorId: rx.doctorId, changes: 'Initial prescription' }] };
  update(d => d.prescriptions.push(newRx));

  // Sync to backend API
  try {
    api.createPrescription({
      patient_id: rx.patientId || 'pat-001',
      medicines: rx.medicines || [],
      diagnosis: rx.diagnosis || 'Type 2 Diabetes Mellitus',
      notes: rx.instructions || '',
      version: 1,
    }).catch(e => console.warn('Backend prescription sync error:', e.message));
  } catch (err) {
    console.warn('Backend prescription call failed:', err);
  }

  return newRx;
}

export async function authorizePrescription(id, doctorId) {
  await delay(200);
  let rx = null;
  update(d => {
    const idx = d.prescriptions.findIndex(p => p.id === id);
    if (idx !== -1) {
      d.prescriptions[idx].status = 'active';
      d.prescriptions[idx].authorizedAt = new Date().toISOString();
      d.prescriptions[idx].versions.push({
        version: d.prescriptions[idx].versions.length + 1, date: new Date().toISOString(),
        action: 'Authorized', authorId: doctorId, changes: 'Authorized for dispensing',
      });
      rx = d.prescriptions[idx];

      // Sync status to backend
      try {
        api.updatePrescriptionStatus(id, 'active', 'Authorized for dispensing')
          .catch(e => console.warn('Prescription status sync error:', e.message));
      } catch (err) {
        console.warn('Prescription status error:', err);
      }
      // Generate dose events for new meds
      if (rx.medicines) {
        for (const med of rx.medicines) {
          for (const time of (med.times || [])) {
            const [h, m] = time.split(':').map(Number);
            const schedDate = new Date();
            schedDate.setHours(h, m, 0, 0);
            if (schedDate > new Date()) {
              d.doseEvents.push({
                id: genId('dose'), patientId: rx.patientId, prescriptionId: rx.id,
                medicineId: med.id, medicineName: med.name,
                scheduledTime: schedDate.toISOString(), status: 'pending',
                actualTime: null, note: '', recordedAt: null,
              });
            }
          }
        }
      }
    }
  });
  return rx;
}

export async function updatePrescription(id, updates, doctorId) {
  await delay(200);
  update(d => {
    const idx = d.prescriptions.findIndex(p => p.id === id);
    if (idx !== -1) {
      Object.assign(d.prescriptions[idx], updates);
      d.prescriptions[idx].versions.push({
        version: d.prescriptions[idx].versions.length + 1, date: new Date().toISOString(),
        action: 'Updated', authorId: doctorId, changes: updates.changeNote || 'Prescription updated',
      });
    }
  });
}

// ── Dose events ─────────────────────────────────────────────────────────
export async function getDoseEvents(patientId) {
  await delay();
  return getAll().doseEvents.filter(e => e.patientId === patientId);
}

export async function updateDoseEvent(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.doseEvents.findIndex(e => e.id === id);
    if (idx !== -1) Object.assign(d.doseEvents[idx], updates);
  });
}

export async function recordDose(id, status, actualTime, note) {
  await delay(150);
  update(d => {
    const idx = d.doseEvents.findIndex(e => e.id === id);
    if (idx !== -1) {
      d.doseEvents[idx].status = status;
      d.doseEvents[idx].actualTime = actualTime;
      d.doseEvents[idx].note = note || '';
      d.doseEvents[idx].recordedAt = new Date().toISOString();
    }
  });
}

// ── Investigations ──────────────────────────────────────────────────────
export async function getInvestigations(patientId) {
  await delay();
  return getAll().investigations.filter(i => i.patientId === patientId);
}

export async function addInvestigation(inv) {
  await delay(200);
  const id = genId('inv');
  const newInv = { ...inv, id };
  update(d => d.investigations.push(newInv));
  return newInv;
}

export async function updateInvestigation(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.investigations.findIndex(i => i.id === id);
    if (idx !== -1) Object.assign(d.investigations[idx], updates);
  });
}

// ── Health entries ──────────────────────────────────────────────────────
export async function getHealthEntries(patientId) {
  await delay();
  return getAll().healthEntries.filter(e => e.patientId === patientId);
}

export async function addHealthEntry(entry) {
  await delay(150);
  const id = genId('he');
  const newEntry = { ...entry, id };
  update(d => d.healthEntries.push(newEntry));
  return newEntry;
}

export async function updateHealthEntry(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.healthEntries.findIndex(e => e.id === id);
    if (idx !== -1) Object.assign(d.healthEntries[idx], updates);
  });
}

export async function deleteHealthEntry(id) {
  await delay(150);
  update(d => { d.healthEntries = d.healthEntries.filter(e => e.id !== id); });
}

// ── Screenings ──────────────────────────────────────────────────────────
export async function getScreenings(patientId) {
  await delay();
  return getAll().screenings.filter(s => s.patientId === patientId);
}

export async function getAllScreenings() {
  await delay();
  return getAll().screenings;
}

export async function updateScreening(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.screenings.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(d.screenings[idx], updates);
  });
}

// ── Appointments ────────────────────────────────────────────────────────
export async function getAppointments(userId) {
  await delay();
  const data = getAll();
  return data.appointments.filter(a => a.patientId === userId || a.doctorId === userId || a.pharmacistId === userId);
}

export async function getAllAppointments() {
  await delay();
  return getAll().appointments;
}

export async function addAppointment(apt) {
  await delay(200);
  const id = genId('apt');
  const newApt = { ...apt, id, status: 'scheduled' };
  update(d => d.appointments.push(newApt));
  return newApt;
}

export async function updateAppointment(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.appointments.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(d.appointments[idx], updates);
  });
}

export async function getAvailability() {
  await delay();
  return getAll().availability;
}

// ── Messages ────────────────────────────────────────────────────────────
export async function getMessages(userId) {
  await delay();
  return getAll().messages.filter(m => m.senderId === userId || m.receiverId === userId);
}

export async function addMessage(msg) {
  await delay(100);
  const id = genId('msg');
  const newMsg = { ...msg, id, timestamp: new Date().toISOString(), read: false };
  update(d => d.messages.push(newMsg));
  return newMsg;
}

export async function markMessageRead(id) {
  await delay(50);
  update(d => {
    const idx = d.messages.findIndex(m => m.id === id);
    if (idx !== -1) d.messages[idx].read = true;
  });
}

// ── Counselling requests ────────────────────────────────────────────────
export async function getCounsellingRequests(filter = {}) {
  await delay();
  let requests = getAll().counsellingRequests;
  if (filter.patientId) requests = requests.filter(r => r.patientId === filter.patientId);
  if (filter.assignedTo) requests = requests.filter(r => r.assignedTo === filter.assignedTo);
  if (filter.status) requests = requests.filter(r => r.status === filter.status);
  return requests;
}

export async function addCounsellingRequest(req) {
  await delay(200);
  const id = genId('cr');
  const newReq = { ...req, id, status: 'requested', requestedAt: new Date().toISOString() };
  update(d => d.counsellingRequests.push(newReq));
  return newReq;
}

export async function updateCounsellingRequest(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.counsellingRequests.findIndex(r => r.id === id);
    if (idx !== -1) Object.assign(d.counsellingRequests[idx], updates);
  });
}

// ── Medication reviews ──────────────────────────────────────────────────
export async function getMedicationReviews(filter = {}) {
  await delay();
  let reviews = getAll().medicationReviews;
  if (filter.patientId) reviews = reviews.filter(r => r.patientId === filter.patientId);
  if (filter.status) reviews = reviews.filter(r => r.status === filter.status);
  return reviews;
}

export async function updateMedicationReview(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.medicationReviews.findIndex(r => r.id === id);
    if (idx !== -1) Object.assign(d.medicationReviews[idx], updates);
  });
}

// ── Safety events ───────────────────────────────────────────────────────
export async function getSafetyEvents(patientId) {
  await delay();
  return getAll().safetyEvents.filter(e => e.patientId === patientId);
}

export async function addSafetyEvent(event) {
  await delay(200);
  const id = genId('se');
  const newEvent = { ...event, id };
  update(d => d.safetyEvents.push(newEvent));
  return newEvent;
}

export async function updateSafetyEvent(id, updates) {
  await delay(150);
  update(d => {
    const idx = d.safetyEvents.findIndex(e => e.id === id);
    if (idx !== -1) Object.assign(d.safetyEvents[idx], updates);
  });
}

// ── Notifications ───────────────────────────────────────────────────────
export async function getNotifications(userId) {
  await delay(100);
  return getAll().notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function addNotification(notif) {
  await delay(50);
  const id = genId('notif');
  const newNotif = { ...notif, id, read: false, createdAt: new Date().toISOString() };
  update(d => d.notifications.push(newNotif));
  return newNotif;
}

export async function markNotificationRead(id) {
  await delay(50);
  update(d => {
    const idx = d.notifications.findIndex(n => n.id === id);
    if (idx !== -1) d.notifications[idx].read = true;
  });
}

export async function markAllNotificationsRead(userId) {
  await delay(100);
  update(d => {
    d.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
  });
}

// ── Audit log ───────────────────────────────────────────────────────────
export async function getAuditLog() {
  await delay();
  return getAll().auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function addAuditEntry(entry) {
  await delay(50);
  const id = genId('audit');
  const newEntry = { ...entry, id, timestamp: new Date().toISOString() };
  update(d => d.auditLog.push(newEntry));
  return newEntry;
}

// ── Clinical targets ────────────────────────────────────────────────────
export async function getClinicalTargets(patientId) {
  await delay(100);
  return getAll().clinicalTargets.find(t => t.patientId === patientId) || null;
}

export async function setClinicalTargets(target) {
  await delay(150);
  update(d => {
    const idx = d.clinicalTargets.findIndex(t => t.patientId === target.patientId);
    if (idx !== -1) Object.assign(d.clinicalTargets[idx], target);
    else d.clinicalTargets.push({ ...target, id: genId('tgt') });
  });
}

// ── Daily Health Progression Engine ─────────────────────────────────────
export function calculateProgression(prog) {
  if (!prog) return { score: 0, level: 1, levelName: 'Incomplete', deductions: [], bonuses: [] };

  let baseScore = 0;
  const deductions = [];
  const bonuses = [];

  // 1. Food / Meals Progression (Max 30%)
  const meals = prog.meals || [];
  const takenMeals = meals.filter(m => m.taken === true);
  const missedMeals = meals.filter(m => m.taken === false);
  const pendingMeals = meals.filter(m => m.taken === null || m.taken === undefined);

  // Points for taken meals (+10% per meal)
  baseScore += takenMeals.length * 10;
  if (takenMeals.length > 0) {
    bonuses.push({
      item: 'Food Intake',
      detail: `${takenMeals.length} meal(s) logged & consumed (+${takenMeals.length * 10}%)`,
      type: 'meal'
    });
  }

  // REDUCE PROGRESSION: If food not taken / missed, deduct score with penalty
  if (missedMeals.length > 0) {
    const penalty = missedMeals.length * 12;
    baseScore = Math.max(0, baseScore - penalty);
    deductions.push({
      item: 'Food / Meals Skipped',
      penalty: `-${penalty}%`,
      detail: `${missedMeals.map(m => m.type || m.label).join(', ')} marked NOT TAKEN`,
      reason: 'Skipping meals causes dangerous hypoglycemic dips and irregular metabolic swings on diabetes medication',
      severity: 'high',
      type: 'meal'
    });
  }

  // 2. Prescription Tablets Progression (Max 40%)
  const tablets = prog.tablets || [];
  const takenTablets = tablets.filter(t => t.taken === true);
  const missedTablets = tablets.filter(t => t.taken === false);

  const tabletBasePoints = Math.round((takenTablets.length / (tablets.length || 3)) * 40);
  baseScore += tabletBasePoints;
  if (takenTablets.length > 0) {
    bonuses.push({
      item: 'Medication Adherence',
      detail: `${takenTablets.length}/${tablets.length} prescribed doses taken (+${tabletBasePoints}%)`,
      type: 'tablet'
    });
  }

  // REDUCE PROGRESSION: If tablet not taken / missed, deduct score with penalty
  if (missedTablets.length > 0) {
    const penalty = missedTablets.length * 15;
    baseScore = Math.max(0, baseScore - penalty);
    deductions.push({
      item: 'Prescription Tablets Missed',
      penalty: `-${penalty}%`,
      detail: `${missedTablets.map(t => t.name || t.label).join(', ')} marked NOT TAKEN`,
      reason: 'Skipping prescribed diabetes medication induces severe post-prandial glycemic spikes',
      severity: 'critical',
      type: 'tablet'
    });
  }

  // 3. Physical Activity Progression (Max 20%)
  const targetMin = prog.targetActivityMinutes || 30;
  const currentMin = prog.activityMinutes || 0;
  const activityRatio = Math.min(1, currentMin / targetMin);
  const activityPoints = Math.round(activityRatio * 20);
  baseScore += activityPoints;
  if (currentMin > 0) {
    bonuses.push({
      item: 'Physical Activity',
      detail: `${currentMin}/${targetMin} min active (+${activityPoints}%)`,
      type: 'activity'
    });
  } else {
    deductions.push({
      item: 'Physical Inactivity',
      penalty: '0 / 20%',
      detail: '0 minutes logged today (Daily goal: 30m)',
      reason: 'Regular daily movement enhances peripheral cellular glucose uptake',
      severity: 'moderate',
      type: 'activity'
    });
  }

  // 4. Blood Glucose Monitoring (Max 10%)
  if (prog.glucoseChecked) {
    baseScore += 10;
    bonuses.push({
      item: 'Glucose Tracking',
      detail: `Fasting reading documented (${prog.fastingGlucose || 118} mg/dL) (+10%)`,
      type: 'glucose'
    });
  } else {
    deductions.push({
      item: 'Glucose Log Missing',
      penalty: '0 / 10%',
      detail: 'No glucose self-monitoring logged today',
      reason: 'Self-monitoring is necessary for immediate clinical safety',
      severity: 'moderate',
      type: 'glucose'
    });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

  let level = 1;
  let levelName = 'Critical Incomplete';
  let badgeVariant = 'danger';
  let colorClass = 'rose';

  if (finalScore >= 85) {
    level = 4;
    levelName = 'Master Diabetic Control';
    badgeVariant = 'success';
    colorClass = 'emerald';
  } else if (finalScore >= 65) {
    level = 3;
    levelName = 'Target Control (On Track)';
    badgeVariant = 'primary';
    colorClass = 'teal';
  } else if (finalScore >= 40) {
    level = 2;
    levelName = 'Moderate Progression';
    badgeVariant = 'warning';
    colorClass = 'amber';
  } else {
    level = 1;
    levelName = 'At Risk (Progression Reduced)';
    badgeVariant = 'danger';
    colorClass = 'rose';
  }

  return {
    score: finalScore,
    level,
    levelName,
    badgeVariant,
    colorClass,
    deductions,
    bonuses,
    stats: {
      mealsTaken: takenMeals.length,
      mealsMissed: missedMeals.length,
      mealsTotal: meals.length,
      tabletsTaken: takenTablets.length,
      tabletsMissed: missedTablets.length,
      tabletsTotal: tablets.length,
      activityMinutes: currentMin,
      activityTarget: targetMin,
      activityPct: Math.round(activityRatio * 100),
      glucoseChecked: !!prog.glucoseChecked,
    }
  };
}

export function getProgressionData(patientId) {
  if (!patientId) {
    return {
      patientId: null,
      date: new Date().toISOString().split('T')[0],
      meals: [],
      tablets: [],
      activityMinutes: 0,
      targetActivityMinutes: 30,
      glucoseChecked: false,
      fastingGlucose: null,
      hydrationGlasses: 0,
      targetHydrationGlasses: 8,
      overallScore: 0,
      scoreColor: '#94a3b8',
      scoreText: 'No Data',
      completedCount: 0,
      totalCount: 0,
      percentages: { mealsPct: 0, tabletsPct: 0, activityPct: 0, glucoseChecked: false }
    };
  }
  const data = getAll();
  if (!data.progressions) data.progressions = {};
  const todayKey = new Date().toISOString().split('T')[0];
  const userKey = `${patientId}_${todayKey}`;

  if (!data.progressions[userKey]) {
    const activePrescriptions = (data.prescriptions || []).filter(
      rx => rx.patientId === patientId && rx.status === 'active'
    );
    const activeTablets = [];
    activePrescriptions.forEach(rx => {
      (rx.medicines || []).forEach(med => {
        activeTablets.push({
          id: med.id || genId('tab'),
          name: med.name,
          dose: med.dose,
          slot: med.frequency || 'Daily',
          taken: false,
          time: med.times?.[0] || '08:00 AM',
          reason: med.instructions || '',
        });
      });
    });

    data.progressions[userKey] = {
      patientId,
      date: todayKey,
      meals: [],
      tablets: activeTablets,
      activityMinutes: 0,
      targetActivityMinutes: 30,
      glucoseChecked: false,
      fastingGlucose: null,
      hydrationGlasses: 0,
      targetHydrationGlasses: 8,
    };
    saveData(data);
  }

  const record = data.progressions[userKey];
  const calculated = calculateProgression(record);
  return { ...record, ...calculated };
}

export function saveProgressionData(patientId, updates = {}) {
  if (!patientId) return null;
  const todayKey = new Date().toISOString().split('T')[0];
  const userKey = `${patientId}_${todayKey}`;
  return update(d => {
    if (!d.progressions) d.progressions = {};
    if (!d.progressions[userKey]) {
      d.progressions[userKey] = { patientId, date: todayKey, ...updates };
    } else {
      Object.assign(d.progressions[userKey], updates);
    }
  });
}

