import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> } // In Next.js 15, params is a Promise
) {
  try {
    const { slug } = await params;
    const requestPath = `/${slug}`;

    // 1. Resolve slug to product ID using idv_url
    const [urlRows] = await pool.query(
      'SELECT id_path, url_type FROM idv_url WHERE request_path = ? LIMIT 1',
      [requestPath]
    );

    const urlData = urlRows as any[];
    if (urlData.length === 0) {
      return NextResponse.json({ success: false, message: "Sản phẩm hoặc danh mục không tồn tại", error: "Not Found" }, { status: 404 });
    }

    if (urlData[0].url_type === 'product:category') {
      const match = urlData[0].id_path.match(/view_id:(\d+)/);
      const categoryId = match ? match[1] : null;
      if (categoryId) {
        const [catRows] = await pool.query('SELECT name, summary, img_big, meta_title FROM idv_seller_category WHERE id = ? LIMIT 1', [Number(categoryId)]);
        const catData = catRows as any[];
        let name = 'Danh mục';
        let summary = '';
        let imgBig = '';
        let metaTitle = '';
        if (catData.length > 0) {
          name = catData[0].name;
          summary = catData[0].summary;
          imgBig = catData[0].img_big;
          metaTitle = catData[0].meta_title;
        }

        return NextResponse.json({ success: true, type: 'category', data: { id: categoryId, type: 'category', name, summary, imgBig, metaTitle } });
      }
    }

    if (urlData[0].url_type !== 'product:product-detail') {
      return NextResponse.json({ success: false, message: "Loại đường dẫn không được hỗ trợ", error: "Invalid Type" }, { status: 400 });
    }

    // Extract product ID from id_path (e.g., "module:product/view:product-detail/view_id:70977")
    const match = urlData[0].id_path.match(/view_id:(\d+)/);
    const productId = match ? match[1] : null;

    if (!productId) {
      return NextResponse.json({ success: false, message: "Lỗi cấu trúc đường dẫn", error: "Invalid URL mapping" }, { status: 400 });
    }

    // 2. Fetch product details
    const [productRows] = await pool.query(`
      SELECT 
        p.id, p.proName, p.storeSKU, p.warranty, p.image_collection, p.proSummary,
        pr.price, pr.market_price, pr.isOn,
        b.name as brandName,
        i.spec, i.description
      FROM idv_sell_product_store p
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
      LEFT JOIN idv_brand b ON p.brandId = b.id
      LEFT JOIN idv_sell_product_info i ON p.id = i.id
      WHERE p.id = ?
    `, [Number(productId)]);

    const products = productRows as any[];
    if (products.length === 0) {
      return NextResponse.json({ success: false, message: "Dữ liệu sản phẩm không tồn tại", error: "Not Found" }, { status: 404 });
    }

    const product = products[0];

    // 3. Parse image_collection
    const parsedImages: string[] = [];
    const rawImgCol = product.image_collection || '';
    if (rawImgCol) {
      // PHP serialized parsing with regex
      const blockRegex = /s:10:"image_name";s:\d+:"([^"]+)";s:3:"alt";s:\d+:"([^"]*)"/g;
      let imgMatch;
      while ((imgMatch = blockRegex.exec(rawImgCol)) !== null) {
        parsedImages.push(`https://hacom.vn/media/product/${imgMatch[1]}`);
      }
    }
    
    // Add default image if none found
    if (parsedImages.length === 0) {
      parsedImages.push('https://placehold.co/800x800/1f2937/a1a1aa?text=No+Image');
    }

    // 4. Format Output Data
    const outputData = {
      id: product.id,
      name: product.proName,
      sku: product.storeSKU,
      brand: product.brandName || 'Đang cập nhật',
      warranty: product.warranty || 'Đang cập nhật',
      price: product.price || 0,
      marketPrice: product.market_price || 0,
      savings: Math.max(0, (product.market_price || 0) - (product.price || 0)),
      images: parsedImages,
      specs: product.spec || '',
      description: product.description || '',
      proSummary: product.proSummary || '',
      status: product.isOn === 1 ? 'active' : 'inactive',
      views: Math.floor(Math.random() * 10000) + 1000, // Mock view count
      type: 'product'
    };

    return NextResponse.json({
      success: true,
      data: outputData,
      message: "Lấy dữ liệu thành công"
    });

  } catch (error: any) {
    console.error("API /products/[slug] Error:", error);
    return NextResponse.json({
      success: false,
      message: "Đã xảy ra lỗi hệ thống",
      error: error.message
    }, { status: 500 });
  }
}
