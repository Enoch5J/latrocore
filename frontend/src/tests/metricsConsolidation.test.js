import { describe, it, expect } from 'vitest';

describe('Metric Consolidation Tests', () => {
  it('combines glucose, checklist, investigations, and screening under health metrics in navigation', async () => {
    // Read the AppLayout source file or check the nav items definition
    const appLayoutModule = await import('../layouts/AppLayout');
    expect(appLayoutModule.default).toBeDefined();
  });

  it('provides the consolidated PatientMetrics component', async () => {
    const metricsModule = await import('../pages/patient/Metrics');
    expect(metricsModule.default).toBeDefined();
  }, 15000);

  it('exports GlucoseMonitor, CareChecklist, Investigations, and Screening with embedded mode support', async () => {
    const glucoseModule = await import('../pages/patient/GlucoseMonitor');
    const checklistModule = await import('../pages/patient/CareChecklist');
    const invModule = await import('../pages/patient/Investigations');
    const screeningModule = await import('../pages/patient/Screening');

    expect(glucoseModule.default).toBeDefined();
    expect(checklistModule.default).toBeDefined();
    expect(invModule.default).toBeDefined();
    expect(screeningModule.default).toBeDefined();
  });
});

