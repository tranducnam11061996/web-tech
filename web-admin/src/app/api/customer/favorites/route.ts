import { requireCustomerSession } from '@/lib/customerAccounts';
import { listCustomerFavorites, parseFavoriteListOptions } from '@/lib/customerFavorites';
import { customerError, customerOk } from '@/lib/customerRoute';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const user = await requireCustomerSession(request);
    const options = parseFavoriteListOptions(new URL(request.url).searchParams);
    const response = customerOk(await listCustomerFavorites(user.id, options));
    recordRouteMetric('GET /api/customer/favorites', performance.now() - startedAt, response.status);
    return response;
  } catch (error) {
    const response = customerError(error);
    recordRouteMetric('GET /api/customer/favorites', performance.now() - startedAt, response.status);
    return response;
  }
}
