import { parse, stringify, El, Attributes } from "html-parse-stringify";

function stripNested(astPiece: El[], omitTags: string[]) {
  if (!astPiece) {
    return;
  }
  for (const tag of astPiece) {
    if (tag.type === "tag" && !!tag.name && !omitTags.includes(tag.name)) {
      tag.name = "remove";
    }
    if (tag.children) {
      stripNested(tag.children, omitTags);
    }
  }
}

export interface TraceInfo {
  original: string;
  ast: El[];
  omitTags: string[];
}

export class Prosaic {
  private ast: El[];
  private omitTags: string[] = [];

  constructor(private original: string) {
    this.ast = parse(this.original);
  }

  public trace(cb: (info: TraceInfo) => void): Prosaic {
    cb({
      original: this.original,
      ast: [...this.ast],
      omitTags: [...this.omitTags],
    });
    return this;
  }

  public flatten(omitTags?: string[]): Prosaic {
    if (omitTags) {
      this.omitTags = omitTags;
    }
    for (const tag of this.ast) {
      if (tag.children) {
        stripNested(tag.children, this.omitTags);
      }
    }
    return this;
  }

  public removeAttributes(ignore?: string[]): Prosaic {
    const removeAttr = (tag: El) => {
      if (!tag) {
        return;
      }
      if (!ignore) {
        delete tag.attrs;
      } else {
        if (ignore) {
          tag.attrs = Object.keys(tag.attrs || [])
            .filter((key) => ignore.includes(key))
            .reduce((obj: Attributes, key: string) => {
              if (tag && tag.attrs && tag.attrs[key]) {
                obj[key] = tag.attrs[key];
              }
              return obj;
            }, {});
        }
      }
      if (tag.children) {
        for (const child of tag.children) {
          removeAttr(child);
        }
      }
    };
    for (const tag of this.ast) {
      removeAttr(tag);
    }
    return this;
  }

  public result(tagsToStrip?: string[]): string {
    let res = stringify(this.ast).replace(/<(\/?|\!?)(remove)(\s*\/)?>/g, "");
    if (tagsToStrip) {
      for (const tag of tagsToStrip) {
        res = res.replace(new RegExp(`<(\/?|\!?)(${tag})>`, "g"), "");
      }
    }
    return res;
  }
}