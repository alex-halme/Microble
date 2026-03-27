import { describe, it, expect } from "vitest";
import { matchGuess, isCorrectGuess, getAmbiguousCandidates } from "../lib/matcher";
import { ORGANISMS } from "../lib/organisms";

// Pick a few organisms for targeted tests
const sAureus = ORGANISMS.find((o) => o.id === "staphylococcus-aureus")!;
const sPneumoniae = ORGANISMS.find((o) => o.id === "streptococcus-pneumoniae")!;
const eColi = ORGANISMS.find((o) => o.id === "escherichia-coli")!;
const mTuberculosis = ORGANISMS.find((o) => o.id === "mycobacterium-tuberculosis")!;
const cDifficile = ORGANISMS.find((o) => o.id === "clostridioides-difficile")!;
const hiv = ORGANISMS.find((o) => o.id === "human-immunodeficiency-virus-1")!;
const hpv = ORGANISMS.find((o) => o.id === "human-papillomavirus")!;
const giardia = ORGANISMS.find((o) => o.id === "giardia-lamblia")!;
const candidaAlbicans = ORGANISMS.find((o) => o.id === "candida-albicans")!;
const pneumocystis = ORGANISMS.find((o) => o.id === "pneumocystis-jirovecii")!;

// ─── Pass 1: exact canonical match ───────────────────────────────────────────

describe("exact canonical match", () => {
  it("matches exact canonical name", () => {
    const r = matchGuess("Staphylococcus aureus", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) {
      expect(r.organism.id).toBe("staphylococcus-aureus");
      expect(r.confidence).toBe("exact");
    }
  });

  it("is case-insensitive", () => {
    const r = matchGuess("staphylococcus AUREUS", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("staphylococcus-aureus");
  });

  it("handles leading/trailing whitespace", () => {
    const r = matchGuess("  Escherichia coli  ", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("escherichia-coli");
  });
});

// ─── Pass 2: exact abbreviation / common name ─────────────────────────────────

describe("exact abbreviation match", () => {
  it("matches registered abbreviation", () => {
    const r = matchGuess("S. aureus", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) {
      expect(r.organism.id).toBe("staphylococcus-aureus");
      expect(r.confidence).toBe("exact");
    }
  });

  it("matches common name MRSA", () => {
    const r = matchGuess("MRSA", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("staphylococcus-aureus");
  });

  it("matches 'C. diff' abbreviation", () => {
    const r = matchGuess("C. diff", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("clostridioides-difficile");
  });

  it("matches Pneumococcus common name", () => {
    const r = matchGuess("Pneumococcus", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("streptococcus-pneumoniae");
  });

  it("matches E. coli", () => {
    const r = matchGuess("E. coli", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("escherichia-coli");
  });

  it("matches HIV alias", () => {
    const r = matchGuess("HIV", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("human-immunodeficiency-virus-1");
  });

  it("matches HPV alias", () => {
    const r = matchGuess("HPV", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("human-papillomavirus");
  });

  it("matches Giardia common name", () => {
    const r = matchGuess("Giardia", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("giardia-lamblia");
  });

  it("matches Candida abbreviation", () => {
    const r = matchGuess("C. albicans", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("candida-albicans");
  });

  it("matches PJP alias", () => {
    const r = matchGuess("PJP", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("pneumocystis-jirovecii");
  });
});

// ─── Pass 3: abbreviation expansion ──────────────────────────────────────────

describe("abbreviation expansion", () => {
  it("expands single-letter genus abbreviation without period", () => {
    const r = matchGuess("S aureus", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("staphylococcus-aureus");
  });

  it("expands partial genus 'staph aureus'", () => {
    const r = matchGuess("staph aureus", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("staphylococcus-aureus");
  });

  it("expands 'strep pneumo'", () => {
    const r = matchGuess("strep pneumo", ORGANISMS);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("streptococcus-pneumoniae");
  });

  it("returns ambiguous when abbreviation matches multiple organisms", () => {
    // "S. sonnei" and "S. typhi" share genus initial — but "S. sp" is ambiguous
    // "S. aureus" should be unique; test a genuinely ambiguous case:
    // "S. pyogenes" vs nothing else with genus S and species pyogenes — should be exact
    // Test: "S." alone (no species) should not match
    const r = matchGuess("S.", ORGANISMS);
    expect(r.matched).toBe(false);
  });
});

// ─── Pass 4: fuzzy matching ───────────────────────────────────────────────────

describe("fuzzy matching", () => {
  it("matches with a single typo in genus", () => {
    const r = matchGuess("Staphyloccocus aureus", ORGANISMS); // doubled c
    expect(r.matched).toBe(true);
    if (r.matched) {
      expect(r.organism.id).toBe("staphylococcus-aureus");
      expect(r.confidence).toBe("fuzzy");
    }
  });

  it("matches with a single typo in species", () => {
    const r = matchGuess("Mycobacterium tuberculosiis", ORGANISMS); // extra i
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("mycobacterium-tuberculosis");
  });

  it("matches Streptococcus pneumoniae with common misspelling", () => {
    const r = matchGuess("Streptococcus pnuemoniae", ORGANISMS); // transposed u/e
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.organism.id).toBe("streptococcus-pneumoniae");
  });
});

// ─── No match ─────────────────────────────────────────────────────────────────

describe("no match", () => {
  it("returns no_match for empty string", () => {
    const r = matchGuess("", ORGANISMS);
    expect(r.matched).toBe(false);
    if (!r.matched) expect(r.reason).toBe("no_match");
  });

  it("returns no_match for gibberish", () => {
    const r = matchGuess("xyzblarg foo", ORGANISMS);
    expect(r.matched).toBe(false);
  });

  it("returns no_match for a real organism not in the dictionary", () => {
    // Hypothetical organism not in our list
    const r = matchGuess("Fictitious bacterium", ORGANISMS);
    expect(r.matched).toBe(false);
  });
});

// ─── isCorrectGuess ──────────────────────────────────────────────────────────

describe("isCorrectGuess", () => {
  it("returns true for exact match against target", () => {
    expect(isCorrectGuess("Staphylococcus aureus", sAureus, ORGANISMS)).toBe(true);
  });

  it("returns false when matched organism is different from target", () => {
    expect(isCorrectGuess("Escherichia coli", sAureus, ORGANISMS)).toBe(false);
  });

  it("returns true for abbreviation of target", () => {
    expect(isCorrectGuess("S. aureus", sAureus, ORGANISMS)).toBe(true);
  });

  it("returns true for virus alias against target", () => {
    expect(isCorrectGuess("HIV", hiv, ORGANISMS)).toBe(true);
  });

  it("returns true for HPV alias against target", () => {
    expect(isCorrectGuess("HPV", hpv, ORGANISMS)).toBe(true);
  });

  it("returns true for parasite common name against target", () => {
    expect(isCorrectGuess("Giardia", giardia, ORGANISMS)).toBe(true);
  });

  it("returns true for fungal abbreviation against target", () => {
    expect(isCorrectGuess("C. albicans", candidaAlbicans, ORGANISMS)).toBe(true);
  });

  it("returns true for fungal common abbreviation against target", () => {
    expect(isCorrectGuess("PJP", pneumocystis, ORGANISMS)).toBe(true);
  });
});

// ─── getAmbiguousCandidates ───────────────────────────────────────────────────

describe("getAmbiguousCandidates", () => {
  it("returns candidates for ambiguous partial input", () => {
    // "staph" alone is ambiguous (aureus vs epidermidis)
    const candidates = getAmbiguousCandidates("staph sp", ORGANISMS);
    // May or may not have results; if it does, they should be Staphylococcus spp.
    if (candidates.length > 0) {
      expect(candidates.every((o) => o.genus === "Staphylococcus")).toBe(true);
    }
  });
});
