import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth';
import { zoneCondition } from '@/lib/zone-scope';
import { workflowTasks } from '@/lib/workflow-tasks';
import { taskAgenda } from '@/lib/task-agenda.mjs';
export async function GET(request: Request) {
  const auth = await authorizeApi(); if (auth.response) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const tasks = await workflowTasks(zoneCondition(request));
    return NextResponse.json(taskAgenda(tasks, params));
  } catch { return NextResponse.json({error:'No se pudo consultar la agenda de seguimiento.'}, {status:500}); }
}
