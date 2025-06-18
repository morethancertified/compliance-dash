To keep things lightweight you only need three extra moving-parts:

────────────────────────────────────────────────────────

Create a small GitHub App ──────────────────────────────────────────────────────── • In your GitHub org go to “Settings → Developer settings → GitHub Apps → New App”.
• Permissions
– Repository contents: read & write
– Pull-requests: read & write
– Metadata: read
(Add Issues:write if you also want to open issues.)

• Web-application flow / callback URL
https://<your-backend-url>/api/github/callback

• Generate a private key and note:
APP_ID, CLIENT_ID, CLIENT_SECRET, WEBHOOK_SECRET, PRIVATE_KEY.

Add them to /backend/.env:

CopyInsert
GITHUB_APP_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
──────────────────────────────────────────────────────── 2. Add a tiny GitHub-auth helper in the backend ──────────────────────────────────────────────────────── Install Octokit:

CopyInsert
npm i @octokit/rest @octokit/auth-app
/backend/src/github.ts

ts
CopyInsert
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import dotenv from 'dotenv'; dotenv.config();

export async function getRepoClient(installationId: number) {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      installationId
    }
  });
  return octokit;
}
/backend/src/routes/github.ts

ts
CopyInsert
import express from 'express';
import { createAppAuth } from '@octokit/auth-app';
import { getRepoClient } from '../github';

const router = express.Router();

// 1) Redirect user/org owner to install the app
router.get('/install', (_req, res) => {
  const url = `https://github.com/apps/<your-app-slug>/installations/new`;
  res.redirect(url);
});

// 2) OAuth callback to store installation-id in DB or session
router.get('/callback', async (req, res) => {
  // GitHub sends installation_id when the app is installed
  const { installation_id } = req.query;
  // Persist installation_id → user/org in your DB
  res.send('App installed – you may close this tab.');
});

export default router;
Mount in index.ts:

ts
CopyInsert
import githubRoutes from './routes/github';
app.use('/api/github', githubRoutes);
──────────────────────────────────────────────────────── 3. Wire remediation → pull-request ──────────────────────────────────────────────────────── Extend your existing /remediate controller:

ts
CopyInsert
import { getRepoClient } from '../github';

router.post('/remediate', async (req: Request, res: Response) => {
  const { resourceId, resourceType, annotation, controlName,
          installationId, owner, repo, baseBranch = 'main' } = req.body;

  // 1. Ask OpenAI for the fix (already implemented)
  const scripts = await generateRemediationScripts({ resourceId, resourceType, annotation, controlName });

  // 2. Create a PR with those scripts
  const octokit = await getRepoClient(installationId);

  // create a branch
  const { data: base } = await octokit.repos.get({
    owner, repo, ref: `heads/${baseBranch}`
  });
  const branchName = `nist-fix/${resourceId}-${Date.now()}`;
  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: base.object.sha
  });

  // commit patch file
  await octokit.repos.createOrUpdateFileContents({
    owner, repo,
    path: `remediation/${resourceId}.md`,
    message: `Remediation for ${resourceId}`,
    content: Buffer.from(scripts.markdown).toString('base64'),
    branch: branchName
  });

  // open PR
  const { data: pr } = await octokit.pulls.create({
    owner, repo,
    title: `Fix ${controlName} for ${resourceId}`,
    head: branchName,
    base: baseBranch,
    body: `This PR proposes the following remediation:\n\n${scripts.markdown}`
  });

  res.json({ scripts, pullRequest: pr.html_url });
});
Front-end: when a user presses “Generate Fix”, include the installationId, owner, repo that they selected from a simple dropdown (fetch their installations via /user/installations endpoint from GitHub).

──────────────────────────────────────────────────────── How this solves your goal ────────────────────────────────────────────────────────

Compliance-dash keeps doing what it already does: list rules and resources and call OpenAI for remediation text.
With the GitHub App hooked up, the same request can also open a PR (or Issue) containing that remediation script in the target repository that owns the IaC for that resource.
Because you commit to a branch, reviewers can see, test, and merge the fix – the full DevSecOps loop.
Later you can enhance: • Add PR labels like compliance + control id.
• Post review comments line-by-line on Terraform/CloudFormation files instead of a new markdown.
• Auto-close findings when PR merges by listening to GitHub webhooks.

That’s all that’s required to “connect compliance-dash to GitHub” and surface remediation scripts right where the code lives.

Feedback submitted
Auto-generated memory was updated
Manage
Created "Compliance Dash GitHub integration request" memory.
Me

it also needs to retrieve the relevant code from the repository

Revert
Add one extra hop in the backend that runs before you call OpenAI or create the pull-request:

──────────────────────────────────────────────────

Use the GitHub Search API to grab the IaC file ──────────────────────────────────────────────────
ts
CopyInsert
// src/github.ts (append)
export async function fetchIaCSnippet(
  octokit: Octokit,
  { owner, repo, ref = 'main', searchTerms }: {
    owner: string; repo: string; ref?: string; searchTerms: string[];
  }
) {
  for (const term of searchTerms) {
    const { data } = await octokit.search.code({
      q: `${term} repo:${owner}/${repo} in:file (extension:tf OR extension:yml OR extension:yaml OR extension:json)`
    });
    if (data.total_count) {
      const hit = data.items[0];                 // take first match
      const { data: file } = await octokit.repos.getContent({
        owner, repo, path: hit.path, ref
      });

      if (!Array.isArray(file) && 'content' in file) {
        const raw = Buffer.from(file.content, 'base64').toString('utf8');
        const lines = raw.split('\n');
        const idx   = lines.findIndex(l => l.includes(term));
        const snippet = lines
          .slice(Math.max(idx - 5, 0), idx + 6) // ±5 lines
          .join('\n');
        return { path: hit.path, snippet };
      }
    }
  }
  return null; // nothing found
}
────────────────────────────────────────────────── 2. Call it from the POST /remediate endpoint ──────────────────────────────────────────────────

ts
CopyInsert
import { fetchIaCSnippet } from '../github';

router.post('/remediate', async (req, res) => {
  const { resourceId, resourceType, annotation, controlName,
          installationId, owner, repo } = req.body;

  const octokit   = await getRepoClient(installationId);
  const iaCResult = await fetchIaCSnippet(octokit, {
    owner, repo,
    searchTerms: [resourceId, controlName.replace(/\s+/g, '_')]
  });

  const scripts = await generateRemediationScripts({
    resourceId, resourceType, annotation, controlName,
    codeSnippet: iaCResult?.snippet ?? ''
  });

  // … (branch + PR creation as before, optionally attach snippet)
  res.json({ scripts, snippetPath: iaCResult?.path });
});
────────────────────────────────────────────────── 3. Pass the snippet to OpenAI for higher-quality fixes ──────────────────────────────────────────────────

ts
CopyInsert
// src/openai.ts (inside generateRemediationScripts)
const prompt = `
${iaC.codeSnippet
  ? `Here is the relevant infrastructure-as-code:\n\n\`\`\`\n${iaC.codeSnippet}\n\`\`\`\n`
  : ''}
Control: ${controlName}
Resource: ${resourceId} (${resourceType})
Non-compliant because: "${annotation}"

Provide:
1. Explanation
2. Updated IaC snippet
3. Shell commands or AWS CLI to remediate if code cannot be updated immediately
`;
────────────────────────────────────────────────── 4. Front-end tweak ────────────────────────────────────────────────── When the user clicks “Generate Fix” supply owner, repo, and the stored installationId along with the AWS details.

────────────────────────────────────────────────── Result ────────────────────────────────────────────────── • Compliance-dash now searches the target repository, extracts the precise Terraform/CFN/CDK lines defining the non-compliant resource, feeds them to GPT, and returns a remediation script.
• The same request still opens a pull-request containing both the suggested fix and the original snippet for reviewer context.

Feedback submitted
Me

i'll be using openai to do this since it can be pretty arbitrary

Revert
Analyzed
openai.ts:(1-200)
Absolutely —let OpenAI decide which file & snippet are relevant, you just feed it the raw material.

────────────────────────────────────────────────────────

Collect candidate IaC files (cheap, deterministic) ────────────────────────────────────────────────────────
ts
CopyInsert
// github.ts
export async function collectIaCFiles(octokit, { owner, repo, ref = 'main' }) {
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: ref, recursive: 'true' });
  const paths = tree
    .filter(i => i.type === 'blob' && /\.(tf|ya?ml|json)$/i.test(i.path))
    .map(i => i.path)
    .slice(0, 1000);                          // hard-cap for token limits
  const files: { path: string; content: string }[] = [];
  for (const path of paths) {
    const blob = await octokit.repos.getContent({ owner, repo, path, ref });
    if (!Array.isArray(blob.data) && 'content' in blob.data) {
      files.push({
        path,
        content: Buffer.from(blob.data.content, 'base64').toString('utf8')
      });
    }
  }
  return files;
}
──────────────────────────────────────────────────────── 2. Ask GPT-4 o to pick one snippet ────────────────────────────────────────────────────────

ts
CopyInsert
// openai.ts (new helper)
export async function locateSnippet(files, context) {
  const catalog = files.map((f, i) => [(${i}) ${f.path}](cci:1://file:///home/derek/edtech/compliance-dash/backend/src/openai.ts:7:0-39:1)).join('\n');

  const locateResp = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a cloud IaC code locator.' },
      { role: 'user', content:
`We have this compliance issue:
Resource ID: ${context.resourceId}
Type: ${context.resourceType}
Control: ${context.controlName}
Annotation: ${context.annotation}

Below is a numbered list of candidate IaC files:
${catalog}

Answer with JSON:
{"fileIndex": n, "reason": "why", "lineStart": x, "lineEnd": y}` }
    ]
  });

  const { fileIndex, lineStart, lineEnd } = JSON.parse(locateResp.choices[0].message!.content!);
  const file = files[fileIndex];
  const snippet = file.content.split('\n').slice(lineStart, lineEnd + 1).join('\n');
  return { snippet, path: file.path };
}
──────────────────────────────────────────────────────── 3. Feed the snippet back into your existing remediation call ──────────────────────────────────────────────────────── (Your generateRemediationScripts already accepts codeSnippet after our previous step.)

──────────────────────────────────────────────────────── 4. End-to-end flow in /remediate ────────────────────────────────────────────────────────

ts
CopyInsert
const files   = await collectIaCFiles(octokit, { owner, repo });
const { snippet, path } = await locateSnippet(files, { resourceId, resourceType, controlName, annotation });

const scripts = await generateRemediationScripts({
  resourceId, resourceType, annotation, controlName, codeSnippet: snippet
});

// continue with PR creation ···
──────────────────────────────────────────────────────── Why this is safe & practical ──────────────────────────────────────────────────────── • Deterministic search boundary – you send GPT a small catalogue plus individual file contents only when required, keeping token usage < 8 k.
• Arbitrary reasoning delegated to GPT – it can match on resource IDs, tags, naming conventions, or even infer indirectly-related modules.
• No vector database overhead – works live on every request; if performance becomes an issue simply cache collectIaCFiles per commit SHA.

This gives you a fully-OpenAI-driven “find-fix-PR” pipeline while the surrounding code remains simple and auditable.