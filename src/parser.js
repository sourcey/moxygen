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
          case 'ref': return s + markdown.link(toMarkdown(element.$$), '#' + element.$.refid, true);
          case '__text__': s = element._; break;
          case 'emphasis': s = '*'; break;
          case 'bold': s = '**'; break;
          case 'parametername': s = '*'; break;
          case 'computeroutput': s = '`'; break;
          case 'parameterlist': s = '\n#### Parameters\n'; break;
          case 'parameteritem': s = '* '; break;
          case 'programlisting': s = '\n```cpp\n'; break;
          case 'itemizedlist': s = '\n\n'; break;
          case 'listitem': s = '* '; break;
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
              s = '\n**See also**: '
            }
            else {
              console.assert(element.$.kind + ' not supported.');
            }
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
          case 'parametername': s += '*: '; break;
          case 'entry': s = markdown.escape.cell(s) + '|'; break;
          case 'programlisting': s += '```\n'; break;
          case 'codeline': s += '\n'; break;
          case 'ulink': s = markdown.link(s, element.$.url); break;
          case 'itemizedlist': s += '\n'; break;
          case 'listitem': s += '\n'; break;
          case 'entry': s = ' | '; break;
          case 'xreftitle': s += ': '; break;
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

module.exports = {

  // All references indexed by refid
  references: {},

  parseMembers: function (compound, props, membersdef) {

    // copy all properties
    Object.keys(props).forEach(function(prop) {
      compound[prop] = props[prop];
    });

    this.references[compound.refid] = compound;

    if (membersdef) {
      membersdef.forEach(function (memberdef) {
        var member = { name: memberdef.name[0] };
        compound.members.push(member);
        Object.keys(memberdef.$).forEach(function(prop) {
          member[prop] = memberdef.$[prop];
        });
        this.references[member.refid] = member;
      }.bind(this));
    }
  },

  parseMember: function (member, section, memberdef) {
    log.verbose('Processing member ' + member.name);
    member.section = section;
    copy(member, 'briefdescription', memberdef);
    copy(member, 'detaileddescription', memberdef);

    var m = [];

    switch (member.kind) {
      case 'function':
        if (memberdef.templateparamlist) {
          m.push('template<');
          memberdef.templateparamlist[0].param.forEach(function (param, argn) {
            m = m.concat(argn == 0 ? [] : ',');
            m = m.concat([toMarkdown(param.type)]);
            m = m.concat(param.declname ? [' ', toMarkdown(param.declname)] : []);
          });
          m.push('>  \n');
        }
        m = m.concat(memberdef.$.inline == 'yes' ? ['inline', ' '] : []);
        m = m.concat(memberdef.$.static == 'yes' ? ['static', ' '] : []);
        m = m.concat(memberdef.$.virt == 'virtual' ? ['virtual', ' '] : []);
        m = m.concat(toMarkdown(memberdef.type), ' ');
        m = m.concat(memberdef.$.explicit  == 'yes' ? ['explicit', ' '] : []);
        m = m.concat(memberdef.name[0]._, '(');
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
        m = m.concat(memberdef.name[0]._);
        break;

      default:
        m.push(member.name);
        break;
    }

    member.proto = '```c++\n' + m.join("") + '\n```'
  },

  assignToNamespace: function (compound, child) {
    if (compound.name != child.namespace)
        console.assert('namespace mismatch: ', compound.name, '!=', child.namespace);

    // namespaces take ownership of the child compound
    if (child.parent)
        delete child.parent.compounds[child.name];
    compound.compounds[child.name] = child;
    child.parent = compound;
  },

  assignNamespaceToGroup: function (compound, child) {

    // add the namespace to the group
    compound.compounds[child.name] = child;

    // remove namespace clildren from direct group children
    Object.keys(child.compounds).forEach(function(id) {
      delete compound.compounds[id];
    });
  },

  assignClassToGroup: function (compound, child) {

    // add the namespace to the group
    // if the child already belongs to a child namespace it will be removed
    // on the call to `assignNamespaceToGroup`
    compound.compounds[child.name] = child;

    // add a groupid and reference to the compound and all it's members
    child.groupid = compound.id;
    child.groupname = compound.name;

    child.members.forEach(function (member) {
      member.groupid = compound.id;
      member.groupname = compound.name;
    });
  },

  parseCompound: function (compound, compounddef) {
    log.verbose('Processing compound ' + compound.name);
    Object.keys(compounddef.$).forEach(function(prop) {
      compound[prop] = compounddef.$[prop];
    });
    compound.fullname = compounddef.compoundname[0]._;
    copy(compound, 'briefdescription', compounddef);
    copy(compound, 'detaileddescription', compounddef);

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
        console.log("WTF: found section", section);
        switch (section.$['kind']) {
          case 'friend':
          case 'public-attrib':
          case 'public-func':
          case 'protected-attrib':
          case 'protected-func':
          case 'private-attrib':
          case 'private-func':
          case 'func':
            if (section.memberdef) {
              section.memberdef.forEach(function (memberdef) {
                var member = this.references[memberdef.$.id];
                if (compound.kind == 'group') {
                  member.groupid = compound.id;
                }
                this.parseMember(member, section.$['kind'], memberdef);
              }.bind(this));
            }
            break;

          default:
            console.assert(true);
        }
      }.bind(this));
    }

    compound.proto = helpers.inline([compound.kind, ' ', markdown.link(compound.name, '#' + compound.refid, true)]);

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

      case 'namespace':
      case 'group':

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
        console.log("WARN -- Not supported kind:", compound.kind);
    }

    return;
  },

  parseIndex: function (root, index, options) {
    index.forEach(function (element) {
      var doxygen, compound = root.find(element.name[0], true);
      var xmlParser = new xml2js.Parser({
        explicitChildren: true,
        preserveChildrenOrder: true,
        charsAsChildren: true
      });

      this.parseMembers(compound, element.$, element.member);

      if (compound.kind !== 'page' && compound.kind !== 'file') {
        log.verbose('Parsing ' + path.join(options.directory, compound.refid + '.xml'));
        doxygen = fs.readFileSync(path.join(options.directory, compound.refid + '.xml'), 'utf8');
        xmlParser.parseString(doxygen, function (err, data) {
          this.parseCompound(compound, data.doxygen.compounddef[0]);
        }.bind(this));
      }

    }.bind(this));
  },

  loadIndex: function (options, callback) {
    log.verbose('Parsing ' + path.join(options.directory, 'index.xml'));
    fs.readFile(path.join(options.directory, 'index.xml'), 'utf8', function(err, data) {
      var xmlParser = new xml2js.Parser();
      xmlParser.parseString(data, function (err, result) {
        var root = new Compound();
        this.parseIndex(root, result.doxygenindex.compound, options);
        callback(null, root); // TODO: return errors properly
      }.bind(this));
    }.bind(this));
  }
};
