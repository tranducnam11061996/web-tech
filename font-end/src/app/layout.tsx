import '../styles/style.css';

export const metadata = {
  title: 'HACOM - Siêu thị Công nghệ',
  description: 'HACOM - Hệ thống bán lẻ đồ công nghệ hàng đầu Việt Nam',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-dark text-white">
        {children}
      </body>
    </html>
  );
}
