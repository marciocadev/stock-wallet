import { join } from 'path';
import { Duration } from 'aws-cdk-lib';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface StockFunctionProps extends NodejsFunctionProps { }

export class StockFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props?: StockFunctionProps) {
    super(scope, id, {
      handler: 'handler',
      functionName: id.replace(/([a-z0–9])([A-Z])/g, '$1-$2').toLowerCase(),
      entry: join(__dirname, '../lambda/', id.replace(/([a-z0–9])([A-Z])/g, '$1-$2').toLowerCase(), '/index.ts'),
      bundling: {
        minify: true,
        sourceMap: true,
      },
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
      ...props,
    });
  }
}