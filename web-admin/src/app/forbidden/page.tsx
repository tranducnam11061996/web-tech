import Link from 'next/link';

export default function ForbiddenPage() {
  return <div className="mx-auto mt-16 max-w-lg rounded-xl border border-red-500/30 bg-red-950/20 p-8 text-center"><h1 className="text-xl font-bold text-red-300">Khong duoc cap quyen</h1><p className="mt-3 text-sm text-gray-400">Tai khoan hien tai khong co quyen truy cap chuc nang nay.</p><Link href="/" className="mt-6 inline-block rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700">Ve trang chu</Link></div>;
}
