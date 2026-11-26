/** Decides which database steps the Vercel build may run. Database steps run ONLY when VERCEL_ENV is exactly "production". Preview, development and a missing VERCEL_ENV never touch a database. The SKIP_* switches can still turn the steps off in production. */
export function databaseSteps(env) {
  const production = env.VERCEL_ENV === 'production';
  return {
    production,
    migrate: production && env.SKIP_DB_MIGRATE !== '1',
    guideSync: production && env.SKIP_LAWYER_GUIDE_SYNC !== '1',
    seed: production && env.SEED_ON_BUILD === '1',
  };
}
