import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import _merge from 'lodash.merge';
import _set from 'lodash.set';
import {
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
} from '@babel/types';

function getReference(input: babel.types.CallExpression, alias?: string) {
  const pushLevel = (node, memo: string[] = []) => {
    if (node.type === 'Identifier') return [...memo, alias || node.name];
    return pushLevel(node.object, [...memo, node.property.name]);
  };

  const levels = pushLevel(input).reverse();

  if (levels.length) return _set({}, levels, null);

  return null;
}

type Property = {
  name: string;
  isRoot: boolean;
  alias?: string;
};

function getReferences({
  properties,
  path,
  modulePath,
}: {
  properties: Property[];
  path:
    | NodePath<babel.types.ImportDeclaration>
    | NodePath<babel.types.Identifier>;
  modulePath: string;
}) {
  return properties
    .map((property) => {
      const moduleName = property.name;
      const references = path.scope.bindings[moduleName]?.referencePaths || [];

      return references.map((reference) => {
        const callExpressionPath = reference.findParent(
          (node) => node.type === 'CallExpression'
        ) as NodePath<babel.types.CallExpression> | null;

        if (!callExpressionPath) return;
        if (callExpressionPath.node.callee.type !== 'CallExpression') return;

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

  function getName(
    specifier:
      | ImportDefaultSpecifier
      | ImportNamespaceSpecifier
      | ImportSpecifier
  ) {
    if (specifier.type === 'ImportDefaultSpecifier')
      return specifier.local.name;
    if (specifier.type === 'ImportSpecifier') {
      if (specifier.imported.type === 'Identifier')
        return specifier.imported.name;
      if (specifier.imported.type === 'StringLiteral')
        return specifier.imported.value;
    }
  }

  traverse(ast, {
    ImportDeclaration(path) {
      const modulePath = path.node.source.value;
      const properties = path.node.specifiers
        .map((specifier) => {
          const name = getName(specifier);
          if (!name) return;

          return {
            name: name,
            isRoot: false,
            alias:
              specifier.type === 'ImportDefaultSpecifier'
                ? 'default'
                : undefined,
          };
        })
        .filter(Boolean) as Property[];

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
      ) as NodePath<babel.types.VariableDeclarator> | null;

      if (!variableDeclaratorPath) return;

      if (variableDeclaratorPath.node.init?.type !== 'CallExpression') return;

      if (
        variableDeclaratorPath.node.init?.arguments[0].type !== 'StringLiteral'
      )
        return;

      const modulePath = variableDeclaratorPath.node.init?.arguments[0].value;

      let properties;

      if (variableDeclaratorPath.node.id.type === 'ObjectPattern') {
        properties = variableDeclaratorPath.node.id.properties
          ?.map((property) => {
            if (
              property.type !== 'ObjectProperty' ||
              property.key.type !== 'Identifier'
            ) {
              return;
            }
            return {
              name: property.key.name,
              isRoot: false,
            };
          })
          .filter(Boolean) as Property[];
      }
      if (variableDeclaratorPath.node.id.type === 'Identifier')
        properties = [
          { isRoot: true, name: variableDeclaratorPath.node.id.name },
        ];

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

export default main;