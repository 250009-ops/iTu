import type {
  CompletionLine,
  InlineNode,
  ListeningContent,
  ReadingContent,
  WritingContent,
} from "@/lib/exam/types";

function completionLines(...rows: InlineNode[][]): CompletionLine[] {
  return rows.map((nodes) => ({ style: "normal", nodes }));
}

/* ------------------------------------------------------------------ *
 *  LISTENING — 4 parts · 40 questions · ~32 min                       *
 * ------------------------------------------------------------------ */

export const listeningContent: ListeningContent = {
  testId: "LIS-ACAD-005",
  title: "Listening",
  totalQuestions: 40,
  durationMinutes: 32,
  audioTracks: [
    {
      part: 1,
      url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
      title: "Part 1",
    },
    {
      part: 2,
      url: "https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg",
      title: "Part 2",
    },
    {
      part: 3,
      url: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
      title: "Part 3",
    },
    {
      part: 4,
      url: "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
      title: "Part 4",
    },
  ],
  parts: [
    {
      id: "l-part-1",
      part: 1,
      title: "Part 1",
      blurb: "Listen and answer questions 1–10.",
      groups: [
        {
          id: "l1-form",
          type: "form_completion",
          from: 1,
          to: 7,
          instruction: "Complete the form below.",
          hint: "Write ONE WORD AND/OR A NUMBER for each answer.",
          title: "Greenfield Community Centre — Membership Enquiry",
          lines: completionLines(
            ["Name: Laura ", { n: 1, placeholder: "surname" }],
            ["Address: 14 ", { n: 2, placeholder: "street" }, " Road, Eastbourne"],
            ["Postcode: ", { n: 3 }],
            ["Phone: 07700 ", { n: 4 }],
            ["Preferred class: ", { n: 5, placeholder: "activity" }],
            ["Membership type: ", { n: 6 }, " (annual)"],
            ["Discount available for: ", { n: 7 }, " and full-time students"],
          ),
        },
        {
          id: "l1-mcq",
          type: "mcq_single",
          from: 8,
          to: 10,
          instruction: "Choose the correct letter, A, B or C.",
          questions: [
            {
              n: 8,
              prompt: "The centre is closed on",
              options: [
                { id: "A", label: "public holidays only." },
                { id: "B", label: "Sundays and public holidays." },
                { id: "C", label: "the last Monday of each month." },
              ],
            },
            {
              n: 9,
              prompt: "New members must bring",
              options: [
                { id: "A", label: "two passport photos." },
                { id: "B", label: "proof of address." },
                { id: "C", label: "a completed health form." },
              ],
            },
            {
              n: 10,
              prompt: "The induction session lasts",
              options: [
                { id: "A", label: "30 minutes." },
                { id: "B", label: "45 minutes." },
                { id: "C", label: "one hour." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "l-part-2",
      part: 2,
      title: "Part 2",
      blurb: "Listen and answer questions 11–20.",
      groups: [
        {
          id: "l2-map",
          type: "map_labeling",
          from: 11,
          to: 15,
          instruction: "Label the map of the park below.",
          hint: "Drag the correct letter, A–H, next to questions 11–20.",
          imageLabel: "Riverside Park — visitor map",
          options: [
            { id: "A", label: "A" },
            { id: "B", label: "B" },
            { id: "C", label: "C" },
            { id: "D", label: "D" },
            { id: "E", label: "E" },
            { id: "F", label: "F" },
            { id: "G", label: "G" },
            { id: "H", label: "H" },
          ],
          zones: [
            { n: 11, x: 22, y: 30, label: "Information centre" },
            { n: 12, x: 58, y: 22, label: "Café" },
            { n: 13, x: 74, y: 52, label: "Boat hire" },
            { n: 14, x: 40, y: 66, label: "Children's playground" },
            { n: 15, x: 18, y: 72, label: "Bird hide" },
          ],
        },
        {
          id: "l2-mcq",
          type: "mcq_single",
          from: 16,
          to: 20,
          instruction: "Choose the correct letter, A, B or C.",
          questions: [
            {
              n: 16,
              prompt: "Guided walks are offered",
              options: [
                { id: "A", label: "every weekday." },
                { id: "B", label: "at weekends only." },
                { id: "C", label: "on request for groups." },
              ],
            },
            {
              n: 17,
              prompt: "The park is best known for its",
              options: [
                { id: "A", label: "ancient oak trees." },
                { id: "B", label: "rare wildflowers." },
                { id: "C", label: "migratory birds." },
              ],
            },
            {
              n: 18,
              prompt: "Dogs must be kept on a lead near the",
              options: [
                { id: "A", label: "lake." },
                { id: "B", label: "meadow." },
                { id: "C", label: "car park." },
              ],
            },
            {
              n: 19,
              prompt: "The new visitor facilities were funded by",
              options: [
                { id: "A", label: "a national lottery grant." },
                { id: "B", label: "local business donations." },
                { id: "C", label: "council tax revenue." },
              ],
            },
            {
              n: 20,
              prompt: "Volunteers are mainly needed for",
              options: [
                { id: "A", label: "leading school visits." },
                { id: "B", label: "maintaining footpaths." },
                { id: "C", label: "running the café." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "l-part-3",
      part: 3,
      title: "Part 3",
      blurb: "Listen and answer questions 21–30.",
      groups: [
        {
          id: "l3-matching",
          type: "matching",
          from: 21,
          to: 25,
          instruction:
            "What does each student decide about the following sections of the report?",
          hint: "Drag the correct letter, A, B or C, next to questions 21–25.",
          options: [
            { id: "A", label: "needs more research" },
            { id: "B", label: "is ready to submit" },
            { id: "C", label: "should be removed" },
          ],
          questions: [
            { n: 21, prompt: "Introduction" },
            { n: 22, prompt: "Methodology" },
            { n: 23, prompt: "Survey results" },
            { n: 24, prompt: "Case study" },
            { n: 25, prompt: "Conclusion" },
          ],
        },
        {
          id: "l3-mcq",
          type: "mcq_single",
          from: 26,
          to: 30,
          instruction: "Choose the correct letter, A, B or C.",
          questions: [
            {
              n: 26,
              prompt: "The tutor suggests the students should first",
              options: [
                { id: "A", label: "narrow their topic." },
                { id: "B", label: "find more sources." },
                { id: "C", label: "rewrite the abstract." },
              ],
            },
            {
              n: 27,
              prompt: "The students agree their biggest challenge was",
              options: [
                { id: "A", label: "managing their time." },
                { id: "B", label: "analysing the data." },
                { id: "C", label: "dividing the workload." },
              ],
            },
            {
              n: 28,
              prompt: "For the presentation they will use",
              options: [
                { id: "A", label: "printed handouts." },
                { id: "B", label: "an online poll." },
                { id: "C", label: "a short video." },
              ],
            },
            {
              n: 29,
              prompt: "The tutor recommends practising",
              options: [
                { id: "A", label: "in front of friends." },
                { id: "B", label: "with a timer." },
                { id: "C", label: "in the seminar room." },
              ],
            },
            {
              n: 30,
              prompt: "They plan to meet again",
              options: [
                { id: "A", label: "on Thursday morning." },
                { id: "B", label: "after the lecture." },
                { id: "C", label: "next Monday." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "l-part-4",
      part: 4,
      title: "Part 4",
      blurb: "Listen and answer questions 31–40.",
      groups: [
        {
          id: "l4-notes",
          type: "note_completion",
          from: 31,
          to: 40,
          instruction: "Complete the notes below.",
          hint: "Write ONE WORD ONLY for each answer.",
          title: "The History of Urban Beekeeping",
          lines: completionLines(
            ["Early cities kept bees mainly for ", { n: 31 }, " and wax."],
            ["Hives were often placed on ", { n: 32 }, " to save space."],
            ["In the 19th century, beekeeping declined due to ", { n: 33 }, "."],
            ["Modern interest is driven by concern about ", { n: 34 }, " of pollinators."],
            ["Rooftop hives can improve local ", { n: 35 }, " by 30%."],
            ["City honey often has a stronger ", { n: 36 }, " than rural honey."],
            ["A single hive needs about ", { n: 37 }, " litres of water per week."],
            ["The main threat to urban bees is loss of ", { n: 38 }, "."],
            ["Some councils now plant wild ", { n: 39 }, " along roadsides."],
            ["Experts predict beekeeping will become a school ", { n: 40 }, "."],
          ),
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  READING — 3 passages · 40 questions · 60 min                       *
 * ------------------------------------------------------------------ */

export const readingContent: ReadingContent = {
  testId: "REA-ACAD-005",
  title: "Reading",
  totalQuestions: 40,
  durationMinutes: 60,
  passages: [
    {
      id: "r-passage-1",
      part: 1,
      title: "The Rediscovery of Wild Apples",
      blurb: "Read the text and answer questions 1–13.",
      paragraphs: [
        {
          marker: "A",
          text: "High in the Tien Shan mountains of Central Asia grow forests of wild apple trees that botanists now believe to be the ancestor of every cultivated apple on Earth. For decades these forests were largely unknown to Western science, hidden behind closed borders and dismissed as ornamental curiosities rather than a genetic treasure house.",
        },
        {
          marker: "B",
          text: "The pioneering work of the Russian botanist Nikolai Vavilov in the 1920s first drew attention to the region. Travelling through the valleys around Almaty, he was astonished to find trees bearing fruit almost indistinguishable from the apples sold in European markets. Vavilov proposed that the diversity of a crop is greatest at its place of origin, and the apple, he concluded, had begun here.",
        },
        {
          marker: "C",
          text: "Modern DNA analysis has confirmed his intuition. Studies comparing the wild Malus sieversii with domestic varieties show that the cultivated apple is, genetically, almost the same species. Over thousands of years, fruit was carried west along trade routes, and chance crossings with European crab apples added only a small fraction to the genome.",
        },
        {
          marker: "D",
          text: "The significance of the wild forests is not merely historical. Cultivated apples have become genetically narrow, bred for sweetness, colour and shelf life at the expense of resistance to disease. The wild trees, by contrast, harbour an enormous range of traits — some resist fungal infection, others tolerate drought or extreme cold.",
        },
        {
          marker: "E",
          text: "Yet the forests are under threat. Grazing livestock strip away seedlings before they can mature, and orchards and housing have replaced large areas of woodland. Conservationists warn that without protection, a resource that took millions of years to evolve could vanish within a generation.",
        },
        {
          marker: "F",
          text: "Efforts are now under way to catalogue and preserve the wild apples. Seed banks have collected samples, and protected reserves have been established. Breeders hope that genes drawn from these ancient trees will one day produce orchard varieties that need far fewer chemical sprays.",
        },
      ],
      groups: [
        {
          id: "r1-tfng",
          type: "tfng",
          from: 1,
          to: 6,
          instruction:
            "Do the following statements agree with the information given in the text?",
          hint: "Choose TRUE, FALSE or NOT GIVEN.",
          questions: [
            { n: 1, prompt: "The wild apple forests were well studied by Western scientists before the 1920s." },
            { n: 2, prompt: "Vavilov found wild fruit that closely resembled commercial apples." },
            { n: 3, prompt: "DNA studies have disproved Vavilov's theory about the apple's origin." },
            { n: 4, prompt: "Crossings with European crab apples greatly changed the apple genome." },
            { n: 5, prompt: "Cultivated apples are generally more disease-resistant than wild ones." },
            { n: 6, prompt: "Grazing animals are one cause of the forests' decline." },
          ],
        },
        {
          id: "r1-notes",
          type: "note_completion",
          from: 7,
          to: 13,
          instruction: "Complete the notes below.",
          hint: "Choose ONE WORD ONLY from the text for each answer.",
          title: "Wild apples of the Tien Shan",
          lines: completionLines(
            ["Believed to be the ", { n: 7 }, " of all cultivated apples."],
            ["Vavilov travelled near the city of ", { n: 8 }, "."],
            ["He argued crop ", { n: 9 }, " is greatest at a plant's origin."],
            ["Wild trees carry useful traits such as resistance to ", { n: 10 }, " infection."],
            ["Some tolerate drought or extreme ", { n: 11 }, "."],
            ["Both grazing and new ", { n: 12 }, " threaten the woodland."],
            ["Samples are now stored in seed ", { n: 13 }, "."],
          ),
        },
      ],
    },
    {
      id: "r-passage-2",
      part: 2,
      title: "Designing Cities for the Heat",
      blurb: "Read the text and answer questions 14–26.",
      paragraphs: [
        {
          marker: "A",
          text: "As average temperatures climb, planners are rethinking the very fabric of cities. Concrete and asphalt absorb heat during the day and release it slowly at night, producing the well-documented 'urban heat island' effect that can leave city centres several degrees warmer than their rural surroundings.",
        },
        {
          marker: "B",
          text: "One of the simplest interventions is also among the oldest: trees. A mature street tree can transpire hundreds of litres of water on a hot day, cooling the air much as sweating cools the body. Studies in several cities have found that well-shaded streets can be up to five degrees cooler than bare ones.",
        },
        {
          marker: "C",
          text: "Surfaces matter too. Dark roofs can reach temperatures hot enough to fry an egg, while pale or reflective coatings stay markedly cooler. Painting roofs white is cheap, and on a large scale it can lower a neighbourhood's temperature measurably, reducing the demand for air conditioning.",
        },
        {
          marker: "D",
          text: "Water features, from fountains to restored streams, provide localised cooling through evaporation. Historically, many hot-climate cities were built around courtyards and channels precisely for this reason, a wisdom that modern engineering had, until recently, largely forgotten.",
        },
        {
          marker: "E",
          text: "Not every solution is purely technical. The way streets are oriented can funnel cooling breezes or block them entirely. Narrow lanes that shade one another work well in some climates but trap pollutants in others, so context is everything.",
        },
        {
          marker: "F",
          text: "Critics caution that piecemeal measures are not enough. Without coordinated policy, the benefits of a shady park in one district do little for residents elsewhere, and the poorest neighbourhoods — often the hottest — are the least likely to receive investment.",
        },
      ],
      groups: [
        {
          id: "r2-headings",
          type: "matching_headings",
          from: 14,
          to: 19,
          instruction:
            "The text has six sections, A–F. Choose the correct heading for each section.",
          hint: "Drag the correct heading, i–viii, into each gap.",
          options: [
            { id: "i", label: "i. The cooling power of greenery" },
            { id: "ii", label: "ii. Why some areas miss out" },
            { id: "iii", label: "iii. Lessons from older designs" },
            { id: "iv", label: "iv. The problem of stored heat" },
            { id: "v", label: "v. How layout shapes airflow" },
            { id: "vi", label: "vi. The economics of tourism" },
            { id: "vii", label: "vii. Reflective surfaces as a fix" },
            { id: "viii", label: "viii. Measuring rainfall in cities" },
          ],
          questions: [
            { n: 14, prompt: "Section A" },
            { n: 15, prompt: "Section B" },
            { n: 16, prompt: "Section C" },
            { n: 17, prompt: "Section D" },
            { n: 18, prompt: "Section E" },
            { n: 19, prompt: "Section F" },
          ],
        },
        {
          id: "r2-multi",
          type: "mcq_multi",
          from: 20,
          to: 21,
          instruction:
            "Which TWO cooling methods does the text say have historical precedents?",
          hint: "Choose TWO letters, A–E.",
          prompt: "Which TWO cooling methods have historical precedents according to the text?",
          numbers: [20, 21],
          maxSelections: 2,
          options: [
            { id: "A", label: "Painting roofs white" },
            { id: "B", label: "Building around courtyards" },
            { id: "C", label: "Using water channels" },
            { id: "D", label: "Installing air conditioning" },
            { id: "E", label: "Restricting traffic" },
          ],
        },
        {
          id: "r2-summary",
          type: "summary_completion",
          from: 22,
          to: 26,
          instruction: "Complete the summary below.",
          hint: "Choose ONE WORD ONLY from the text for each answer.",
          title: "Keeping cities cool",
          lines: completionLines(
            ["Cities trap heat because ", { n: 22 }, " and asphalt absorb it during the day."],
            ["Street trees cool the air through ", { n: 23 }, ", much like sweating."],
            ["Pale roof coatings reduce the need for ", { n: 24 }, " conditioning."],
            ["Fountains and streams cool surroundings by ", { n: 25 }, "."],
            ["The hottest districts are often the ", { n: 26 }, " and receive little investment."],
          ),
        },
      ],
    },
    {
      id: "r-passage-3",
      part: 3,
      title: "The Science of Persuasion",
      blurb: "Read the text and answer questions 27–40.",
      paragraphs: [
        {
          text: "For more than half a century, psychologists have tried to pin down what makes one message persuasive and another forgettable. The earliest models assumed that people weigh arguments rationally, accepting whichever case is logically stronger. Decades of experiments have shown that the reality is far messier.",
        },
        {
          text: "A landmark idea is the so-called dual-process account, which holds that we think in two distinct ways. One is fast, intuitive and effortless; the other is slow, deliberate and demanding. Persuasion, on this view, can travel by either route. A careful reader may scrutinise every claim, while a distracted one is swayed by surface cues — the confidence of a speaker, the gloss of a brochure.",
        },
        {
          text: "Crucially, which route dominates depends on motivation and capacity. When a decision matters and we have time to think, we engage the slow system and argument quality wins out. When we are busy, tired or indifferent, shortcuts take over. Advertisers have long exploited this, pairing products with attractive faces rather than evidence.",
        },
        {
          text: "Source credibility complicates the picture further. An expert's words carry weight, but only up to a point; audiences quickly discount a source they suspect of self-interest. Interestingly, a message can become more persuasive when the listener forgets where it came from — a phenomenon researchers call the 'sleeper effect'.",
        },
        {
          text: "Emotion, too, is no mere distraction. Moderate fear can spur action, but only when paired with a clear, achievable recommendation; without one, frightened audiences tend to switch off entirely. The most durable attitude change, studies suggest, comes not from being told what to think but from being led to generate the arguments oneself.",
        },
      ],
      groups: [
        {
          id: "r3-mcq",
          type: "mcq_single",
          from: 27,
          to: 30,
          instruction: "Choose the correct letter, A, B, C or D.",
          questions: [
            {
              n: 27,
              prompt: "Early models of persuasion assumed that people",
              options: [
                { id: "A", label: "ignore logical arguments." },
                { id: "B", label: "judge arguments rationally." },
                { id: "C", label: "rely mainly on emotion." },
                { id: "D", label: "distrust all experts." },
              ],
            },
            {
              n: 28,
              prompt: "According to the dual-process account, the 'slow' system is used when",
              options: [
                { id: "A", label: "the listener is distracted." },
                { id: "B", label: "the message is short." },
                { id: "C", label: "a decision matters to us." },
                { id: "D", label: "the speaker is attractive." },
              ],
            },
            {
              n: 29,
              prompt: "The 'sleeper effect' describes how a message can become more persuasive when",
              options: [
                { id: "A", label: "it is repeated often." },
                { id: "B", label: "its source is forgotten." },
                { id: "C", label: "it provokes fear." },
                { id: "D", label: "an expert delivers it." },
              ],
            },
            {
              n: 30,
              prompt: "The most lasting attitude change comes from",
              options: [
                { id: "A", label: "strong emotional appeals." },
                { id: "B", label: "trusted authority figures." },
                { id: "C", label: "generating one's own arguments." },
                { id: "D", label: "frequent exposure." },
              ],
            },
          ],
        },
        {
          id: "r3-matching",
          type: "matching",
          from: 31,
          to: 35,
          instruction:
            "Match each concept with the correct description.",
          hint: "Drag the correct letter, A–F, next to questions 31–35.",
          options: [
            { id: "A", label: "works only with a clear recommendation" },
            { id: "B", label: "relies on surface cues" },
            { id: "C", label: "involves careful scrutiny" },
            { id: "D", label: "is quickly discounted if self-interested" },
            { id: "E", label: "assumes purely rational weighing" },
            { id: "F", label: "strengthens once a source is forgotten" },
          ],
          questions: [
            { n: 31, prompt: "The fast route to persuasion" },
            { n: 32, prompt: "The slow route to persuasion" },
            { n: 33, prompt: "Source credibility" },
            { n: 34, prompt: "The earliest models" },
            { n: 35, prompt: "Moderate fear" },
          ],
        },
        {
          id: "r3-yng",
          type: "yng",
          from: 36,
          to: 40,
          instruction:
            "Do the following statements agree with the claims of the writer?",
          hint: "Choose YES, NO or NOT GIVEN.",
          questions: [
            { n: 36, prompt: "People always evaluate persuasive messages logically." },
            { n: 37, prompt: "Distraction makes people more vulnerable to surface cues." },
            { n: 38, prompt: "Expert sources are persuasive without limit." },
            { n: 39, prompt: "Strong fear is more effective than moderate fear." },
            { n: 40, prompt: "Self-generated arguments produce durable attitude change." },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  WRITING — 2 tasks · 60 min                                         *
 * ------------------------------------------------------------------ */

export const writingContent: WritingContent = {
  testId: "WRI-ACAD-005",
  title: "Writing",
  durationMinutes: 60,
  tasks: [
    {
      id: "w-task-1",
      part: 1,
      taskNumber: 1,
      minutes: 20,
      minWords: 150,
      instruction:
        "You should spend about 20 minutes on this task. Write at least 150 words.",
      prompt:
        "The chart below shows the percentage of households in three countries using renewable energy between 2010 and 2024.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      visual: {
        kind: "line",
        caption: "Households using renewable energy (%), 2010–2024 — Denmark, Germany, Japan",
      },
    },
    {
      id: "w-task-2",
      part: 2,
      taskNumber: 2,
      minutes: 40,
      minWords: 250,
      instruction:
        "You should spend about 40 minutes on this task. Write at least 250 words.",
      prompt:
        "Some people believe that universities should focus on providing academic skills, while others think they should prepare students for the world of work.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.",
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  SPEAKING — student-side prompts (released by examiner)             *
 * ------------------------------------------------------------------ */

export const speakingStudentContent = {
  testId: "SPK-ACAD-005",
  examiner: "Dr. Emma Williams",
  examinerTitle: "Speaking Examiner · IELTS Certified",
  slot: "14:00 – 14:20",
  parts: [
    {
      part: 1,
      title: "Introduction & interview",
      guidance: "4–5 minutes · familiar topics",
      durationSec: 300,
    },
    {
      part: 2,
      title: "Individual long turn",
      guidance: "1 min preparation · 2 min talk",
      durationSec: 180,
    },
    {
      part: 3,
      title: "Two-way discussion",
      guidance: "4–5 minutes · abstract questions",
      durationSec: 300,
    },
  ],
  cueCard: {
    title: "Describe a book you read recently that you enjoyed.",
    bullets: [
      "what the book was about",
      "when and where you read it",
      "why you chose to read it",
      "and explain whether you would recommend it to others.",
    ],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  part1Questions: [
    "Can you tell me your full name, please?",
    "Where are you from, and do you live in a house or a flat?",
    "Let's talk about your work or studies. What do you do?",
    "Do you enjoy your free time? What do you usually do?",
  ],
  part2ExaminerNotes: [
    "Give the candidate 1 minute to prepare.",
    "Ask them to speak for 1–2 minutes.",
    "Ask one or two rounding-off questions afterwards.",
  ],
  part3Questions: [
    "What skills do you think are most important for young people today?",
    "Do you think some skills are becoming less useful over time?",
    "How has technology changed the way people learn new skills?",
    "Should governments invest more in skills training? Why?",
  ],
};
