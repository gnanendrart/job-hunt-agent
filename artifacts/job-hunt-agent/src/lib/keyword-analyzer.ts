export interface KeywordFrequency {
  keyword: string;
  count: number;
  pct: number;
}

const SKILL_PATTERNS: [string, RegExp][] = [
  ["Machine Learning",       /\bmachine[\s\-]?learning\b/i],
  ["Deep Learning",          /\bdeep[\s\-]?learning\b/i],
  ["Natural Language Processing", /\bnatural[\s\-]?language[\s\-]?processing\b|\bNLP\b/],
  ["Computer Vision",        /\bcomputer[\s\-]?vision\b/i],
  ["Data Engineering",       /\bdata[\s\-]?engineer(?:ing)?\b/i],
  ["Data Science",           /\bdata[\s\-]?scien(?:ce|tist)\b/i],
  ["Data Analysis",          /\bdata[\s\-]?anal(?:ysis|ytics|yst)\b/i],
  ["Data Modeling",          /\bdata[\s\-]?model(?:ing|ler)?\b/i],
  ["Data Warehouse",         /\bdata[\s\-]?warehouse\b/i],
  ["Data Pipeline",          /\bdata[\s\-]?pipeline\b/i],
  ["Business Intelligence",  /\bbusiness[\s\-]?intelligence\b/i],
  ["A/B Testing",            /\ba[\s\/]b[\s\-]?test(?:ing)?\b/i],
  ["Power BI",               /\bpower[\s\-]?bi\b/i],
  ["Feature Engineering",    /\bfeature[\s\-]?engineer(?:ing)?\b/i],
  ["CI/CD",                  /\bci[\s\/]cd\b|\bcontinuous[\s\-]?integration\b|\bcontinuous[\s\-]?delivery\b/i],
  ["REST API",               /\brest[\s\-]?api\b|\brestful\b/i],
  ["Cross-functional",       /\bcross[\s\-]?functional\b/i],
  ["Statistical Analysis",   /\bstatistical[\s\-]?anal(?:ysis|ytics)\b|\bstatistics\b|\bstatistical\b/i],
  ["ETL",                    /\betl\b|\bextract[\s\-]transform[\s\-]load\b/i],
  ["AWS",                    /\baws\b|\bamazon[\s\-]?web[\s\-]?services\b/i],
  ["Azure",                  /\bazure\b/i],
  ["GCP",                    /\bgcp\b|\bgoogle[\s\-]?cloud\b/i],
  ["Snowflake",              /\bsnowflake\b/i],
  ["Databricks",             /\bdatabricks\b/i],
  ["BigQuery",               /\bbigquery\b/i],
  ["Redshift",               /\bredshift\b/i],
  ["Python",                 /\bpython\b/i],
  ["SQL",                    /\bsql\b/i],
  ["JavaScript",             /\bjavascript\b/i],
  ["TypeScript",             /\btypescript\b/i],
  ["Java",                   /\bjava\b(?!script)/i],
  ["Scala",                  /\bscala\b/i],
  ["Golang",                 /\bgolang\b/i],
  ["Pandas",                 /\bpandas\b/i],
  ["NumPy",                  /\bnumpy\b/i],
  ["Apache Spark",           /\bapache[\s\-]?spark\b|\bpyspark\b|\bspark\b/i],
  ["Hadoop",                 /\bhadoop\b/i],
  ["Tableau",                /\btableau\b/i],
  ["Looker",                 /\blooker\b/i],
  ["dbt",                    /\bdbt\b/i],
  ["Excel",                  /\bexcel\b|\bspreadsheet\b/i],
  ["scikit-learn",           /\bscikit[\s\-]?learn\b|\bsklearn\b/i],
  ["TensorFlow",             /\btensorflow\b/i],
  ["PyTorch",                /\bpytorch\b/i],
  ["Jupyter",                /\bjupyter\b/i],
  ["Docker",                 /\bdocker\b/i],
  ["Kubernetes",             /\bkubernetes\b|\bk8s\b/i],
  ["Terraform",              /\bterraform\b/i],
  ["Git",                    /\bgit(?:hub|lab)?\b/i],
  ["Linux",                  /\blinux\b|\bunix\b/i],
  ["React",                  /\breact\.?js\b|\breact\b/i],
  ["Node.js",                /\bnode\.?js\b/i],
  ["GraphQL",                /\bgraphql\b/i],
  ["Microservices",          /\bmicroservice\b/i],
  ["Agile",                  /\bagile\b/i],
  ["Scrum",                  /\bscrum\b/i],
  ["Jira",                   /\bjira\b/i],
  ["Stakeholder Management", /\bstakeholder\b/i],
  ["Communication",          /\bcommunicat(?:ion|ing)\b/i],
  ["Collaboration",          /\bcollaborat(?:ion|ing|ive)\b/i],
  ["Leadership",             /\bleadership\b/i],
  ["Cloud",                  /\bcloud\b/i],
  ["Analytics",              /\banalytics\b/i],
  ["Data Visualization",     /\bdata[\s\-]?visualization\b|\bvisualiz(?:ation|ing)\b/i],
  ["API",                    /\bapi\b/i],
];

export interface GapAnalysis {
  gaps: KeywordFrequency[];
  present: KeywordFrequency[];
  coveragePct: number;
}

export function analyzeResumeGaps(
  marketKeywords: KeywordFrequency[],
  resumeText: string,
): GapAnalysis {
  const patternMap = new Map<string, RegExp>(SKILL_PATTERNS);
  const gaps: KeywordFrequency[] = [];
  const present: KeywordFrequency[] = [];

  for (const kw of marketKeywords) {
    const pattern = patternMap.get(kw.keyword);
    if (!pattern) continue;
    if (pattern.test(resumeText)) {
      present.push(kw);
    } else {
      gaps.push(kw);
    }
  }

  const total = gaps.length + present.length;
  const coveragePct = total === 0 ? 0 : Math.round((present.length / total) * 100);
  return { gaps, present, coveragePct };
}

export function analyzeKeywords(
  jobs: { description?: string | null }[],
  topN = 20,
): KeywordFrequency[] {
  const total = jobs.length;
  if (total === 0) return [];

  return SKILL_PATTERNS
    .map(([keyword, pattern]) => {
      const count = jobs.filter((j) => pattern.test(j.description ?? "")).length;
      return { keyword, count, pct: Math.round((count / total) * 100) };
    })
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword))
    .slice(0, topN);
}
