import { typescript, awscdk, vscode } from 'projen';
const project = new typescript.TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'stock-wallet',
  projenrcTs: true,
});

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

project.synth();