import { Activity, Users, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HomeDashboard() {
  const stats = [
    { label: "Doanh thu hôm nay", value: "145.2M ₫", change: "+12.5%", isPositive: true, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Đơn hàng mới", value: "324", change: "+5.2%", isPositive: true, icon: ShoppingCart, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Lượt truy cập", value: "12,450", change: "-2.1%", isPositive: false, icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Khách hàng mới", value: "86", change: "+14.3%", isPositive: true, icon: Users, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="flex flex-col w-full h-full p-6 animate-in fade-in duration-300">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 mb-2">Welcome back, Admin!</h1>
        <p className="text-gray-400">Dưới đây là tổng quan hiệu suất hệ thống bán lẻ HACOM hôm nay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-panel p-6 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-md ${stat.bg} ${stat.color} shadow-inner`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.isPositive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {stat.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="text-3xl font-bold text-gray-100 mb-1 font-mono tracking-tight">{stat.value}</div>
                <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        <div className="lg:col-span-2 glass-panel p-6 rounded-lg border border-gray-800/50 flex flex-col">
          <h2 className="text-lg font-bold text-gray-300 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-500 rounded-sm"></span> Biểu đồ doanh thu (Demo)
          </h2>
          <div className="flex-1 border border-dashed border-gray-800 rounded-md flex items-center justify-center bg-gray-900/30">
            <div className="text-gray-600 font-mono text-sm">CHART_PLACEHOLDER</div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 flex flex-col">
          <h2 className="text-lg font-bold text-gray-300 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-red-500 rounded-sm"></span> Hoạt động gần đây
          </h2>
          <div className="flex-1 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-start pb-4 border-b border-gray-800/50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                <div>
                  <div className="text-sm text-gray-300 font-medium">Đơn hàng #HC{Math.floor(Math.random() * 10000)} vừa được thanh toán</div>
                  <div className="text-xs text-gray-500 mt-1">{i * 12} phút trước</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
