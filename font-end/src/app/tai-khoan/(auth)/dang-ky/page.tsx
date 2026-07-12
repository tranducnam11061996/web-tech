import type { Metadata } from 'next';
import { RegisterPage } from '@/components/customer/CustomerRegisterPage';

export const metadata: Metadata = { title: 'Đăng ký tài khoản | TrucTiepGAME', description: 'Tạo tài khoản TrucTiepGAME để lưu địa chỉ và theo dõi đơn hàng.' };
export default function Page() { return <RegisterPage />; }
