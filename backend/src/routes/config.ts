import express from 'express';
import type { Request, Response } from 'express';
import { getNonCompliantResourcesForRule, listConfigRules } from '../awsConfig';
import { generateRemediationScripts } from '../openai';

const router = express.Router();

// GET /api/config/rules
router.get('/rules', async (req, res) => {
  try {
    const nextToken = req.query.nextToken as string | undefined;
    const { rules, nextToken: newNextToken } = await listConfigRules(nextToken);
    // Map to a simpler structure for frontend
    const controls = rules.map((rule: any) => ({
      name: rule.ConfigRuleName,
      description: rule.Description,
      id: rule.ConfigRuleId,
      arn: rule.ConfigRuleArn,
      inputParameters: rule.InputParameters,
      scope: rule.Scope,
      source: rule.Source,
      compliance: rule.Compliance,
    }));
    res.json({ controls, nextToken: newNextToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch config rules.' });
  }
});

// GET /api/config/noncompliant/:ruleName
router.get('/noncompliant/:ruleName', async (req, res) => {
  try {
    const ruleName = req.params.ruleName;
    const nextToken = req.query.nextToken as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const { results, nextToken: newNextToken } = await getNonCompliantResourcesForRule(ruleName, nextToken, limit);
    // Map AWS SDK results to a simpler structure for the frontend
    const resources = results.map((result: any) => ({
      resourceId: result.EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId,
      resourceType: result.EvaluationResultIdentifier.EvaluationResultQualifier.ResourceType,
      complianceTime: result.ResultRecordedTime,
      annotation: result.Annotation,
      complianceResourceType: result.EvaluationResultIdentifier.EvaluationResultQualifier.ResourceType,
    }));
    res.json({ resources, nextToken: newNextToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch non-compliant resources.' });
  }
});

// POST /api/config/remediate
router.post('/remediate', async (req: Request, res: Response) => {
  try {
    const { resourceId, resourceType, annotation, controlName } = req.body;
    if (!resourceId || !resourceType) {
      res.status(400).json({ error: 'resourceId and resourceType are required.' });
      return;
    }
    const scripts = await generateRemediationScripts({ resourceId, resourceType, annotation, controlName });
    res.json(scripts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate remediation scripts.' });
  }
});

export default router;
