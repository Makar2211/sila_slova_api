import { Prisma, PrismaClient, Role } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface LangMap {
  ru?: string;
  en?: string;
  uk?: string;
  [key: string]: string | undefined;
}

interface StepOption {
  id: string;
  text: LangMap;
  [key: string]: unknown;
}

interface StepJson {
  step_id: string;
  scene_id: string;
  step_type: string;
  text_audience: string;
  prompt: LangMap;
  options?: StepOption[];
  correct_answer?: string | string[];
  explanation?: LangMap;
}

interface SceneJson {
  scene_id: string;
  title: LangMap;
  step_ids: string[];
  first_step_index: number;
}

interface LessonJson {
  lesson_id: string;
  title: LangMap;
  default_lang: string;
  supported_langs: string[];
  scenes: Record<string, SceneJson>;
  steps: StepJson[];
  step_image_map?: Record<string, string>;
}

function toJson(value: unknown): Prisma.InputJsonValue | null {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const USERS = [
  {
    email: 'owner@silaslova.com',
    password: 'owner123',
    displayName: 'Owner',
    baseRole: Role.OWNER,
  },
  {
    email: 'admin@silaslova.com',
    password: 'admin123',
    displayName: 'Administrator',
    baseRole: Role.ADMINISTRATOR,
  },
  {
    email: 'revisioner@silaslova.com',
    password: 'rev123',
    displayName: 'Revisioner',
    baseRole: Role.REVISIONER,
  },
  {
    email: 'teacher1@silaslova.com',
    password: 'teach123',
    displayName: 'Teacher One',
    baseRole: Role.TEACHER,
  },
  {
    email: 'teacher2@silaslova.com',
    password: 'teach123',
    displayName: 'Teacher Two',
    baseRole: Role.TEACHER,
  },
  {
    email: 'student1@silaslova.com',
    password: 'stud123',
    displayName: 'Student One',
    baseRole: Role.STUDENT,
  },
  {
    email: 'student2@silaslova.com',
    password: 'stud123',
    displayName: 'Student Two',
    baseRole: Role.STUDENT,
  },
];

async function seedUsers() {
  console.log('Seeding users...');

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        baseRole: u.baseRole,
      },
    });
    console.log(`  ${u.baseRole}: ${u.email}`);
  }

  console.log(`Seeded ${USERS.length} users.\n`);
}

async function seedLesson(lesson: LessonJson) {
  const lessonData = {
    title: lesson.title,
    defaultLang: lesson.default_lang,
    supportedLangs: lesson.supported_langs,
  };
  await prisma.lesson.upsert({
    where: { id: lesson.lesson_id },
    update: lessonData,
    create: { id: lesson.lesson_id, ...lessonData },
  });

  const sceneCuidMap: Record<string, string> = {};

  for (const [sortOrder, [sceneKey, scene]] of Object.entries(
    lesson.scenes,
  ).entries()) {
    const sceneData = {
      title: scene.title,
      firstStepIndex: scene.first_step_index,
      sortOrder,
    };
    const row = await prisma.scene.upsert({
      where: { lessonId_sceneKey: { lessonId: lesson.lesson_id, sceneKey } },
      update: sceneData,
      create: { lessonId: lesson.lesson_id, sceneKey, ...sceneData },
    });
    sceneCuidMap[sceneKey] = row.id;
  }

  const imageMap = lesson.step_image_map ?? {};

  for (const [sortOrder, step] of lesson.steps.entries()) {
    const sceneCuid = sceneCuidMap[step.scene_id];
    if (!sceneCuid) {
      console.warn(
        `  ⚠  unknown scene_id "${step.scene_id}" for step "${step.step_id}" — skipped`,
      );
      continue;
    }

    const stepData = {
      sceneId: sceneCuid,
      stepType: step.step_type,
      textAudience: step.text_audience,
      prompt: toJson(step.prompt) ?? {},
      options: toJson(step.options),
      correctAnswer: toJson(step.correct_answer),
      explanation: toJson(step.explanation),
      imagePath: imageMap[step.step_id] ?? null,
      sortOrder,
    };

    await prisma.step.upsert({
      where: {
        lessonId_stepKey: { lessonId: lesson.lesson_id, stepKey: step.step_id },
      },
      update: stepData,
      create: {
        lessonId: lesson.lesson_id,
        stepKey: step.step_id,
        ...stepData,
      },
    });
  }
}

async function seedLessons() {
  const dataDir = path.resolve(__dirname, '../data/SERVER');

  if (!fs.existsSync(dataDir)) {
    console.warn(`⚠  ${dataDir} not found — skipping lessons`);
    return;
  }

  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith('_runtime.json'))
    .sort();

  if (files.length === 0) {
    console.warn('⚠  No lesson JSON files found in data/SERVER/');
    return;
  }

  console.log(`Seeding ${files.length} lessons...`);

  for (const file of files) {
    const lesson: LessonJson = JSON.parse(
      fs.readFileSync(path.join(dataDir, file), 'utf-8'),
    );
    await seedLesson(lesson);
    console.log(
      `  ✓  Lesson ${lesson.lesson_id} — ${Object.keys(lesson.scenes).length} scenes, ${lesson.steps.length} steps`,
    );
  }

  console.log('Lessons seeded.\n');
}

async function main() {
  console.log('=== Seeding database ===\n');
  await seedUsers();
  await seedLessons();
  console.log('=== Done ===');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
