import { describe, it, expect } from "vitest";
import {
  CHECKSUM_ALGORITHM,
  backupTypeForTriggerReason,
  canonicalizeForChecksum,
  checksumPresenceStatus,
  computeChecksum,
  detectCountMismatches,
  detectMissingTables,
  requiresAuditLogArtifact,
  verifyChecksum,
} from "./backup-integrity";

describe("canonicalizeForChecksum", () => {
  it("sorts object keys alphabetically, regardless of insertion order", () => {
    const a = canonicalizeForChecksum({ b: 1, a: 2, c: 3 });
    const b = canonicalizeForChecksum({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it("sorts keys recursively at every nesting level", () => {
    const a = canonicalizeForChecksum({ z: { y: 1, x: 2 }, a: 1 });
    const b = canonicalizeForChecksum({ a: 1, z: { x: 2, y: 1 } });
    expect(a).toBe(b);
  });

  it("never reorders array elements", () => {
    const value = { rows: [{ id: 3 }, { id: 1 }, { id: 2 }] };
    expect(canonicalizeForChecksum(value)).toBe('{"rows":[{"id":3},{"id":1},{"id":2}]}');
  });

  it("produces a different string when array order changes", () => {
    const a = canonicalizeForChecksum({ rows: [1, 2, 3] });
    const b = canonicalizeForChecksum({ rows: [3, 2, 1] });
    expect(a).not.toBe(b);
  });
});

describe("computeChecksum", () => {
  it("is stable across two computations on the same content, even with different key insertion order", () => {
    const first = computeChecksum({ players: [{ id: "1", role: "coach" }], matches: [] });
    const second = computeChecksum({ matches: [], players: [{ role: "coach", id: "1" }] });
    expect(first).toBe(second);
  });

  it("differs as soon as one byte of content changes", () => {
    const first = computeChecksum({ players: [{ id: "1", role: "coach" }] });
    const second = computeChecksum({ players: [{ id: "1", role: "player" }] });
    expect(first).not.toBe(second);
  });

  it("produces a 64-character lowercase hex sha256 digest", () => {
    const checksum = computeChecksum({ a: 1 });
    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("checksumPresenceStatus", () => {
  it("is legacy-unverifiable when format_version is null and no checksum is stored — never claims verified", () => {
    expect(checksumPresenceStatus(null, null)).toBe("legacy-unverifiable");
  });

  it("is unverified when a checksum is stored, format 2, no incomplete artifact — never claims 'ok' from presence alone", () => {
    expect(checksumPresenceStatus(2, "abc123", false)).toBe("unverified");
  });

  it("is needs-finalization for a format-2 backup whose own checksum is still null — never confused with legacy", () => {
    expect(checksumPresenceStatus(2, null, false)).toBe("needs-finalization");
  });

  it("is needs-finalization for a format-2 backup with a checksum but an incomplete associated artifact", () => {
    expect(checksumPresenceStatus(2, "abc123", true)).toBe("needs-finalization");
  });
});

describe("verifyChecksum", () => {
  const snapshot = { players: [{ id: "1" }] };

  it("is legacy-unverifiable when format_version is null and no checksum is stored", () => {
    expect(verifyChecksum(null, null, snapshot)).toBe("legacy-unverifiable");
  });

  it("is needs-finalization when format_version is 2 but the checksum is still null — never legacy", () => {
    expect(verifyChecksum(2, null, snapshot)).toBe("needs-finalization");
  });

  it("is ok only after an actual recomputation matches the stored checksum", () => {
    const stored = computeChecksum(snapshot);
    expect(verifyChecksum(2, stored, snapshot)).toBe("ok");
  });

  it("is mismatch when the stored checksum does not match a recomputation", () => {
    expect(
      verifyChecksum(2, "0000000000000000000000000000000000000000000000000000000000000000", snapshot)
    ).toBe("mismatch");
  });
});

describe("detectMissingTables", () => {
  it("flags a table listed as included but absent from the snapshot", () => {
    expect(detectMissingTables(["players", "matches"], { players: [] })).toEqual(["matches"]);
  });

  it("returns an empty list when every included table is present", () => {
    expect(detectMissingTables(["players"], { players: [], matches: [] })).toEqual([]);
  });
});

describe("detectCountMismatches", () => {
  it("flags a table whose declared count differs from the actual row count", () => {
    const mismatches = detectCountMismatches({ players: 24, matches: 30 }, { players: new Array(24).fill({}), matches: new Array(29).fill({}) });
    expect(mismatches).toEqual([{ table: "matches", declared: 30, actual: 29 }]);
  });

  it("returns an empty list when all counts match", () => {
    const mismatches = detectCountMismatches({ players: 2 }, { players: [{}, {}] });
    expect(mismatches).toEqual([]);
  });
});

describe("backupTypeForTriggerReason", () => {
  it("maps every trigger_reason to exactly the expected backup_type", () => {
    expect(backupTypeForTriggerReason("manual")).toBe("manual");
    expect(backupTypeForTriggerReason("weekly")).toBe("routine");
    expect(backupTypeForTriggerReason("before_reset")).toBe("pre_operation");
    expect(backupTypeForTriggerReason("before_restore")).toBe("pre_operation");
    expect(backupTypeForTriggerReason("before_migration")).toBe("pre_operation");
    expect(backupTypeForTriggerReason("before_fusion")).toBe("pre_operation");
    expect(backupTypeForTriggerReason("before_unlock")).toBe("pre_operation");
    expect(backupTypeForTriggerReason("end_of_season")).toBe("end_of_season");
  });
});

describe("requiresAuditLogArtifact", () => {
  it("is true only for the sensitive trigger reasons", () => {
    expect(requiresAuditLogArtifact("before_restore")).toBe(true);
    expect(requiresAuditLogArtifact("before_migration")).toBe(true);
    expect(requiresAuditLogArtifact("before_fusion")).toBe(true);
  });

  it("is false for routine or non-sensitive trigger reasons", () => {
    expect(requiresAuditLogArtifact("manual")).toBe(false);
    expect(requiresAuditLogArtifact("weekly")).toBe(false);
    expect(requiresAuditLogArtifact("before_reset")).toBe(false);
    expect(requiresAuditLogArtifact("before_unlock")).toBe(false);
    expect(requiresAuditLogArtifact("end_of_season")).toBe(false);
  });
});

describe("CHECKSUM_ALGORITHM", () => {
  it("is the versioned constant expected by the schema constraint", () => {
    expect(CHECKSUM_ALGORITHM).toBe("sha256-canonical-json-v1");
  });
});
