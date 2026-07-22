import Link from 'next/link';

export default function Section7() {
  return (
    <>
  {/*  START section-7  */}
  <section className="section-7 py-10 bg-dark-200" id="section-7">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      <div className="features-grid">

        {/*  ============================================  */}
        {/*  CARD 1: AI HỖ TRỢ – CHƯA BIẾT CHỌN LAPTOP NÀO?  */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-ai">
            <span className="badge-dot"></span>
            AI hỗ trợ
          </div>

          {/*  Corner icon  */}
          <div className="corner-icon">✦</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Chưa Biết Chọn<br />
            <span className="highlight-red">Laptop Nào?</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            AI của TrucTiepGAME phân tích ngân sách và nhu cầu để gợi ý chiếc laptop phù hợp chỉ trong khoảng 40 giây.
          </p>

          {/*  CTA button  */}
          <Link href="/laptop" className="cta-outlined mb-20">
            ✦ Xem chi tiết →
          </Link>

          {/*  Bottom stat pills  */}
          <div className="stat-row">
            <span className="stat-pill"><span className="stat-value stat-value-red">8 triệu+</span> Ngân sách</span>
            <span className="stat-pill"><span className="stat-value stat-value-cyan">~40 giây</span> Tốc độ</span>
            <span className="stat-pill"><span className="stat-value stat-value-green">200+</span> Mẫu máy</span>
          </div>
        </div>

        {/*  ============================================  */}
        {/*  CARD 2: AI BUILDER – DON'T GUESS BUILD SMART  */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-app">
            <span className="badge-dot"></span>
            Màn Hình
          </div>

          {/*  Corner icon  */}
          <div className="corner-icon">📱</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Tổng Kho<br />
            <span className="highlight-green">Màn Hình</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            Màn hình nét căng – làm việc mượt mà – quà tặng liền tay. Đội ngũ TrucTiepGAME sẽ giúp bạn chọn màn hình chuẩn màu, hiển thị sắc nét cho cả làm việc lẫn giải trí
          </p>

          {/*  Bottom stat pills  */}
          <div className="tag-row">
            <span className="stat-pill">Giá <span className="stat-value stat-value-green">Siêu tốt</span></span>
            <span className="stat-pill">Giao hàng <span className="stat-value stat-value-cyan">Tận nơi</span></span>
            <span className="stat-pill">Mẫu mã <span className="stat-value stat-value-yellow">Đa dạng</span></span>
          </div>

          {/*  CTA button  */}
          <Link href="/monitor-man-hinh.html" className="cta-outlined">
            ✦ Xem chi tiết →
          </Link>
        </div>

        {/*  ============================================  */}
        {/*  CARD 3: AI HỖ TRỢ – CHƯA BIẾT CHỌN LAPTOP NÀO?  */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-builder">
            <span className="badge-dot"></span>
            PC Builder
          </div>

          {/*  Corner icon  */}
          <div className="corner-icon">⚙</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Công xưởng<br />
            <span className="highlight-yellow">LẮP RÁP PC Gaming</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            Chọn ngân sách, tựa game và yêu cầu FPS, các chuyên gia TrucTiepGAME sẽ tư vấn dàn PC chiến mượt, lắp ráp chuẩn và test trực tiếp hiệu năng, đúng theo yêu cầu của bạn.
          </p>

          {/*  CTA button  */}
          <Link href="/bo-pc-gaming-livestream.html" className="cta-outlined mb-20">
            ✦ Xem cấu hình →
          </Link>

          {/*  Bottom stat pills  */}
          <div className="stat-row">
            <span className="stat-pill">Ngân sách <span className="stat-value stat-value-green">Tối ưu</span></span>
            <span className="stat-pill">Cấu hình <span className="stat-value stat-value-cyan">Chuyên gia</span></span>
            <span className="stat-pill">Hiệu năng <span className="stat-value stat-value-red">Max ping</span></span>
          </div>
        </div>

        {/*  ============================================  */}
        {/*  CARD 4: FLASH DEALS – DON'T BLINK            */}
        {/*  ============================================  */}
        <div className="feature-card">
          {/*  Top badge  */}
          <div className="top-badge badge-flash">
            <span className="badge-dot"></span>
            PC Doanh Nghiệp
          </div>

          {/*  Corner icon (lightning)  */}
          <div className="corner-icon">⚡</div>

          {/*  Heading  */}
          <h3 className="feature-heading">
            Ưu Đãi KHỦNG<br />
            <span className="highlight-pink">PC Văn Phòng</span>
          </h3>

          {/*  Description  */}
          <p className="feature-desc">
            Chọn nhu cầu công việc và ngân sách, TrucTiepGAME sẽ tư vấn và triển khai hệ thống cấu hình PC office chạy mượt, tiết kiệm chi phí, phù hợp cho cá nhân và doanh nghiệp.
          </p>

          {/*  Tag pills  */}
          <div className="tag-row">
            <span className="stat-pill">Giảm giá <span className="stat-value stat-value-green">tới 40%</span></span>
            <span className="stat-pill">Hỗ trợ <span className="stat-value stat-value-yellow">24 / 7</span></span>
            <span className="stat-pill">Chính sách <span className="stat-value stat-value-pink">Linh hoạt</span></span>
          </div>

          {/*  CTA button  */}
          <Link href="/pc-van-phong.html" className="cta-outlined">
            ✦ Xem cấu hình →
          </Link>
        </div>

      </div>{/*  /features-grid  */}

    </div>
  </section>
  {/*  END section-7  */}
    </>
  );
}
