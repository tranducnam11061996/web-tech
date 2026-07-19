import { CommercePageFrame } from "@/components/commerce/CommercePageFrame";
import PcBuilderClient from "./PcBuilderClient";

export const metadata = {
  title: "Xây dựng cấu hình PC | TrucTiepGAME",
  description:
    "Tự chọn toàn bộ linh kiện PC đang bán, lọc theo thuộc tính, kiểm tra tương thích và nhận báo giá trước khi đặt hàng.",
};

export default function PcBuilderPage() {
  return (
    <CommercePageFrame>
      <PcBuilderClient />
    </CommercePageFrame>
  );
}
