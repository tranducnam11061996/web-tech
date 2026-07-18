import { assertCustomerOrigin, requireCustomerSession } from '@/lib/customerAccounts';
import { customerError, customerOk } from '@/lib/customerRoute';
import { pcBuilderSaveSchema } from '@/lib/pcBuilder/types';
import { assertPcBuilderFeature, listCustomerPcBuilds, savePcBuild } from '@/lib/pcBuilder/service';

export async function GET(request: Request) { try { assertPcBuilderFeature(); const user=await requireCustomerSession(request); return customerOk(await listCustomerPcBuilds(user.id)); } catch(error){ return customerError(error); } }
export async function POST(request: Request) { try { assertPcBuilderFeature(); assertCustomerOrigin(request); const user=await requireCustomerSession(request); const parsed=pcBuilderSaveSchema.parse(await request.json()); return customerOk(await savePcBuild({ ...parsed, mode: parsed.mode || 'manual', input: parsed.input || {} },user.id),201); } catch(error){ return customerError(error); } }
