const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const fs = require('fs');
const _merge = require('lodash.merge');
const _set = require('lodash.set');

function getReference(input, alias) {
  const pushLevel = (i, memo = []) => {
    if (i.type === 'Identifier') return [...memo, alias || i.name];
    return pushLevel(i.object, [...memo, i.property.name]);
  };

  const levels = pushLevel(input).reverse();

  if (levels.length) return _set({}, levels, null);

  return null;
}

function getReferences({ properties, path, modulePath }) {
  return properties
    .map((property) => {
      const moduleName = property.name;
      const references = path.scope.bindings[moduleName]?.referencePaths || [];

      return references.map((reference) => {
        const callExpressionPath = reference.findParent(
          (node) => node.type === 'CallExpression'
        );
        if (!callExpressionPath) return;

        const referenceObject = getReference(
          callExpressionPath.node.callee,
          property.alias
        );

        return property.isRoot
          ? referenceObject
          : { [modulePath]: referenceObject };
      });
    })
    .flat();
}

function buildMock(value) {
  if (!value) return 'jest.fn()';

  return `{${Object.entries(value)
    .map(([key, value]) => `${key}:${buildMock(value)}`)
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

  const ast = safeParse(file);

  let importReferences;
  let requireReferences;

  traverse(ast, {
    ImportDeclaration(path) {
      const modulePath = path.node.source.value;
      const properties = path.node.specifiers.map((specifier) => {
        return {
          name:
            specifier.type === 'ImportDefaultSpecifier'
              ? specifier.local.name
              : specifier.imported.name,
          isRoot: false,
          alias:
            specifier.type === 'ImportDefaultSpecifier' ? 'default' : undefined,
        };
      });

      importReferences = getReferences({
        properties,
        path,
        modulePath,
      });
    },
    Identifier(path) {
      if (path.node.name !== 'require') return;

      const variableDeclaratorPath = path.findParent(
        (node) => node.type === 'VariableDeclarator'
      );

      if (!variableDeclaratorPath) return;

      const modulePath = variableDeclaratorPath.node.init.arguments[0].value;
      const properties = variableDeclaratorPath.node.id.properties?.map(
        (property) => {
          return {
            name: property.key.name,
            isRoot: false,
          };
        }
      ) || [{ isRoot: true, name: variableDeclaratorPath.node.id.name }];

      requireReferences = getReferences({
        properties,
        path,
        modulePath,
      });
    },
  });

  const references = [
    ...(importReferences || []),
    ...(requireReferences || []),
  ];

  const modules = references.reduce((acc, reference) => {
    return _merge(acc, reference);
  }, {});

  const output = Object.entries(modules)
    .map(([key, value]) => {
      return `jest.mock('${key}', () => (${buildMock(value)}));`;
    })
    .join('\n');

  return generate(parse(output, {})).code;
}

module.exports = main;
