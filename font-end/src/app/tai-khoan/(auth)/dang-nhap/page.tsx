import type { Metadata } from 'next';
import { LoginPage } from '@/components/customer/CustomerLoginPage';

export const metadata: Metadata = { title: 'Đăng nhập tài khoản | TrucTiepGAME', description: 'Đăng nhập TrucTiepGAME để theo dõi đơn hàng và quản lý thông tin mua sắm.' };
export default function Page() { return <LoginPage />; }
