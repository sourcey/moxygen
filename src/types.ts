/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

export interface MoxygenOptions {
  directory: string;
  output: string;
  groups: boolean;
  classes: boolean;
  pages: boolean;
  noindex: boolean;
  anchors: boolean;
  htmlAnchors: boolean;
  language: string;
  templates: string;
  logfile?: string | boolean;
  quiet: boolean;
  frontmatter: boolean;
  filters: Filters;
}

export interface Filters {
  members: string[];
  compounds: string[];
}

export interface Param {
  type: string;
  name: string;
  description: string;
}

export interface EnumValue {
  name: string;
  briefdescription: string;
  detaileddescription: string;
  summary: string;
}

export interface Member {
  name: string;
  refid: string;
  kind: string;
  parent: Compound;
  section: string;
  prot: string;
  static: string;
  virtual: string;
  proto: string;
  briefdescription: string;
  detaileddescription: string;
  summary: string;
  enumvalue: EnumValue[];
  groupid?: string;
  groupname?: string;
  id?: string;

  // Structured fields for modern templates
  returnType: string;
  params: Param[];
  templateParams: Param[];
  qualifiers: string[];
  definition: string;
  argsstring: string;
  initializer: string;
  isConst: boolean;
  isInline: boolean;
  isExplicit: boolean;
  isStatic: boolean;
  isVirtual: boolean;

  [key: string]: unknown;
}

export interface BaseCompoundRef {
  prot: string;
  name: string;
  refid?: string;
}

export interface Compound {
  parent: Compound | null;
  id: string;
  name: string;
  kind: string;
  refid: string;
  fullname: string;
  shortname: string;
  compounds: Record<string, Compound>;
  members: Member[];
  basecompoundref: BaseCompoundRef[];
  derivedcompoundref: BaseCompoundRef[];
  filtered: {
    compounds: Compound[];
    members: Member[];
  };
  briefdescription: string;
  detaileddescription: string;
  summary: string;
  proto: string;
  namespace: string;
  groupid?: string;
  groupname?: string;
  innernamespaces?: unknown[];
  includes?: string;
  language?: string;
  [key: string]: unknown;
}

/** References map: refid -> Compound | Member */
export type References = Record<string, Compound | Member>;

/** xml2js parsed XML element with explicit children */
export interface XmlElement {
  '#name'?: string;
  _?: string;
  $?: Record<string, string>;
  $$?: XmlElement[];
  [key: string]: unknown;
}
