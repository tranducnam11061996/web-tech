import { requireCustomerSession } from '@/lib/customerAccounts';
import { getCustomerFavoriteProductIds, parseFavoriteStatusIds } from '@/lib/customerFavorites';
import { customerError, customerOk } from '@/lib/customerRoute';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const user = await requireCustomerSession(request);
    const productIds = parseFavoriteStatusIds(new URL(request.url).searchParams.get('ids'));
    const favoriteProductIds = await getCustomerFavoriteProductIds(user.id, productIds);
    const response = customerOk({ favoriteProductIds });
    recordRouteMetric('GET /api/customer/favorites/status', performance.now() - startedAt, response.status);
    return response;
  } catch (error) {
    const response = customerError(error);
    recordRouteMetric('GET /api/customer/favorites/status', performance.now() - startedAt, response.status);
    return response;
  }
}
