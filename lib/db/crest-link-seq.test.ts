import { describe, expect, it } from "vitest";
import {
  CREST_LINK_SEQ_ID,
  crestLinkSeqValue,
  crestLinkSeqWriteRow,
} from "./crest-link-seq";

describe("crest_link_seq writes", () => {
  it("only writes the singleton id=1 row", () => {
    const row = crestLinkSeqWriteRow(6, 7);
    expect(row).toEqual({ id: CREST_LINK_SEQ_ID, value: 7 });
    expect(row.id).toBe(1);
  });

  it("never proposes id=2 for Crest Link numbering", () => {
    expect(crestLinkSeqWriteRow(0, 1).id).not.toBe(2);
  });

  it("reads only the id=1 value from mixed rows", () => {
    expect(
      crestLinkSeqValue([
        { id: 1, value: 6 },
        { id: 2, value: 99 },
      ]),
    ).toBe(6);
  });
});
