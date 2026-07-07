import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Parser as XmlParser } from 'xml2js';
import { createCompound, findCompound } from './compound.js';
import { inline, getAnchor } from './helpers.js';
import { log } from './logger.js';
import * as md from './markdown.js';
import type {
  Compound,
  EnumValue,
  Member,
  MoxygenOptions,
  Param,
  RelationRef,
  References,
  XmlElement,
} from './types.js';

let parserOptions: MoxygenOptions;
const references: References = {};
let root: Compound;

function currentContextName(context: XmlElement[]): string | undefined {
  return context[context.length - 1]?.['#name'];
}

function headingLevel(context: XmlElement[]): number {
  const parent = context[context.length - 1];
  const match = parent?.['#name']?.match(/^sect([1-6])$/);
  return match ? Math.min(Number(match[1]) + 1, 6) : 2;
}

/**
 * Convert a Doxygen XML element tree to Markdown.
 */
function toMarkdown(element: unknown, context: XmlElement[] = []): string {
  if (typeof element === 'string') {
    return element;
  }

  if (Array.isArray(element)) {
    return element.map((v) => toMarkdown(v, context)).join('');
  }

  if (typeof element !== 'object' || element === null) {
    return '';
  }

  const el = element as XmlElement;
  let s = '';

  // Opening
  switch (el['#name']) {
    case 'ref':
      if (currentContextName(context) === 'programlisting') {
        return s + toMarkdown(el.$$, context);
      }
      return s + md.refLink(toMarkdown(el.$$), el.$?.refid ?? '');
    case '__text__':
      s = el._ ?? '';
      break;
    case 'emphasis':
      s = '*';
      break;
    case 'bold':
      s = '**';
      break;
    case 'parametername':
    case 'computeroutput':
      s = '`';
      break;
    case 'parameterlist':
      s = el.$?.kind === 'exception'
        ? '\n#### Exceptions\n'
        : '\n#### Parameters\n';
      break;
    case 'parameteritem':
      s = '* ';
      break;
    case 'programlisting': {
      const lang = el.$?.filename?.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'cpp';
      context.push(el);
      s = `\n\`\`\`${lang}\n`;
      break;
    }
    case 'verbatim':
      s = '\n```\n';
      break;
    case 'orderedlist':
      context.push(el);
      s = '\n\n';
      break;
    case 'itemizedlist':
      context.push(el);
      s = '\n\n';
      break;
    case 'variablelist':
      context.push(el);
      s = '\n\n';
      break;
    case 'varlistentry':
      s = '\n* ';
      break;
    case 'term':
      s = '**';
      break;
    case 'listitem':
      s = currentContextName(context) === 'orderedlist'
        ? '1. '
        : currentContextName(context) === 'variablelist'
          ? ': '
        : '* ';
      break;
    case 'sp':
      s = ' ';
      break;
    case 'heading':
      s = '## ';
      break;
    case 'xrefsect':
      s += '\n> ';
      break;
    case 'simplesect': {
      const kind = el.$?.kind;
      context.push(el);
      if (kind === 'attention' || kind === 'warning') {
        s = '\n:::warning\n';
      } else if (kind === 'note' || kind === 'remark') {
        s = '\n:::note\n';
      } else if (kind === 'deprecated') {
        s = '\n:::warning\n**Deprecated.** ';
      } else if (kind === 'return') {
        s = '\n#### Returns\n';
      } else if (kind === 'see') {
        s = '**See also**: ';
      } else if (kind === 'since') {
        s = '**Since**: ';
      } else if (kind === 'pre') {
        s = '\n#### Preconditions\n';
      } else if (kind === 'post') {
        s = '\n#### Postconditions\n';
      } else if (kind === 'invariant') {
        s = '\n#### Invariants\n';
      } else if (kind === 'author') {
        s = '**Author**: ';
      } else if (kind === 'copyright') {
        s = '**Copyright**: ';
      } else if (kind === 'par') {
        const title = el.$$?.find((child) => child['#name'] === 'title');
        const titleText = title ? trim(toMarkdown(title.$$, context)) || trim(title._ ?? '') : '';
        s = titleText ? `\n#### ${titleText}\n` : '\n#### Notes\n';
      } else {
        log.warn(`simplesect kind '${kind}' not supported`);
      }
      break;
    }
    case 'formula': {
      let formula = trim(el._ ?? '');
      if (formula.startsWith('$') && formula.endsWith('$')) return formula;
      if (formula.startsWith('\\[') && formula.endsWith('\\]')) {
        formula = trim(formula.substring(2, formula.length - 2));
      }
      return `\n$$\n${formula}\n$$\n`;
    }
    case 'preformatted':
      s = '\n<pre>';
      break;
    case 'anchor':
      s = getAnchor(el.$?.id ?? '', parserOptions);
      break;
    case 'image': {
      const name = el.$?.name ?? '';
      const caption = trim(el.$$ ? toMarkdown(el.$$, context) : (el._ ?? ''));
      return name ? `![${caption}](${name})` : caption;
    }
    case 'sect1':
    case 'sect2':
    case 'sect3':
    case 'sect4':
    case 'sect5':
    case 'sect6':
      context.push(el);
      s = `\n${getAnchor(el.$?.id ?? '', parserOptions)}\n`;
      break;
    case 'title': {
      if (currentContextName(context) === 'simplesect') {
        return '';
      }
      const level = '#'.repeat(headingLevel(context));
      const title = trim(el.$$ ? toMarkdown(el.$$, context) : (el._ ?? ''));
      return `\n${level} ${title}\n`;
    }
    case 'mdash':
      s = '&mdash;';
      break;
    case 'ndash':
      s = '&ndash;';
      break;
    case 'linebreak':
      s = '<br/>';
      break;
    case 'xreftitle':
    case 'entry':
    case 'row':
    case 'ulink':
    case 'codeline':
    case 'highlight':
    case 'table':
    case 'para':
    case 'parameterdescription':
    case 'parameternamelist':
    case 'xrefdescription':
    case 'hruler':
    case undefined:
      break;
    default:
      log.warn(`${el['#name']}: not yet supported`);
  }

  // Recurse on children
  if (el.$$) {
    s += toMarkdown(el.$$, context);
  }

  // Closing
  switch (el['#name']) {
    case 'simplesect': {
      const closeKind = el.$?.kind;
      if (closeKind === 'attention' || closeKind === 'warning' || closeKind === 'note' || closeKind === 'remark' || closeKind === 'deprecated') {
        s += '\n:::\n\n';
      } else {
        s += '\n\n';
      }
      context.pop();
      break;
    }
    case 'parameterlist':
    case 'para':
      s += '\n\n';
      break;
    case 'emphasis':
      s += '*';
      break;
    case 'bold':
      s += '**';
      break;
    case 'parameteritem':
      s += '\n';
      break;
    case 'computeroutput':
      s += '`';
      break;
    case 'parametername':
      s += '` ';
      break;
    case 'entry':
      s = md.escape.cell(s) + '|';
      break;
    case 'programlisting':
      s += '```\n';
      context.pop();
      break;
    case 'verbatim':
      if (s && !s.endsWith('\n')) s += '\n';
      s += '```\n';
      break;
    case 'codeline':
      s += '\n';
      break;
    case 'ulink':
      s = md.safeLink(s, el.$?.url ?? '');
      break;
    case 'orderedlist':
      context.pop();
      s += '\n';
      break;
    case 'itemizedlist':
      context.pop();
      s += '\n';
      break;
    case 'variablelist':
      context.pop();
      s += '\n';
      break;
    case 'listitem':
      s += '\n';
      break;
    case 'term':
      s += '**';
      break;
    case 'xreftitle':
      s += ': ';
      break;
    case 'preformatted':
      s += '</pre>\n';
      break;
    case 'sect1':
    case 'sect2':
    case 'sect3':
    case 'sect4':
    case 'sect5':
    case 'sect6':
      context.pop();
      s += '\n';
      break;
    case 'row':
      s = '\n' + md.escape.row(s);
      if (el.$$ && el.$$[0]?.$?.thead === 'yes') {
        s += el.$$.map((_, i) => (i ? ' | ' : '\n') + '---------').join('');
      }
      break;
  }

  return s;
}

function trim(text: string): string {
  return text.trim();
}

/** Convert a named XML field to trimmed Markdown. */
function mdField(def: Record<string, unknown>, property: string): string {
  return trim(toMarkdown(def[property]));
}

/** Extract a summary from brief or detailed description. */
function mdSummary(def: Record<string, unknown>): string {
  let summary = trim(toMarkdown(def['briefdescription']));
  if (!summary) {
    summary = trim(toMarkdown(def['detaileddescription']));
    if (summary) {
      const firstSentence = summary.split('\n', 1)[0];
      if (firstSentence) summary = firstSentence;
    }
  }
  return cleanSummary(summary);
}

function cleanSummary(summary: string): string {
  const lines = summary.split(/\n+/);
  const kept: string[] = [];

  for (const line of lines) {
    if (/^#{2,6}\s+(Parameters|Template Parameters|Exceptions|Returns?)\b/i.test(line.trim())) {
      break;
    }
    kept.push(line);
  }

  return kept.join(' ').replace(/\s+/g, ' ').trim();
}

function parseTemplateParams(def: Record<string, unknown>): Param[] {
  const result: Param[] = [];
  const tpl = def.templateparamlist as Array<Record<string, unknown>> | undefined;
  if (!tpl?.length || !(tpl[0] as Record<string, unknown>).param) return result;

  const params = (tpl[0] as Record<string, unknown>).param as Array<Record<string, unknown>>;
  for (const param of params) {
    result.push({
      type: trim(toMarkdown(param.type)),
      name: param.declname ? trim(toMarkdown(param.declname)) : '',
      description: '',
      defaultValue: param.defval ? trim(toMarkdown(param.defval)) : undefined,
    });
  }

  return result;
}

function parseRelationRefs(def: Record<string, unknown>, property: string): RelationRef[] {
  const refs = def[property] as Array<Record<string, unknown>> | undefined;
  if (!refs?.length) return [];

  return refs.map((ref) => {
    const attrs = (ref.$ ?? {}) as Record<string, string>;
    return {
      name: trim(toMarkdown(ref)) || String(ref._ ?? ''),
      refid: attrs.refid,
      compoundref: attrs.compoundref,
      startline: attrs.startline,
      endline: attrs.endline,
    };
  }).filter((ref) => ref.name || ref.refid);
}

function normalizeQualifier(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function pushUnique(list: string[], value: string | undefined): void {
  const normalized = normalizeQualifier(value ?? '');
  if (normalized && !list.includes(normalized)) list.push(normalized);
}

function extractBalancedCall(source: string, keyword: string): string | undefined {
  const match = new RegExp(`\\b${keyword}\\b`).exec(source);
  if (!match) return undefined;

  let index = match.index + keyword.length;
  while (/\s/.test(source[index] ?? '')) index += 1;
  if (source[index] !== '(') return keyword;

  const start = index;
  let depth = 0;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return `${keyword}${source.slice(start, index + 1)}`;
      }
    }
  }

  return keyword;
}

function extractRequiresClause(source: string): string | undefined {
  const match = /\brequires\b/.exec(source);
  if (!match) return undefined;

  let clause = source.slice(match.index).replace(/\s*=\s*(?:delete|default)\s*;?$/, '');
  clause = clause.replace(/\s*(?:override|final)\s*$/, '');
  return clause;
}

function parseMembers(
  compound: Compound,
  props: Record<string, string>,
  membersdef?: Array<Record<string, unknown>>,
): void {
  Object.assign(compound, props);
  references[compound.refid] = compound;

  if (membersdef) {
    for (const memberdef of membersdef) {
      const member: Member = {
        name: (memberdef.name as string[])[0],
        parent: compound,
        refid: '',
        kind: '',
        section: '',
        prot: '',
        static: '',
        virtual: '',
        proto: '',
        briefdescription: '',
        detaileddescription: '',
        summary: '',
        enumvalue: [],
        returnType: '',
        params: [],
        templateParams: [],
        qualifiers: [],
        prefixQualifiers: [],
        definition: '',
        argsstring: '',
        initializer: '',
        isConst: false,
        isInline: false,
        isExplicit: false,
        isStatic: false,
        isVirtual: false,
        isNodiscard: false,
        isConstexpr: false,
        isConsteval: false,
        references: [],
        referencedBy: [],
        reimplements: [],
        reimplementedBy: [],
      };
      compound.members.push(member);

      const attrs = memberdef.$ as Record<string, string>;
      if (attrs) {
        Object.assign(member, attrs);
      }
      references[member.refid] = member;
    }
  }
}

/** Extract parameter descriptions from detaileddescription XML. */
function extractParamDescriptions(memberdef: Record<string, unknown>): Record<string, string> {
  const descriptions: Record<string, string> = {};
  const detailed = memberdef.detaileddescription as Record<string, unknown>;
  if (!detailed || !detailed.$$) return descriptions;

  const elements = (detailed as XmlElement).$$!;
  for (const para of elements) {
    if (para['#name'] !== 'para' || !para.$$) continue;
    for (const child of para.$$) {
      if (child['#name'] !== 'parameterlist') continue;
      if (!child.$$) continue;
      for (const item of child.$$) {
        if (item['#name'] !== 'parameteritem' || !item.$$) continue;
        let paramName = '';
        let paramDesc = '';
        for (const part of item.$$) {
          if (part['#name'] === 'parameternamelist' && part.$$) {
            for (const pn of part.$$) {
              if (pn['#name'] === 'parametername') {
                paramName = toMarkdown(pn).trim();
              }
            }
          } else if (part['#name'] === 'parameterdescription') {
            paramDesc = trim(toMarkdown(part));
          }
        }
        if (paramName) descriptions[paramName] = paramDesc;
      }
    }
  }
  return descriptions;
}

function parseMember(
  member: Member,
  section: string,
  memberdef: Record<string, unknown>,
): void {
  log.verbose(`Processing member ${member.kind} ${member.name}`);
  member.section = section;

  member.briefdescription = mdField(memberdef, 'briefdescription');
  member.detaileddescription = mdField(memberdef, 'detaileddescription');
  member.summary = mdSummary(memberdef);

  const attrs = memberdef.$ as Record<string, string>;

  // Populate structured fields
  member.isConst = attrs['const'] === 'yes';
  member.isInline = attrs.inline === 'yes';
  member.isExplicit = attrs.explicit === 'yes';
  member.isStatic = attrs.static === 'yes';
  member.isVirtual = attrs.virt === 'virtual' || attrs.virt === 'pure-virtual';
  member.isNodiscard = attrs.nodiscard === 'yes';
  member.isConstexpr = attrs.constexpr === 'yes';
  member.isConsteval = attrs.consteval === 'yes';
  member.returnType = trim(toMarkdown(memberdef.type));

  if (memberdef.location) {
    const locations = memberdef.location as Array<Record<string, Record<string, string>>>;
    const locationAttrs = locations?.[0]?.$;
    const location = locationAttrs?.file;
    if (location) {
      member.location = location;
    }
    if (locationAttrs?.line) {
      member.locationLine = locationAttrs.line;
    }
  }

  // Definition and argsstring
  if (memberdef.definition) {
    const defArr = memberdef.definition as Array<Record<string, string>>;
    member.definition = defArr?.[0]?._ ?? '';
  }
  if (memberdef.argsstring) {
    const argsArr = memberdef.argsstring as Array<Record<string, string>>;
    member.argsstring = argsArr?.[0]?._ ?? '';
  }

  // Extract parameter descriptions from the detailed description XML
  const paramDescs = extractParamDescriptions(memberdef);

  member.templateParams = parseTemplateParams(memberdef);
  member.references = parseRelationRefs(memberdef, 'references');
  member.referencedBy = parseRelationRefs(memberdef, 'referencedby');
  member.reimplements = parseRelationRefs(memberdef, 'reimplements');
  member.reimplementedBy = parseRelationRefs(memberdef, 'reimplementedby');

  // Function parameters
  const hasCallableArgs = member.kind !== 'friend' || !!member.argsstring.trim();
  if (memberdef.param && hasCallableArgs && (member.kind === 'function' || member.kind === 'signal' || member.kind === 'slot' || member.kind === 'friend')) {
    const params = memberdef.param as Array<Record<string, unknown>>;
    for (const param of params) {
      const paramName = param.declname ? trim(toMarkdown(param.declname)) : '';
      member.params.push({
        type: trim(toMarkdown(param.type)),
        name: paramName,
        description: paramDescs[paramName] ?? '',
        defaultValue: param.defval ? trim(toMarkdown(param.defval)) : undefined,
      });
    }
  }

  // Qualifiers
  const prefixQualifiers: string[] = [];
  const qualifiers: string[] = [];
  if (member.isNodiscard) prefixQualifiers.push('[[nodiscard]]');
  if (member.isConsteval) prefixQualifiers.push('consteval');
  if (member.isConstexpr) prefixQualifiers.push('constexpr');
  if (member.isConst) qualifiers.push('const');
  if (member.argsstring) {
    const refQualifierMatch = member.argsstring.match(/\)\s*(?:const\s*)?(?:noexcept(?:\s*\([^)]*\))?\s*)?(&&?)(?=\s*(?:noexcept|override|final|->|requires|=|$))/);
    if (refQualifierMatch) pushUnique(qualifiers, refQualifierMatch[1]);
    pushUnique(qualifiers, extractBalancedCall(member.argsstring, 'noexcept'));
    const trailingReturnMatch = member.argsstring.match(/->\s*(.+?)(?=\s*(?:requires|noexcept|override|final|=|$))/);
    if (trailingReturnMatch) pushUnique(qualifiers, `-> ${trailingReturnMatch[1].trim()}`);
    if (/\boverride\b/.test(member.argsstring)) pushUnique(qualifiers, 'override');
    if (/\bfinal\b/.test(member.argsstring)) pushUnique(qualifiers, 'final');
    pushUnique(qualifiers, extractRequiresClause(member.argsstring));
    if (/=\s*delete$/.test(member.argsstring)) pushUnique(qualifiers, '= delete');
    if (/=\s*default/.test(member.argsstring)) pushUnique(qualifiers, '= default');
  }
  if (attrs.noexcept === 'yes') pushUnique(qualifiers, 'noexcept');
  if (memberdef.requiresclause) pushUnique(qualifiers, `requires ${mdField(memberdef, 'requiresclause')}`);
  if (memberdef.qualifier) {
    const xmlQualifiers = memberdef.qualifier as unknown[];
    for (const qualifier of xmlQualifiers) {
      pushUnique(qualifiers, trim(toMarkdown(qualifier)));
    }
  }
  member.prefixQualifiers = prefixQualifiers;
  member.qualifiers = qualifiers;

  // Build legacy proto string (for classic templates)
  let m: string[] = [];

  switch (member.kind) {
    case 'friend':
      m.push(attrs.prot, ' ');
      if (member.templateParams.length > 0) {
        m.push('template<');
        member.templateParams.forEach((tp, i) => {
          if (i > 0) m.push(',');
          m.push(tp.type);
          if (tp.name) m.push(' ', tp.name);
          if (tp.defaultValue) m.push(' = ', tp.defaultValue);
        });
        m.push('>  \n');
      }
      m.push('friend ');
      if (member.returnType) m.push(member.returnType, ' ');
      m.push(md.refLink(member.name, member.refid));
      if (member.argsstring) {
        m.push('(');
        member.params.forEach((param, i) => {
          if (i > 0) m.push(', ');
          m.push(param.type);
          if (param.name) m.push(' ', param.name);
          if (param.defaultValue) m.push(' = ', param.defaultValue);
        });
        m.push(')');
      }
      for (const q of qualifiers) {
        m.push(' ', q);
      }
      break;

    case 'signal':
    case 'slot':
      m.push(`{${member.kind}} `);
    // fallthrough
    case 'function':
      m.push(attrs.prot, ' ');
      if (member.templateParams.length > 0) {
        m.push('template<');
        member.templateParams.forEach((tp, i) => {
          if (i > 0) m.push(',');
          m.push(tp.type);
          if (tp.name) m.push(' ', tp.name);
          if (tp.defaultValue) m.push(' = ', tp.defaultValue);
        });
        m.push('>  \n');
      }
      for (const q of prefixQualifiers) {
        m.push(q, ' ');
      }
      if (member.isInline) m.push('inline', ' ');
      if (member.isStatic) m.push('static', ' ');
      if (member.isVirtual) m.push('virtual', ' ');
      m.push(toMarkdown(memberdef.type), ' ');
      if (member.isExplicit) m.push('explicit', ' ');
      m.push(md.refLink(member.name, member.refid));
      m.push('(');
      member.params.forEach((param, i) => {
        if (i > 0) m.push(', ');
        m.push(param.type);
        if (param.name) m.push(' ', param.name);
        if (param.defaultValue) m.push(' = ', param.defaultValue);
      });
      m.push(')');
      for (const q of qualifiers) {
        m.push(' ', q);
      }
      break;

    case 'variable':
      m.push(attrs.prot, ' ');
      if (member.isStatic) m.push('static', ' ');
      if (attrs.mutable === 'yes') m.push('mutable', ' ');
      m.push(toMarkdown(memberdef.type), ' ');
      m.push(md.refLink(member.name, member.refid));
      if (memberdef.initializer) {
        const init = (memberdef.initializer as Array<Record<string, string>>)[0]?._ ?? '';
        if (init) {
          m.push(' ', init);
          member.initializer = init;
        }
      }
      break;

    case 'property':
      m.push(`{${member.kind}} `);
      m.push(toMarkdown(memberdef.type), ' ');
      m.push(md.refLink(member.name, member.refid));
      break;

    case 'typedef':
      if (/^using\b/.test(member.definition)) {
        m.push('using ', md.refLink(member.name, member.refid), ' = ', toMarkdown(memberdef.type));
      } else {
        m.push('typedef ', toMarkdown(memberdef.type), ' ', md.refLink(member.name, member.refid));
      }
      break;

    case 'enum':
      member.enumvalue = [];
      if (memberdef.enumvalue) {
        for (const param of memberdef.enumvalue as Array<Record<string, unknown>>) {
          member.enumvalue.push({
            name: mdField(param, 'name'),
            briefdescription: mdField(param, 'briefdescription'),
            detaileddescription: mdField(param, 'detaileddescription'),
            summary: mdSummary(param),
          });
        }
      }
      m.push(member.kind, ' ', md.refLink(member.name, member.refid));
      break;

    default:
      m.push(member.kind, ' ', md.refLink(member.name, member.refid));
      break;
  }

  member.proto = inline(m);
}

function assignToNamespace(compound: Compound, child: Compound): void {
  if (compound.name !== child.namespace) {
    log.warn(`namespace mismatch: ${compound.name} != ${child.namespace}`);
  }

  if (child.parent) {
    delete (child.parent as Compound).compounds[child.id];
  }
  compound.compounds[child.id] = child;
  child.parent = compound;
}

function assignCompoundGroup(compound: Compound, group: Compound): void {
  compound.groupid = group.id;
  compound.groupname = group.name;

  for (const member of compound.members) {
    member.groupid = group.id;
    member.groupname = group.name;
  }

  for (const child of Object.values(compound.compounds)) {
    assignCompoundGroup(child, group);
  }
}

function pruneGroupTopLevelDuplicates(group: Compound): void {
  const topLevelRefids = new Set(
    Object.values(group.compounds).map((compound) => compound.refid),
  );

  for (const [id, compound] of Object.entries(group.compounds)) {
    let current = compound.parent;
    while (current) {
      if (topLevelRefids.has(current.refid) && current.groupid === group.id) {
        delete group.compounds[id];
        break;
      }
      current = current.parent;
    }
  }
}

function assignNamespaceToGroup(compound: Compound, child: Compound): void {
  compound.compounds[child.id] = child;

  for (const id of Object.keys(child.compounds)) {
    delete compound.compounds[id];
  }
}

function assignClassToGroup(compound: Compound, child: Compound): void {
  compound.compounds[child.id] = child;
  assignCompoundGroup(child, compound);
}

function assignGroupToGroup(compound: Compound, child: Compound): void {
  if (child.parent) {
    delete (child.parent as Compound).compounds[child.id];
  }
  compound.compounds[child.id] = child;
  child.parent = compound;
}

function extractPageSections(page: Compound, elements: XmlElement[]): void {
  for (const element of elements) {
    if (element['#name'] === 'sect1' || element['#name'] === 'sect2' || element['#name'] === 'sect3') {
      const id = element.$?.id ?? '';
      const member: Member = {
        section: element['#name'],
        id,
        name: id,
        refid: id,
        parent: page,
        kind: '',
        prot: '',
        static: '',
        virtual: '',
        proto: '',
        briefdescription: '',
        detaileddescription: '',
        summary: '',
        enumvalue: [],
        returnType: '',
        params: [],
        templateParams: [],
        qualifiers: [],
        prefixQualifiers: [],
        definition: '',
        argsstring: '',
        initializer: '',
        isConst: false,
        isInline: false,
        isExplicit: false,
        isStatic: false,
        isVirtual: false,
        isNodiscard: false,
        isConstexpr: false,
        isConsteval: false,
        references: [],
        referencedBy: [],
        reimplements: [],
        reimplementedBy: [],
      };
      page.members.push(member);
      references[member.refid] = member;
    }
    if (element.$$) {
      extractPageSections(page, element.$$);
    }
  }
}

function parseCompound(compound: Compound, compounddef: Record<string, unknown>): void {
  log.verbose(`Processing compound ${compound.name}`);

  const attrs = compounddef.$ as Record<string, string>;
  Object.assign(compound, attrs);

  compound.fullname = ((compounddef.compoundname as Array<Record<string, string>>)[0] as Record<string, string>)._ ??
    (compounddef.compoundname as string[])[0] ?? '';

  // Short name: strip namespace prefix
  const nameParts = compound.fullname.split('::');
  compound.shortname = nameParts[nameParts.length - 1] || compound.name;

  // Group title (from @defgroup "Title")
  if (compounddef.title) {
    const titleArr = compounddef.title as Array<Record<string, string>>;
    const title = titleArr?.[0]?._ ?? (titleArr?.[0] as unknown as string) ?? '';
    if (title) compound.shortname = title;
  }

  // Language from XML attribute
  if (attrs.language) {
    compound.language = attrs.language;
  }

  // Include file
  if (compounddef.includes) {
    const includes = compounddef.includes as Array<Record<string, unknown>>;
    if (includes.length > 0) {
      compound.includes = (includes[0] as Record<string, string>)._ ?? '';
    }
  }

  compound.briefdescription = mdField(compounddef, 'briefdescription');
  compound.detaileddescription = mdField(compounddef, 'detaileddescription');
  compound.summary = mdSummary(compounddef);
  compound.templateParams = parseTemplateParams(compounddef);

  if (compounddef.basecompoundref) {
    for (const ref of compounddef.basecompoundref as Array<Record<string, unknown>>) {
      const refAttrs = ref.$ as Record<string, string>;
      compound.basecompoundref.push({
        prot: refAttrs.prot,
        name: ref._ as string,
        refid: refAttrs.refid,
        virt: refAttrs.virt,
      });
    }
  }

  if (compounddef.derivedcompoundref) {
    for (const ref of compounddef.derivedcompoundref as Array<Record<string, unknown>>) {
      const refAttrs = ref.$ as Record<string, string>;
      compound.derivedcompoundref.push({
        prot: refAttrs.prot,
        name: ref._ as string,
        refid: refAttrs.refid,
        virt: refAttrs.virt,
      });
    }
  }

  if (compounddef.sectiondef) {
    for (const section of compounddef.sectiondef as Array<Record<string, unknown>>) {
      const sectionAttrs = section.$ as Record<string, string>;
      if (section.memberdef) {
        for (const memberdef of section.memberdef as Array<Record<string, unknown>>) {
          const memberAttrs = memberdef.$ as Record<string, string>;
          const member = references[memberAttrs.id] as Member;
          if (!member) continue;

          if (compound.kind === 'group') {
            member.groupid = compound.id;
            member.groupname = compound.name;
          } else if (compound.kind === 'file') {
            root.members.push(member);
          }
          parseMember(member, sectionAttrs.kind, memberdef);
        }
      }
    }
  }

  compound.proto = inline([compound.kind, ' ', md.refLink(compound.name, compound.refid)]);

  if (compounddef.location) {
    const locations = compounddef.location as Array<Record<string, Record<string, string>>>;
    const locationAttrs = locations?.[0]?.$;
    const location = locationAttrs?.file;
    if (location) {
      compound.location = location;
    }
    if (locationAttrs?.line) {
      compound.locationLine = locationAttrs.line;
    }
  }

  // Handle innerclass for any compound that can contain nested types
  if (compounddef.innerclass) {
    const innerclassRefs: string[] = [];
    for (const innerclassdef of compounddef.innerclass as Array<Record<string, unknown>>) {
      const innerAttrs = innerclassdef.$ as Record<string, string>;
      innerclassRefs.push(innerAttrs.refid);
      const ref = references[innerAttrs.refid] as Compound;
      if (!ref) continue;

      switch (compound.kind) {
        case 'namespace':
          assignToNamespace(compound, ref);
          break;
        case 'group':
          assignClassToGroup(compound, ref);
          break;
        case 'file':
          break;
        default:
          // class, interface, enum - nest inner classes directly
          compound.compounds[ref.id] = ref;
          ref.parent = compound;
          break;
      }
    }
    if (compound.kind === 'file') {
      compound.fileCompoundRefs = innerclassRefs;
    }
  }

  if (compounddef.innernamespace && compound.kind === 'file') {
    const innernamespaceRefs: string[] = [];
    for (const namespacedef of compounddef.innernamespace as Array<Record<string, unknown>>) {
      const nsAttrs = namespacedef.$ as Record<string, string>;
      innernamespaceRefs.push(nsAttrs.refid);
    }
    compound.fileNamespaceRefs = innernamespaceRefs;
  }

  switch (compound.kind) {
    case 'class':
    case 'struct':
    case 'union':
    case 'typedef':
    case 'interface':
    case 'enum': {
      const parts = compound.name.split('::');
      compound.namespace = parts.slice(0, -1).join('::');
      break;
    }

    case 'page':
      extractPageSections(compound, (compounddef as Record<string, XmlElement[]>).$$);
      break;

    case 'namespace':
    case 'group':
      if (compound.kind === 'group') {
        compound.groupid = compound.id;
        compound.groupname = compound.name;
      }

      if (compounddef.innernamespace) {
        compound.innernamespaces = [];
        for (const namespacedef of compounddef.innernamespace as Array<Record<string, unknown>>) {
          const nsAttrs = namespacedef.$ as Record<string, string>;
          if (compound.kind === 'group') {
            const ref = references[nsAttrs.refid] as Compound;
            if (ref) assignNamespaceToGroup(compound, ref);
          }
        }
      }

      if (compound.kind === 'group' && compounddef.innergroup) {
        for (const groupdef of compounddef.innergroup as Array<Record<string, unknown>>) {
          const groupAttrs = groupdef.$ as Record<string, string>;
          const ref = references[groupAttrs.refid] as Compound;
          if (ref) assignGroupToGroup(compound, ref);
        }
      }

      if (compound.kind === 'group') {
        pruneGroupTopLevelDuplicates(compound);
      }
      break;

    default:
      break;
  }
}

function parseIndex(
  rootCompound: Compound,
  index: Array<Record<string, unknown>>,
  options: MoxygenOptions,
): void {
  // Pass 1: register all compounds and their members in the references map.
  // Sort by refid length (ascending) so parent namespaces are created before children.
  const sorted = [...index].sort((a, b) => {
    const aRefid = (a.$ as Record<string, string>).refid ?? '';
    const bRefid = (b.$ as Record<string, string>).refid ?? '';
    return aRefid.length - bRefid.length;
  });

  for (const element of sorted) {
    const attrs = element.$ as Record<string, string>;
    const name = (element.name as string[])?.[0] ?? '';
    const compound = findCompound(rootCompound, attrs.refid, name, true)!;
    parseMembers(compound, attrs, element.member as Array<Record<string, unknown>> | undefined);
  }

  // Pass 2: parse compound XML files. All refs are now registered so
  // innerclass/innernamespace lookups succeed regardless of order.
  for (const element of sorted) {
    const attrs = element.$ as Record<string, string>;
    const compound = references[attrs.refid] as Compound;
    if (!compound) continue;

    const xmlPath = join(options.directory, `${compound.refid}.xml`);
    log.verbose(`Parsing ${xmlPath}`);

    try {
      const xml = readFileSync(xmlPath, 'utf8');
      const xmlParser = new XmlParser({
        explicitChildren: true,
        preserveChildrenOrder: true,
        charsAsChildren: true,
      });

      xmlParser.parseString(xml, (err: Error | null, data: Record<string, unknown>) => {
        if (err) {
          log.warn(`parse error for file: ${xmlPath}`);
          return;
        }
        const doxygen = data.doxygen as Record<string, unknown>;
        const compounddefs = doxygen.compounddef as Array<Record<string, unknown>>;
        parseCompound(compound, compounddefs[0]);
      });
    } catch (e) {
      log.warn(`failed to read: ${xmlPath}`);
    }
  }
}

/**
 * Load and parse Doxygen XML index.
 */
export async function loadIndex(options: MoxygenOptions): Promise<{ root: Compound; references: References }> {
  parserOptions = options;
  root = createCompound();
  root.kind = 'index';

  // Clear references
  for (const key of Object.keys(references)) {
    delete references[key];
  }

  const indexPath = join(options.directory, 'index.xml');
  log.verbose(`Parsing ${indexPath}`);

  const xml = readFileSync(indexPath, 'utf8');

  return new Promise((resolve, reject) => {
    const xmlParser = new XmlParser();
    xmlParser.parseString(xml, (err: Error | null, result: Record<string, unknown>) => {
      if (err) {
        reject(new Error(`Failed to parse doxygen XML: ${err}`));
        return;
      }

      const doxygenindex = result.doxygenindex as Record<string, unknown>;
      const compounds = doxygenindex.compound as Array<Record<string, unknown>>;
      parseIndex(root, compounds, options);
      resolve({ root, references });
    });
  });
}
