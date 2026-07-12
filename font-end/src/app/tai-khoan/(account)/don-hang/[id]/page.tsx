import { CustomerOrderDetail } from '@/components/customer/CustomerAccountPages';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const id = Number((await params).id); return <CustomerOrderDetail orderId={id} />; }
