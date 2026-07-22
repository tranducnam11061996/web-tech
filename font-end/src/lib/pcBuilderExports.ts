import { formatPcPrice, type PcBuilderQuote } from "./pcBuilder";

type ComponentLabel = { code: string; name: string };

function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export async function downloadPcBuilderExcel(quote: PcBuilderQuote, components: ComponentLabel[]) {
  const { default: ExcelJS } = await import("exceljs");
  const labels = new Map(components.map((component) => [component.code, component.name]));
  const rows: Array<Array<string | number>> = [
    ["TRUCTIEPGAME - CẤU HÌNH PC"],
    ["Danh mục", "Tên sản phẩm", "SKU", "Đơn giá", "Số lượng", "Thành tiền", "Khuyến mãi"],
    ...quote.items.map((item) => [
      labels.get(item.componentCode) || item.componentCode,
      item.name,
      item.sku,
      item.price,
      item.quantity,
      item.lineTotal,
      item.promotion?.name || (item.buildPriceApplied ? "Giá Build PC theo SKU" : ""),
    ]),
    [],
    ["Tạm tính trước ưu đãi Build PC", quote.totals.cartSubtotal],
    ["Giảm Build PC", quote.totals.buildDiscount],
    ["Phí lắp ráp", quote.totals.assemblyFee],
    ["Tổng thanh toán", quote.totals.total],
  ];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TrucTiepGAME PC Builder";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Cấu hình PC", {
    views: [{ state: "frozen", ySplit: 2 }],
  });
  worksheet.addRows(rows);
  worksheet.mergeCells("A1:G1");
  worksheet.getRow(1).font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF182B5B" } };
  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE32636" } };
  worksheet.columns = [28, 58, 18, 16, 10, 16, 30].map((width) => ({ width }));
  for (let row = 3; row <= 2 + quote.items.length; row += 1) {
    worksheet.getCell(row, 4).numFmt = "#,##0\"đ\"";
    worksheet.getCell(row, 6).numFmt = "#,##0\"đ\"";
    worksheet.getRow(row).alignment = { vertical: "middle", wrapText: true };
  }
  for (let row = rows.length - 3; row <= rows.length; row += 1)
    worksheet.getCell(row, 2).numFmt = "#,##0\"đ\"";
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.download = `cau-hinh-pc-${fileStamp()}.xlsx`;
  link.href = URL.createObjectURL(blob);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export function downloadPcBuilderPng(quote: PcBuilderQuote, components: ComponentLabel[]) {
  const labels = new Map(components.map((component) => [component.code, component.name]));
  const width = 1440;
  const headerHeight = 190;
  const rowHeight = 116;
  const footerHeight = 230;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = headerHeight + quote.items.length * rowHeight + footerHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ xuất ảnh cấu hình.");
  context.fillStyle = "#090b10";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#e32636");
  gradient.addColorStop(1, "#182b5b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, 14);
  context.fillStyle = "#ffffff";
  context.font = "800 44px Arial";
  context.fillText("TRUCTIEPGAME", 72, 82);
  context.fillStyle = "#ef4653";
  context.font = "700 24px Arial";
  context.fillText("CẤU HÌNH PC CỦA BẠN", 72, 130);
  context.fillStyle = "#8d96aa";
  context.font = "18px Arial";
  context.fillText(`Xuất lúc ${new Date().toLocaleString("vi-VN")}`, 72, 164);
  quote.items.forEach((item, index) => {
    const y = headerHeight + index * rowHeight;
    context.fillStyle = index % 2 ? "#10131b" : "#0d1017";
    context.fillRect(52, y, width - 104, rowHeight - 4);
    context.fillStyle = "#7f8ca7";
    context.font = "700 17px Arial";
    context.fillText(`${String(index + 1).padStart(2, "0")}  ${labels.get(item.componentCode) || item.componentCode}`, 76, y + 34);
    context.fillStyle = "#f5f7fb";
    context.font = "700 21px Arial";
    wrapText(context, item.name, 780).forEach((line, lineIndex) => context.fillText(line, 76, y + 66 + lineIndex * 25));
    context.textAlign = "right";
    context.fillStyle = "#9aa4b8";
    context.font = "18px Arial";
    context.fillText(`SL ${item.quantity}`, 1080, y + 52);
    context.fillStyle = "#ff5260";
    context.font = "800 22px Arial";
    context.fillText(formatPcPrice(item.lineTotal), width - 76, y + 52);
    context.textAlign = "left";
  });
  const footerY = headerHeight + quote.items.length * rowHeight;
  context.fillStyle = "#151a25";
  context.fillRect(52, footerY + 24, width - 104, 160);
  context.fillStyle = "#9aa4b8";
  context.font = "20px Arial";
  context.fillText("Tạm tính", 82, footerY + 70);
  context.fillText("Giảm Build PC", 82, footerY + 108);
  context.fillStyle = "#ffffff";
  context.font = "800 25px Arial";
  context.fillText("TỔNG THANH TOÁN", 82, footerY + 154);
  context.textAlign = "right";
  context.fillStyle = "#ffffff";
  context.font = "700 20px Arial";
  context.fillText(formatPcPrice(quote.totals.cartSubtotal), width - 82, footerY + 70);
  context.fillStyle = "#ff5260";
  context.fillText(`-${formatPcPrice(quote.totals.buildDiscount)}`, width - 82, footerY + 108);
  context.font = "900 30px Arial";
  context.fillText(formatPcPrice(quote.totals.total), width - 82, footerY + 156);
  context.textAlign = "left";
  const link = document.createElement("a");
  link.download = `cau-hinh-pc-${fileStamp()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
