import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import importPlugin from 'eslint-plugin-import';
import pluginVue from 'eslint-plugin-vue';
import { Linter } from 'eslint';

const rules: Partial<Linter.RulesRecord> = {
  'class-methods-use-this': 'off',
  curly: ['error', 'all'],
  eqeqeq: ['error', 'smart'],
  'max-classes-per-file': ['error', 1],
  'no-void': ['error', { allowAsStatement: true }],
  'no-console': ['warn'],
  'no-param-reassign': 'warn',
  'no-underscore-dangle': 'error',
  'no-await-in-loop': 'error',
  'no-duplicate-imports': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-use-before-define': 'error',
  'no-template-curly-in-string': 'error',
  'no-promise-executor-return': 'error',
  // 'import/extensions': ['error', 'ignorePackages'],
  'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  'import/no-cycle': ['error'],
  '@typescript-eslint/no-floating-promises': 'off', // used to call store actions without await and router
  '@typescript-eslint/no-inferrable-types': ['off'],
  '@typescript-eslint/typedef': [
    'warn',
    {
      arrayDestructuring: true,
      arrowParameter: true,
      memberVariableDeclaration: true,
      objectDestructuring: true,
      parameter: true,
      propertyDeclaration: true,
      variableDeclaration: true,
      variableDeclarationIgnoreFunction: true,
    },
  ],
  '@typescript-eslint/unbound-method': 'error',
  '@typescript-eslint/explicit-member-accessibility': 'error',
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-useless-constructor': 'error',
  '@typescript-eslint/no-empty-function': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      args: 'all',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  '@typescript-eslint/no-misused-promises': [
    'error',
    {
      checksVoidReturn: {
        arguments: false,
      },
    },
  ],
  '@typescript-eslint/no-empty-interface': [
    'error',
    {
      allowSingleExtends: true,
    },
  ],
  // change to "error" (default) later, currently too many violations
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/no-unsafe-member-access': 'warn',
  '@typescript-eslint/no-unsafe-call': 'warn',
  '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
  '@typescript-eslint/no-empty-object-type': 'warn', // alternative pattern for empty getters in stores needed
  '@typescript-eslint/prefer-promise-reject-errors': 'warn',
};

export default defineConfig(
  globalIgnores([
    'eslint.config.ts',
    '.prettierrc.cjs',
    'dist/*',
    'node_modules/*',
    'coverage/*',
    'src/api-client/generated/**/*',
  ]),
  {
    name: 'ts-config',
    extends: [tseslint.configs.recommendedTypeChecked, pluginVue.configs['flat/essential']],
    plugins: { tseslint: tseslint, import: importPlugin },
    languageOptions: {
      parser: vueParser,
      sourceType: 'module',
      ecmaVersion: 2022,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.app.json', './tsconfig.node.json'],
      },
    },
    files: ['**/*.vue', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs', '**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    ignores: ['test-migrations/**/*.ts', 'migrations/**/*.ts', 'src/api-client/openapi/**'],
    rules: rules,
  },
);
