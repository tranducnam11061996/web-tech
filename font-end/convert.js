const fs = require('fs');

let html = fs.readFileSync('D:/web-tech/font-end/gio-hang.html', 'utf-8');

let sectionMatch = html.match(/<section[\s\S]*?<\/section>/);
if (!sectionMatch) {
    console.error('Could not find <section>');
    process.exit(1);
}
let jsx = sectionMatch[0];

// Basic JSX replacements
jsx = jsx.replace(/class=/g, 'className=');
jsx = jsx.replace(/for=/g, 'htmlFor=');
jsx = jsx.replace(/fill-rule=/g, 'fillRule=');
jsx = jsx.replace(/clip-rule=/g, 'clipRule=');
jsx = jsx.replace(/stroke-linecap=/g, 'strokeLinecap=');
jsx = jsx.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
jsx = jsx.replace(/stroke-width=/g, 'strokeWidth=');

// Self closing tags (basic)
jsx = jsx.replace(/<input([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return '<input' + p1 + ' />';
});
jsx = jsx.replace(/<hr([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return '<hr' + p1 + ' />';
});
jsx = jsx.replace(/<br([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return '<br' + p1 + ' />';
});
jsx = jsx.replace(/<img([^>]*?)>/g, (match, p1) => {
    if (p1.endsWith('/')) return match;
    return '<img' + p1 + ' />';
});

// For .card-box replacement
jsx = jsx.replace(/className=\"([^"]*?)card-box([^"]*?)\"/g, 'className=\"$1bg-[#111115] border border-[#1a1a1e] rounded-xl$2\"');
jsx = jsx.replace(/className=\"([^"]*?)card-box([^"]*?)\"/g, 'className=\"$1bg-[#111115] border border-[#1a1a1e] rounded-xl$2\"');

// Fix checkbox and radio classes
jsx = jsx.replace(/<input type="checkbox"([^>]*?)className=\"([^"]*?)\"/g, '<input type="checkbox"$1className=\"accent-red-500 cursor-pointer $2\"');
jsx = jsx.replace(/<input type="radio"([^>]*?)className=\"([^"]*?)\"/g, '<input type="radio"$1className=\"accent-green-500 cursor-pointer $2\"');

let pageContent = `export default function CartPage() {
  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      ${jsx}
    </div>
  );
}
`;

fs.mkdirSync('D:/web-tech/font-end/src/app/gio-hang', { recursive: true });
fs.writeFileSync('D:/web-tech/font-end/src/app/gio-hang/page.tsx', pageContent, 'utf-8');
console.log('Done!');
