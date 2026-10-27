// services/ragAssistantService.ts — Lightweight RAG Assistant for Legal Metrology & Instrument Verification

import { RagResponse, RagDocumentCitation } from '../types/instrument';

interface ApprovedChunk {
  docId: string;
  title: string;
  section: string;
  keywords: string[];
  content: string;
}

const APPROVED_CORPUS: ApprovedChunk[] = [
  {
    docId: 'DOC-LM-01',
    title: 'Legal Metrology Act, 2009',
    section: 'Section 24: Verification and Stamping of Weights and Measures',
    keywords: ['verification', 'stamping', 'commercial', 'statutory', 'officer', 'certificate', 'trade', 'initial'],
    content:
      'Every person having any weight or measure in his possession, custody or control in circumstances indicating that such weight or measure is being used, or is intended or likely to be used by him in any transaction or for industrial production or protection, shall, before putting such weight or measure into such use, have such weight or measure verified and stamped by the Legal Metrology Officer. Upon satisfactory verification, an official certificate of verification shall be issued to the applicant.',
  },
  {
    docId: 'DOC-LM-01',
    title: 'Legal Metrology Act, 2009',
    section: 'Section 30: Penalty for Use of Non-standard Weights and Measures',
    keywords: ['penalty', 'fine', 'offence', 'unverified', 'non-standard', 'punishment', 'imprisonment', 'section 30'],
    content:
      'Whoever uses any weight or measure or makes use of any numeration otherwise than in accordance with the standards of weight or measure specified under this Act, shall be punished with fine which may extend to twenty-five thousand rupees, and for the second or subsequent offence, with imprisonment for a term which may extend to one year and also with fine.',
  },
  {
    docId: 'DOC-LM-01',
    title: 'Legal Metrology Act, 2009',
    section: 'Section 33: Penalty for Use of Unverified Weight or Measure',
    keywords: ['penalty', 'unverified', 'stamping', 'fine', 'trade', 'section 33', 'expired'],
    content:
      'Whoever, in any transaction or for protection or for industrial production, uses, or has in his possession for use, any weight or measure which has not been verified or re-verified and stamped under this Act, shall be punished with fine which shall not be less than two thousand rupees, but which may extend to ten thousand rupees, and for the second or subsequent offence, with imprisonment for a term which may extend to one year and with fine.',
  },
  {
    docId: 'DOC-LM-02',
    title: 'Legal Metrology (General) Rules, 2011',
    section: 'Schedule IX: Non-automatic Weighing Instruments — Accuracy Classes',
    keywords: ['accuracy', 'class', 'class i', 'class ii', 'class iii', 'class iv', 'scale', 'interval', 'capacity'],
    content:
      'Non-automatic weighing instruments are classified into four accuracy classes: Class I (Special Accuracy, precision laboratory analytical balances), Class II (High Accuracy, bullion / jewelry and pharmaceutical weighing), Class III (Medium Accuracy, general commercial retail counter scales, grocery scales, industrial platform scales), and Class IV (Ordinary Accuracy, coarse materials, weighbridges and scrap scales). The verification scale interval (e) determines the minimum verification scale and maximum number of verification scale intervals (n = Max / e).',
  },
  {
    docId: 'DOC-LM-02',
    title: 'Legal Metrology (General) Rules, 2011',
    section: 'Schedule IX, Part 2: Maximum Permissible Errors (MPE)',
    keywords: ['mpe', 'maximum permissible error', 'tolerance', 'error', 'load', 'verification', 'inspection', 'limits'],
    content:
      'Maximum Permissible Errors (MPE) on initial verification for Class III instruments: For loads m between 0 and 500e, MPE is ±0.5e; for loads between 500e and 2000e, MPE is ±1.0e; for loads above 2000e up to Max, MPE is ±1.5e. On periodic inspection in service, the maximum permissible error is twice the MPE on initial verification. Any instrument exceeding the MPE shall fail inspection and cannot be stamped.',
  },
  {
    docId: 'DOC-LM-03',
    title: 'OIML R 76-1 International Recommendation',
    section: 'Clause 3.5 & 3.6: Metrological Requirements and Eccentricity Testing',
    keywords: ['oiml', 'eccentricity', 'corner', 'repeatability', 'temperature', 'level', 'sensitivity', 'test'],
    content:
      'The indication of an instrument shall not depend on the position of the load on the load receptor. During the eccentric load test, a load corresponding to 1/3 of the maximum capacity (plus tare where applicable) is placed successively in the center and in the four quadrants of the load receptor. The difference between indications shall not exceed the MPE for that test load. The instrument must also remain level and within temperature range 10°C to 40°C.',
  },
  {
    docId: 'DOC-LM-04',
    title: 'Enforcement Guidelines on Verification Intervals & Stamping Seals',
    section: 'Rule 27: Re-verification Periodicity & Broken Seals',
    keywords: ['interval', 'periodicity', 're-verification', 'frequency', 'annual', 'repair', 'broken seal', 'validity'],
    content:
      'Every weighing or measuring instrument used in trade shall be presented for re-verification at intervals of twelve months (one year), except for storage tanks and automatic weighing systems which may have twenty-four month periods. Whenever any instrument is dismantled or repaired, or if any verification seal is broken or tampered with, the existing certificate is immediately rendered void and the instrument must undergo fresh verification and stamping before being brought back into commercial service.',
  },
  {
    docId: 'DOC-LM-05',
    title: 'Trader Compliance & Inspection Standards Handbook',
    section: 'Chapter 4: Trader Obligations During Inspection',
    keywords: ['trader', 'obligation', 'duty', 'premises', 'access', 'records', 'display', 'certificate display'],
    content:
      'Every user of weights and measures in trade must: (1) Maintain all instruments clean, leveled, and in proper working order; (2) Prominently display the Certificate of Verification or verify QR code at the business premises near the point of sale; (3) Allow authorized Legal Metrology Officers free access to inspect instruments and test weights; (4) Retain calibration reports and previous verification receipts for statutory inspection.',
  },
];

const DISCLAIMER_TEXT =
  'Disclaimer: This AI assistant provides regulatory guidance strictly from approved Legal Metrology Act & Rules documents. Official verification decisions, stamping, and legal determinations are exclusively made by authorized Legal Metrology Officers.';

export const ragAssistantService = {
  /**
   * Evaluates query against the approved regulatory corpus.
   * Strictly enforces safety guardrails against bypassing verification or altering certificates.
   */
  async askQuestion(query: string): Promise<RagResponse> {
    const normalizedQuery = query.toLowerCase().trim();

    // Guardrail 1: Check for unauthorized administrative override attempts
    const unauthorizedKeywords = [
      'approve inspection',
      'bypass inspection',
      'bypass verification',
      'change certificate status',
      'issue fake certificate',
      'override inspector',
      'modify certificate',
      'skip stamping',
    ];

    if (unauthorizedKeywords.some((kw) => normalizedQuery.includes(kw))) {
      return {
        question: query,
        answer:
          'Security & Compliance Restriction: The AI Assistant cannot approve inspections, issue certificates, override officers, or alter regulatory statuses. All verifications and stamping actions require physical testing and statutory authorization by a designated Legal Metrology Officer under Section 24 of the Legal Metrology Act, 2009.',
        citations: [
          {
            docId: 'DOC-LM-01',
            title: 'Legal Metrology Act, 2009',
            section: 'Section 24: Statutory Inspection Exclusivity',
            snippet: 'Verification and stamping can only be conducted by authorized Legal Metrology Officers.',
          },
        ],
        confidence: 100,
        disclaimer: DISCLAIMER_TEXT,
        isAnswerable: true,
      };
    }

    // Tokenize query
    const queryTokens = normalizedQuery
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (queryTokens.length === 0) {
      return {
        question: query,
        answer: 'Please enter a specific question regarding weighing and measuring instrument verification or legal metrology standards.',
        citations: [],
        confidence: 0,
        disclaimer: DISCLAIMER_TEXT,
        isAnswerable: false,
      };
    }

    // Score chunks using keyword frequency + exact matches
    const scoredChunks = APPROVED_CORPUS.map((chunk) => {
      let score = 0;
      const lowerContent = chunk.content.toLowerCase();
      const lowerTitle = chunk.title.toLowerCase();
      const lowerSection = chunk.section.toLowerCase();

      // Check keywords
      for (const kw of chunk.keywords) {
        if (normalizedQuery.includes(kw)) {
          score += 5;
        }
      }

      // Check tokens
      for (const token of queryTokens) {
        if (lowerSection.includes(token)) score += 4;
        if (lowerTitle.includes(token)) score += 3;
        if (lowerContent.includes(token)) score += 2;
      }

      return { chunk, score };
    });

    // Sort by score
    scoredChunks.sort((a, b) => b.score - a.score);
    const topMatches = scoredChunks.filter((item) => item.score >= 4);

    if (topMatches.length === 0) {
      return {
        question: query,
        answer:
          'The approved Legal Metrology documents in our repository do not contain specific information to answer your question. As required by verification standards, we do not invent regulatory information. Please consult your local Legal Metrology Department or refer to the official government gazette.',
        citations: [],
        confidence: 0,
        disclaimer: DISCLAIMER_TEXT,
        isAnswerable: false,
      };
    }

    // Compose synthesised answer with citations
    const primaryMatch = topMatches[0].chunk;
    const citations: RagDocumentCitation[] = topMatches.slice(0, 2).map((m) => ({
      docId: m.chunk.docId,
      title: m.chunk.title,
      section: m.chunk.section,
      snippet: m.chunk.content.slice(0, 180) + '...',
    }));

    // Synthesize structured answer based on retrieved text
    const answer = `Based on [${primaryMatch.title}, ${primaryMatch.section}]:\n\n${primaryMatch.content}${
      topMatches.length > 1
        ? `\n\nFurthermore, [${topMatches[1].chunk.title}, ${topMatches[1].chunk.section}] specifies:\n${topMatches[1].chunk.content}`
        : ''
    }`;

    return {
      question: query,
      answer,
      citations,
      confidence: Math.min(98, 70 + topMatches[0].score * 2),
      disclaimer: DISCLAIMER_TEXT,
      isAnswerable: true,
    };
  },
};
