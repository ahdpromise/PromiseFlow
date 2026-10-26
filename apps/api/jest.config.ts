
import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);

const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',

  moduleFileExtensions: ['ts', 'js', 'json'],

  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          isolatedModules: true,
          rootDir: '.',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },

  moduleNameMapper: pathsToModuleNameMapper(paths, {
    prefix: '<rootDir>/',
    useESM: true,
  }),

  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],

  coverageDirectory: './coverage',
};

export default config;
