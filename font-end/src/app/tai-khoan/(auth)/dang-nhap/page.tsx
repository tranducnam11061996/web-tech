import type { Metadata } from 'next';
import { LoginPage } from '@/components/customer/CustomerLoginPage';

export const metadata: Metadata = { title: 'Đăng nhập tài khoản | TrucTiepGAME', description: 'Đăng nhập TrucTiepGAME để theo dõi đơn hàng và quản lý thông tin mua sắm.' };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawProductId = first(params.favoriteProductId) || "";
  const productId = /^\d+$/.test(rawProductId) && Number.isSafeInteger(Number(rawProductId)) && Number(rawProductId) > 0
    ? Number(rawProductId)
    : null;
  const returnTo = first(params.returnTo) === "/yeu-thich" ? "/yeu-thich" : null;
  return <LoginPage favoriteProductId={productId} returnTo={returnTo} />;
}
