import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAssistantResponse,
  formatPrescriptionInsights,
  getClinicalMedicineDetails
} from '../services/assistantEngine';
import { applyAIPrescriptionToPatient } from '../services/dataService';

describe('Prescription & AI Integration with Strict Guardrails', () => {
  const sampleMedicines = [
    {
      name: 'Metformin 500mg',
      dose: '500mg',
      frequency: 'Twice daily',
      foodInstruction: 'With meals'
    },
    {
      name: 'Glimepiride 1mg',
      dose: '1mg',
      frequency: 'Once daily',
      foodInstruction: 'Before breakfast'
    },
    {
      name: 'Unclear Tablet',
      dose: 'unclear',
      frequency: 'unclear',
      foodInstruction: 'unclear'
    }
  ];

  const prescriptionContext = sampleMedicines.map(m =>
    `- ${m.name} (Dose: ${m.dose}, Frequency: ${m.frequency})`
  ).join('\n');

  beforeEach(() => {
    // Mock localStorage for node environment
    const store = {};
    globalThis.localStorage = {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };
  });

  it('correctly maps clinical details for detected medicines and flags unclear items', () => {
    const metDetails = getClinicalMedicineDetails('Metformin 500mg');
    expect(metDetails.category).toBe('Biguanide (Insulin Sensitizer)');
    expect(metDetails.adverseEffects).toContain('Gastrointestinal');

    const unclearDetails = getClinicalMedicineDetails('Unclear Tablet');
    expect(unclearDetails.isUnclear).toBe(true);
    expect(unclearDetails.adverseEffects).toContain('unclear');
  });

  it('formats prescription insights exclusively for detected medicines', () => {
    const insights = formatPrescriptionInsights(sampleMedicines);
    expect(insights.adverseEffects.length).toBeGreaterThan(0);
    expect(insights.lifestyleTips.length).toBeGreaterThan(0);
    expect(insights.schedules.length).toBeGreaterThan(0);

    // Verify Metformin & Glimepiride are included
    const medNames = insights.adverseEffects.map(a => a.medicine);
    expect(medNames.some(n => n.includes('Metformin'))).toBe(true);
    expect(medNames.some(n => n.includes('Glimepiride'))).toBe(true);
  });

  it('strictly limits adverse effect queries to detected medicines', () => {
    const response = getAssistantResponse(
      'What are the adverse effects of my medication?',
      'en',
      prescriptionContext,
      sampleMedicines
    );

    expect(response.text).toContain('Metformin');
    expect(response.text).toContain('Glimepiride');
    expect(response.text).toContain('Strict Prescription Guardrail');
    // Ensure no outside unrelated drug like Warfarin or Digoxin is hallucinated
    expect(response.text).not.toContain('Warfarin');
    expect(response.text).not.toContain('Digoxin');
  });

  it('strictly rejects unprescribed medicines or queries about unlisted drugs', () => {
    const response = getAssistantResponse(
      'Should I take Aspirin or Warfarin with my current prescription?',
      'en',
      prescriptionContext,
      sampleMedicines
    );

    expect(response.text).toContain('Strict Prescription Guardrail');
    expect(response.text).toContain('Active Prescriptions');
  });

  it('safely syncs digitized prescription into patient data service', () => {
    const mockRx = {
      doctor_name: 'Dr. Apollo Specialist',
      clinic_name: 'Apollo Sugar Clinic',
      diagnosis: 'Type 2 Diabetes Mellitus',
      medicines: sampleMedicines
    };

    const res = applyAIPrescriptionToPatient('pat-001', mockRx);
    expect(res).toBeDefined();
    expect(res.prescriptions).toBeDefined();
    const active = res.prescriptions.find(p => p.patientId === 'pat-001' && p.status === 'active');
    expect(active).toBeDefined();
    expect(active.doctorName).toBe('Dr. Apollo Specialist');
    expect(active.medicines.length).toBe(3);
  });
});
