import { describe, it, expect } from "vitest";
import { buildOwnershipTransferAuditEntry } from "./team-settings";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("buildOwnershipTransferAuditEntry", () => {
  it("uses the new owner's uuid as record_id, never a non-uuid literal like team_settings.id", () => {
    const entry = buildOwnershipTransferAuditEntry(
      "5fe576b7-1dd7-4f0f-bb0d-2e3e7b03c542",
      "56985f31-bffd-4340-8474-d747a1c9b1ab"
    );

    expect(entry.recordId).toBe("56985f31-bffd-4340-8474-d747a1c9b1ab");
    expect(entry.recordId).toMatch(UUID_RE);
    expect(entry.recordId).not.toBe("1");
  });

  it("keeps both the old and new owner ids in the audit metadata", () => {
    const entry = buildOwnershipTransferAuditEntry(
      "5fe576b7-1dd7-4f0f-bb0d-2e3e7b03c542",
      "56985f31-bffd-4340-8474-d747a1c9b1ab"
    );

    expect(entry.oldData).toEqual({ owner_player_id: "5fe576b7-1dd7-4f0f-bb0d-2e3e7b03c542" });
    expect(entry.newData).toEqual({ owner_player_id: "56985f31-bffd-4340-8474-d747a1c9b1ab" });
    expect(entry.tableName).toBe("team_settings");
  });

  it("still produces a valid record_id when there was no previous owner", () => {
    const entry = buildOwnershipTransferAuditEntry(null, "56985f31-bffd-4340-8474-d747a1c9b1ab");

    expect(entry.recordId).toMatch(UUID_RE);
    expect(entry.oldData).toEqual({ owner_player_id: null });
  });
});
