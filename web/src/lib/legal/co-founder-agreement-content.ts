export const AGREEMENT_META = {
  title: "Co-Founder Operating Agreement",
  subtitle: "iTestU — IELTS Mock Exam ERP",
  place: "Tashkent, Republic of Uzbekistan",
  partyA: {
    name: "Sarvarbek Erkinov",
    role: "Bosh Director",
    subtitle: "CTO / Founder Side",
  },
  partyB: {
    name: "Ozodbek To'lqinov",
    role: "CEO",
    subtitle: "Co-Founder Side",
  },
  disclaimer:
    "Operating agreement draft for review before legal finalization. Not a financial services contract.",
};

export type ContractBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "notice"; title: string; items: string[] };

export type ContractSection = {
  id: string;
  title: string;
  blocks: ContractBlock[];
};

export const MAIN_SECTIONS: ContractSection[] = [
  {
    id: "purpose",
    title: "1. Purpose",
    blocks: [
      {
        type: "paragraph",
        text: "This agreement is an operating agreement — not a financial services contract. It defines how both parties run the project together: roles, responsibilities, profit sharing, equity growth, and protection of project secrets.",
      },
    ],
  },
  {
    id: "responsibility",
    title: "2. Responsibility and Control",
    blocks: [
      {
        type: "paragraph",
        text: "Bosh Director — Sarvarbek Erkinov (Party A)",
      },
      {
        type: "list",
        items: [
          "Manages technical stack, architecture, infrastructure, and security.",
          "Owns technical-risk decisions.",
          "Keeps final veto only for technical or platform-risk matters.",
        ],
      },
      {
        type: "paragraph",
        text: "CEO — Ozodbek To'lqinov (Party B)",
      },
      {
        type: "list",
        items: [
          "Has full operational admin control and must execute all business implementations.",
          "Owns pricing strategy, sales, operations, and growth execution.",
          "Manages admin workflows, policy rollout, and business model improvements.",
        ],
      },
    ],
  },
  {
    id: "admin",
    title: "3. CEO Admin Capabilities",
    blocks: [
      {
        type: "list",
        items: [
          "Package and pricing operations",
          "Order and payment operations",
          "Customer handling and dispute operations",
          "Teacher operations and assignment control",
          "Performance and reporting oversight",
          "Operational policy updates and milestone delivery",
        ],
      },
    ],
  },
  {
    id: "profit",
    title: "4. Profit Share and Equity",
    blocks: [
      {
        type: "paragraph",
        text: "Net profit split starts at Bosh Director 75% and CEO 25% once the first milestone is passed.",
      },
      {
        type: "paragraph",
        text: "First milestone is fixed at $50 cumulative net profit. At this milestone, equity rises to 5% and CEO profit share becomes 30%.",
      },
      {
        type: "table",
        headers: ["Stage", "CEO Equity", "CEO Profit Share", "Bosh Director Share"],
        rows: [
          ["Initial stage", "0%", "25%", "75%"],
          ["First milestone ($50 net profit)", "5%", "30%", "70%"],
          ["Next award stage", "10%", "35%", "65%"],
          ["Next award stage", "15%", "40%", "60%"],
          ["Final award stage", "20% max", "45% max", "55% min"],
        ],
      },
      {
        type: "paragraph",
        text: "Future milestone thresholds for next awards are set in writing after first milestone review.",
      },
      {
        type: "notice",
        title: "NOTICE — 20% Equity Cap and Next Decision Process",
        items: [
          "When CEO equity reaches 20% (maximum under this agreement), CEO profit share is already at its maximum stage of 45%.",
          "At that stage, both parties enter a formal decision-making process to review whether the equity limit should be increased through the next milestone cycle.",
          "Any new equity limit must be set in writing and signed by both parties.",
          "Profit share does not increase beyond 45%, even if the equity limit is raised later.",
        ],
      },
    ],
  },
  {
    id: "confidentiality",
    title: "5. Confidentiality and Project Secrets",
    blocks: [
      {
        type: "paragraph",
        text: "Both parties agree that the project, company, and all related materials are confidential. This obligation survives termination.",
      },
      {
        type: "list",
        items: [
          "Source code, architecture, databases, and technical designs must not be disclosed.",
          "Customer data, user records, and payment information must remain protected.",
          "Business strategy, pricing logic, growth plans, and internal processes are confidential.",
          "Credentials, API keys, server access, and security configurations must be kept secure.",
          "No sharing with third parties without written approval from the Bosh Director.",
          "No public posting, demo, or portfolio use of confidential materials without approval.",
          "Confidential information may be used only for project operations under this agreement.",
          "Neither party may use project secrets for a competing product or separate commercial venture.",
          "On termination, each party must stop using and return or destroy confidential materials.",
        ],
      },
      {
        type: "notice",
        title: "NOTICE — Breach of Confidentiality",
        items: [
          "Unauthorized disclosure or misuse of project secrets is a material breach.",
          "The Bosh Director may suspend benefits, freeze equity progression, and pursue termination and legal remedies.",
        ],
      },
    ],
  },
  {
    id: "ip",
    title: "6. IP Ownership",
    blocks: [
      {
        type: "list",
        items: [
          "Core project IP remains under the Bosh Director / assigned legal entity.",
          "Operational work product created for the project is assigned to the project entity.",
          "Confidentiality obligations apply to all IP and project materials.",
        ],
      },
    ],
  },
  {
    id: "penalty",
    title: "7. Penalty and Enforcement",
    blocks: [
      {
        type: "list",
        items: [
          "Suspend variable release first on underperformance.",
          "Freeze equity and next-award progression.",
          "Require recovery plan.",
          "Reduce or defer variable co-founder benefit for repeated failure.",
          "Terminate agreement if repeated failure continues after correction.",
        ],
      },
    ],
  },
];

export const EXHIBIT_A_SECTIONS: ContractSection[] = [
  {
    id: "exhibit-a",
    title: "Exhibit A — KPI and Penalty Rules",
    blocks: [
      {
        type: "paragraph",
        text: "CEO performance is measured by implementation outcomes, admin execution quality, and business delivery.",
      },
      {
        type: "paragraph",
        text: "Suspend-first enforcement applies, with written documentation for each action.",
      },
    ],
  },
];

export const EXHIBIT_B_SECTIONS: ContractSection[] = [
  {
    id: "exhibit-b",
    title: "Exhibit B — Equity and Profit Award Table",
    blocks: [
      {
        type: "table",
        headers: ["Stage", "Equity", "Profit Share"],
        rows: [
          ["Initial", "0%", "25%"],
          ["First milestone ($50 net profit)", "5%", "30%"],
          ["Next award stage", "10%", "35%"],
          ["Next award stage", "15%", "40%"],
          ["Final award stage", "20% max", "45% max"],
        ],
      },
      {
        type: "notice",
        title: "NOTICE — After 20% Equity Is Reached",
        items: [
          "At 20% equity, CEO profit share is already at maximum (45%).",
          "After this stage, both parties must run a formal decision process to decide whether the equity limit should be increased through a new milestone cycle.",
          "Any increase to the equity limit requires written and signed approval. Profit share remains capped at 45%.",
        ],
      },
    ],
  },
];
