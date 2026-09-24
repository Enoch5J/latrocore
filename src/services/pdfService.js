import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../data/demoDate';

export function generateCareSummaryPDF(patient, data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary branding colors
  const primaryColor = [15, 118, 110]; // #0F766E
  const secondaryColor = [37, 99, 235]; // #2563EB
  const textDark = [15, 23, 42]; // #0F172A
  const textMuted = [100, 116, 139]; // #64748B

  // Header banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('LATROCORE — Comprehensive Diabetes Care Summary', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 240, 238);
  doc.text(`Generated: ${formatDate(new Date(), { month: 'short', day: 'numeric', year: 'numeric' })}  •  Confidential Medical Record  •  Simulated Demonstration Data`, 14, 22);

  let currentY = 36;

  // Patient Profile Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text('Patient Information', 14, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textDark);

  const doctor = data.users?.[patient.assignedDoctor];
  const pharmacist = data.users?.[patient.assignedPharmacist];

  const profileData = [
    ['Full Name:', patient.name || 'N/A', 'Age / Gender:', `${patient.age || 'N/A'} yrs / ${patient.gender || 'N/A'}`],
    ['Patient ID:', patient.id || 'N/A', 'Diagnosis:', `${patient.diabetesType || 'Type 2 Diabetes'} (${patient.diagnosisYear || 'N/A'})`],
    ['Primary Physician:', doctor?.name || 'N/A', 'Clinical Pharmacist:', pharmacist?.name || 'N/A'],
    ['Blood Group:', patient.bloodGroup || 'N/A', 'Contact Phone:', patient.phone || 'N/A'],
    ['Allergies:', (patient.allergies || []).join(', ') || 'No known drug allergies', 'Comorbidities:', (patient.comorbidities || []).join(', ') || 'None reported'],
  ];

  autoTable(doc, {
    startY: currentY,
    body: profileData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: textDark },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: textMuted, cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', textColor: textMuted, cellWidth: 40 },
      3: { cellWidth: 55 },
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Recent Glucose Readings Summary
  const patientReadings = (data.glucoseReadings || [])
    .filter(r => r.patientId === patient.id)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text('Recent Glucose Readings (Last 5)', 14, currentY);
  currentY += 6;

  const glucoseRows = patientReadings.slice(0, 5).map(r => [
    formatDate(r.dateTime, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    `${r.value} ${r.unit || 'mg/dL'}`,
    r.context ? r.context.replace(/_/g, ' ') : 'Random',
    r.mealStatus || '-',
    r.symptoms || 'None reported'
  ]);

  if (glucoseRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Date & Time', 'Glucose Value', 'Context', 'Meal Association', 'Symptoms']],
      body: glucoseRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('No glucose readings recorded.', 14, currentY);
    currentY += 8;
  }

  // Active Prescriptions Section
  const patientRx = (data.prescriptions || [])
    .filter(p => p.patientId === patient.id && p.status === 'active');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text('Active Medications', 14, currentY);
  currentY += 6;

  const rxRows = patientRx.map(p => [
    p.medicationName || p.name,
    p.dosage,
    p.frequency,
    p.foodInstruction || p.instructions || 'As directed',
    p.startDate ? formatDate(p.startDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'
  ]);

  if (rxRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Medication', 'Dosage', 'Frequency', 'Food / Administration', 'Started']],
      body: rxRows,
      theme: 'striped',
      headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('No active prescriptions found.', 14, currentY);
    currentY += 8;
  }

  // Check if we need a new page for investigations and screening
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // Recent Investigations
  const patientInvs = (data.investigations || [])
    .filter(i => i.patientId === patient.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text('Laboratory & Diagnostic Investigations', 14, currentY);
  currentY += 6;

  const invRows = patientInvs.slice(0, 6).map(inv => [
    formatDate(inv.date, { month: 'short', day: 'numeric', year: 'numeric' }),
    inv.testName || inv.type,
    `${inv.value} ${inv.unit || ''}`,
    inv.referenceRange || 'Standard',
    inv.status || 'Final'
  ]);

  if (invRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Test Name', 'Result', 'Reference Range', 'Status']],
      body: invRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2 },
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...textMuted);
    doc.text('No recent investigation records.', 14, currentY);
    currentY += 8;
  }

  // Footer Disclaimer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(
      'Demonstration Environment • Fictional Patient Record • Not for actual clinical decision making.',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 25,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  return doc;
}
