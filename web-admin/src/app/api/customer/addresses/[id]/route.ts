import { z } from 'zod';
import { assertCustomerOrigin, deleteCustomerAddress, makeCustomerAddressDefault, updateCustomerAddress } from '@/lib/customerAccounts';
import { customerError, customerOk } from '@/lib/customerRoute';
import { customerAddressSchema } from '@/lib/commerceValidation';
import { parseJson, PublicRequestError } from '@/lib/publicRequest';
function id(params: { id: string }) { const value = Number(params.id); if (!Number.isInteger(value) || value <= 0) throw new PublicRequestError(400, 'INVALID_ID', 'Địa chỉ không hợp lệ.'); return value; }
const patchSchema = z.union([customerAddressSchema, z.object({ isDefault: z.literal(true) }).strict()]);
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { assertCustomerOrigin(request); const addressId=id(await context.params); const body=await parseJson(request, patchSchema, 16_000); if ('isDefault' in body && body.isDefault && Object.keys(body).length===1) await makeCustomerAddressDefault(request,addressId); else await updateCustomerAddress(request,addressId,body); return customerOk({updated:true}); } catch(error){ return customerError(error); } }
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { assertCustomerOrigin(request); await deleteCustomerAddress(request,id(await context.params)); return customerOk({deleted:true}); } catch(error){ return customerError(error); } }
