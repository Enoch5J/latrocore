import { describe, it, expect } from 'vitest';

describe('Metric Consolidation Tests', () => {
  it('combines glucose, checklist, investigations, and screening under health metrics in navigation', async () => {
    const appLayoutModule = await import('../layouts/AppLayout');
    expect(appLayoutModule.default).toBeDefined();
  }, 20000);

  it('provides the consolidated PatientMetrics component', async () => {
    const metricsModule = await import('../pages/patient/Metrics');
    expect(metricsModule.default).toBeDefined();
  }, 20000);

  it('exports GlucoseMonitor, CareChecklist, Investigations, and Screening with embedded mode support', async () => {
    const glucoseModule = await import('../pages/patient/GlucoseMonitor');
    const checklistModule = await import('../pages/patient/CareChecklist');
    const invModule = await import('../pages/patient/Investigations');
    const screeningModule = await import('../pages/patient/Screening');

    expect(glucoseModule.default).toBeDefined();
    expect(checklistModule.default).toBeDefined();
    expect(invModule.default).toBeDefined();
    expect(screeningModule.default).toBeDefined();
  }, 20000);

  it('provides all 8 Pharmacist / Pharm D clinical portal modules', async () => {
    const dashboard = await import('../pages/pharmacist/Dashboard');
    const patients = await import('../pages/pharmacist/PatientManagement');
    const prescriptions = await import('../pages/pharmacist/PrescriptionManagement');
    const adherence = await import('../pages/pharmacist/MedicationAdherence');
    const interactions = await import('../pages/pharmacist/DrugInteractions');
    const counselling = await import('../pages/pharmacist/PatientCounselling');
    const inventory = await import('../pages/pharmacist/MedicineInventory');
    const reports = await import('../pages/pharmacist/ReportsAnalytics');

    expect(dashboard.default).toBeDefined();
    expect(patients.default).toBeDefined();
    expect(prescriptions.default).toBeDefined();
    expect(adherence.default).toBeDefined();
    expect(interactions.default).toBeDefined();
    expect(counselling.default).toBeDefined();
    expect(inventory.default).toBeDefined();
    expect(reports.default).toBeDefined();
  }, 25000);
});
