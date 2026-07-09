export const AGREEMENT_META = {
  title: "Co-Founder Operating Agreement",
  subtitle: "iTestU",
  place: "Tashkent, Republic of Uzbekistan",
  partyA: {
    name: "Sarvarbek Erkinov",
    role: "Founder Side (Tech Owner)",
  },
  partyB: {
    name: "Ozodbek To'lqinov",
    role: "Co-Founder Side (Operations Manager)",
  },
  disclaimer:
    "Business contract draft for review before legal finalization.",
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
    id: "responsibility",
    title: "Control and Responsibility",
    blocks: [
      {
        type: "list",
        items: [
          "Founder side manages technical stack, architecture, infrastructure, security, and technical-risk approvals.",
          "Co-founder side has full operational admin control and must execute all business implementations.",
          "Founder side keeps final veto only for technical-risk matters.",
        ],
      },
    ],
  },
  {
    id: "admin",
    title: "Manager Admin Capabilities",
    blocks: [
      {
        type: "list",
        items: [
          "Pricing and package decisions",
          "Operational workflow control",
          "Sales and process implementation",
          "Business model improvements such as subscriptions",
          "Execution and milestone accountability",
        ],
      },
    ],
  },
  {
    id: "profit",
    title: "Profit and Milestone Rule",
    blocks: [
      {
        type: "paragraph",
        text: "Net profit split starts at Founder 75% and Co-founder 25% after technical fees are covered and first milestone is passed.",
      },
      {
        type: "paragraph",
        text: "First milestone is fixed at $50 cumulative net profit. At this milestone, equity rises to 5% and co-founder profit share becomes 30%.",
      },
      {
        type: "table",
        headers: ["Stage", "Co-Founder Equity", "Co-Founder Profit Share", "Founder Profit Share"],
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
          "When co-founder equity reaches 20% (maximum under this agreement), co-founder profit share is already at its maximum stage of 45%.",
          "At that stage, both parties enter a formal decision-making process to review whether the equity limit should be increased through the next milestone cycle.",
          "Any new equity limit must be set in writing and signed by both parties.",
          "Profit share does not increase beyond 45%, even if the equity limit is raised later.",
        ],
      },
    ],
  },
  {
    id: "cost",
    title: "Lemon Fee and Cost Awareness",
    blocks: [
      {
        type: "list",
        items: [
          "Pricing must be based on net amount after tax and platform fee, not gross amount.",
          "Lemon flow: product price -> tax -> total charged -> platform fee -> net amount.",
          "From your early payment case: from 12,000 UZS, net result noted was $0.47 in the deduction context.",
        ],
      },
      {
        type: "table",
        headers: ["Cost Item", "Value"],
        rows: [
          ["VPS 3", "200,000 UZS"],
          ["Mail service", "84,000 UZS"],
          ["Domain (yearly)", "29,000 UZS"],
          ["AI service (initial)", "about $10/month"],
          ["LiveKit paid usage", "about $50 when needed"],
          ["Technical debt reserve", "$100"],
        ],
      },
      {
        type: "paragraph",
        text: "Technical operations can create extra costs. These costs are valid technical business costs.",
      },
      {
        type: "notice",
        title: "NOTICE — Tech Fee Notification Rule",
        items: [
          "Whenever technical fees or new technical costs arise (infrastructure, tooling, security, scaling, or urgent technical purchases), the CTO Founder (Party A) must notify the CEO Co-founder (Party B) in writing without delay.",
          "The CEO Co-founder must then apply the necessary financial considerations in pricing, budgeting, and profit planning based on that notification.",
        ],
      },
    ],
  },
  {
    id: "penalty",
    title: "Penalty and Enforcement",
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
        text: "Co-founder performance is measured by implementation outcomes, admin execution quality, and business delivery.",
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
          "At 20% equity, co-founder profit share is already at maximum (45%).",
          "After this stage, both parties must run a formal decision process to decide whether the equity limit should be increased through a new milestone cycle.",
          "Any increase to the equity limit requires written and signed approval. Profit share remains capped at 45%.",
        ],
      },
    ],
  },
];
