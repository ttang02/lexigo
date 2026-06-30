import { describe, expect, it } from "vitest";
import { renderCloudflareConfig } from "../../scripts/prepare-cloudflare-config.mjs";

const SOURCE = `{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "lexigo-scores",
      "database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
    }
  ]
}`;

describe("Cloudflare deploy config preparation", () => {
  it("rejects the placeholder before Wrangler deploy reaches the Cloudflare API", () => {
    expect(() => renderCloudflareConfig(SOURCE, "REPLACE_WITH_YOUR_D1_DATABASE_ID")).toThrow(
      /CLOUDFLARE_D1_DATABASE_ID/
    );
  });

  it("injects a real D1 database id into the generated Wrangler config", () => {
    const databaseId = "11111111-2222-4333-8444-555555555555";
    const rendered = renderCloudflareConfig(SOURCE, databaseId);

    expect(rendered).toContain(`"database_id": "${databaseId}"`);
    expect(rendered).not.toContain("REPLACE_WITH_YOUR_D1_DATABASE_ID");
  });
});
