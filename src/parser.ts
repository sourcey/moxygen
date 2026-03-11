/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

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
  References,
  XmlElement,
} from './types.js';

let parserOptions: MoxygenOptions;
const references: References = {};
let root: Compound;

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
    case 'programlisting':
      s = '\n```cpp\n';
      break;
    case 'orderedlist':
      context.push(el);
      s = '\n\n';
      break;
    case 'itemizedlist':
      s = '\n\n';
      break;
    case 'listitem':
      s = context.length > 0 && context[context.length - 1]['#name'] === 'orderedlist'
        ? '1. '
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
      if (kind === 'attention') {
        s = '> ';
      } else if (kind === 'return') {
        s = '\n#### Returns\n';
      } else if (kind === 'see') {
        s = '**See also**: ';
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
    case 'sect1':
    case 'sect2':
    case 'sect3':
      context.push(el);
      s = `\n${getAnchor(el.$?.id ?? '', parserOptions)}\n`;
      break;
    case 'title': {
      const level = '#'.repeat(Number(context[context.length - 1]?.['#name']?.slice(-1) ?? '1'));
      s = `\n#${level} ${el._ ?? ''}\n`;
      break;
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
    case 'verbatim':
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
      break;
    case 'codeline':
      s += '\n';
      break;
    case 'ulink':
      s = md.link(s, el.$?.url ?? '');
      break;
    case 'orderedlist':
      context.pop();
      s += '\n';
      break;
    case 'itemizedlist':
    case 'listitem':
      s += '\n';
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
  return summary;
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
        definition: '',
        argsstring: '',
        initializer: '',
        isConst: false,
        isInline: false,
        isExplicit: false,
        isStatic: false,
        isVirtual: false,
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
  member.isVirtual = attrs.virt === 'virtual';
  member.returnType = trim(toMarkdown(memberdef.type));

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

  // Template parameters
  if (memberdef.templateparamlist) {
    const tpl = memberdef.templateparamlist as Array<Record<string, unknown>>;
    if (tpl.length > 0 && (tpl[0] as Record<string, unknown>).param) {
      const params = (tpl[0] as Record<string, unknown>).param as Array<Record<string, unknown>>;
      for (const param of params) {
        member.templateParams.push({
          type: trim(toMarkdown(param.type)),
          name: param.declname ? trim(toMarkdown(param.declname)) : '',
          description: '',
        });
      }
    }
  }

  // Function parameters
  if (memberdef.param && (member.kind === 'function' || member.kind === 'signal' || member.kind === 'slot')) {
    const params = memberdef.param as Array<Record<string, unknown>>;
    for (const param of params) {
      const paramName = param.declname ? trim(toMarkdown(param.declname)) : '';
      member.params.push({
        type: trim(toMarkdown(param.type)),
        name: paramName,
        description: paramDescs[paramName] ?? '',
      });
    }
  }

  // Qualifiers
  const qualifiers: string[] = [];
  if (member.isConst) qualifiers.push('const');
  if (member.argsstring) {
    if (/noexcept$/.test(member.argsstring)) qualifiers.push('noexcept');
    if (/=\s*delete$/.test(member.argsstring)) qualifiers.push('= delete');
    if (/=\s*default/.test(member.argsstring)) qualifiers.push('= default');
  }
  member.qualifiers = qualifiers;

  // Build legacy proto string (for classic templates)
  let m: string[] = [];

  switch (member.kind) {
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
        });
        m.push('>  \n');
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

function assignNamespaceToGroup(compound: Compound, child: Compound): void {
  compound.compounds[child.id] = child;

  for (const id of Object.keys(child.compounds)) {
    delete compound.compounds[id];
  }
}

function assignClassToGroup(compound: Compound, child: Compound): void {
  compound.compounds[child.id] = child;

  child.groupid = compound.id;
  child.groupname = compound.name;

  for (const member of child.members) {
    member.groupid = compound.id;
    member.groupname = compound.name;
  }
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
        definition: '',
        argsstring: '',
        initializer: '',
        isConst: false,
        isInline: false,
        isExplicit: false,
        isStatic: false,
        isVirtual: false,
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

  if (compounddef.basecompoundref) {
    for (const ref of compounddef.basecompoundref as Array<Record<string, unknown>>) {
      const refAttrs = ref.$ as Record<string, string>;
      compound.basecompoundref.push({
        prot: refAttrs.prot,
        name: ref._ as string,
        refid: refAttrs.refid,
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

  // Handle innerclass for any compound that can contain nested types
  if (compounddef.innerclass) {
    for (const innerclassdef of compounddef.innerclass as Array<Record<string, unknown>>) {
      const innerAttrs = innerclassdef.$ as Record<string, string>;
      const ref = references[innerAttrs.refid] as Compound;
      if (!ref) continue;

      switch (compound.kind) {
        case 'namespace':
          assignToNamespace(compound, ref);
          break;
        case 'group':
          assignClassToGroup(compound, ref);
          break;
        default:
          // class, interface, enum - nest inner classes directly
          compound.compounds[ref.id] = ref;
          ref.parent = compound;
          break;
      }
    }
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
    if (!compound || compound.kind === 'file') continue;

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
