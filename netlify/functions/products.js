const PRODUCTS = {
  "maintenance-planning": {
    slug: "maintenance-planning",
    name: "Maintenance Planning Excel Sheet",
    price: 249,
    file: "maintenance-planning-excel.xlsx",
    fmt: "XLSX"
  },
  "preventive-maintenance-checklist": {
    slug: "preventive-maintenance-checklist",
    name: "Preventive Maintenance Checklist",
    price: 149,
    file: "preventive-maintenance-checklist.xlsx",
    fmt: "XLSX"
  },
  "breakdown-report-template": {
    slug: "breakdown-report-template",
    name: "Breakdown Report Template",
    price: 129,
    file: "breakdown-report-template.xlsx",
    fmt: "XLSX"
  },
  "root-cause-analysis-template": {
    slug: "root-cause-analysis-template",
    name: "Root Cause Analysis Template",
    price: 179,
    file: "root-cause-analysis-template.docx",
    fmt: "DOCX"
  },
  "pump-inspection-checklist": {
    slug: "pump-inspection-checklist",
    name: "Pump Inspection Checklist",
    price: 149,
    file: "pump-inspection-checklist.xlsx",
    fmt: "XLSX"
  },
  "conveyor-inspection-checklist": {
    slug: "conveyor-inspection-checklist",
    name: "Conveyor Inspection Checklist",
    price: 149,
    file: "conveyor-inspection-checklist.xlsx",
    fmt: "XLSX"
  },
  "gearbox-inspection-checklist": {
    slug: "gearbox-inspection-checklist",
    name: "Gearbox Inspection Checklist",
    price: 149,
    file: "gearbox-inspection-checklist.xlsx",
    fmt: "XLSX"
  },
  "bearing-failure-analysis-sheet": {
    slug: "bearing-failure-analysis-sheet",
    name: "Bearing Failure Analysis Sheet",
    price: 149,
    file: "bearing-failure-analysis-sheet.xlsx",
    fmt: "XLSX"
  },
  "lubrication-schedule-template": {
    slug: "lubrication-schedule-template",
    name: "Lubrication Schedule Template",
    price: 149,
    file: "lubrication-schedule-template.xlsx",
    fmt: "XLSX"
  },
  "downtime-tracking-dashboard": {
    slug: "downtime-tracking-dashboard",
    name: "Downtime Tracking Dashboard",
    price: 299,
    file: "downtime-tracking-dashboard.xlsx",
    fmt: "XLSX"
  },
  "complete-bundle": {
    slug: "complete-bundle",
    name: "Complete Bundle — All 10 Templates",
    price: 999,
    file: "kk-engineering-complete-bundle.zip",
    fmt: "ZIP"
  }
};

function getPriceLabel(product) {
  return `R${product.price}`;
}

module.exports = { PRODUCTS, getPriceLabel };
