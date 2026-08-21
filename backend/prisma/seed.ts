// Seeds demo data: admin user, 6 projects, completed scans, 60+ findings
// with varied statuses and audit history. Run with:  npm run seed
import { FindingStatus, PrismaClient, ScanStatus, ScanType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateFindings, makeRng } from '../src/scans/finding-generator';

const prisma = new PrismaClient();
const rng = makeRng(20260820); // deterministic demo data

function daysAgo(days: number, hourJitter = true): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  if (hourJitter) d.setHours(8 + Math.floor(rng() * 9), Math.floor(rng() * 60), 0, 0);
  return d;
}

const PROJECTS = [
  { name: 'payments-api', description: 'Core payments processing REST API', repoUrl: 'https://git.example.com/acme/payments-api', defaultBranch: 'main', stack: 'TypeScript', owner: 'Ada Lovelace' },
  { name: 'customer-portal', description: 'Public customer self-service web portal', repoUrl: 'https://git.example.com/acme/customer-portal', defaultBranch: 'main', stack: 'Angular', owner: 'Grace Hopper' },
  { name: 'billing-service', description: 'Invoice generation and billing microservice', repoUrl: 'https://git.example.com/acme/billing-service', defaultBranch: 'develop', stack: 'Java', owner: 'Alan Turing' },
  { name: 'auth-gateway', description: 'Single sign-on and identity gateway', repoUrl: 'https://git.example.com/acme/auth-gateway', defaultBranch: 'main', stack: 'Go', owner: 'Katherine Johnson' },
  { name: 'mobile-backend', description: 'BFF for iOS/Android apps', repoUrl: 'https://git.example.com/acme/mobile-backend', defaultBranch: 'main', stack: 'Python', owner: 'Linus T.' },
  { name: 'data-warehouse-etl', description: 'Nightly ETL jobs into the data warehouse', repoUrl: 'https://git.example.com/acme/dw-etl', defaultBranch: 'main', stack: 'Python', owner: 'Margaret Hamilton' },
];

const REVIEW_COMMENTS: Record<string, string> = {
  CONFIRMED: 'Reproduced during triage; scheduling a fix.',
  FALSE_POSITIVE: 'Scanner misidentified sanitized input; verified safe.',
  ACCEPTED_RISK: 'Internal-only service; risk accepted for this quarter.',
  FIXED: 'Patched and verified in the latest release.',
};

async function main() {
  console.log('Clearing existing data …');
  await prisma.findingStatusChange.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.scan.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating demo user admin/admin …');
  await prisma.user.create({
    data: {
      username: 'admin',
      password: await bcrypt.hash('admin', 10),
      name: 'Demo Admin',
      role: 'ADMIN',
    },
  });

  let totalFindings = 0;
  for (const [pi, p] of PROJECTS.entries()) {
    const project = await prisma.project.create({
      data: { ...p, createdAt: daysAgo(70 - pi * 5) },
    });

    const scanCount = 2 + Math.floor(rng() * 2); // 2–3 scans per project
    for (let s = 0; s < scanCount; s++) {
      const type: ScanType = rng() < 0.5 ? ScanType.SAST : ScanType.DAST;
      const startedAt = daysAgo(Math.floor(rng() * 55) + 1);
      const durationSec = 40 + Math.floor(rng() * 300);
      const finishedAt = new Date(startedAt.getTime() + durationSec * 1000);

      const scan = await prisma.scan.create({
        data: { projectId: project.id, type, status: ScanStatus.COMPLETED, startedAt, finishedAt, durationSec },
      });

      const findings = generateFindings(type, 3 + Math.floor(rng() * 5), rng);
      for (const f of findings) {
        totalFindings++;
        // ~55% stay OPEN, the rest get a reviewed status + audit trail entry
        const roll = rng();
        let status: FindingStatus = FindingStatus.OPEN;
        if (roll > 0.85) status = FindingStatus.FIXED;
        else if (roll > 0.75) status = FindingStatus.FALSE_POSITIVE;
        else if (roll > 0.65) status = FindingStatus.ACCEPTED_RISK;
        else if (roll > 0.55) status = FindingStatus.CONFIRMED;

        const finding = await prisma.finding.create({
          data: { ...f, scanId: scan.id, projectId: project.id, status, createdAt: finishedAt },
        });
        if (status !== FindingStatus.OPEN) {
          await prisma.findingStatusChange.create({
            data: {
              findingId: finding.id,
              oldStatus: FindingStatus.OPEN,
              newStatus: status,
              comment: REVIEW_COMMENTS[status] || '',
              changedBy: 'admin',
              changedAt: new Date(finishedAt.getTime() + 86400000 * (1 + Math.floor(rng() * 5))),
            },
          });
        }
      }
    }
  }
  console.log(`Seed complete: ${PROJECTS.length} projects, ${totalFindings} findings.`);
  console.log('Login with  admin / admin');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
