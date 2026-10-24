export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  verbose: true,
  clearMocks: true,
  testMatch: ["**/?(*.)+(spec|test).ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "node",
          verbatimModuleSyntax: false,
          isolatedModules: true,
          esModuleInterop: true,
          types: ["jest", "node"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
