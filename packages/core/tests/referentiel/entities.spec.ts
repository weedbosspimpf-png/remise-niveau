import { describe, expect, it } from "vitest";
import {
  isTrustedSource,
  isUsableProgram,
  type CurriculumProgram,
  type CurriculumSource,
} from "../../src/referentiel/entities.js";

function makeProgram(overrides: Partial<CurriculumProgram> = {}): CurriculumProgram {
  return {
    id: "prog-1",
    educationSystemId: "sys-ci",
    schoolYear: "2025-2026",
    versionLabel: "Version DPFC v3",
    sourceId: "src-1",
    status: "VALIDATED",
    ...overrides,
  };
}

function makeSource(overrides: Partial<CurriculumSource> = {}): CurriculumSource {
  return {
    id: "src-1",
    type: "OFFICIAL",
    organisme: "DPFC",
    ...overrides,
  };
}

describe("isUsableProgram", () => {
  it("un programme VALIDATED est utilisable", () => {
    expect(isUsableProgram(makeProgram({ status: "VALIDATED" }))).toBe(true);
  });

  it("un programme DRAFT n'est pas utilisable", () => {
    expect(isUsableProgram(makeProgram({ status: "DRAFT" }))).toBe(false);
  });

  it("un programme ARCHIVED n'est pas utilisable (l'ancienne version reste consultable mais pas active)", () => {
    expect(isUsableProgram(makeProgram({ status: "ARCHIVED" }))).toBe(false);
  });
});

describe("isTrustedSource", () => {
  it.each(["OFFICIAL", "VERIFIED"] as const)("%s est une source de confiance", (type) => {
    expect(isTrustedSource(makeSource({ type }))).toBe(true);
  });

  it.each(["SECONDARY", "UNVERIFIED", "OUTDATED"] as const)(
    "%s n'est pas une source de confiance",
    (type) => {
      expect(isTrustedSource(makeSource({ type }))).toBe(false);
    },
  );
});

describe("deux versions du même programme", () => {
  it("coexistent sans collision d'identifiants (archivage sans écrasement, §8)", () => {
    const ancienneVersion = makeProgram({ id: "prog-2024", status: "ARCHIVED" });
    const nouvelleVersion = makeProgram({
      id: "prog-2025",
      schoolYear: "2025-2026",
      status: "VALIDATED",
    });

    expect(ancienneVersion.id).not.toBe(nouvelleVersion.id);
    expect(isUsableProgram(ancienneVersion)).toBe(false);
    expect(isUsableProgram(nouvelleVersion)).toBe(true);
  });
});
