import { describe, expect, it } from "vitest";

import { parseCredentialRequest } from "../../src/commands/auth/git-credential.js";

describe("parseCredentialRequest", () => {
  it("parses the block git sends", () => {
    expect(parseCredentialRequest("protocol=https\nhost=bitbucket.org\n\n")).toEqual({
      protocol: "https",
      host: "bitbucket.org",
    });
  });

  it("ignores the terminating blank line and stray text", () => {
    expect(parseCredentialRequest("host=bitbucket.org\n\nnonsense\n")).toEqual({
      host: "bitbucket.org",
    });
  });

  it("keeps a value containing an equals sign intact", () => {
    // Base64 tokens routinely end in `=`; splitting on every occurrence drops the line.
    expect(parseCredentialRequest("password=ab=cd==\n")["password"]).toBe("ab=cd==");
  });

  it("ignores a line that starts with the separator", () => {
    expect(parseCredentialRequest("=oops\nhost=bitbucket.org\n")).toEqual({
      host: "bitbucket.org",
    });
  });
});
