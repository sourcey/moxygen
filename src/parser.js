/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var fs = require('fs');
var log = require('winston');
var path = require('path');
var xml2js = require('xml2js');

var Compound = require('./compound');
var helpers = require('./helpers');
var markdown = require('./markdown');

function toMarkdown(element, context) {
  var s = '';
  context = context || [];
  switch (typeof element) {
    case 'string':
      s = element;
      break;

    case 'object':
      if (Array.isArray(element)) {
        element.forEach(function (value, key) {
          s += toMarkdown(value, context);
        });
      }
      else {

        // opening the element
        switch (element['#name']) {
          case 'ref': return s + markdown.refLink(toMarkdown(element.$$), element.$.refid);
          case '__text__': s = element._; break;
          case 'emphasis': s = '*'; break;
          case 'bold': s = '**'; break;
          case 'parametername':
          case 'computeroutput': s = '`'; break;
          case 'parameterlist':
            if (element.$.kind == 'exception') {
              s = '\n#### Exceptions\n'
            }
            else {
              s = '\n#### Parameters\n'
            }
            break;

          case 'parameteritem': s = '* '; break;
          case 'programlisting': s = '\n```cpp\n'; break;
          case 'orderedlist':
            context.push(element);
            s = '\n\n';
            break;
          case 'itemizedlist': s = '\n\n'; break;
          case 'listitem':
            s = (context.length > 0 && context[context.length - 1]['#name'] == 'orderedlist') ? '1. ' : '* ';
            break;
          case 'sp': s = ' '; break;
          case 'heading': s = '## '; break;
          case 'xrefsect': s += '\n> '; break;
          case 'simplesect':
            if (element.$.kind == 'attention') {
              s = '> ';
            }
            else if (element.$.kind == 'return') {
              s = '\n#### Returns\n'
            }
            else if (element.$.kind == 'see') {
              s = '**See also**: '
            }
            else {
              console.assert(element.$.kind + ' not supported.');
            }
            break;
          case 'formula':
            s = trim(element._);
            if (s.startsWith('$') && s.endsWith('$')) return s;
            if (s.startsWith('\\[') && s.endsWith('\\]'))
              s = trim(s.substring(2, s.length - 2));
            return '\n$$\n' + s + '\n$$\n';
          case 'preformatted': s = '\n<pre>'; break;

          case 'sect1':
          case 'sect2':
          case 'sect3':
            context.push(element);
            s = '\n' + helpers.getAnchor(element.$.id, module.exports.parserOptions) + '\n';
            break;
          case 'title':
            var level = '#'.repeat(context[context.length - 1]['#name'].slice(-1));
            s = '\n#' + level + ' ' + element._ + '\n';
            break;

          case 'mdash': s = '&mdash;'; break;
          case 'ndash': s = '&ndash;'; break;
          case 'linebreak': s = '<br/>'; break;

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
            console.error(false, element['#name'] + ': not yet supported.');
        }

        // recurse on children elements
        if (element.$$) {
          s += toMarkdown(element.$$, context);
        }

        // closing the element
        switch (element['#name']) {
          case 'parameterlist':
          case 'para': s += '\n\n'; break;
          case 'emphasis': s += '*'; break;
          case 'bold': s += '**'; break;
          case 'parameteritem': s += '\n'; break;
          case "computeroutput": s += '`'; break;
          case 'parametername': s += '` '; break;
          case 'entry': s = markdown.escape.cell(s) + '|'; break;
          case 'programlisting': s += '```\n'; break;
          case 'codeline': s += '\n'; break;
          case 'ulink': s = markdown.link(s, element.$.url); break;
          case 'orderedlist':
            context.pop();
            s += '\n';
            break;
          case 'itemizedlist': s += '\n'; break;
          case 'listitem': s += '\n'; break;
          case 'entry': s = ' | '; break;
          case 'xreftitle': s += ': '; break;
          case 'preformatted': s += '</pre>\n'; break;
          case 'sect1':
          case 'sect2':
          case 'sect3':
            context.pop();
            s += '\n';
            break;
          case 'row':
            s = '\n' + markdown.escape.row(s);
            if (element.$$ && element.$$[0].$.thead == "yes") {
              element.$$.forEach(function (th, i) {
                s += (i ? ' | ' : '\n') + '---------';
              });
            }
            break;
        }

      }
      break;

    default:
      console.assert(false);
  }

  return s;
}

function trim(text) {
  return text.replace(/^[\s\t\r\n]+|[\s\t\r\n]+$/g, '');
}

function copy(dest, property, def) {
  dest[property] = trim(toMarkdown(def[property]));
}

function summary(dest, def) {
  // set from briefdescription or first paragraph of detaileddescription
  var summary = trim(toMarkdown(def['briefdescription']));
  if (!summary) {
    summary = trim(toMarkdown(def['detaileddescription']));
    if (summary) {
      var firstSentence = summary.split('\n', 1)[0]; //.split('. ').first;
      if (firstSentence)
        summary = firstSentence;
    }
  }
  dest['summary'] = summary;
}

module.exports = {

  // All references indexed by refid
  references: {},

  // The root compound
  root: new Compound(),

  parseMembers: function (compound, props, membersdef) {

    // copy all properties
    Object.keys(props).forEach(function(prop) {
      compound[prop] = props[prop];
    });

    this.references[compound.refid] = compound;

    if (membersdef) {
      membersdef.forEach(function (memberdef) {
        var member = { name: memberdef.name[0], parent: compound };
        compound.members.push(member);
        Object.keys(memberdef.$).forEach(function(prop) {
          member[prop] = memberdef.$[prop];
        });
        this.references[member.refid] = member;
      }.bind(this));
    }
  },

  parseMember: function (member, section, memberdef) {
    log.verbose('Processing member ' + member.kind + ' ' + member.name);
    member.section = section;
    copy(member, 'briefdescription', memberdef);
    copy(member, 'detaileddescription', memberdef);
    summary(member, memberdef);

    var m = [];
    switch (member.kind) {
      case 'signal':
      case 'slot':
        m = m.concat(['{', member.kind, '} ']);

      case 'function':
        m = m.concat(memberdef.$.prot, ' '); // public, private, ...
        if (memberdef.templateparamlist) {
          m.push('template<');
          if (memberdef.templateparamlist.length > 0 && memberdef.templateparamlist.param) {
            memberdef.templateparamlist[0].param.forEach(function (param, argn) {
              m = m.concat(argn == 0 ? [] : ',');
              m = m.concat([toMarkdown(param.type)]);
              m = m.concat(param.declname ? [' ', toMarkdown(param.declname)] : []);
            });
          }
          m.push('>  \n');
        }
        m = m.concat(memberdef.$.inline == 'yes' ? ['inline', ' '] : []);
        m = m.concat(memberdef.$.static == 'yes' ? ['static', ' '] : []);
        m = m.concat(memberdef.$.virt == 'virtual' ? ['virtual', ' '] : []);
        m = m.concat(toMarkdown(memberdef.type), ' ');
        m = m.concat(memberdef.$.explicit  == 'yes' ? ['explicit', ' '] : []);
        // m = m.concat(memberdef.name[0]._);
        m = m.concat(markdown.refLink(member.name, member.refid));
        m = m.concat('(');
        if (memberdef.param) {
          memberdef.param.forEach(function (param, argn) {
            m = m.concat(argn == 0 ? [] : ',');
            m = m.concat([toMarkdown(param.type)]);
            m = m.concat(param.declname ? [' ', toMarkdown(param.declname)] : []);
          });
        }

        m = m.concat(')');
        m = m.concat(memberdef.$['const']  == 'yes' ? [' ', 'const'] : []);
        m = m.concat(memberdef.argsstring[0]._.match(/noexcept$/) ? ' noexcept' : '');
        m = m.concat(memberdef.argsstring[0]._.match(/=\s*delete$/) ? ' = delete' : '');
        m = m.concat(memberdef.argsstring[0]._.match(/=\s*default/) ? ' = default' : '');
        break;

      case 'variable':
        m = m.concat(memberdef.$.prot, ' '); // public, private, ...
        m = m.concat(memberdef.$.static == 'yes' ? ['static', ' '] : []);
        m = m.concat(memberdef.$.mutable == 'yes' ? ['mutable', ' '] : []);
        m = m.concat(toMarkdown(memberdef.type), ' ');
        // m = m.concat(memberdef.name[0]._);
        m = m.concat(markdown.refLink(member.name, member.refid));
        break;

      case 'property':
        m = m.concat(['{', member.kind, '} ']);
        m = m.concat(toMarkdown(memberdef.type), ' ');
        // m = m.concat(memberdef.name[0]._);
        m = m.concat(markdown.refLink(member.name, member.refid));
        break;

      case 'enum':
        member.enumvalue = [];
        if (memberdef.enumvalue) {
          memberdef.enumvalue.forEach(function (param, argn) {
            var enumvalue = {}
            copy(enumvalue, 'name', param);
            copy(enumvalue, 'briefdescription', param);
            copy(enumvalue, 'detaileddescription', param);
            summary(enumvalue, param);
            member.enumvalue.push(enumvalue);
          });
        }
        // m.push(member.kind + ' ' + member.name);
        m = m.concat([member.kind, ' ', markdown.refLink(member.name, member.refid)]);
        break;

      default:
        // m.push(member.kind + ' ' + member.name);
        m = m.concat([member.kind, ' ', markdown.refLink(member.name, member.refid)]);
        break;
    }

    member.proto = helpers.inline(m);
  },

  assignToNamespace: function (compound, child) {
    if (compound.name != child.namespace)
        console.assert('namespace mismatch: ', compound.name, '!=', child.namespace);

    // namespaces take ownership of the child compound
    if (child.parent)
        delete child.parent.compounds[child.id];
    compound.compounds[child.id] = child;
    child.parent = compound;
  },

  assignNamespaceToGroup: function (compound, child) {

    // add the namespace to the group
    compound.compounds[child.id] = child;

    // remove namespace clildren from direct group children
    Object.keys(child.compounds).forEach(function(id) {
      delete compound.compounds[id];
    });
  },

  assignClassToGroup: function (compound, child) {

    // add the namespace to the group
    // if the child already belongs to a child namespace it will be removed
    // on the call to `assignNamespaceToGroup`
    compound.compounds[child.id] = child;

    // add a groupid and reference to the compound and all it's members
    child.groupid = compound.id;
    child.groupname = compound.name;

    child.members.forEach(function (member) {
      member.groupid = compound.id;
      member.groupname = compound.name;
    });
  },

  extractPageSections: function(page, elements) {
    elements.forEach(function(element) {
      if (element['#name'] == 'sect1' || element['#name'] == 'sect2' || element['#name'] == 'sect3') {
        var id = element.$.id;
        var member = { section: element['#name'], id: id, name: id, refid: id, parent: page };
        page.members.push(member);
        this.references[member.refid] = member;
      }
      if (element.$$)
        this.extractPageSections(page, element.$$);
    }.bind(this));
  },

  parseCompound: function (compound, compounddef) {
    log.verbose('Processing compound ' + compound.name);
    Object.keys(compounddef.$).forEach(function(prop) {
      compound[prop] = compounddef.$[prop];
    });
    compound.fullname = compounddef.compoundname[0]._;
    copy(compound, 'briefdescription', compounddef);
    copy(compound, 'detaileddescription', compounddef);
    summary(compound, compounddef);

    if (compounddef.basecompoundref) {
      compounddef.basecompoundref.forEach(function (basecompoundref) {
        compound.basecompoundref.push({
          prot: basecompoundref.$.prot,
          name: basecompoundref._,
        });
      });
    }

    if (compounddef.sectiondef) {
      compounddef.sectiondef.forEach(function (section) {
        // switch (section.$['kind']) {
        //   case 'define':
        //   case 'enum':
        //   case 'friend':
        //   case 'public-attrib':
        //   case 'public-func':
        //   case 'protected-attrib':
        //   case 'protected-func':
        //   case 'private-attrib':
        //   case 'private-func':
            if (section.memberdef) {
              section.memberdef.forEach(function (memberdef) {
                var member = this.references[memberdef.$.id];

                if (compound.kind == 'group') {
                  member.groupid = compound.id;
                  member.groupname = compound.name;
                }
                else if (compound.kind == 'file') {
                  // add free members defined inside files in the default
                  // namespace to the root compound
                  this.root.members.push(member);
                }
                this.parseMember(member, section.$['kind'], memberdef);
              }.bind(this));
            }
        //     break;
        //
        //   default:
        //     console.assert(true);
        // }
      }.bind(this));
    }

    compound.proto = helpers.inline([compound.kind, ' ', markdown.refLink(compound.name, compound.refid)]);

    // kind specific parsing
    switch (compound.kind) {
      case 'class':
      case 'struct':
      case 'union':
      case 'typedef':

        // set namespace reference
        var nsp = compound.name.split('::');
        compound.namespace = nsp.splice(0, nsp.length - 1).join('::');
        break;

      case 'file':
        // NOTE: to handle free functions in the default namespace we would
        // parse add all contained members to the root compound.
        break;

      case 'page':
        this.extractPageSections(compound, compounddef.$$);
        break;

      case 'namespace':
      case 'group':

        if (compound.kind == 'group') {
          compound.groupid = compound.id;
          compound.groupname = compound.name;
        }

        // handle innerclass for groups and namespaces
        if (compounddef.innerclass) {
          compounddef.innerclass.forEach(function (innerclassdef) {
              if (compound.kind == 'namespace') {
                // log.verbose('Assign ' + innerclassdef.$.refid + ' to namespace ' + compound.name);

                if (this.references[innerclassdef.$.refid])
                  this.assignToNamespace(compound, this.references[innerclassdef.$.refid]);
              }
              else if (compound.kind == 'group') {
                // log.verbose('Assign ' + innerclassdef.$.refid + ' to group ' + compound.name);
                if (this.references[innerclassdef.$.refid])
                  this.assignClassToGroup(compound, this.references[innerclassdef.$.refid]);
              }
          }.bind(this));
        }

        // handle innernamespace for groups and namespaces
        if (compounddef.innernamespace) {
          compound.innernamespaces = [];
          compounddef.innernamespace.forEach(function (namespacedef) {
            if (compound.kind == 'group') {
              // log.verbose('Assign namespace ' + namespacedef.$.refid + ' to group ' + compound.name);
              this.assignNamespaceToGroup(compound, this.references[namespacedef.$.refid]);
            }
          }.bind(this));
        }
        break;
      default:
        console.assert(true);
    }

    return;
  },

  parseIndex: function (root, index, options) {
    index.forEach(function (element) {
      var doxygen, compound = root.find(element.$.refid, element.name[0], true);
      var xmlParser = new xml2js.Parser({
        explicitChildren: true,
        preserveChildrenOrder: true,
        charsAsChildren: true
      });

      this.parseMembers(compound, element.$, element.member);

      if (compound.kind !== 'file') { // && compound.kind !== 'file'
        log.verbose('Parsing ' + path.join(options.directory, compound.refid + '.xml'));
        doxygen = fs.readFileSync(path.join(options.directory, compound.refid + '.xml'), 'utf8');
        xmlParser.parseString(doxygen, function (err, data) {
          if (err) {
            log.verbose('warning - parse error for file' , path.join(options.directory, compound.refid + '.xml'))
            return;
          }
            this.parseCompound(compound, data.doxygen.compounddef[0]);
        }.bind(this));
      }

    }.bind(this));
  },

  loadIndex: function (options, callback) {
    this.parserOptions = options;
    log.verbose('Parsing ' + path.join(options.directory, 'index.xml'));
    fs.readFile(path.join(options.directory, 'index.xml'), 'utf8', function(err, data) {
      if (err) {
        callback('Failed to load Doxygen XML: ' + err);
        return;
      }
      var xmlParser = new xml2js.Parser();
      xmlParser.parseString(data, function (err, result) {
        if (err) {
          callback('Failed to parse Doxygen XML: ' + err);
          return;
        }
        this.root.kind = 'index';
        this.parseIndex(this.root, result.doxygenindex.compound, options);
        callback(null, this.root); // TODO: return errors properly
      }.bind(this));
    }.bind(this));
  }
};
