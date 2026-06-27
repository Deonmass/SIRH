"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  calculateMonthlyBaseFromPointage,
  calculatePayroll,
  DEFAULT_PAYROLL_PARAMS,
  validateSmig,
} from "@/lib/payroll";
import { buildIrppDisplayLabel, buildIrppFormulaText } from "@/lib/irpp-bareme";
import {
  DEFAULT_SMIG_BAREME,
  filterSmigByCategory,
  getSmigRowByGrade,
  listSmigCategories,
  SMIG_DAYS_REFERENCE,
  smigHousingMonthlyFromPointage,
  smigTransportMonthlyFromPointage,
} from "@/lib/smig-bareme";
import {
  buildJobPositionPayrollFromSimulator,
  DEFAULT_POINTAGE,
  initSimulatorFromPayroll,
  smigAmountsFromRow,
} from "@/lib/payroll-simulator-config";
import type { AppSettings, Currency, Employee, JobPositionPayroll, PayrollParams } from "@/lib/types";
import { useAppSettings } from "@/contexts/SettingsContext";
import { resolveWorkMonthMode } from "@/lib/work-month-mode";
import { cn } from "@/lib/utils";

export function SalarySimulator({
  params: initialParams,
  settings,
  embedded = false,
  readOnly = false,
  stacked = false,
  bulletinOnly = false,
  compactTotals = false,
  hideCurrencySelector = false,
  displayCurrency,
  onDisplayCurrencyChange,
  payrollConfig,
  onPayrollChange,
  employee,
}: {
  params?: PayrollParams;
  settings?: AppSettings;
  /** Mode fiche de poste : sans en-tête page, synchronise la config paie */
  embedded?: boolean;
  /** Affichage identique au simulateur, sans modification (ex. dossier employé) */
  readOnly?: boolean;
  /** Colonne étroite : pointage au-dessus du bulletin, champs en une colonne */
  stacked?: boolean;
  /** Affiche uniquement la carte « Bulletin de paie » */
  bulletinOnly?: boolean;
  /** Totaux du bulletin plus compacts (dossier employé) */
  compactTotals?: boolean;
  /** Masque le sélecteur devise (affiché par le parent) */
  hideCurrencySelector?: boolean;
  displayCurrency?: Currency;
  onDisplayCurrencyChange?: (currency: Currency) => void;
  payrollConfig?: JobPositionPayroll;
  onPayrollChange?: (payroll: JobPositionPayroll) => void;
  /** Pour le mode bulletin : jours prestés = paramètre entreprise (ou override dossier). */
  employee?: Pick<Employee, "workMonthMode"> | null;
}) {
  const { formatSalary, formatEquivalent, convertAmount, exchangeRate, settings: appSettings } =
    useAppSettings();
  const bareme = appSettings.smigBareme?.length
    ? appSettings.smigBareme
    : settings?.smigBareme?.length
      ? settings.smigBareme
      : DEFAULT_SMIG_BAREME;

  const [params, setParams] = useState<PayrollParams>(initialParams ?? appSettings ?? DEFAULT_PAYROLL_PARAMS);

  useEffect(() => {
    const src = settings ?? initialParams ?? appSettings;
    setParams((p) => ({
      ...p,
      exchangeRate: src.exchangeRate,
      smigUsd: src.smigUsd,
      smigCdf: src.smigCdf,
      cnssEmployeeRate: src.cnssEmployeeRate,
      cnssEmployerRate: src.cnssEmployerRate,
      inppRate: src.inppRate,
      onemRate: src.onemRate,
      irppBrackets: src.irppBrackets,
      irppMinMonthlyCdf: src.irppMinMonthlyCdf,
      irppMaxRateOfTaxable: src.irppMaxRateOfTaxable,
    }));
  }, [
    settings,
    initialParams,
    appSettings,
    appSettings.exchangeRate,
    appSettings.smigUsd,
    appSettings.smigCdf,
    appSettings.irppBrackets,
    appSettings.irppMinMonthlyCdf,
    appSettings.irppMaxRateOfTaxable,
    appSettings.inppRate,
    appSettings.inppSector,
    appSettings.inppHeadcountForfait,
  ]);

  function handleCurrencyChange(next: Currency) {
    if (next === currency) return;
    setOtherDeductions((v) => convertAmount(v, currency, next));
    if (onDisplayCurrencyChange) onDisplayCurrencyChange(next);
    else setInternalCurrency(next);
  }

  const workDaysPerMonth = resolveWorkMonthMode(employee, appSettings);

  const simInit = useMemo(
    () => initSimulatorFromPayroll(payrollConfig, bareme, convertAmount),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init unique au montage (fiche poste)
    []
  );

  const defaultRow = getSmigRowByGrade(bareme, simInit.smigGrade) ?? bareme[0];
  const [internalCurrency, setInternalCurrency] = useState<Currency>(simInit.currency);
  const currency = displayCurrency ?? internalCurrency;
  const [smigCategory, setSmigCategory] = useState(
    simInit.smigCategory || (defaultRow?.categoryLabel ?? "")
  );
  const [smigGrade, setSmigGrade] = useState(simInit.smigGrade);
  const [dailyBaseCdf, setDailyBaseCdf] = useState(simInit.dailyBaseCdf);
  const [transportDailyCdf, setTransportDailyCdf] = useState(simInit.transportDailyCdf);
  const [housingMonthlyCdf, setHousingMonthlyCdf] = useState(simInit.housingMonthlyCdf);
  const [daysPresent, setDaysPresent] = useState(() => {
    if (readOnly || bulletinOnly) {
      return payrollConfig?.daysPresent ?? workDaysPerMonth;
    }
    if (embedded) return workDaysPerMonth;
    return workDaysPerMonth;
  });
  const [daysSick, setDaysSick] = useState(simInit.daysSick);
  const [daysAnnualLeave, setDaysAnnualLeave] = useState(simInit.daysAnnualLeave);
  const [daysHoliday, setDaysHoliday] = useState(simInit.daysHoliday);
  const [dependents, setDependents] = useState(simInit.dependents);
  const [unionMember, setUnionMember] = useState(simInit.unionMember);
  const [otherDeductions, setOtherDeductions] = useState(simInit.otherDeductions);
  const [payrollNotes, setPayrollNotes] = useState(payrollConfig?.payrollNotes ?? "");
  const allowancesRef = useRef(payrollConfig?.allowances ?? []);
  const lastEmittedPayrollRef = useRef<string | null>(null);
  const appliedPayrollSmigRef = useRef({
    grade: simInit.smigGrade,
    category: simInit.smigCategory || (defaultRow?.categoryLabel ?? ""),
  });

  const smigCategories = useMemo(() => listSmigCategories(bareme), [bareme]);
  const gradesInCategory = useMemo(
    () => filterSmigByCategory(bareme, smigCategory),
    [bareme, smigCategory]
  );

  const selectedSmigRow = useMemo(
    () => getSmigRowByGrade(bareme, smigGrade),
    [bareme, smigGrade]
  );

  const barèmeDailyBaseCdf = selectedSmigRow?.dailyBaseSalary ?? 0;
  const barèmeTransportDailyCdf = selectedSmigRow?.transportDaily ?? 0;
  const barèmeHousingMonthlyCdf = selectedSmigRow?.housingAllowance ?? 0;
  const dailyBase = currency === "CDF" ? dailyBaseCdf : convertAmount(dailyBaseCdf, "CDF", "USD");
  const transportPerDay =
    currency === "CDF" ? transportDailyCdf : convertAmount(transportDailyCdf, "CDF", "USD");
  const housingMonthly =
    currency === "CDF" ? housingMonthlyCdf : convertAmount(housingMonthlyCdf, "CDF", "USD");

  const amountsDifferFromBareme =
    dailyBaseCdf !== barèmeDailyBaseCdf ||
    transportDailyCdf !== barèmeTransportDailyCdf ||
    housingMonthlyCdf !== barèmeHousingMonthlyCdf;

  const linkedHousingMonthlyCdf = useMemo(
    () => smigHousingMonthlyFromPointage(dailyBaseCdf, daysPresent),
    [dailyBaseCdf, daysPresent]
  );

  function syncLinkedHousing(dailyCdf = dailyBaseCdf, days = daysPresent) {
    setHousingMonthlyCdf(smigHousingMonthlyFromPointage(dailyCdf, days));
  }

  function applyBaremeAmounts(row = selectedSmigRow) {
    if (!row) return;
    const amounts = smigAmountsFromRow(row);
    setDailyBaseCdf(amounts.dailyBaseCdf);
    setTransportDailyCdf(amounts.transportDailyCdf);
    syncLinkedHousing(amounts.dailyBaseCdf, daysPresent);
  }

  function updateDailyBaseCdf(cdf: number) {
    setDailyBaseCdf(cdf);
    syncLinkedHousing(cdf, daysPresent);
  }

  function updateDaysPresent(days: number) {
    setDaysPresent(days);
    syncLinkedHousing(dailyBaseCdf, days);
  }

  useEffect(() => {
    if (readOnly || bulletinOnly) return;
    if (!embedded) {
      updateDaysPresent(workDaysPerMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync paramètres entreprise
  }, [workDaysPerMonth, readOnly, bulletinOnly, embedded]);

  useEffect(() => {
    if (!embedded || readOnly || bulletinOnly) return;
    updateDaysPresent(workDaysPerMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fiche poste : jours = paramètre entreprise
  }, [workDaysPerMonth, embedded, readOnly, bulletinOnly]);

  const transportMonthlyPointage = useMemo(
    () => smigTransportMonthlyFromPointage(transportDailyCdf, daysPresent),
    [transportDailyCdf, daysPresent]
  );

  const transportMonthlyPointageDisplay =
    currency === "CDF"
      ? transportMonthlyPointage
      : convertAmount(transportMonthlyPointage, "CDF", "USD");

  const transportMonthlyFullMonth = useMemo(
    () => smigTransportMonthlyFromPointage(transportDailyCdf, workDaysPerMonth),
    [transportDailyCdf, workDaysPerMonth]
  );

  const transportMonthlyFullMonthDisplay =
    currency === "CDF"
      ? transportMonthlyFullMonth
      : convertAmount(transportMonthlyFullMonth, "CDF", "USD");

  const transportMonthlyBarèmeAtWorkMonth = useMemo(
    () => smigTransportMonthlyFromPointage(barèmeTransportDailyCdf, workDaysPerMonth),
    [barèmeTransportDailyCdf, workDaysPerMonth]
  );

  const transportMonthlyBarèmeAtWorkMonthDisplay =
    currency === "CDF"
      ? transportMonthlyBarèmeAtWorkMonth
      : convertAmount(transportMonthlyBarèmeAtWorkMonth, "CDF", "USD");

  function selectSmigGrade(grade: number) {
    const row = getSmigRowByGrade(bareme, grade);
    if (!row) return;
    setSmigGrade(row.grade);
    setSmigCategory(row.categoryLabel);
    appliedPayrollSmigRef.current = { grade: row.grade, category: row.categoryLabel };
    applyBaremeAmounts(row);
  }

  useEffect(() => {
    if (!embedded || readOnly || !payrollConfig) return;
    const sig = JSON.stringify(payrollConfig);
    if (lastEmittedPayrollRef.current === sig) return;

    const init = initSimulatorFromPayroll(payrollConfig, bareme, convertAmount);
    setInternalCurrency(init.currency);
    setSmigGrade(init.smigGrade);
    setSmigCategory(init.smigCategory);
    setDailyBaseCdf(init.dailyBaseCdf);
    setTransportDailyCdf(init.transportDailyCdf);
    setHousingMonthlyCdf(
      smigHousingMonthlyFromPointage(init.dailyBaseCdf, workDaysPerMonth)
    );
    setDaysPresent(workDaysPerMonth);
    setDaysSick(init.daysSick);
    setDaysAnnualLeave(init.daysAnnualLeave);
    setDaysHoliday(init.daysHoliday);
    setDependents(init.dependents);
    setUnionMember(init.unionMember);
    setOtherDeductions(init.otherDeductions);
    setPayrollNotes(payrollConfig.payrollNotes ?? "");
    allowancesRef.current = payrollConfig.allowances ?? [];
    appliedPayrollSmigRef.current = {
      grade: init.smigGrade,
      category: init.smigCategory,
    };
  }, [embedded, readOnly, payrollConfig, bareme, convertAmount, workDaysPerMonth]);

  useEffect(() => {
    if (!embedded || !payrollConfig || readOnly) return;

    const extGrade = payrollConfig.smigGrade ?? payrollConfig.category;
    const extCategory =
      payrollConfig.smigCategory ??
      getSmigRowByGrade(bareme, extGrade)?.categoryLabel ??
      "";

    if (
      appliedPayrollSmigRef.current.grade === extGrade &&
      appliedPayrollSmigRef.current.category === extCategory
    ) {
      return;
    }

    const row = getSmigRowByGrade(bareme, extGrade);
    if (!row) return;

    appliedPayrollSmigRef.current = { grade: extGrade, category: extCategory };
    setSmigGrade(row.grade);
    setSmigCategory(row.categoryLabel);
    applyBaremeAmounts(row);
  }, [
    embedded,
    payrollConfig,
    payrollConfig?.smigGrade,
    payrollConfig?.category,
    payrollConfig?.smigCategory,
    bareme,
  ]);

  const readOnlyPayrollKey = useMemo(
    () => (readOnly && payrollConfig ? JSON.stringify(payrollConfig) : ""),
    [readOnly, payrollConfig]
  );

  useEffect(() => {
    if (!readOnly || !payrollConfig) return;
    const init = initSimulatorFromPayroll(payrollConfig, bareme, convertAmount);
    setInternalCurrency(init.currency);
    setSmigGrade(init.smigGrade);
    setSmigCategory(init.smigCategory);
    setDailyBaseCdf(init.dailyBaseCdf);
    setTransportDailyCdf(init.transportDailyCdf);
    setHousingMonthlyCdf(init.housingMonthlyCdf);
    setDaysPresent(init.daysPresent);
    setDaysSick(init.daysSick);
    setDaysAnnualLeave(init.daysAnnualLeave);
    setDaysHoliday(init.daysHoliday);
    setDependents(init.dependents);
    setUnionMember(init.unionMember);
    setOtherDeductions(init.otherDeductions);
  }, [readOnly, readOnlyPayrollKey, payrollConfig, bareme, convertAmount]);

  useEffect(() => {
    if (!embedded || !payrollConfig) return;

    const extDependents = payrollConfig.dependents ?? DEFAULT_POINTAGE.dependents;
    const extUnionMember = payrollConfig.unionMember ?? false;

    setDependents((current) => (current === extDependents ? current : extDependents));
    setUnionMember((current) => (current === extUnionMember ? current : extUnionMember));
  }, [embedded, payrollConfig, payrollConfig?.dependents, payrollConfig?.unionMember]);

  const pointage = useMemo(
    () => ({
      dailyBaseSalary: dailyBaseCdf,
      transportPerDay: transportDailyCdf,
      daysPresent,
      daysSickMaternity: daysSick,
      daysAnnualLeave,
      daysHoliday,
    }),
    [dailyBaseCdf, transportDailyCdf, daysPresent, daysSick, daysAnnualLeave, daysHoliday]
  );

  const pointageBreakdown = useMemo(
    () => calculateMonthlyBaseFromPointage(pointage),
    [pointage]
  );

  const salary = useMemo(
    () => ({
      baseSalary: pointageBreakdown.baseSalaryMonthly,
      currency,
      category: smigGrade,
      allowances: [],
    }),
    [pointageBreakdown.baseSalaryMonthly, currency, smigGrade]
  );

  const payrollOptions = useMemo(
    () => ({
      pointage,
      housingAllowance: housingMonthlyCdf,
      dependents,
      unionMember,
    }),
    [pointage, housingMonthlyCdf, dependents, unionMember]
  );

  const result = useMemo(
    () => calculatePayroll(salary, params, otherDeductions, payrollOptions),
    [salary, params, otherDeductions, payrollOptions]
  );

  const builtPayroll = useMemo(
    () =>
      buildJobPositionPayrollFromSimulator(
        {
          currency,
          smigGrade,
          smigCategory,
          dailyBaseCdf,
          transportDailyCdf,
          housingMonthlyCdf,
          daysPresent,
          daysSick,
          daysAnnualLeave,
          daysHoliday,
          dependents,
          unionMember,
          otherDeductions,
          payrollNotes,
          allowances: allowancesRef.current,
        },
        bareme,
        convertAmount
      ),
    [
      currency,
      smigGrade,
      smigCategory,
      dailyBaseCdf,
      transportDailyCdf,
      housingMonthlyCdf,
      daysPresent,
      daysSick,
      daysAnnualLeave,
      daysHoliday,
      dependents,
      unionMember,
      otherDeductions,
      payrollNotes,
      bareme,
      convertAmount,
    ]
  );

  useEffect(() => {
    if (readOnly || !onPayrollChange) return;
    const signature = JSON.stringify(builtPayroll);
    if (lastEmittedPayrollRef.current === signature) return;
    lastEmittedPayrollRef.current = signature;
    onPayrollChange(builtPayroll);
  }, [builtPayroll, onPayrollChange, readOnly]);

  const smigDailyFloorCdf = selectedSmigRow?.dailyBaseSalary ?? params.smigCdf / SMIG_DAYS_REFERENCE;
  const dailyBaseForSmig =
    currency === "CDF" ? dailyBaseCdf : convertAmount(dailyBaseCdf, "CDF", "USD");
  const smigDailyFloorForSmig =
    currency === "CDF" ? smigDailyFloorCdf : convertAmount(smigDailyFloorCdf, "CDF", "USD");
  const smigCheck = validateSmig(dailyBaseForSmig, currency, params, smigDailyFloorForSmig);

  const pointageAmount = (cdf: number) =>
    currency === "CDF" ? cdf : convertAmount(cdf, "CDF", "USD");
  const dailyBaseDisplay = pointageAmount(pointageBreakdown.dailyBaseSalary);
  const presentBaseDisplay = pointageAmount(pointageBreakdown.presentBasePay);
  const sickPayDisplay = pointageAmount(pointageBreakdown.sickMaternityPay);
  const leavePayDisplay = pointageAmount(pointageBreakdown.annualLeavePay);
  const holidayPayDisplay = pointageAmount(pointageBreakdown.holidayBasePay);

  const brutMensuelDisplay = result.baseSalary;
  const imposableTotal = result.totalRemunerationImposable ?? brutMensuelDisplay;
  const housingDisplay = result.housingAllowance ?? housingMonthly;
  const transportDisplay = result.transportAllowance ?? transportMonthlyPointageDisplay;
  const indemnitesTotal = housingDisplay + transportDisplay;
  const totalGains = result.totalGains ?? result.grossSalary;
  const totalRetenues = result.totalLegalDeductions ?? 0;
  const baseCnssDisplay = result.baseCnss ?? imposableTotal;
  const baseIprDisplay = result.baseIpr ?? result.taxableBase;
  const baseSalaryForInpp = result.baseSalary ?? brutMensuelDisplay;
  const iprBrutDisplay = result.iprBeforeAbatement ?? result.ipr;
  const chargesEmployeurTotal = result.cnssEmployer + result.inpp + result.onem;
  const fmt = (amount: number) => formatSalary(amount, currency);
  const formatCdfInCurrency = (amountCdf: number) =>
    formatSalary(
      currency === "CDF" ? amountCdf : convertAmount(amountCdf, "CDF", "USD"),
      currency
    );
  const pctLabel = (rate: number, decimals = 0) =>
    (rate * 100).toLocaleString("fr-CD", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const irppLabel = buildIrppDisplayLabel(result.iprAppliedRates, result.iprAbatementPercent);
  const irppFormula = buildIrppFormulaText({
    bracketBreakdown: result.iprBracketBreakdown,
    iprBeforeAbatement: iprBrutDisplay,
    iprAbatementPercent: result.iprAbatementPercent,
    ipr: result.ipr,
    baseIpr: baseIprDisplay,
    formatAmount: fmt,
  });

  const bulletinSections: BulletinSectionConfig[] = [
    {
      title: "Pointage du mois",
      lines: [
        {
          label: "Salaire de base journalier",
          value: dailyBaseDisplay,
          type: "info" as const,
        },
        ...(daysPresent > 0
          ? [
              {
                label: `Jours prestés (P) — ${daysPresent} j`,
                formula: `${fmt(dailyBaseDisplay)} × ${daysPresent}`,
                value: presentBaseDisplay,
                type: "gain" as const,
              },
            ]
          : []),
        ...(daysSick > 0
          ? [
              {
                label: `Maladie / maternité (M) — ${daysSick} j`,
                formula: `${fmt(dailyBaseDisplay)} × ⅔ × ${daysSick}`,
                value: sickPayDisplay,
                type: "gain" as const,
              },
            ]
          : []),
        ...(daysAnnualLeave > 0
          ? [
              {
                label: `Congé annuel (CA) — ${daysAnnualLeave} j`,
                formula: `${fmt(dailyBaseDisplay)} × ${daysAnnualLeave}`,
                value: leavePayDisplay,
                type: "gain" as const,
              },
            ]
          : []),
        ...(daysHoliday > 0
          ? [
              {
                label: `Jours fériés (F) — ${daysHoliday} j`,
                formula: `${fmt(dailyBaseDisplay)} × 2 × ${daysHoliday}`,
                value: holidayPayDisplay,
                type: "gain" as const,
              },
            ]
          : []),
      ],
    },
    {
      title: "Rémunération imposable",
      lines: [
        {
          label: "Salaire de base",
          formula:
            daysPresent + daysSick + daysAnnualLeave + daysHoliday > 0
              ? `${fmt(presentBaseDisplay)}${daysSick > 0 ? ` + ${fmt(sickPayDisplay)}` : ""}${daysAnnualLeave > 0 ? ` + ${fmt(leavePayDisplay)}` : ""}${daysHoliday > 0 ? ` + ${fmt(holidayPayDisplay)}` : ""}`
              : undefined,
          value: brutMensuelDisplay,
          type: "subtotal",
        },
      ],
    },
    {
      title: "Retenues sur salaire",
      lines: [
        {
          label: `CNSS travailleur (${(params.cnssEmployeeRate * 100).toFixed(0)} %)`,
          value: -result.cnssEmployee,
          type: "deduction",
        },
        {
          label: "Base IRPP (après CNSS)",
          value: result.baseIpr ?? result.taxableBase,
          type: "info",
        },
        ...(iprBrutDisplay !== result.ipr
          ? [
              {
                label: "IRPP brut (barème progressif)",
                value: iprBrutDisplay,
                type: "info" as const,
              },
            ]
          : []),
        {
          label: irppLabel,
          formula: irppFormula,
          value: -result.ipr,
          type: "deduction",
        },
        ...(result.unionContribution
          ? [
              {
                label: "Cotisation syndicale (2 %)",
                value: -result.unionContribution,
                type: "deduction" as const,
              },
            ]
          : []),
        ...(otherDeductions > 0
          ? [
              {
                label: "Autres retenues / prêts",
                value: -otherDeductions,
                type: "deduction" as const,
              },
            ]
          : []),
        {
          label: "TOTAL RETENUES LÉGALES",
          value: totalRetenues,
          type: "deductionSummary",
        },
      ],
    },
    {
      title: "Indemnités & net à payer",
      lines: [
        {
          label: "Indemnité logement",
          value: housingDisplay,
          type: "gain",
        },
        {
          label: "Indemnité transport (pointage)",
          value: transportDisplay,
          type: "gain",
        },
        {
          label: "TOTAL INDEMNITÉS",
          value: indemnitesTotal,
          type: "subtotal",
        },
        {
          label: "SALAIRE BRUT",
          formula: `${fmt(imposableTotal)} + ${fmt(indemnitesTotal)}`,
          value: totalGains,
          type: "total",
        },
        {
          label: "NET À PAYER",
          formula: `${fmt(totalGains)} − ${fmt(totalRetenues)}`,
          value: result.netSalary,
          type: "net",
        },
      ],
    },
    {
      title: "Coût total employeur",
      groups: [
        {
          title: "Charges employeur",
          lines: [
            {
              label: `CNSS employeur (${pctLabel(params.cnssEmployerRate)} %)`,
              formula: `${fmt(baseCnssDisplay)} × ${pctLabel(params.cnssEmployerRate)} %`,
              value: result.cnssEmployer,
              type: "charge",
            },
            {
              label: `INPP (${pctLabel(params.inppRate, 1)} %)`,
              formula: `${fmt(baseSalaryForInpp)} × ${pctLabel(params.inppRate, 1)} %`,
              value: result.inpp,
              type: "charge",
            },
            {
              label: `ONEM (${pctLabel(params.onemRate, 1)} %)`,
              formula: `${fmt(baseCnssDisplay)} × ${pctLabel(params.onemRate, 1)} %`,
              value: result.onem,
              type: "charge",
            },
            {
              label: "TOTAL CHARGES EMPLOYEUR",
              formula: `${fmt(result.cnssEmployer)} + ${fmt(result.inpp)} + ${fmt(result.onem)}`,
              value: chargesEmployeurTotal,
              type: "subtotal",
            },
          ],
        },
      ],
      grandSummary: {
        label: "Coût total",
        items: [
          { label: "Net à payer", value: result.netSalary, tone: "net" },
          { label: "Retenues employé", value: totalRetenues, tone: "deduction" },
          { label: "Charges employeur", value: chargesEmployeurTotal, tone: "charge" },
        ],
        total: {
          label: "COÛT TOTAL EMPLOYEUR",
          value: result.netSalary + totalRetenues + chargesEmployeurTotal,
        },
      },
    },
  ];

  const grid2 = stacked ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4";
  const grid3 = stacked ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3";

  const flatBulletin = embedded && bulletinOnly;

  return (
    <div className={cn(flatBulletin ? "space-y-2" : embedded ? "space-y-6" : "space-y-8")}>
      {!embedded && (
        <header className="page-header-bar -mx-8 mb-4 rounded-none border-b px-8">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Support RH RDC — Calcul du salaire
          </p>
          <h1>Simulateur de paie</h1>
          <p className="max-w-3xl">
            Le salaire de base mensuel est calculé à partir du pointage : jours prestés, maladie (⅔ du
            journalier), congé annuel ; jours fériés (F) : double du base journalier + transport.
          </p>
          <p className="text-xs text-sky-400/90">
            Taux BCC : 1 USD = {exchangeRate.toLocaleString("fr-CD")} CDF — changement de devise avec
            conversion automatique des montants saisis.
          </p>
        </header>
      )}

      {embedded && !readOnly && (
        <p className="text-sm text-[var(--shell-text-muted)]">
          Même simulateur que Paie → Simulateur : barème SMIG, pointage, bulletin et coût employeur.
          La configuration est enregistrée avec la fiche de poste.
        </p>
      )}

      <fieldset
        disabled={readOnly}
        className={cn(
          "grid min-w-0 w-full gap-6 border-0 p-0 m-0 disabled:opacity-100",
          bulletinOnly || stacked ? "grid-cols-1" : "lg:grid-cols-2 lg:items-start"
        )}
      >
        {!bulletinOnly && (
        <Card
          className={cn(
            "flex flex-col",
            !stacked && "lg:max-h-[min(75vh,calc(100dvh-12rem))] lg:overflow-hidden"
          )}
        >
          <CardHeader className="shrink-0">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-sky-400" />
              <h2 className="font-semibold text-white">Pointage & base mensuelle</h2>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-0">
            <div className={grid2}>
              <Field label="Devise d'affichage">
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                  className="input w-full"
                >
                  <option value="CDF">CDF — Franc congolais</option>
                  <option value="USD">USD — Dollar</option>
                </select>
              </Field>
              <Field label="Catégorie professionnelle (barème SMIG)">
                <select
                  value={smigCategory}
                  onChange={(e) => {
                    const label = e.target.value;
                    setSmigCategory(label);
                    const first = filterSmigByCategory(bareme, label)[0];
                    if (first) selectSmigGrade(first.grade);
                  }}
                  className="input w-full"
                >
                  {smigCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className={grid2}>
              <Field label="Grade (barème SMIG)">
                <select
                  value={smigGrade}
                  onChange={(e) => selectSmigGrade(Number(e.target.value))}
                  className="input w-full"
                >
                  {gradesInCategory.map((r) => (
                    <option key={r.id} value={r.grade}>
                      Grade {r.grade} — {r.echelon !== "—" ? `Éch. ${r.echelon}` : r.categoryCode}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Salaire de base journalier (${currency})`}>
                <NumericInput
                  min={0}
                  decimal
                  thousands={currency === "CDF"}
                  value={currency === "CDF" ? dailyBaseCdf : dailyBase}
                  onChange={(n) =>
                    updateDailyBaseCdf(currency === "CDF" ? n : convertAmount(n, "USD", "CDF"))
                  }
                  className="input w-full"
                />
                {dailyBaseCdf !== barèmeDailyBaseCdf && (
                  <p className="text-xs text-amber-400/90 mt-1">
                    Barème grade {smigGrade} : {formatCdfInCurrency(barèmeDailyBaseCdf)}
                  </p>
                )}
              </Field>
            </div>
            <div className={grid2}>
              <Field label={`Transport / jour (${currency})`}>
                <NumericInput
                  min={0}
                  decimal
                  thousands={currency === "CDF"}
                  value={currency === "CDF" ? transportDailyCdf : transportPerDay}
                  onChange={(n) =>
                    setTransportDailyCdf(currency === "CDF" ? n : convertAmount(n, "USD", "CDF"))
                  }
                  className="input w-full"
                />
                {transportDailyCdf !== barèmeTransportDailyCdf && (
                  <p className="text-xs text-amber-400/90 mt-1">
                    Barème : {formatCdfInCurrency(barèmeTransportDailyCdf)}/j
                  </p>
                )}
              </Field>
              <Field label={`Logement mensuel (${currency})`}>
                <NumericInput
                  min={0}
                  decimal
                  thousands={currency === "CDF"}
                  value={currency === "CDF" ? housingMonthlyCdf : housingMonthly}
                  onChange={(n) =>
                    setHousingMonthlyCdf(currency === "CDF" ? n : convertAmount(n, "USD", "CDF"))
                  }
                  className="input w-full"
                />
                {housingMonthlyCdf !== linkedHousingMonthlyCdf && (
                  <p className="text-xs text-amber-400/90 mt-1">
                    Calculé (base × {daysPresent} j × 30 %) :{" "}
                    {formatCdfInCurrency(linkedHousingMonthlyCdf)}
                  </p>
                )}
              </Field>
            </div>
            <div className={grid2}>
              <Field label={`Transport / mois plein (réf. ${workDaysPerMonth} j)`}>
                <input
                  type="text"
                  readOnly
                  value={formatSalary(transportMonthlyFullMonthDisplay, currency)}
                  className="input w-full bg-white/5 text-slate-300"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Barème SMIG : {formatSalary(transportMonthlyBarèmeAtWorkMonthDisplay, currency)}
                </p>
              </Field>
              <Field label="Transport mensuel (pointage)">
                <input
                  type="text"
                  readOnly
                  value={formatSalary(transportMonthlyPointageDisplay, currency)}
                  className="input w-full bg-white/5 text-slate-300"
                />
                <p className="text-xs text-amber-400/90 mt-1">
                  {formatSalary(transportPerDay, currency)}/j × {daysPresent} j
                </p>
              </Field>
            </div>
            {amountsDifferFromBareme && !readOnly && (
              <button
                type="button"
                onClick={() => applyBaremeAmounts()}
                className="text-xs text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
              >
                Réappliquer les montants du barème SMIG (grade {smigGrade})
              </button>
            )}

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
              <p className="text-sm font-medium text-sky-300">Pointage du mois</p>
              <div className={grid3}>
                <Field
                  label={`Jours prestés (P)${!embedded ? ` — ${workDaysPerMonth} j.` : ""}`}
                >
                  {embedded ? (
                    <NumericInput
                      min={0}
                      value={daysPresent}
                      onChange={updateDaysPresent}
                      className="input w-full"
                    />
                  ) : (
                    <input
                      type="text"
                      readOnly
                      value={String(daysPresent)}
                      className="input w-full bg-white/5 text-slate-300"
                    />
                  )}
                  {!embedded && (
                    <p className="mt-1 text-xs text-slate-500">
                      Mode de travail entreprise (Paramètres → Congés & préavis) : {workDaysPerMonth}{" "}
                      j. / mois
                    </p>
                  )}
                </Field>
                <Field label="Maladie / maternité (M)">
                  <NumericInput
                    min={0}
                    value={daysSick}
                    onChange={setDaysSick}
                    className="input w-full"
                  />
                </Field>
                <Field label="Congé annuel (CA)">
                  <NumericInput
                    min={0}
                    value={daysAnnualLeave}
                    onChange={setDaysAnnualLeave}
                    className="input w-full"
                  />
                </Field>
                <Field label="Jours fériés (F)">
                  <NumericInput
                    min={0}
                    value={daysHoliday}
                    onChange={setDaysHoliday}
                    className="input w-full"
                  />
                </Field>
              </div>
              <p className="text-xs text-slate-500">
                P : base × jours + transport · M : ⅔ base × jours · CA : base × jours · F : base × 2
                + transport
              </p>
            </div>

            <div className={grid3}>
              <Field label="Personnes à charge (IRPP)">
                <NumericInput min={0} max={9} value={dependents} onChange={setDependents} className="input w-full" />
              </Field>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={unionMember} onChange={(e) => setUnionMember(e.target.checked)} className="rounded border-white/20" />
                  Cotisation syndicale (2 %)
                </label>
              </div>
            </div>

            <Field label={`Autres retenues (${currency})`}>
              <NumericInput
                min={0}
                decimal
                thousands={currency === "CDF"}
                value={otherDeductions}
                onChange={setOtherDeductions}
                className="input w-full"
              />
              {formatEquivalent(otherDeductions, currency) && (
                <p className="text-xs text-slate-500 mt-1">{formatEquivalent(otherDeductions, currency)}</p>
              )}
            </Field>

            {embedded && (
              <Field label="Notes paie (fiche de poste)">
                <textarea
                  rows={2}
                  value={payrollNotes}
                  onChange={(e) => setPayrollNotes(e.target.value)}
                  className="input w-full"
                  placeholder="Commentaires internes sur le package…"
                />
              </Field>
            )}

            <div className="border-t border-white/10 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-300">Taux légaux</p>
              <div className={cn(grid3, "text-xs")}>
                <label className="text-slate-400">
                  Taux change BCC (1 USD → CDF)
                  <NumericInput
                    min={0}
                    decimal
                    value={params.exchangeRate}
                    onChange={(v) => setParams({ ...params, exchangeRate: v })}
                    className="input mt-1 w-full"
                  />
                  <span className="text-[10px] text-slate-600">Synchronisé avec Paramètres · modifiable pour simulation</span>
                </label>
                <label className="text-slate-400">
                  INPP %
                  <input
                    readOnly
                    value={`${(params.inppRate * 100).toLocaleString("fr-CD", { maximumFractionDigits: 1 })} %`}
                    className="input mt-1 w-full cursor-default opacity-80"
                  />
                  <span className="text-[10px] text-slate-600">
                    Dérivé du secteur et de l&apos;effectif — Paramètres → Entreprise
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {flatBulletin ? (
          <div className="min-h-0 min-w-0">
            {!hideCurrencySelector && (
              <div className="mb-2 flex justify-end">
                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="shrink-0">Devise</span>
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                    className="input min-w-[7rem] py-1 text-sm text-white"
                    aria-label="Devise du bulletin"
                  >
                    <option value="CDF">CDF</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
            )}
            {!smigCheck.valid && (
              <div className="mb-2 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  Salaire de base journalier inférieur au SMIG (
                  {formatSalary(smigCheck.smig, currency)}/j) — Art. 923, nul de plein droit (Art.
                  37)
                </span>
              </div>
            )}
            <div className="space-y-3">
              {bulletinSections.map((section) => (
                <BulletinSection
                  key={section.title}
                  title={section.title}
                  lines={section.lines}
                  groups={section.groups}
                  footer={section.footer}
                  grandSummary={section.grandSummary}
                  currency={currency}
                  formatSalary={formatSalary}
                  compactTotals={compactTotals}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card
            className={cn(
              "flex flex-col",
              !stacked && "lg:max-h-[min(75vh,calc(100dvh-12rem))] lg:overflow-hidden"
            )}
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
              <h2 className="text-base font-semibold uppercase tracking-wide text-white">
                {bulletinOnly ? "Bulletin de paie" : "Bulletin simulé"}
              </h2>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span className="shrink-0">Devise</span>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                  className="input min-w-[8.5rem] py-1.5 text-sm text-white"
                  aria-label="Devise du bulletin"
                >
                  <option value="CDF">CDF</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pt-4">
              {!smigCheck.valid && (
                <div className="mb-4 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  <Info className="h-5 w-5 shrink-0" />
                  <span>
                    Salaire de base journalier inférieur au SMIG (
                    {formatSalary(smigCheck.smig, currency)}/j) — Art. 923, nul de plein droit (Art.
                    37)
                  </span>
                </div>
              )}
              <div className="space-y-6">
                {bulletinSections.map((section) => (
                  <BulletinSection
                    key={section.title}
                    title={section.title}
                    lines={section.lines}
                    groups={section.groups}
                    footer={section.footer}
                    grandSummary={section.grandSummary}
                    currency={currency}
                    formatSalary={formatSalary}
                    compactTotals={compactTotals}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </fieldset>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

type BulletinLineType =
  | "gain"
  | "deduction"
  | "info"
  | "subtotal"
  | "total"
  | "net"
  | "charge"
  | "cost"
  | "deductionSummary"
  | "employeeDeduction";

type BulletinLine = {
  label: string;
  value: number;
  type: BulletinLineType;
  formula?: string;
};

type BulletinSectionConfig = {
  title: string;
  lines?: BulletinLine[];
  groups?: { title: string; lines: BulletinLine[] }[];
  footer?: { label: string; value: number; formula?: string };
  grandSummary?: {
    label: string;
    items: { label: string; value: number; tone: "net" | "deduction" | "charge" }[];
    total: { label: string; value: number; formula?: string };
  };
};

function BulletinSection({
  title,
  lines = [],
  groups,
  footer,
  grandSummary,
  currency,
  formatSalary,
  compactTotals = false,
}: BulletinSectionConfig & {
  currency: Currency;
  formatSalary: (amount: number, currency?: Currency) => string;
  compactTotals?: boolean;
}) {
  const hasContent =
    lines.length > 0 || (groups?.length ?? 0) > 0 || footer || grandSummary;
  if (!hasContent) return null;

  return (
    <section>
      <div className={cn("flex items-center gap-2", compactTotals ? "mb-1.5" : "mb-3 gap-3")}>
        <h3
          className={cn(
            "shrink-0 font-semibold uppercase tracking-wider text-slate-500",
            compactTotals ? "text-[10px]" : "text-[11px]"
          )}
        >
          {title}
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      {groups ? (
        <div className={compactTotals ? "space-y-2" : "space-y-4"}>
          {groups.map((group) => (
            <div key={group.title}>
              <p
                className={cn(
                  "mb-0.5 font-semibold uppercase tracking-wider text-slate-600",
                  compactTotals ? "px-0 text-[9px]" : "mb-1 px-3 text-[10px]"
                )}
              >
                {group.title}
              </p>
              {group.lines.map((line, idx) => (
                <BulletinLineRow
                  key={`${group.title}-${line.label}-${idx}`}
                  line={line}
                  currency={currency}
                  formatSalary={formatSalary}
                  compact={compactTotals}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {lines.map((line, idx) => (
            <BulletinLineRow
              key={`${line.label}-${idx}`}
              line={line}
              currency={currency}
              formatSalary={formatSalary}
              compact={compactTotals}
            />
          ))}
        </div>
      )}
      {footer && (
        <div
          className={cn(
            "border-t border-white/10",
            compactTotals ? "mt-1.5 px-0 pt-2" : "mt-2 px-3 pt-3"
          )}
        >
          <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {footer.label}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
              {formatSalary(footer.value, currency)}
            </span>
          </div>
        </div>
      )}
      {grandSummary && (
        <div
          className={cn(
            "rounded-lg border border-sky-500/25 bg-sky-500/5",
            compactTotals ? "mt-2 p-2" : "mt-4 rounded-xl p-4"
          )}
        >
          <p
            className={cn(
              "font-semibold uppercase tracking-wider text-sky-300/90",
              compactTotals ? "mb-1.5 text-[10px]" : "mb-3 text-[11px]"
            )}
          >
            {grandSummary.label}
          </p>
          <div className={compactTotals ? "space-y-1" : "space-y-2"}>
            {grandSummary.items.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-4">
                <span className={compactTotals ? "text-xs text-slate-400" : "text-sm text-slate-400"}>
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    compactTotals ? "text-sm" : "text-base",
                    item.tone === "net"
                      ? "text-emerald-400"
                      : item.tone === "deduction"
                        ? "text-red-400/90"
                        : "text-slate-200"
                  )}
                >
                  {formatSalary(item.value, currency)}
                </span>
              </div>
            ))}
          </div>
          <div className={cn("border-t border-sky-500/20", compactTotals ? "mt-1.5 pt-1.5" : "mt-3 pt-3")}>
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={cn(
                  "font-bold uppercase tracking-wide text-sky-300",
                  compactTotals ? "text-xs" : "text-sm"
                )}
              >
                {grandSummary.total.label}
              </span>
              <span
                className={cn(
                  "shrink-0 font-bold tabular-nums text-sky-300",
                  compactTotals ? "text-base" : "text-xl"
                )}
              >
                {formatSalary(grandSummary.total.value, currency)}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BulletinLineRow({
  line,
  currency,
  formatSalary,
  compact = false,
}: {
  line: BulletinLine;
  currency: Currency;
  formatSalary: (amount: number, currency?: Currency) => string;
  compact?: boolean;
}) {
  const showMinus =
    line.type === "deduction" || (line.type === "subtotal" && line.value < 0);

  const isEmphasis =
    line.type === "total" ||
    line.type === "net" ||
    line.type === "subtotal" ||
    line.type === "deductionSummary";

  const valueClass =
    line.type === "deduction"
      ? "text-red-400/90"
      : line.type === "deductionSummary" || line.type === "employeeDeduction"
        ? "text-red-400/90"
        : line.type === "net"
          ? "text-emerald-400 font-semibold"
          : line.type === "info"
            ? "text-slate-500"
            : line.type === "charge"
              ? "text-slate-300"
              : line.type === "total" || line.type === "subtotal"
                ? "text-white font-semibold"
                : "text-slate-200";

  return (
    <div
      className={cn(
        "flex justify-between gap-3 text-sm",
        compact ? "px-0 py-0.5" : "gap-4 px-3 py-1.5",
        isEmphasis && (compact ? "py-1 font-medium text-white" : "py-2 font-medium text-white"),
        !isEmphasis && "text-slate-400"
      )}
    >
      <div className="min-w-0 leading-snug">
        <span>{line.label}</span>
      </div>
      <span className={`shrink-0 tabular-nums ${valueClass}`}>
        {showMinus ? "− " : ""}
        {formatSalary(Math.abs(line.value), currency)}
      </span>
    </div>
  );
}
