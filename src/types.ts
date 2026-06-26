export interface SourceUrlInput {
  path: string;
  line?: string;
  symbol?: string;
}

export interface SourceUrlRoute {
  /** Doxygen source path prefix. Longest matching prefix wins. */
  prefix: string;
  /**
   * Base URL or template for this route. Omit or set false to suppress public
   * links while still rendering the plain "Defined in path:line" location.
   */
  url?: string | false;
}

export type SourceUrlResolver =
  | string
  | SourceUrlRoute[]
  | ((input: SourceUrlInput) => string | undefined);

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
  /** Separator joining qualified name, owner, signature and summary in search snippets. */
  titleSeparator: string;
  sourceRoot?: string;
  sourceUrl?: SourceUrlResolver;
  logfile?: string | boolean;
  quiet: boolean;
  frontmatter: boolean;
  filters: Filters;
  inlineGroups: boolean;
}

export interface Filters {
  members: string[];
  compounds: string[];
}

export interface Param {
  type: string;
  name: string;
  description: string;
  defaultValue?: string;
}

export interface EnumValue {
  name: string;
  briefdescription: string;
  detaileddescription: string;
  summary: string;
}

export interface RelationRef {
  name: string;
  refid?: string;
  compoundref?: string;
  startline?: string;
  endline?: string;
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
  location?: string;
  locationLine?: string;

  // Structured fields for modern templates
  returnType: string;
  params: Param[];
  templateParams: Param[];
  qualifiers: string[];
  prefixQualifiers: string[];
  definition: string;
  argsstring: string;
  initializer: string;
  isConst: boolean;
  isInline: boolean;
  isExplicit: boolean;
  isStatic: boolean;
  isVirtual: boolean;
  isNodiscard: boolean;
  isConstexpr: boolean;
  isConsteval: boolean;
  references: RelationRef[];
  referencedBy: RelationRef[];
  reimplements: RelationRef[];
  reimplementedBy: RelationRef[];

  [key: string]: unknown;
}

export interface BaseCompoundRef {
  prot: string;
  name: string;
  refid?: string;
  virt?: string;
}

export interface InheritedMemberGroup {
  name: string;
  refid?: string;
  members: Member[];
}

export interface AllMemberEntry {
  name: string;
  kind: string;
  refid?: string;
  owner: string;
  ownerRefid?: string;
  inherited: boolean;
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
  inheritedMemberGroups: InheritedMemberGroup[];
  allMembers: AllMemberEntry[];
  filtered: {
    compounds: Compound[];
    members: Member[];
    sections: SectionGroup[];
  };
  briefdescription: string;
  detaileddescription: string;
  summary: string;
  proto: string;
  namespace: string;
  templateParams: Param[];
  groupid?: string;
  groupname?: string;
  innernamespaces?: unknown[];
  includes?: string;
  language?: string;
  location?: string;
  locationLine?: string;
  fileCompoundRefs?: string[];
  fileNamespaceRefs?: string[];
  [key: string]: unknown;
}

export interface SectionGroup {
  section: string;
  label: string;
  members: Member[];
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
