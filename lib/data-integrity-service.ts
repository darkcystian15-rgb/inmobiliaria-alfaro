import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { assertPropertyWritable } from './data-integrity.mjs';
export async function assertWritable(executor: Pick<typeof db, 'execute'>, id: number) {
  await assertPropertyWritable({query: async (query: string, values: unknown[]) => {
    const parts=query.split('?');const statement=sql.raw(parts[0]);
    values.forEach((value,index)=>{statement.append(sql`${value}`);statement.append(sql.raw(parts[index+1]));});
    return executor.execute(statement);
  }},id);
}
