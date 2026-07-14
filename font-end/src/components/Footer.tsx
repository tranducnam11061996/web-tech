'use client';

import { useEffect, useState } from 'react';
import { fallbackBottomFooterMenu, loadBottomFooterMenu } from '@/lib/bottomFooterMenu';
import { fallbackFooterMenu, loadFooterMenu } from '@/lib/footerMenu';

export default function Footer() {
  const [footerMenu, setFooterMenu] = useState(fallbackFooterMenu);
  const [bottomFooterMenu, setBottomFooterMenu] = useState(fallbackBottomFooterMenu);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFooterMenu(), loadBottomFooterMenu()]).then(([menu, bottomMenu]) => {
      if (!cancelled) {
        setFooterMenu(menu);
        setBottomFooterMenu(bottomMenu);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const [shop, support, info, build] = footerMenu.groups;

  return (
    <>
      {/*  START footer  */}
  <footer className="bg-dark py-16 border-t border-dark-border mt-10">
    <div className="max-w-[1800px] mx-auto px-6 lg:px-8">

      {/*  ROW 1: Logo/Subscribe + 4 Link Columns  */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-10 mb-16">

        {/*  Col 1 (Span 2)  */}
          <div className="col-span-2 lg:col-span-2 pr-0 lg:pr-10">
          {/*  Logo  */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-red-500/20">
                e</div>
              <span className="text-white font-bold text-2xl tracking-tight">evetech</span>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gray-500 font-semibold">You dream it, we build it</p>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed mb-8 pr-4">
            Elevating your gaming experience with premium hardware and cutting-edge technology since 2007.
          </p>

          {/*  Subscribe Box  */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-sm">
            <h4 className="text-white font-bold text-base mb-1">Stay updated</h4>
            <p className="text-xs text-gray-500 mb-5">Get the latest deals and tech news</p>
            <div className="flex gap-3" aria-describedby="newsletter-unavailable">
              <input type="email" disabled aria-label="Email nhận bản tin" placeholder="Your Email Address"
                className="bg-transparent border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white w-full disabled:cursor-not-allowed disabled:opacity-50 placeholder-gray-600" />
              <button type="button" disabled aria-describedby="newsletter-unavailable"
                className="cursor-not-allowed rounded-lg border border-cyan-500/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-cyan-400/60 opacity-70 whitespace-nowrap">Sắp ra mắt</button>
            </div>
            <p id="newsletter-unavailable" className="mt-2 text-[11px] text-gray-500">Tính năng đăng ký nhận tin đang được phát triển.</p>
          </div>
        </div>

        {/*  Col 2: SHOP  */}
        <div className="lg:col-span-1">
          <h4 className="text-cyan-400 font-bold text-xs tracking-[0.15em] uppercase mb-6">{shop.label}</h4>
          <ul className="space-y-4 text-[13px] font-medium">
            <li><a href={shop.links[0].url} className="text-white flex items-center gap-2 hover:text-cyan-400 transition-colors"><span
                  className="text-orange-500">{shop.links[0].suffixText}</span> {shop.links[0].label}</a></li>
            <li><a href={shop.links[1].url} className="hover:text-white transition-colors">{shop.links[1].label}</a></li>
            <li><a href={shop.links[2].url} className="hover:text-white transition-colors">{shop.links[2].label}</a></li>
            <li><a href={shop.links[3].url} className="hover:text-white transition-colors">{shop.links[3].label}</a></li>
            <li><a href={shop.links[4].url} className="hover:text-white transition-colors">{shop.links[4].label}</a></li>
            <li><a href={shop.links[5].url} className="hover:text-white transition-colors">{shop.links[5].label}</a></li>
            <li><a href={shop.links[6].url} className="hover:text-white transition-colors">{shop.links[6].label}</a></li>
            <li><a href={shop.links[7].url} className="hover:text-white transition-colors">{shop.links[7].label}</a></li>
            <li><a href={shop.links[8].url} className="hover:text-white transition-colors">{shop.links[8].label}</a></li>
          </ul>
        </div>

        {/*  Col 3: SUPPORT  */}
        <div className="lg:col-span-1">
          <h4 className="text-cyan-400 font-bold text-xs tracking-[0.15em] uppercase mb-6">{support.label}</h4>
          <ul className="space-y-4 text-[13px] font-medium">
            <li><a href={support.links[0].url} className="hover:text-white transition-colors">{support.links[0].label}</a></li>
            <li><a href={support.links[1].url} className="hover:text-white transition-colors">{support.links[1].label}</a></li>
            <li><a href={support.links[2].url} className="hover:text-white transition-colors">{support.links[2].label}</a></li>
            <li><a href={support.links[3].url} className="hover:text-white transition-colors">{support.links[3].label}</a></li>
            <li><a href={support.links[4].url} className="hover:text-white transition-colors">{support.links[4].label}</a></li>
          </ul>
        </div>

        {/*  Col 4: INFO  */}
        <div className="lg:col-span-1">
          <h4 className="text-cyan-400 font-bold text-xs tracking-[0.15em] uppercase mb-6">{info.label}</h4>
          <ul className="space-y-4 text-[13px] font-medium">
            <li><a href={info.links[0].url} className="hover:text-white transition-colors">{info.links[0].label}</a></li>
            <li><a href={info.links[1].url} className="hover:text-white transition-colors">{info.links[1].label}</a></li>
            <li><a href={info.links[2].url} className="hover:text-white transition-colors">{info.links[2].label}</a></li>
            <li><a href={info.links[3].url} className="hover:text-white transition-colors">{info.links[3].label}</a></li>
            <li><a href={info.links[4].url} className="hover:text-white transition-colors">{info.links[4].label}</a></li>
            <li><a href={info.links[5].url} className="hover:text-white transition-colors">{info.links[5].label}</a></li>
            <li><a href={info.links[6].url} className="hover:text-white transition-colors">{info.links[6].label}</a></li>
          </ul>
        </div>

        {/*  Col 5: BUILD  */}
        <div className="lg:col-span-1">
          <h4 className="text-cyan-400 font-bold text-xs tracking-[0.15em] uppercase mb-6">{build.label}</h4>
          <ul className="space-y-4 text-[13px] font-medium">
            <li><a href={build.links[0].url} className="hover:text-white transition-colors">{build.links[0].label}</a></li>
            <li><a href={build.links[1].url} className="hover:text-white transition-colors">{build.links[1].label}</a></li>
            <li><a href={build.links[2].url} className="hover:text-white transition-colors">{build.links[2].label}</a></li>
            <li><a href={build.links[3].url} className="hover:text-white transition-colors">{build.links[3].label}</a></li>
            <li><a href={build.links[4].url} className="hover:text-white transition-colors">{build.links[4].label}</a></li>
          </ul>
        </div>

      </div>

      {/*  Separator  */}
      <div className="border-t border-dark-border mb-12"></div>

      {/*  ROW 2: Contact Info + Social/App  */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-12 xl:gap-8 mb-12">

        {/*  Contact Cards (4 cols)  */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
          {/*  Phone  */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <h5 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase flex items-center gap-2 mb-3">
              <span className="text-gray-400">📞</span> PHONE
            </h5>
            <p className="text-[13px] text-white font-medium leading-relaxed">(010) 786 0044<br />(012) 653 0033</p>
          </div>
          {/*  Email  */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <h5 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase flex items-center gap-2 mb-3">
              <span className="text-gray-400">✉️</span> EMAIL
            </h5>
            <p className="text-[13px] text-white font-medium leading-relaxed">sales@evetech.co.za<br />support@evetech.co.za
            </p>
          </div>
          {/*  Location  */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <h5 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase flex items-center gap-2 mb-3">
              <span className="text-gray-400">📍</span> LOCATION
            </h5>
            <p className="text-[13px] text-white font-medium leading-relaxed">Limeroc Business Park, Holland Road
              (R114)<br />Knoppieslaagte, Centurion 0157</p>
          </div>
          {/*  Hours  */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <h5 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase flex items-center gap-2 mb-3">
              <span className="text-gray-400">🕒</span> HOURS
            </h5>
            <p className="text-[13px] text-white font-medium leading-relaxed">Mon-Fri: 9am - 4pm<br />Sat: 9am - 12pm</p>
          </div>
        </div>

        {/*  Socials & Apps  */}
        <div className="flex flex-col sm:flex-row gap-10 xl:gap-12 shrink-0">

          {/*  Follow Us  */}
          <div>
            <h5 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-4">Follow Us</h5>
            <div className="flex gap-2">
              <a href="#" className="social-icon icon-ig" aria-label="Instagram">IG</a>
              <a href="#" className="social-icon icon-x" aria-label="X (Twitter)"><span
                  className="font-bold text-[15px]">X</span></a>
              <a href="#" className="social-icon icon-fb" aria-label="Facebook"><span className="font-bold">f</span></a>
              <a href="#" className="social-icon icon-yt" aria-label="YouTube"><span className="text-[10px]">▶</span></a>
              <a href="#" className="social-icon icon-tk" aria-label="TikTok"></a>
            </div>
          </div>

          {/*  Get the App  */}
          <div>
            <h5 className="text-[11px] text-gray-500 font-semibold tracking-widest uppercase mb-4">Get the App</h5>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="app-btn">
                <span className="text-xl leading-none">🍎</span>
                <div className="flex flex-col justify-center">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wide mb-[2px]">Download on the</span>
                  <span className="text-[13px] font-bold leading-none">App Store</span>
                </div>
              </a>
              <a href="#" className="app-btn">
                <span className="text-xl leading-none text-green-500">▶</span>
                <div className="flex flex-col justify-center">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wide mb-[2px]">GET IT ON</span>
                  <span className="text-[13px] font-bold leading-none">Google Play</span>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/*  Separator  */}
      <div className="border-t border-dark-border mb-10"></div>

      {/*  ROW 3: Trusted Partners  */}
      <div className="mb-10 text-center">
        <h4 className="text-[11px] text-cyan-400 font-semibold tracking-[0.2em] uppercase mb-6">{bottomFooterMenu.heading}</h4>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[11px] font-bold uppercase tracking-wider">
          <a href={bottomFooterMenu.links[0].url} className="partner-link">{bottomFooterMenu.links[0].label}</a>
          <a href={bottomFooterMenu.links[1].url} className="partner-link">{bottomFooterMenu.links[1].label}</a>
          <a href={bottomFooterMenu.links[2].url} className="partner-link">{bottomFooterMenu.links[2].label}</a>
          <a href={bottomFooterMenu.links[3].url} className="partner-link">{bottomFooterMenu.links[3].label}</a>
          <a href={bottomFooterMenu.links[4].url} className="partner-link">{bottomFooterMenu.links[4].label}</a>
          <a href={bottomFooterMenu.links[5].url} className="partner-link">{bottomFooterMenu.links[5].label}</a>
          <a href={bottomFooterMenu.links[6].url} className="partner-link">{bottomFooterMenu.links[6].label}</a>
          <a href={bottomFooterMenu.links[7].url} className="partner-link">{bottomFooterMenu.links[7].label}</a>
          <a href={bottomFooterMenu.links[8].url} className="partner-link">{bottomFooterMenu.links[8].label}</a>
          <a href={bottomFooterMenu.links[9].url} className="partner-link">{bottomFooterMenu.links[9].label}</a>
          <a href={bottomFooterMenu.links[10].url} className="partner-link">{bottomFooterMenu.links[10].label}</a>
          <a href={bottomFooterMenu.links[11].url} className="partner-link">{bottomFooterMenu.links[11].label}</a>
          <a href={bottomFooterMenu.links[12].url} className="partner-link">{bottomFooterMenu.links[12].label}</a>
          <a href={bottomFooterMenu.links[13].url} className="partner-link">{bottomFooterMenu.links[13].label}</a>
          <a href={bottomFooterMenu.links[14].url} className="partner-link">{bottomFooterMenu.links[14].label}</a>
          <a href={bottomFooterMenu.links[15].url} className="partner-link">{bottomFooterMenu.links[15].label}</a>
          <a href={bottomFooterMenu.links[16].url} className="partner-link">{bottomFooterMenu.links[16].label}</a>
          <a href={bottomFooterMenu.links[17].url} className="partner-link">{bottomFooterMenu.links[17].label}</a>
          <a href={bottomFooterMenu.links[18].url} className="partner-link">{bottomFooterMenu.links[18].label}</a>
        </div>
      </div>

      {/*  Separator  */}
      <div className="border-t border-dark-border mb-10"></div>

      {/*  ROW 4: Copyright & Payment  */}
      <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-8 mb-10">

        <div className="max-w-3xl text-[11px] text-gray-500 leading-[1.8] text-center lg:text-left">
          <p className="mb-3 font-medium">Copyright © 2007 - 2026 - All rights reserved by EVETECH (Pty) Ltd</p>
          <p>All images appearing on this website are copyright Evetech.co.za. Any unauthorized use of its logos and
            other graphics is forbidden. Prices and specifications are subject to change without notice. EVETECH IS NOT
            RESPONSIBLE FOR ANY TYPO, PHOTOGRAPH, OR PROGRAM ERRORS, AND RESERVES THE RIGHT TO CANCEL ANY INCORRECT
            ORDERS. Please Note: Product images are for illustrative purposes only and may differ from the actual
            product.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 items-center">
          {/*  Simulated Payment & Security Logos  */}
          <div className="payment-logo">
            <div className="flex items-center gap-1 text-white font-bold text-sm">
              <span className="text-xl">🔒</span> SSL Secure
            </div>
          </div>
          <div className="payment-logo text-white font-bold italic">
            Verified by <span className="text-lg uppercase">VISA</span>
          </div>
          <div className="payment-logo text-white font-bold italic">
            <span className="text-red-500">MasterCard.</span> SecureCode
          </div>
          {/*  Card Icons  */}
          <div className="payment-logo w-10 h-6 bg-white rounded flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mix-blend-multiply -mr-1"></div>
            <div className="w-4 h-4 rounded-full bg-yellow-400 mix-blend-multiply -ml-1"></div>
          </div>
          <div className="payment-logo w-10 h-6 bg-white rounded flex items-center justify-center">
            <span className="text-[#1a1f71] font-bold text-[10px] italic">VISA</span>
          </div>
        </div>

      </div>

      {/*  ROW 5: Made with  */}
      <div className="text-center text-xs text-gray-500 font-medium pb-4">
        Made with <span className="text-red-500 mx-1">❤️</span> in 🇿🇦 South Africa
      </div>

    </div>
  </footer>
  {/*  END footer  */}
    </>
  );
}
