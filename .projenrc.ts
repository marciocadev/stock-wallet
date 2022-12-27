import { typescript, awscdk, vscode, web } from 'projen';

const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'stock-wallet',
  projenrcTs: true,
});

// vscode settings
const vscodeSettings = new vscode.VsCodeSettings(project.vscode!);
vscodeSettings.addSetting('files.exclude', {
  '**/.git': true,
  '**/.svn': true,
  '**/.hg': true,
  '**/CVS': true,
  '**/.DS_Store': true,
  '**/Thumbs.db': true,
  '**/node_modules': true,
});
vscodeSettings.addSetting('typescript.disableAutomaticTypeAcquisition', true);
// vscode settings

// backend configuration
new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.56.1',
  defaultReleaseBranch: 'main',
  name: 'backend',
  parent: project,
  outdir: 'backend',
  deps: [
    '@types/aws-lambda',
    '@aws-sdk/util-dynamodb',
    '@aws-sdk/client-dynamodb',
    '@aws-lambda-powertools/logger',
    'source-map-support',
  ],
});
project.addTask('deploy-backend', {
  steps: [
    { exec: 'cd backend && cdk deploy --require-approval never' },
  ],
});
// backend configuration

// frontend configuration
const frontend = new web.ReactTypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'frontend',
  parent: project,
  outdir: 'frontend',
  devDeps: [
    'autoprefixer',
    'cssnano',
    'postcss-import',
    'postcss-cli',
    'postcss-nested',
    'npm-run-all',
  ],
});
frontend.addTask('postcss:watch', {
  steps: [{ exec: 'postcss src/App.css -o src/index.css -w' }],
});
frontend.addTask('postcss:build', {
  steps: [{ exec: 'postcss src/App.css -o src/index.css' }],
});
frontend.addTask('build-all', {
  steps: [
    { spawn: 'eslint' },
    { spawn: 'postcss:build' },
    { spawn: 'build' },
  ],
});
frontend.addTask('start', {
  steps: [
    { exec: 'npm-run-all -p postcss:watch dev' },
  ],
});
// frontend configuration

project.synth();