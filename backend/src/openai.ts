import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateRemediationScripts(resource: {
  resourceId: string;
  resourceType: string;
  annotation?: string;
  controlName?: string;
}) {
  const { resourceId, resourceType, annotation, controlName } = resource;
  const prompt = `You are a cloud security engineer. Given the following AWS resource and compliance issue, generate remediation scripts for Terraform, CloudFormation, and AWS CLI.\n\nResource ID: ${resourceId}\nResource Type: ${resourceType}\nCompliance Issue: ${annotation || 'N/A'}\nControl: ${controlName || 'N/A'}\n\nRespond in the following JSON format:\n{\n  "terraform": "...terraform script...",
  "cloudformation": "...cloudformation script...",
  "aws_cli": "...aws cli command(s)..."
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful cloud compliance assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 800,
  });

  // Try to parse the response as JSON
  const text = response.choices[0].message?.content || '';
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonString);
  } catch (err) {
    return { error: 'Could not parse remediation scripts from OpenAI response.', raw: text };
  }
}
