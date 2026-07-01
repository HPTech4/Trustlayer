export type RiskLevel = 'low' | 'medium' | 'high';
export type FlagSeverity = 'warning' | 'danger' | 'pass' | 'info';

export interface SignalFlag {
  label: string;
  severity: FlagSeverity;
}

export interface ParsedExplanation {
  summary: string;
  detail: string;
  flags: SignalFlag[];
}

export interface FactorScore {
  label: string;
  score: number;
  weight: number;
}

export interface ConfidenceMeta {
  level: "high" | "medium" | "low";
  label: string;
  detail: string;
}

const RISK_HEX: Record<RiskLevel, string> = {
  low: '#1baf7a',
  medium: '#eda100',
  high: '#e34948',
};

export function riskHex(level: RiskLevel): string {
  return RISK_HEX[level];
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'High trust';
  if (score >= 60) return 'Moderate trust';
  if (score >= 40) return 'Low trust';
  return 'Very low trust';
}

export function confidenceForScore(score: number): ConfidenceMeta {
  if (score >= 75) {
    return {
      level: 'high',
      label: 'High confidence',
      detail: 'The scoring signal is strong and the explanation is supported by clear context.',
    };
  }

  if (score >= 50) {
    return {
      level: 'medium',
      label: 'Moderate confidence',
      detail: 'The score balances several signals and should be reviewed alongside the explanation.',
    };
  }

  return {
    level: 'low',
    label: 'Lower confidence',
    detail: 'The available context is limited or mixed, so this should be treated as an early read.',
  };
}

export function verdictText(level: RiskLevel): { headline: string; sub: string } {
  const map: Record<RiskLevel, { headline: string; sub: string }> = {
    low: { headline: 'Looks trustworthy', sub: 'No major concerns detected' },
    medium: { headline: 'Some things need a closer look', sub: 'A few signals worth checking' },
    high: { headline: 'Serious red flags found', sub: 'Review carefully before proceeding' },
  };

  return map[level];
}

export function deriveFactors(text: string, overallScore: number): FactorScore[] {
  const lower = text.toLowerCase();

  return [
    {
      label: 'Entity age',
      score: lower.includes('new') || lower.includes('recent') || lower.includes('month-old')
        ? Math.max(10, overallScore - 25)
        : Math.min(90, overallScore + 15),
      weight: 20,
    },
    {
      label: 'Jurisdiction risk',
      score: lower.includes('jurisdiction') || lower.includes('offshore') || lower.includes('low-tax')
        ? Math.max(5, overallScore - 35)
        : Math.min(95, overallScore + 10),
      weight: 25,
    },
    {
      label: 'Transfer size',
      score: lower.includes('wire transfer') || lower.includes('large transfer') || lower.includes('$')
        ? Math.max(15, overallScore - 20)
        : Math.min(85, overallScore + 5),
      weight: 20,
    },
    {
      label: 'Relationship history',
      score: lower.includes('no prior history') || lower.includes('no history') || lower.includes('new client')
        ? Math.max(10, overallScore - 30)
        : Math.min(90, overallScore + 20),
      weight: 20,
    },
    {
      label: 'Verification status',
      score: lower.includes('unverified') || lower.includes('no registration')
        ? Math.max(5, overallScore - 40)
        : lower.includes('verified') || lower.includes('established')
          ? Math.min(95, overallScore + 25)
          : overallScore,
      weight: 15,
    },
  ];
}

export function parseExplanation(raw: string): ParsedExplanation {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.summary && parsed.detail) {
      return { summary: parsed.summary, detail: parsed.detail, flags: parsed.flags ?? [] };
    }
  } catch {
    // fall through to heuristic parser
  }

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lower = raw.toLowerCase();
  const flags: SignalFlag[] = [];

  const rules: [string, string, FlagSeverity][] = [
    ['shell company', 'Shell / offshore entity', 'danger'],
    ['offshore', 'Shell / offshore entity', 'danger'],
    ['wire transfer', 'High-value transfer', 'warning'],
    ['large transfer', 'High-value transfer', 'warning'],
    ['no prior history', 'No transaction history', 'warning'],
    ['no history', 'No transaction history', 'warning'],
    ['unverified', 'Unverified registration', 'danger'],
    ['no registration', 'Unverified registration', 'danger'],
    ['verified', 'Verified entity', 'pass'],
    ['established', 'Established entity', 'pass'],
    ['jurisdiction', 'High-risk jurisdiction', 'danger'],
    ['low-tax', 'High-risk jurisdiction', 'danger'],
    ['new client', 'New counterparty', 'info'],
    ['new customer', 'New counterparty', 'info'],
  ];

  const seen = new Set<string>();
  rules.forEach(([kw, label, sev]) => {
    if (lower.includes(kw) && !seen.has(label)) {
      seen.add(label);
      flags.push({ label, severity: sev });
    }
  });

  if (!flags.length) flags.push({ label: 'Manual review recommended', severity: 'info' });

  return {
    summary: sentences[0] ?? raw,
    detail: sentences.slice(1).join(' '),
    flags,
  };
}
