const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const fs = require('fs');
const _merge = require('lodash.merge');
const _set = require('lodash.set');

function addReference(input, alias) {
  const pushLevel = (i, memo = []) => {
    if (i.type === 'Identifier') return [...memo, alias || i.name];
    return pushLevel(i.object, [...memo, i.property.name]);
  };

  const levels = pushLevel(input).reverse();

  if (levels.length) return _set({}, levels, null);

  return null;
}

function getReferences({ properties, path, modulePath, modules }) {
  properties.forEach((property) => {
    const moduleName = property.name;
    const references = path.scope.bindings[moduleName]?.referencePaths || [];
    references.map((reference) => {
      const callExpressionPath = reference.findParent(
        (node) => node.type === 'CallExpression'
      );
      if (!callExpressionPath) return;

      const referenceObject = addReference(
        callExpressionPath.node.callee,
        property.alias
      );

      if (property.root) {
        _merge(modules, referenceObject);
        return;
      }

      _merge(modules, { [modulePath]: referenceObject });
    });
  });
}

function build(value) {
  if (!value) return 'jest.fn()';

  return `{${Object.entries(value)
    .map(([key, value]) => `${key}:${build(value)}`)
    .join(',')}}`;
}

function safeParse(file) {
  try {
    return parse(file, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (error) {
    throw new Error(`Error parsing file: ${error.message}`);
  }
}

function main(file) {
  if (!file) throw new Error('file is required');

  const modules = {};

  const ast = safeParse(file);

  traverse(ast, {
    ImportDeclaration(path) {
      const modulePath = path.node.source.value;
      const properties = path.node.specifiers.map((specifier) => {
        if (specifier.type === 'ImportDefaultSpecifier') {
          return { name: specifier.local.name, alias: 'default', root: false };
        }
        return {
          name: specifier.imported.name,
          root: false,
          alias:
            specifier.type === 'ImportDefaultSpecifier' ? 'default' : undefined,
        };
      });
      getReferences({
        properties,
        path,
        modulePath,
        modules,
      });
    },
    Identifier(path) {
      if (path.node.name !== 'require') return;
      const parentPath = path.findParent(
        (node) => node.type === 'VariableDeclarator'
      );
      const modulePath = parentPath.node.init.arguments[0].value;
      const properties = parentPath.node.id.properties?.map((property) => {
        return {
          name: property.key.name,
          root: false,
        };
      }) || [{ root: true, name: parentPath.node.id.name }];

      getReferences({
        properties,
        path,
        modulePath,
        modules,
      });
    },
  });

  const output = Object.entries(modules)
    .map(([key, value]) => {
      return `jest.mock('${key}', () => (${build(value)}));`;
    })
    .join('\n');

  return generate(parse(output, {})).code;
}

module.exports = main;
