import { ConfigServiceClient, GetComplianceDetailsByConfigRuleCommand, DescribeConfigRulesCommand } from "@aws-sdk/client-config-service";
import dotenv from 'dotenv';

dotenv.config();

const client = new ConfigServiceClient({
  // Region can come from environment or IMDS; fallback to us-east-1
  region: process.env.AWS_REGION || "us-east-1",
  // Do not explicitly pass credentials; rely on default provider chain (ECS task role, etc.)
});

export async function listConfigRules(nextToken?: string) {
  const command = new DescribeConfigRulesCommand({
    NextToken: nextToken,
  });
  const response = await client.send(command);
  return { rules: response.ConfigRules || [], nextToken: response.NextToken };
}

export async function getNonCompliantResourcesForRule(ruleName: string, nextToken?: string, limit: number = 100) {
  const command = new GetComplianceDetailsByConfigRuleCommand({
    ConfigRuleName: ruleName,
    ComplianceTypes: ['NON_COMPLIANT'],
    Limit: limit,
    NextToken: nextToken,
  });
  const response = await client.send(command);
  return { results: response.EvaluationResults || [], nextToken: response.NextToken };
}
