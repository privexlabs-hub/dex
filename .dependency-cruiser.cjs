/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'apps-do-not-import-apps',
      comment: 'Applications never depend on each other; shared code lives in packages/.',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'packages-do-not-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'db-is-a-leaf',
      comment: 'packages/db may only depend on env/config; business logic goes in domain.',
      severity: 'error',
      from: { path: '^packages/db/' },
      to: { path: '^packages/', pathNot: '^packages/(db|env|config)/' },
    },
    {
      name: 'ui-is-presentational',
      comment: 'packages/ui must not depend on db, domain, queue, storage or auth.',
      severity: 'error',
      from: { path: '^packages/ui/' },
      to: { path: '^packages/(db|domain|queue|storage|auth|flags)/' },
    },
    {
      name: 'no-secrets-in-client',
      comment: 'Client components must never import server-only packages.',
      severity: 'error',
      from: { path: '^apps/[^/]+/(app|components)/.*\\.tsx$', pathNot: 'server' },
      to: { path: '^packages/(db|queue|storage|auth)/src/server' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'default'],
    },
  },
};
