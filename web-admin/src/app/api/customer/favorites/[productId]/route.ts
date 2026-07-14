import { assertCustomerOrigin, requireCustomerSession } from '@/lib/customerAccounts';
import { addCustomerFavorite, deleteCustomerFavorite, parseFavoriteProductId } from '@/lib/customerFavorites';
import { customerError, customerOk } from '@/lib/customerRoute';
import { consumeRateLimit } from '@/lib/performanceInfrastructure';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

type RouteContext = { params: Promise<{ productId: string }> };

async function customerAndProduct(request: Request, context: RouteContext) {
  assertCustomerOrigin(request);
  const [user, params] = await Promise.all([requireCustomerSession(request), context.params]);
  const productId = parseFavoriteProductId(params.productId);
  await consumeRateLimit({
    scope: 'customer_favorite_write',
    key: String(user.id),
    limit: 120,
    windowSeconds: 900,
    blockSeconds: 900,
  });
  return { user, productId };
}

async function handleMutation(
  request: Request,
  context: RouteContext,
  method: 'PUT' | 'DELETE',
) {
  const startedAt = performance.now();
  const metric = `${method} /api/customer/favorites/:productId`;
  try {
    const { user, productId } = await customerAndProduct(request, context);
    const result = method === 'PUT'
      ? await addCustomerFavorite(user.id, productId)
      : await deleteCustomerFavorite(user.id, productId);
    const response = customerOk(result);
    recordRouteMetric(metric, performance.now() - startedAt, response.status);
    return response;
  } catch (error) {
    const response = customerError(error);
    recordRouteMetric(metric, performance.now() - startedAt, response.status);
    return response;
  }
}

export async function PUT(request: Request, context: RouteContext) {
  return handleMutation(request, context, 'PUT');
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleMutation(request, context, 'DELETE');
}
