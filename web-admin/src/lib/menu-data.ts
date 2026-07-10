import {
  ShoppingCart,
  Package,
  FileText,
  ShieldCheck,
  Link as LinkIcon,
  Layers,
  Users,
  Megaphone,
  FileImage,
  Cpu,
  CreditCard,
  Settings,
  FormInput,
  MessageSquare,
  File,
  UserCog,
  Upload
} from 'lucide-react';

export const menuGroups = [
  {
    title: 'Quản lý bán hàng',
    icon: ShoppingCart,
    items: [
      { name: 'Danh sách đơn hàng', path: '#' }
    ]
  },
  {
    title: 'Quản lý sản phẩm',
    icon: Package,
    items: [
      { name: 'Danh sách sản phẩm', path: '/product/product-list' },
      { name: 'Danh mục sản phẩm', path: '/product/categories' },
      { name: 'Danh mục cho SEO', path: '#' },
      { name: 'Bộ sưu tập', path: '/product/collection' },
      { name: 'Quản lý khung sản phẩm', path: '/product/product-frame' },
      { name: 'Biến thể sản phẩm', path: '/product/product-group' },
      { name: 'Quản lý thuộc tính', path: '/product/attribute-list' },
      { name: 'Thông số trên card', path: '/product/card-attributes' },
      { name: 'Danh sách thương hiệu', path: '/product/brand' }
    ]
  },
  {
    title: 'Quản lý bài viết',
    icon: FileText,
    items: [
      { name: 'Bài viết', path: '/news/news-list' },
      { name: 'Danh mục bài viết', path: '/news/news-category' }
    ]
  },
  {
    title: 'Quản lý bảo hành',
    icon: ShieldCheck,
    items: [
      { name: 'Danh mục hãng', path: '#' }
    ]
  },
  {
    title: 'Tính năng Redirect',
    icon: LinkIcon,
    items: [
      { name: 'Tính năng Redirect', path: '#' }
    ]
  },
  {
    title: 'Combo Set',
    icon: Layers,
    items: [
      { name: 'Danh sách combo set', path: '/product/combo-set/list' }
    ]
  },
  {
    title: 'Quản lý khách hàng',
    icon: Users,
    items: [
      { name: 'Tổng hợp trao đổi của người dùng', path: '#' },
      { name: 'Tổng hợp đánh giá của người dùng', path: '#' }
    ]
  },
  {
    title: 'Quản lý Marketing',
    icon: Megaphone,
    items: [
      { name: 'Danh sách banner', path: '/banner/banner-list' },
      { name: 'Danh sách vị trí banner', path: '/banner/locations' },
      { name: 'Facebook Product Ads', path: '#' },
      { name: 'Update Excel SEO sản phẩm', path: '#' },
      { name: 'Quản lý chi nhánh', path: '#' }
    ]
  },
  {
    title: 'Quản lý Nội dung',
    icon: FileImage,
    items: [
      { name: 'Danh sách nội dung cố định', path: '#' },
      { name: 'Danh sách ảnh khách hàng', path: '#' },
      { name: 'Danh sách media', path: '#' },
      { name: 'Menu header', path: '/content/menu/header' },
      { name: 'Kh\u1ed1i menu trang ch\u1ee7', path: '/content/menu/homepage' }
    ]
  },
  {
    title: 'Xây dựng máy tính',
    icon: Cpu,
    items: [
      { name: 'Link kiện xây dựng', path: '#' }
    ]
  },
  {
    title: 'Quản lý Trả góp',
    icon: CreditCard,
    items: [
      { name: 'Cài đặt trả góp', path: '#' }
    ]
  },
  {
    title: 'Quản lý Hệ thống',
    icon: Settings,
    items: [
      { name: 'Danh sách tag', path: '#' },
      { name: 'Đồng bộ dữ liệu', path: '#' },
      { name: 'Thời gian làm việc', path: '#' },
      { name: 'FAQs', path: '#' }
    ]
  },
  {
    title: 'Quản lý Form đăng ký',
    icon: FormInput,
    items: [
      { name: 'Chờ mua sản phẩm', path: '#' },
      { name: 'Tuyển dụng', path: '#' },
      { name: 'Bài viết tuyển dụng', path: '#' },
      { name: 'Yêu cầu bảo hành', path: '#' }
    ]
  },
  {
    title: 'Quản lý phản hồi',
    icon: MessageSquare,
    items: [
      { name: 'Danh sách khách hàng nhập tin', path: '#' },
      { name: 'Khách hàng gửi liên hệ', path: '#' }
    ]
  },
  {
    title: 'Quản lý văn bản',
    icon: File,
    items: [
      { name: 'Danh sách công văn', path: '#' },
      { name: 'Hệ thống tài liệu', path: '#' }
    ]
  },
  {
    title: 'Phân quyền',
    icon: UserCog,
    items: [
      { name: 'Nhóm menu', path: '#' },
      { name: 'Nhóm chức năng', path: '#' },
      { name: 'Log Web', path: '#' }
    ]
  },
  {
    title: 'Upload Image',
    icon: Upload,
    items: [
      { name: 'Upload Image', path: '#' }
    ]
  }
];
