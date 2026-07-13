import '../styles/style.css';
import AddToCartSuccessModal from '@/components/AddToCartSuccessModal';
import { CustomerSessionProvider } from '@/lib/customer';
import WebVitalsLoader from '@/components/WebVitalsLoader';

export const metadata = {
  title: 'TrucTiepGAME - Siêu thị Công nghệ',
  description: 'TrucTiepGAME - Hệ thống bán lẻ đồ công nghệ hàng đầu Việt Nam',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-dark text-white">
        <CustomerSessionProvider>
          <WebVitalsLoader />
          {children}
          <AddToCartSuccessModal />
        </CustomerSessionProvider>
      </body>
    </html>
  );
}
