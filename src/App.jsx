import { useState, useRef } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/predict";

const C = {
  bg:"#0F1117",surface:"#181C27",card:"#1E2235",border:"#2A2F45",
  borderHi:"#3D4460",text:"#E8EAF0",muted:"#8890A8",
  accent:"#4F8EF7",accentSoft:"#1C2E50",
  green:"#3DD68C",greenSoft:"#0D2B1E",
  amber:"#F5A623",amberSoft:"#2B1F06",
  red:"#F05252",redSoft:"#2A0F0F",
  purple:"#A78BFA",purpleSoft:"#1E1535",
  teal:"#2DD4BF",tealSoft:"#0D2B26",
};

const RISK_COLOR = { Low:C.green, Moderate:C.amber, High:C.red };
const RISK_BG    = { Low:C.greenSoft, Moderate:C.amberSoft, High:C.redSoft };

// ── Icon set ──────────────────────────────────────────────────────────────────
// Monochrome line icons (matches the header logo style) — used instead of
// colorful emoji throughout the app.
const ICON_PATHS = {
  flask:       <path d="M9 2h6M9 2v6.5L4 18a2 2 0 002 3h12a2 2 0 002-3l-5-9.5V2" />,
  helix:       <path d="M7 3c5 3 5 6 0 9s-5 6 0 9M17 3c-5 3-5 6 0 9s5 6 0 9M5 9.5h14M5 14.5h14" />,
  bolt:        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  pill:        <><path d="M5 12 12 5a4.95 4.95 0 117 7l-7 7a4.95 4.95 0 01-7-7z" /><path d="M9.5 7.5l7 7" /></>,
  heart:       <path d="M12 21s-7.5-4.7-10-9.5C.5 7.8 3 4 7 4c2 0 4 1.3 5 3 1-1.7 3-3 5-3 4 0 6.5 3.8 5 7.5C19.5 16.3 12 21 12 21z" />,
  drop:        <path d="M12 2C8 8 5 11.5 5 15.2 5 19 8.1 22 12 22s7-3 7-6.8C19 11.5 16 8 12 2z" />,
  liver:       <path d="M4 9c0-3.3 3.6-6 9-6 5 0 7 2.5 7 6 0 4-3 8-9 9-3.5.6-7-1.7-7-5 0-1.5.6-2.8 0-4z" />,
  flame:       <path d="M12 2c2.5 4-1 5.3-1 8.3a3 3 0 106 0c0-1.6-.8-2.4-1.5-3.3 1 2.6-.6 3.6-1.5 3.6-1.4 0-1.5-1.5-1.5-3 0-1.7 1-2.6-.5-5.6z" />,
  stethoscope: <path d="M6 3v6a4 4 0 008 0V3M10 13v2a5 5 0 0010 0v-1.5M19.5 11.5a2 2 0 100-4 2 2 0 000 4z" />,
  scale:       <path d="M12 3v4M5 8h14M5 8l-2.5 6a3 3 0 006 0L5 8M19 8l-2.5 6a3 3 0 006 0L19 8M9 21h6" />,
  box:         <path d="M3 8l9-5 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9" />,
  book:        <path d="M4 4.5A2.5 2.5 0 016.5 2H11a3 3 0 013 3v15.5a2.5 2.5 0 00-2.5-2.5H4zM20 4.5A2.5 2.5 0 0017.5 2H13a3 3 0 00-3 3v15.5A2.5 2.5 0 0112.5 18H20z" />,
  warning:     <path d="M12 3 2 20h20zM12 9.5v4.5M12 17h.01" />,
  check:       <path d="M4 12.5 9 18 20 6" />,
};

function Icon({ name, color = C.text, size = 18, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}

const MODELS = {
  clinical: {
    key:"clinical", label:"Clinical",
    icon:"flask", color:C.accent, soft:C.accentSoft,
    desc:"14 clinical biomarkers only — no miRNA required",
    mirnaPct:0,
  },
  mirna: {
    key:"mirna", label:"miRNA-Aware",
    icon:"helix", color:C.purple, soft:C.purpleSoft,
    desc:"Research-calibrated miRNA distributions (PMC8492848, PMC11942408)",
    mirnaPct:15,
  },
  ensemble: {
    key:"ensemble", label:"Combined",
    icon:"bolt", color:C.teal, soft:C.tealSoft,
    desc:"35% Clinical RF + 65% miRNA XGBoost — recommended",
    mirnaPct:10,
  },
};

const CLINICAL_FIELDS = [
  {key:"ldl_cholesterol",label:"LDL Cholesterol",unit:"mg/dL",min:50,max:300,step:1,ref:"<100 optimal",hi:185,lo:88},
  {key:"triglycerides",label:"Triglycerides",unit:"mg/dL",min:50,max:600,step:1,ref:"<150 normal",hi:280,lo:95},
  {key:"hba1c",label:"HbA1c",unit:"%",min:4,max:12,step:0.1,ref:"<5.7 normal",hi:7.2,lo:5.1},
  {key:"fasting_glucose",label:"Fasting Glucose",unit:"mg/dL",min:60,max:300,step:1,ref:"<100 normal",hi:148,lo:82},
  {key:"hdl_cholesterol",label:"HDL Cholesterol",unit:"mg/dL",min:20,max:100,step:1,ref:">45 desired",hi:32,lo:72},
  {key:"bmi",label:"BMI",unit:"",min:16,max:50,step:0.1,ref:"18.5–24.9 normal",hi:36.5,lo:22.3},
  {key:"systolic_bp",label:"Systolic BP",unit:"mmHg",min:80,max:200,step:1,ref:"<120 normal",hi:148,lo:112},
  {key:"crp",label:"CRP",unit:"mg/L",min:0,max:20,step:0.1,ref:"<1.0 low risk",hi:5.5,lo:0.6},
];

const MIRNA_FIELDS = [
  {key:"miR_122",label:"miR-122",sub:"Lipid metabolism & Fatty liver (↑ in MetSyn)",min:0.1,max:6,step:0.01,hi:2.4,lo:0.8},
  {key:"miR_33", label:"miR-33", sub:"Cholesterol & HDL (↓ DOWNREGULATED in MetSyn)",min:0.1,max:6,step:0.01,hi:0.6,lo:1.1},
  {key:"miR_21", label:"miR-21", sub:"Chronic inflammation (↑ in MetSyn)",min:0.1,max:6,step:0.01,hi:2.0,lo:0.9},
  {key:"miR_103",label:"miR-103",sub:"Insulin resistance & Glucose (↑ in MetSyn)",min:0.1,max:6,step:0.01,hi:2.3,lo:0.8},
  {key:"miR_34a",label:"miR-34a",sub:"Obesity metabolic stress — strongest signal (↑ in MetSyn)",min:0.1,max:6,step:0.01,hi:2.2,lo:0.7},
];

// ── Therapeutic mapping (from research database) ─────────────────────────────
const THERAPEUTIC_MAP = {
  miR_122: {
    name: "miR-122",
    pathway: "Lipid metabolism & Fatty liver",
    phenotype: "Hepatic Dyslipidemia Phenotype",
    icon: "liver",
    riskDirection: "up",
    threshold: 1.5,
    conventional: {
      drugs: ["Atorvastatin (Lipitor)", "Rosuvastatin", "High-dose Omega-3 Fatty Acids"],
      mechanism: "Statins inhibit HMG-CoA reductase, reducing hepatic cholesterol synthesis. Omega-3s reduce VLDL triglyceride secretion.",
      note: "First-line standard of care for dyslipidaemia."
    },
    targeted: {
      therapy: "Miravirsen / RG-125 (Anti-miR-122)",
      stage: "Phase II trials",
      mechanism: "Antisense oligonucleotide that silences miR-122 expression in hepatocytes, restoring lipid homeostasis.",
      delivery: "Lipid Nanoparticles (LNPs) — high feasibility via endogenous ApoE-mediated hepatic targeting.",
      ref: "Esau et al., 2006; Kulkarni et al., 2021"
    },
    target_tissue: "Liver",
    clinical_insight: "High delivery feasibility via standard LNPs due to natural hepatic tropism. Most clinically advanced miRNA therapeutic target.",
  },
  miR_33: {
    name: "miR-33",
    pathway: "Cholesterol regulation & HDL levels",
    phenotype: "Low HDL & Atherosclerosis Risk",
    icon: "drop",
    riskDirection: "down",
    threshold: 0.9,
    conventional: {
      drugs: ["Fenofibrate (Lipanthyl)", "Gemfibrozil"],
      mechanism: "Fibrates activate PPARα, increasing fatty acid oxidation and raising HDL-C while reducing triglycerides.",
      note: "miR-33 is DOWNREGULATED in MetSyn — low values indicate risk."
    },
    targeted: {
      therapy: "Anti-miR-33 Oligonucleotides",
      stage: "Preclinical / Early trials",
      mechanism: "Inhibition of miR-33 markedly increases ABCA1 expression, accelerating reverse cholesterol transport and boosting HDL ('good' cholesterol).",
      delivery: "Targeted to Macrophages & Liver via lipid carriers.",
      ref: "Rayner et al., 2011"
    },
    target_tissue: "Macrophages & Liver",
    clinical_insight: "ABCA1 upregulation is the key mechanism — restoring the reverse cholesterol transport pathway that MetSyn patients lose.",
  },
  miR_21: {
    name: "miR-21",
    pathway: "Chronic low-grade inflammation",
    phenotype: "Inflammation & Tissue Fibrosis",
    icon: "flame",
    riskDirection: "up",
    threshold: 1.5,
    conventional: {
      drugs: ["Lisinopril (Zestril — ACE Inhibitor)", "Curcumin supplements (high dose)"],
      mechanism: "ACE inhibitors reduce inflammatory cytokine cascades via angiotensin II suppression. Curcumin inhibits NF-κB signalling.",
      note: "Targets secondary cardiovascular and renal tissue damage from chronic metabolic inflammation."
    },
    targeted: {
      therapy: "RG-012 (Anti-miR-21)",
      stage: "Phase II trials (Alport syndrome / fibrosis)",
      mechanism: "Anti-miR-21 prevents tissue fibrosis and remodelling in cardiovascular and renal tissues exposed to chronic metabolic stress.",
      delivery: "Cardiovascular & Renal tissue delivery — under active investigation.",
      ref: "Chau et al., 2012; PMC11942408"
    },
    target_tissue: "Cardiovascular & Renal tissues",
    clinical_insight: "Addresses the downstream fibrosis that conventional metabolic treatments ignore. Critical for preventing end-organ damage in advanced MetSyn.",
  },
  miR_103: {
    name: "miR-103",
    pathway: "Insulin resistance & Glucose regulation",
    phenotype: "Severe Insulin Resistance Phenotype",
    icon: "stethoscope",
    riskDirection: "up",
    threshold: 1.4,
    conventional: {
      drugs: ["Metformin (Glucophage)", "Pioglitazone (Actos — TZD class)"],
      mechanism: "Metformin activates AMPK, reducing hepatic glucose output. Pioglitazone (TZD) improves peripheral insulin sensitivity via PPARγ.",
      note: "Combination addresses both hepatic glucose overproduction and peripheral resistance."
    },
    targeted: {
      therapy: "Antagomir-103 (Anti-miR-103)",
      stage: "Preclinical",
      mechanism: "Restores Caveolin-1 expression in skeletal muscle, reactivating insulin receptor signalling and glucose uptake.",
      delivery: "Major challenge: non-fenestrated muscle capillaries block standard LNPs. Requires advanced extra-hepatic nano-carriers.",
      ref: "Trajkovski et al., 2011"
    },
    target_tissue: "Skeletal Muscle & Adipose tissue",
    clinical_insight: "Delivery to muscle is the key unsolved challenge in this pathway. Current research focuses on exosome-based and receptor-targeted nanocarriers.",
  },
  miR_34a: {
    name: "miR-34a",
    pathway: "Obesity-induced metabolic stress",
    phenotype: "Severe Obesity & Adipose Tissue Senescence",
    icon: "scale",
    riskDirection: "up",
    threshold: 1.5,
    conventional: {
      drugs: ["Semaglutide (Ozempic) — GLP-1 agonist", "Tirzepatide (Mounjaro) — GLP-1/GIP dual agonist"],
      mechanism: "GLP-1/GIP agonists reduce appetite centrally, slow gastric emptying, and promote insulin secretion. Tirzepatide also activates GIP receptor for additive fat reduction.",
      note: "Strongest weight-loss drugs currently available. Directly targets the obesity driver of miR-34a upregulation."
    },
    targeted: {
      therapy: "MRX34 / miR-34a Inhibitors",
      stage: "Phase I trials (oncology); MetSyn application preclinical",
      mechanism: "Inhibiting miR-34a reverses adipose tissue cellular senescence and lipotoxicity — restoring normal adipokine secretion and insulin sensitivity.",
      delivery: "Adipose tissue targeting via LNPs under investigation.",
      ref: "PMC12670128; Beg et al., 2017"
    },
    target_tissue: "Adipose Tissue (visceral fat)",
    clinical_insight: "Strongest miRNA signal in the model (log2FC = 3.29). Strongly upregulated in visceral fat during morbid obesity. Drives the senescence-inflammation cycle.",
  },
};



// ── Risk indicator cards ──────────────────────────────────────────────────────
// Each card pairs one clinical biomarker with its matching ML miRNA, combined
// with the SAME 35% clinical / 65% miRNA weighting already used by the
// Ensemble model (see MODELS.ensemble) — not a plain OR/AND boolean.
// miRNA threshold/direction is read from THERAPEUTIC_MAP (single source of truth).
const CLINICAL_WEIGHT = 0.35, MIRNA_WEIGHT = 0.65;

const RISK_CARD_DEFS = [
  { id: "risk_fatty_liver", mirKey: "miR_122", icon: "liver", color: C.amber,
    riskTitle: "Lipid Metabolism & Fatty Liver Risk",
    clinical: { key: "triglycerides", riskDirection: "up", threshold: 200, label: "Triglycerides ≥ 200 mg/dL" },
    description: "Your biomolecular profile shows elevation in miR-122, indicating early-stage disruptions in lipid metabolism and an increased clinical risk for non-alcoholic fatty liver development." },
  { id: "risk_cholesterol", mirKey: "miR_33", icon: "drop", color: C.accent,
    riskTitle: "Cholesterol & HDL Dysregulation Risk",
    clinical: { key: "hdl_cholesterol", riskDirection: "down", threshold: 45, label: "HDL < 45 mg/dL" },
    description: "A significant drop in miR-33 levels (specifically below 0.9) points toward an active risk of lipid imbalance, marked by lower protective HDL levels and dysregulated cholesterol homeostasis (Source: PMC8492848)." },
  { id: "risk_inflammation", mirKey: "miR_21", icon: "flame", color: C.red,
    riskTitle: "Chronic Low-Grade Inflammation Risk",
    clinical: { key: "crp", riskDirection: "up", threshold: 3.0, label: "CRP ≥ 3.0 mg/L" },
    description: "Elevated levels of miR-21 are key cellular indicators of chronic, hidden metabolic inflammation. This underlying cellular stress can progressively damage vascular walls and accelerate metabolic deterioration." },
  { id: "risk_insulin_resistance", mirKey: "miR_103", icon: "stethoscope", color: C.teal,
    riskTitle: "Insulin Resistance & Glucose Intolerance Risk",
    clinical: { key: "hba1c", riskDirection: "up", threshold: 6.5, label: "HbA1c ≥ 6.5%" },
    description: "An increase in miR-103 directly reflects cellular insulin resistance and impaired glucose management. This metabolic shift increases the long-term risk of transitioning into pre-diabetes or Type 2 Diabetes." },
  { id: "risk_obesity_stress", mirKey: "miR_34a", icon: "scale", color: C.purple,
    riskTitle: "Severe Obesity & Metabolic Stress Risk",
    clinical: { key: "bmi", riskDirection: "up", threshold: 30, label: "BMI ≥ 30" },
    description: "Your results show an elevation in miR-34a, which represents the strongest metabolic stress signal. This indicator is strongly linked to progressive adipose (fat) tissue dysfunction and systemic metabolic suppression." },
];

const RISK_CARDS = RISK_CARD_DEFS.map(c => {
  const t = THERAPEUTIC_MAP[c.mirKey];
  const isUp = t.riskDirection === "up";
  return {
    ...c,
    subTitle: t.pathway,
    mirna: { key: c.mirKey, riskDirection: t.riskDirection, threshold: t.threshold,
             label: `${t.name} (${isUp ? "Elevated" : "Decreased"} — ${isUp ? ">" : "<"} ${t.threshold})` },
  };
});

// Pure, typed predicate — no eval() of condition strings.
function evalRule(rule, values) {
  const v = values[rule.key];
  if (v == null || isNaN(v)) return false;
  return rule.riskDirection === "up" ? v > rule.threshold : v < rule.threshold;
}

// Combined risk score: 0, 35, 65 or 100 — mirrors the Ensemble model's
// 35/65 weighting instead of a plain OR/AND boolean.
function riskCardScore(card, values) {
  const clinicalHit = evalRule(card.clinical, values);
  const mirnaHit = evalRule(card.mirna, values);
  return (clinicalHit ? CLINICAL_WEIGHT : 0) + (mirnaHit ? MIRNA_WEIGHT : 0);
}

const ALL_FIELDS = [...CLINICAL_FIELDS, ...MIRNA_FIELDS];
const ATP3_LABELS = {
  high_bmi:"BMI ≥ 30",high_triglycerides:"Triglycerides ≥ 150 mg/dL",
  low_hdl:"HDL < 45 mg/dL",high_bp:"Systolic BP ≥ 130 mmHg",
  high_glucose:"Fasting Glucose ≥ 100 mg/dL",
};

function fmt(k){ return k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }

// ── Mock prediction (demo mode) ───────────────────────────────────────────────
function mockAll(form) {
  const score=(form.bmi>=30?1:0)+(form.triglycerides>=150?1:0)+
              (form.hdl_cholesterol<45?1:0)+(form.systolic_bp>=130?1:0)+(form.fasting_glucose>=100?1:0);
  const dir = v => v>0?"increases risk":"decreases risk";

  const clinProb = Math.min(0.97,Math.max(0.03,score/5+(Math.random()-0.5)*0.04));
  const mirScore = (
    (form.miR_122>1.5?1:0)*0.25+(form.miR_33<0.9?1:0)*0.25+
    (form.miR_21>1.5?1:0)*0.20+(form.miR_103>1.4?1:0)*0.15+(form.miR_34a>1.5?1:0)*0.15
  );
  const mirProb  = Math.min(0.97,Math.max(0.03,(score/5)*0.5+(mirScore)*0.5+(Math.random()-0.5)*0.04));
  const ensProb  = 0.35*clinProb + 0.65*mirProb;

  const clinShap = [
    {feature:"bmi",value:form.bmi,shap_value:+((form.bmi-25)/100).toFixed(4)},
    {feature:"triglycerides",value:form.triglycerides,shap_value:+((form.triglycerides-150)/2000).toFixed(4)},
    {feature:"fasting_glucose",value:form.fasting_glucose,shap_value:+((form.fasting_glucose-100)/1500).toFixed(4)},
    {feature:"hdl_cholesterol",value:form.hdl_cholesterol,shap_value:+((45-form.hdl_cholesterol)/600).toFixed(4)},
    {feature:"systolic_bp",value:form.systolic_bp,shap_value:+((form.systolic_bp-130)/1500).toFixed(4)},
  ].sort((a,b)=>Math.abs(b.shap_value)-Math.abs(a.shap_value)).slice(0,5).map(f=>({...f,direction:dir(f.shap_value)}));

  const mirShap = [
    {feature:"miR_34a",value:form.miR_34a,shap_value:+((form.miR_34a-1.5)/25).toFixed(4)},
    {feature:"miR_103",value:form.miR_103,shap_value:+((form.miR_103-1.5)/28).toFixed(4)},
    {feature:"miR_122",value:form.miR_122,shap_value:+((form.miR_122-1.5)/25).toFixed(4)},
    {feature:"miR_33", value:form.miR_33, shap_value:+((0.9-form.miR_33)/25).toFixed(4)},
    {feature:"miR_21", value:form.miR_21, shap_value:+((form.miR_21-1.5)/28).toFixed(4)},
  ].sort((a,b)=>Math.abs(b.shap_value)-Math.abs(a.shap_value)).slice(0,5).map(f=>({...f,direction:dir(f.shap_value)}));

  const mkResult = (prob, top, modelKey) => {
    const pred=prob>=0.5?1:0;
    const risk=prob<0.35?"Low":prob<0.65?"Moderate":"High";
    const m=MODELS[modelKey];
    // Build shap_values dict so TherapyPage can read miRNA SHAP scores
    const sv={};
    top.forEach(f=>{sv[f.feature]=f.shap_value;});
    return {prediction:pred,label:pred?"Has Metabolic Syndrome":"No Metabolic Syndrome",
            probability:+prob.toFixed(4),risk_level:risk,
            confidence_pct:+((pred?prob:1-prob)*100).toFixed(1),
            top_factors:top,shap_values:sv,
            model_name:m.label,model_auc:1.0,
            mirna_importance:m.mirnaPct};
  };

  const ensTop=[...mirShap,...clinShap.filter(f=>!mirShap.find(m=>m.feature===f.feature))]
                .sort((a,b)=>Math.abs(b.shap_value)-Math.abs(a.shap_value)).slice(0,5);

  return {
    _demo:true,
    atp3_criteria:{high_bmi:form.bmi>=30,high_triglycerides:form.triglycerides>=150,
                   low_hdl:form.hdl_cholesterol<45,high_bp:form.systolic_bp>=130,
                   high_glucose:form.fasting_glucose>=100},
    atp3_criteria_met:score,
    clinical:mkResult(clinProb,clinShap,"clinical"),
    mirna:   mkResult(mirProb, mirShap, "mirna"),
    ensemble:mkResult(ensProb, ensTop,  "ensemble"),
  };
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
function RiskGauge({ probability, riskLevel, animated, size=200 }) {
  const pct  = Math.round(probability*100);
  const color= RISK_COLOR[riskLevel]||C.accent;
  const cx=110,cy=110,R=90;
  const ptOnArc=(p,r=R)=>{const a=-Math.PI+p*Math.PI;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  const arc=(p0,p1,s,o=1)=>{const[x0,y0]=ptOnArc(p0);const[x1,y1]=ptOnArc(p1);
    return <path d={`M${x0},${y0} A${R},${R},0,0,1,${x1},${y1}`} fill="none" stroke={s} strokeWidth="11" strokeLinecap="round" opacity={o}/>;};
  const[nx,ny]=ptOnArc(probability,74);
  const[llx,lly]=ptOnArc(0.10,60);
  const[mlx,mly]=ptOnArc(0.50,60);
  const[hlx,hly]=ptOnArc(0.90,60);
  return (
    <div style={{width:"100%",maxWidth:size}}>
      <svg viewBox="0 0 220 120" width="100%" height="auto" style={{display:"block"}}>
        {arc(0,0.33,C.greenSoft)}{arc(0.33,0.67,C.amberSoft)}{arc(0.67,1,C.redSoft)}
        {arc(0,0.33,C.green)}{arc(0.33,0.67,C.amber)}{arc(0.67,1,C.red)}
        {arc(0,Math.max(0.01,probability),color,0.28)}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.15"/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round"
              style={{transition:animated?"all 0.9s cubic-bezier(0.34,1.56,0.64,1)":"none"}}/>
        <circle cx={cx} cy={cy} r="6" fill={C.card} stroke={color} strokeWidth="2"/>
        <circle cx={cx} cy={cy} r="2.5" fill={color}/>
        <text x={cx} y={cy-22} textAnchor="middle" fill={color} fontFamily="monospace" fontSize="28" fontWeight="700">{pct}%</text>
        <text x={cx} y={cy-8}  textAnchor="middle" fill={C.muted} fontFamily="Arial,sans-serif" fontSize="9" letterSpacing="1.5">PROBABILITY</text>
        <text x={llx} y={lly+4} textAnchor="middle" fill={C.green} fontFamily="Arial,sans-serif" fontSize="10" fontWeight="600">Low</text>
        <text x={mlx} y={mly+4} textAnchor="middle" fill={C.amber} fontFamily="Arial,sans-serif" fontSize="10" fontWeight="600">Moderate</text>
        <text x={hlx} y={hly+4} textAnchor="middle" fill={C.red}   fontFamily="Arial,sans-serif" fontSize="10" fontWeight="600">High</text>
      </svg>
    </div>
  );
}

// ── ShapBar ───────────────────────────────────────────────────────────────────
function ShapBar({value,max}){
  const pct=Math.min(100,Math.abs(value)/max*100);
  const color=value>0?C.red:C.green;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3,transition:"width 0.6s"}}/>
      </div>
      <span style={{fontSize:11,color,fontFamily:"monospace",minWidth:54,textAlign:"right"}}>
        {value>0?"+":""}{value.toFixed(4)}
      </span>
    </div>
  );
}

// ── RiskIndicatorsPanel ───────────────────────────────────────────────────────
function RiskIndicatorsPanel({ values }) {
  const scored = RISK_CARDS
    .map(c => ({
      ...c,
      score: riskCardScore(c, values),
      clinicalHit: evalRule(c.clinical, values),
      mirnaHit: evalRule(c.mirna, values),
    }))
    .filter(c => c.score > 0);

  if (!scored.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>
        <Icon name="warning" color={C.amber} size={16} />
        Risk Indicators Detected ({scored.length})
      </div>
      {scored.map(c => {
        const pct = Math.round(c.score * 100);
        const scoreColor = pct >= 100 ? C.red : C.amber;
        return (
          <div key={c.id} style={{
            background: C.card, border: `1px solid ${scoreColor}40`,
            borderRadius: 12, padding: "14px 18px", marginBottom: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Icon name={c.icon} color={c.color} size={22} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{c.riskTitle}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{c.subTitle}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor }}>{pct}%</div>
                <div style={{ fontSize: 9, color: C.muted }}>combined risk</div>
              </div>
            </div>

            {/* Weighted contribution bar — mirrors the Ensemble model's bar */}
            <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 8, display: "flex" }}>
              <div style={{ width: `${c.clinicalHit ? CLINICAL_WEIGHT * 100 : 0}%`, background: C.accent }} />
              <div style={{ width: `${c.mirnaHit ? MIRNA_WEIGHT * 100 : 0}%`, background: c.color }} />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: c.clinicalHit ? 700 : 400,
                color: c.clinicalHit ? C.accent : C.muted,
                background: c.clinicalHit ? C.accentSoft : C.surface,
                border: `1px solid ${c.clinicalHit ? C.accent : C.border}40`,
                borderRadius: 5, padding: "2px 8px",
              }}>{c.clinicalHit ? "✓" : "—"} Clinical (35%): {c.clinical.label}</span>
              <span style={{
                fontSize: 10, fontWeight: c.mirnaHit ? 700 : 400,
                color: c.mirnaHit ? c.color : C.muted,
                background: c.mirnaHit ? `${c.color}1a` : C.surface,
                border: `1px solid ${c.mirnaHit ? c.color : C.border}40`,
                borderRadius: 5, padding: "2px 8px",
              }}>{c.mirnaHit ? "✓" : "—"} miRNA (65%): {c.mirna.label}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{c.description}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── TherapyCard component ────────────────────────────────────────────────────
function TherapyCard({ mirKey, data, shapValue, rank }) {
  const [expanded, setExpanded] = useState(false);
  // Safe when value is null (miRNA not in top 5 SHAP factors)
  const hasValue = data.value != null;
  const isRisk = hasValue
    ? (data.riskDirection === "up" ? data.value > data.threshold : data.value < data.threshold)
    : false;

  const dirColor = isRisk ? C.red : C.green;
  const dirBg    = isRisk ? C.redSoft : C.greenSoft;
  const v = hasValue ? data.value.toFixed(2) + "×" : null;
  const statusText = v === null
    ? "Low SHAP impact — not in top 5 factors"
    : data.riskDirection === "up"
      ? (isRisk ? `↑ ${v} — Upregulated (risk)` : `${v} — Normal range`)
      : (isRisk ? `↓ ${v} — Downregulated (risk)` : `${v} — Normal range`);

  return (
    <div style={{
      background: C.card, border: `1px solid ${isRisk ? dirColor + "50" : C.border}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 12,
      boxShadow: isRisk ? `0 0 12px ${dirColor}18` : "none",
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: "14px 18px", cursor: "pointer",
          background: `linear-gradient(90deg, ${isRisk ? dirColor + "12" : C.accentSoft + "60"} 0%, transparent 100%)`,
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        {/* Rank badge */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: isRisk ? dirColor : C.green, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff",
        }}>#{rank}</div>

        {/* Icon + name */}
        <Icon name={data.icon} color={isRisk ? dirColor : C.accent} size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{data.name}</span>
            <span style={{ fontSize: 11, color: C.muted }}>·</span>
            <span style={{ fontSize: 11, color: C.muted }}>{data.pathway}</span>
          </div>
          <div style={{ fontSize: 11, color: dirColor, fontWeight: 500, marginTop: 2 }}>
            {statusText}
          </div>
        </div>

        {/* SHAP bar mini */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontFamily: "monospace", color: shapValue===0?C.muted:dirColor, fontWeight: 600 }}>
            {shapValue===0 ? "—" : (shapValue > 0 ? "+" : "") + shapValue.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>{shapValue===0?"no SHAP data":"SHAP impact"}</div>
        </div>

        {/* Expand toggle */}
        <div style={{ fontSize: 16, color: C.muted, marginLeft: 4 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 18px 18px" }}>

          {/* Status bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8, marginBottom: 14,
            background: dirBg, border: `1px solid ${dirColor}30`,
            fontSize: 12, color: dirColor, fontWeight: 500,
          }}>
            {!isRisk && <Icon name="check" color={dirColor} size={14} />}
            {isRisk
              ? `This miRNA is in the pathological range and is actively contributing to MetSyn risk.`
              : `This miRNA is within normal range and is not currently a risk driver.`}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

            {/* Conventional therapy */}
            <div style={{
              background: C.surface, borderRadius: 10,
              border: `1px solid ${C.border}`, padding: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.accent, fontWeight: 700,
                            letterSpacing: "0.5px", marginBottom: 10 }}>
                <Icon name="pill" color={C.accent} size={13} /> CONVENTIONAL THERAPY (Available Now)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {data.conventional.drugs.map((drug, i) => (
                  <div key={i} style={{
                    fontSize: 12, fontWeight: 600, color: C.text,
                    background: C.card, borderRadius: 6,
                    padding: "5px 10px", border: `1px solid ${C.border}`,
                  }}>{drug}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                {data.conventional.mechanism}
              </div>
              {data.conventional.note && (
                <div style={{
                  marginTop: 8, fontSize: 11,
                  color: data.name === "miR-33" ? C.amber : C.muted,
                  fontStyle: "italic",
                }}>{data.conventional.note}</div>
              )}
            </div>

            {/* Targeted / Gene therapy */}
            <div style={{
              background: C.surface, borderRadius: 10,
              border: `1px solid ${C.purple}40`, padding: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.purple, fontWeight: 700,
                            letterSpacing: "0.5px", marginBottom: 10 }}>
                <Icon name="helix" color={C.purple} size={13} /> TARGETED GENE THERAPY (Research / Trials)
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 4,
              }}>{data.targeted.therapy}</div>
              <div style={{
                display: "inline-block", fontSize: 10, color: C.amber,
                background: C.amberSoft, borderRadius: 4,
                padding: "2px 8px", marginBottom: 8, fontWeight: 600,
              }}>{data.targeted.stage}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>
                {data.targeted.mechanism}
              </div>
              <div style={{
                fontSize: 10, color: C.teal,
                background: C.tealSoft, borderRadius: 6,
                padding: "6px 10px", lineHeight: 1.5,
              }}>
                Delivery: {data.targeted.delivery}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
                Ref: {data.targeted.ref}
              </div>
            </div>
          </div>

          {/* Clinical insight */}
          <div style={{
            marginTop: 12, padding: "10px 14px",
            background: C.accentSoft, borderRadius: 8,
            border: `1px solid ${C.accent}30`,
          }}>
            <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>
              Clinical insight:{" "}
            </span>
            <span style={{ fontSize: 11, color: C.offwhite || C.text }}>
              {data.clinical_insight}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.muted }}>
            Primary target tissue: <span style={{ color: C.text, fontWeight: 600 }}>
              {data.target_tissue}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TherapyPage ───────────────────────────────────────────────────────────────
function TherapyPage({ result }) {
  if (!result) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon name="pill" color={C.muted} size={48} /></div>
      <div style={{ fontSize: 16, marginBottom: 8, color: C.text }}>No prediction yet</div>
      <div style={{ fontSize: 13 }}>Run a prediction first, then come back here to see personalised therapeutic recommendations.</div>
    </div>
  );

  // Get miRNA SHAP values from the ensemble result (most comprehensive)
  // Always read miRNA SHAP from the miRNA-Aware model — it is the only model
  // guaranteed to have SHAP values for all 5 miRNA features
  const ensembleSV = result.mirna?.shap_values
    || result.ensemble?.shap_values
    || {};
  const mirKeys = ["miR_122", "miR_33", "miR_21", "miR_103", "miR_34a"];

  // Rank miRNA by absolute SHAP impact
  const ranked = mirKeys
    .map(k => ({
      key: k,
      data: { ...THERAPEUTIC_MAP[k], value: null },
      shap: ensembleSV[k] || 0,
    }))
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));

  // Inject actual input values from the result (stored in top_factors)
  const inputVals = {};
  (result.ensemble?.top_factors || []).forEach(f => {
    inputVals[f.feature] = f.value;
  });

  // Count risk miRNAs
  const riskCount = ranked.filter(r => {
    const d = THERAPEUTIC_MAP[r.key];
    return d.riskDirection === "up" ? r.shap > 0 : r.shap < 0;
  }).length;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "18px 20px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              miRNA Therapeutic Recommendations
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              Based on the ensemble model's SHAP analysis, the miRNAs below are ranked by their
              impact on this patient's prediction. Each shows both conventional pharmacotherapy
              available today and experimental RNA-targeted gene therapies under clinical trials.
            </div>
          </div>
          {/* Summary badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "miRNAs analysed", val: "5", color: C.accent },
              { label: "In risk range", val: String(riskCount), color: C.red },
              { label: "In normal range", val: String(5 - riskCount), color: C.green },
            ].map(b => (
              <div key={b.label} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "8px 14px", textAlign: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: b.color }}>{b.val}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: 12, padding: "8px 12px",
          background: C.amberSoft, borderRadius: 7,
          border: `1px solid ${C.amber}30`, fontSize: 11, color: C.amber,
        }}>
          For research and educational use only. All therapeutic information is sourced from
          published clinical literature. This is not a prescription or clinical recommendation.
        </div>
      </div>

      {/* Ranked miRNA therapy cards */}
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, padding: "0 2px" }}>
        Ranked by SHAP impact (most influential first) · Click any card to expand treatment details
      </div>

      {ranked.map((r, i) => (
        <TherapyCard
          key={r.key}
          mirKey={r.key}
          data={{ ...THERAPEUTIC_MAP[r.key], value: inputVals[r.key] }}
          shapValue={r.shap}
          rank={i + 1}
        />
      ))}

      {/* Research note */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "16px 20px", marginTop: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>
          <Icon name="book" color={C.text} size={15} /> About RNA-Targeted Therapies
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {[
            { title: "Antisense Oligonucleotides", body: "Short synthetic DNA/RNA strands that bind and silence specific miRNAs. Most clinically advanced class." },
            { title: "Antagomirs", body: "Chemically modified oligonucleotides with enhanced stability and tissue penetration for miRNA inhibition." },
            { title: "Lipid Nanoparticles (LNPs)", body: "Primary delivery vehicle. Naturally target the liver via ApoE — ideal for miR-122 and miR-33." },
            { title: "Extra-hepatic Delivery Challenge", body: "Reaching muscle (miR-103) and adipose tissue (miR-34a) requires next-gen nano-carriers beyond standard LNPs." },
          ].map(item => (
            <div key={item.title} style={{
              background: C.surface, borderRadius: 8,
              border: `1px solid ${C.border}`, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ── Field ─────────────────────────────────────────────────────────────────────
function Field({f,value,onChange,error}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11,color:C.muted,fontWeight:500}}>
        {f.label}{f.unit?` (${f.unit})`:""}
        {f.ref&&<span style={{color:C.borderHi,marginLeft:6}}>{f.ref}</span>}
        {f.sub&&<span style={{display:"block",color:f.key==="miR_33"?C.amber:C.borderHi,marginTop:1}}>{f.sub}</span>}
      </label>
      <input type="number" value={value} min={f.min} max={f.max} step={f.step}
        onChange={e=>onChange(f.key,e.target.value)}
        style={{background:C.surface,border:`1px solid ${error?C.red:C.border}`,
                borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,
                width:"100%",outline:"none"}}
        onFocus={e=>e.target.style.borderColor=C.accent}
        onBlur={e=>e.target.style.borderColor=error?C.red:C.border}/>
      {error&&<span style={{fontSize:11,color:C.red}}>{error}</span>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({title,icon,color,children}){
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
      <div style={{padding:"11px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,background:`linear-gradient(90deg,${color}18 0%,transparent 100%)`}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontWeight:600,fontSize:13,color:C.text}}>{title}</span>
      </div>
      <div style={{padding:18}}>{children}</div>
    </div>
  );
}

// ── ModelResultPanel ──────────────────────────────────────────────────────────
function ModelResultPanel({result, modelKey, active, onSelect, atp3, atp3Met}){
  const m = MODELS[modelKey];
  const color = m.color;
  const isActive = active === modelKey;
  const maxShap = result ? Math.max(...result.top_factors.map(f=>Math.abs(f.shap_value)),0.01) : 0.01;

  return(
    <div onClick={()=>onSelect(modelKey)}
         style={{background:isActive?`${color}10`:C.card,
                 border:`${isActive?2:1}px solid ${isActive?color:C.border}`,
                 borderRadius:12,cursor:"pointer",transition:"all 0.2s",
                 overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,
                   borderBottom:`1px solid ${isActive?`${color}30`:C.border}`,
                   background:`linear-gradient(90deg,${color}18 0%,transparent 100%)`}}>
        <Icon name={m.icon} color={color} size={18} />
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:13,color:C.text}}>{m.label}</div>
          <div style={{fontSize:11,color:C.muted}}>{m.desc}</div>
        </div>
        {result&&(
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:700,color:RISK_COLOR[result.risk_level]}}>
              {result.probability*100 < 1 ? "<1" : Math.round(result.probability*100)}%
            </div>
            <div style={{fontSize:10,color:C.muted}}>probability</div>
          </div>
        )}
      </div>

      {/* Body — only full detail when active */}
      {result && (
        <div style={{padding:"14px 16px"}}>
          {isActive ? (
            <>
              {/* Full result */}
              <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"center",marginBottom:14}}>
                <RiskGauge probability={result.probability} riskLevel={result.risk_level} animated={true} size={180}/>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:16,fontWeight:700,color:RISK_COLOR[result.risk_level],marginBottom:8}}>
                    {result.label}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
                    {[{label:"Risk",value:result.risk_level,color:RISK_COLOR[result.risk_level]},
                      {label:"Confidence",value:`${result.confidence_pct}%`,color:C.text},
                      {label:"ATP-III",value:`${atp3Met}/5`,color:C.text},
                      {label:"miRNA weight",value:`${result.mirna_importance}%`,color:color}
                    ].map(b=>(
                      <div key={b.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px"}}>
                        <div style={{fontSize:10,color:C.muted}}>{b.label}</div>
                        <div style={{fontSize:13,fontWeight:600,color:b.color}}>{b.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>Model AUC: {result.model_auc}</div>
                </div>
              </div>

              {/* miRNA importance bar */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:6}}>miRNA contribution to decision</div>
                <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${result.mirna_importance}%`,height:"100%",
                               background:`linear-gradient(90deg,${color},${color}88)`,
                               borderRadius:4,transition:"width 0.8s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{fontSize:10,color:C.muted}}>Clinical features</span>
                  <span style={{fontSize:10,color:color,fontWeight:600}}>{result.mirna_importance}% miRNA</span>
                </div>
              </div>

              {/* SHAP */}
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Top contributing factors (SHAP)</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {result.top_factors.map((f,i)=>(
                  <div key={f.feature} style={{padding:"9px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5,flexWrap:"wrap",gap:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:10,color:C.muted,background:C.card,borderRadius:4,padding:"1px 5px"}}>#{i+1}</span>
                        <span style={{fontSize:12,fontWeight:600,color:C.text}}>{fmt(f.feature)}</span>
                        <span style={{fontSize:11,color:C.muted}}>= {f.value}</span>
                      </div>
                      <span style={{fontSize:10,color:f.shap_value>0?C.red:C.green,
                                    background:f.shap_value>0?C.redSoft:C.greenSoft,
                                    borderRadius:5,padding:"2px 7px",fontWeight:500}}>
                        {f.direction}
                      </span>
                    </div>
                    <ShapBar value={f.shap_value} max={maxShap}/>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Compact summary when not active */
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:RISK_COLOR[result.risk_level]}}>{result.label}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  Risk: {result.risk_level} · Confidence: {result.confidence_pct}%
                </div>
              </div>
              <div style={{width:60,height:32,background:RISK_BG[result.risk_level],
                           border:`1px solid ${RISK_COLOR[result.risk_level]}40`,
                           borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                           fontSize:14,fontWeight:700,color:RISK_COLOR[result.risk_level]}}>
                {Math.round(result.probability*100)}%
              </div>
            </div>
          )}
        </div>
      )}
      {!result && (
        <div style={{padding:"14px 16px",color:C.muted,fontSize:12}}>
          Run a prediction to see results here.
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const init = () => { const f={}; ALL_FIELDS.forEach(x=>{f[x.key]=""}); return f; };
  const [form,    setForm]    = useState(init());
  const [errors,  setErrors]  = useState({});
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState("form");
  const [active,  setActive]  = useState("ensemble");
  const resultRef = useRef(null);

  const change = (key,val) => { setForm(f=>({...f,[key]:val})); setErrors(e=>({...e,[key]:null})); };

  const loadDemo = type => {
    const f={}; ALL_FIELDS.forEach(x=>{f[x.key]=type==="high"?x.hi:x.lo});
    setForm(f); setErrors({});
  };

  // Raw form values (clinical + miRNA) used only for risk-card rules —
  // every rule references a field already collected above, no extra inputs.
  const riskCardValues = {};
  ALL_FIELDS.forEach(f => {
    const v = parseFloat(form[f.key]);
    if (!isNaN(v)) riskCardValues[f.key] = v;
  });

  const validate = () => {
    const e={};
    ALL_FIELDS.forEach(f=>{
      const v=parseFloat(form[f.key]);
      if(form[f.key]===""||isNaN(v)) e[f.key]="Required";
      else if(v<f.min||v>f.max) e[f.key]=`${f.min}–${f.max}`;
    });
    return e;
  };

  const submit = async () => {
    const errs=validate();
    if(Object.keys(errs).length){setErrors(errs);return;}
    const payload={}; ALL_FIELDS.forEach(f=>{payload[f.key]=parseFloat(form[f.key]);});
    setLoading(true);
    try {
      let data;
      try {
        const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},
                                        body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
        if(!res.ok) throw new Error();
        data=await res.json();
      } catch {
        await new Promise(r=>setTimeout(r,900));
        data=mockAll(payload);
      }
      setResult(data); setTab("result");
      setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth"}),120);
    } finally { setLoading(false); }
  };

  const errCount = Object.keys(errors).filter(k=>errors[k]).length;

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,
                 fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>

      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
                   padding:"14px 20px",display:"flex",alignItems:"center",
                   justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:C.accentSoft,
                       display:"flex",alignItems:"center",justifyContent:"center",
                       border:`1px solid ${C.accent}40`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke={C.accent} strokeWidth="2" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>MetSyn Predictor</div>
            <div style={{fontSize:11,color:C.muted}}>3-Model Comparison · Clinical | miRNA | Ensemble | Therapy Guide</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {Object.values(MODELS).map(m=>(
            <div key={m.key} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:m.color,background:`${m.color}15`,
                                     border:`1px solid ${m.color}40`,borderRadius:20,
                                     padding:"3px 10px"}}><Icon name={m.icon} color={m.color} size={12} /> {m.label}</div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex"}}>
        {[
          { key:"form",    label:"Patient Data",            disabled:false },
          { key:"result",  label:"Model Comparison Results", disabled:!result },
          { key:"therapy", label:"Therapeutic Guide",     disabled:!result, color:C.teal },
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} disabled={t.disabled}
                  style={{background:"transparent",border:"none",padding:"11px 18px",
                          color:tab===t.key?(t.color||C.accent):C.muted,
                          borderBottom:tab===t.key?`2px solid ${t.color||C.accent}`:"2px solid transparent",
                          cursor:t.disabled?"default":"pointer",
                          fontSize:13,fontWeight:tab===t.key?600:400,transition:"all 0.2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"20px 16px"}}>

        {/* ── FORM TAB ── */}
        {tab==="form"&&(
          <>
            <div style={{display:"flex",gap:8,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:C.muted}}>Quick fill:</span>
              <button onClick={()=>loadDemo("high")} style={{background:C.redSoft,border:`1px solid ${C.red}40`,color:C.red,borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:500,cursor:"pointer"}}>High-risk patient</button>
              <button onClick={()=>loadDemo("low")}  style={{background:C.greenSoft,border:`1px solid ${C.green}40`,color:C.green,borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:500,cursor:"pointer"}}>Healthy patient</button>
              <button onClick={()=>{setForm(init());setErrors({});setResult(null);}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>Clear</button>
            </div>

            <Card title="Clinical Biomarkers" icon={<Icon name="flask" color={C.accent} />} color={C.accent}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
                {CLINICAL_FIELDS.map(f=><Field key={f.key} f={f} value={form[f.key]} onChange={change} error={errors[f.key]}/>)}
              </div>
            </Card>

            <Card title="miRNA Expression (fold-change vs healthy baseline)" icon={<Icon name="helix" color={C.purple} />} color={C.purple}>
              <div style={{marginBottom:10,padding:"8px 12px",background:C.purpleSoft,borderRadius:7,fontSize:11,color:C.purple,border:`1px solid ${C.purple}30`}}>
                <strong>miR-33 is DOWNREGULATED in MetSyn</strong> — a value below 0.9 indicates risk (opposite to the other miRNAs). Source: PMC8492848.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
                {MIRNA_FIELDS.map(f=><Field key={f.key} f={f} value={form[f.key]} onChange={change} error={errors[f.key]}/>)}
              </div>
            </Card>

            {errCount>0&&(
              <div style={{padding:"9px 13px",background:C.redSoft,border:`1px solid ${C.red}40`,borderRadius:7,color:C.red,fontSize:12,marginBottom:12}}>
                Fix {errCount} field{errCount>1?"s":""} before running prediction.
              </div>
            )}
            <button onClick={submit} disabled={loading}
                    style={{width:"100%",padding:"13px",borderRadius:10,
                            background:loading?C.accentSoft:C.accent,
                            color:loading?C.muted:"#fff",border:"none",
                            fontSize:14,fontWeight:600,cursor:loading?"default":"pointer",letterSpacing:"0.3px"}}>
              {loading?"Running all 3 models…":"Run Prediction on All Models →"}
            </button>
          </>
        )}

        {/* ── RESULTS TAB ── */}
        {tab==="result"&&result&&(
          <div ref={resultRef}>
            {result._demo&&(
              <div style={{marginBottom:14,padding:"9px 13px",background:C.amberSoft,
                           border:`1px solid ${C.amber}40`,borderRadius:7,color:C.amber,fontSize:12}}>
                Demo mode — API not running. Results computed locally. Start FastAPI at localhost:8000 for real predictions.
              </div>
            )}

            {/* ATP-III shared header */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
                         padding:"16px 20px",marginBottom:16}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:10}}>
                ATP-III Diagnostic Criteria — shared across all models
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
                {Object.entries(result.atp3_criteria).map(([key,met])=>(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 11px",
                                         borderRadius:7,background:met?C.redSoft:C.greenSoft,
                                         border:`1px solid ${met?C.red:C.green}30`}}>
                    <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,
                                 background:met?C.red:C.green,display:"flex",
                                 alignItems:"center",justifyContent:"center",
                                 fontSize:10,color:"#fff",fontWeight:700}}>{met?"✕":"✓"}</div>
                    <div>
                      <div style={{fontSize:11,fontWeight:500,color:met?C.red:C.green}}>{ATP3_LABELS[key]}</div>
                      <div style={{fontSize:10,color:C.muted}}>{met?"Criterion met":"Within range"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <RiskIndicatorsPanel values={riskCardValues} />

            {/* Hint */}
            <div style={{fontSize:12,color:C.muted,marginBottom:12,padding:"0 2px"}}>
              Click a model panel to expand its full results and SHAP explanation.
            </div>

            {/* Three model panels */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {["ensemble","clinical","mirna"].map(key=>(
                <ModelResultPanel key={key} result={result[key]} modelKey={key}
                                  active={active} onSelect={setActive}
                                  atp3={result.atp3_criteria} atp3Met={result.atp3_criteria_met}/>
              ))}
            </div>

            {/* Comparison mini-table */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
                         padding:"16px 20px",marginTop:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:12}}>
                Side-by-side comparison
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      {["Model","Verdict","Probability","Risk level","Confidence","miRNA weight"].map(h=>(
                        <th key={h} style={{padding:"6px 12px",textAlign:"left",color:C.muted,fontWeight:500}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["clinical","mirna","ensemble"].map(key=>{
                      const r=result[key]; const m=MODELS[key];
                      return(
                        <tr key={key} style={{borderBottom:`1px solid ${C.border}20`,
                                              background:active===key?`${m.color}08`:"transparent"}}>
                          <td style={{padding:"8px 12px"}}>
                            <span style={{display:"inline-flex",alignItems:"center",gap:6,color:m.color,fontWeight:600}}><Icon name={m.icon} color={m.color} size={14} /> {m.label}</span>
                          </td>
                          <td style={{padding:"8px 12px",color:RISK_COLOR[r.risk_level],fontWeight:500}}>{r.label}</td>
                          <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:RISK_COLOR[r.risk_level]}}>{Math.round(r.probability*100)}%</td>
                          <td style={{padding:"8px 12px"}}>
                            <span style={{background:RISK_BG[r.risk_level],color:RISK_COLOR[r.risk_level],
                                          borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>{r.risk_level}</span>
                          </td>
                          <td style={{padding:"8px 12px",color:C.text}}>{r.confidence_pct}%</td>
                          <td style={{padding:"8px 12px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:60,height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                                <div style={{width:`${r.mirna_importance}%`,height:"100%",background:m.color,borderRadius:3}}/>
                              </div>
                              <span style={{color:m.color,fontSize:11,fontWeight:600}}>{r.mirna_importance}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={()=>setTab("form")}
                    style={{width:"100%",padding:"11px",borderRadius:9,background:"transparent",
                            color:C.muted,border:`1px solid ${C.border}`,fontSize:13,
                            cursor:"pointer",marginTop:12}}>← Edit patient data</button>
          </div>
        )}

        {/* ── THERAPY TAB ── */}
        {tab==="therapy"&&(
          <div>
            {result?._demo&&(
              <div style={{marginBottom:14,padding:"9px 13px",background:C.amberSoft,
                           border:`1px solid ${C.amber}40`,borderRadius:7,color:C.amber,fontSize:12}}>
                Demo mode — SHAP impact values are approximate. Start FastAPI at localhost:8000 for real predictions.
              </div>
            )}
            <TherapyPage result={result} />
            <button onClick={()=>setTab("result")}
                    style={{width:"100%",padding:"11px",borderRadius:9,background:"transparent",
                            color:C.muted,border:`1px solid ${C.border}`,fontSize:13,
                            cursor:"pointer",marginTop:12}}>← Back to Model Results</button>
          </div>
        )}
      </div>

      <div style={{textAlign:"center",padding:"20px",color:C.muted,fontSize:11,
                   borderTop:`1px solid ${C.border}`,marginTop:16}}>
        MetSyn Predictor · 3-Model · Clinical | miRNA-Aware | Ensemble · For research use only
      </div>
    </div>
  );
}
