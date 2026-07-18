import { assertCustomerOrigin, requireCustomerSession } from '@/lib/customerAccounts';
import { customerError, customerOk } from '@/lib/customerRoute';
import { pcBuilderSaveSchema } from '@/lib/pcBuilder/types';
import { assertPcBuilderFeature, deleteCustomerPcBuild, getCustomerPcBuild, updateCustomerPcBuild } from '@/lib/pcBuilder/service';

async function id(context:{params:Promise<{id:string}>}) { const value=Number((await context.params).id); if(!Number.isInteger(value)||value<=0) throw new Error('Build ID không hợp lệ.'); return value; }
export async function GET(request:Request,context:{params:Promise<{id:string}>}) { try { assertPcBuilderFeature(); const user=await requireCustomerSession(request); return customerOk(await getCustomerPcBuild(user.id,await id(context))); } catch(error){ return customerError(error); } }
export async function PUT(request:Request,context:{params:Promise<{id:string}>}) { try { assertPcBuilderFeature(); assertCustomerOrigin(request); const user=await requireCustomerSession(request); const parsed=pcBuilderSaveSchema.parse(await request.json()); return customerOk(await updateCustomerPcBuild(user.id,await id(context),{...parsed,mode:parsed.mode||'manual',input:parsed.input||{}})); } catch(error){ return customerError(error); } }
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}) { try { assertPcBuilderFeature(); assertCustomerOrigin(request); const user=await requireCustomerSession(request); return customerOk(await deleteCustomerPcBuild(user.id,await id(context))); } catch(error){ return customerError(error); } }
