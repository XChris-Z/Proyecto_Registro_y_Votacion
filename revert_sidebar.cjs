const fs = require('fs');

let css = fs.readFileSync('src/styles/global.css', 'utf8');

// 1. Sidebar background and text
css = css.replace(/(\.admin-sidebar\s*\{[\s\S]*?background:\s*)#FFFFFF(\s*!important;)/g, '$1#00594E$2');
css = css.replace(/(\.admin-sidebar\s*\{[\s\S]*?color:\s*)var\(--clr-text\)(\s*!important;)/g, '$1#FFFFFF$2');
css = css.replace(/(\.admin-sidebar\s*\{[\s\S]*?border-right:\s*)1px solid rgba\(0,0,0,0\.06\)(\s*!important;)/g, '$1none$2');

// 2. Logo text color
css = css.replace(/(\.admin-sidebar__logo-text\s*\{\s*color:\s*)var\(--clr-text\)(\s*!important;)/, '$1#FFFFFF$2');
css = css.replace(/color:var\(--clr-text-muted\)/g, 'color:rgba(255,255,255,0.65)');

// 3. Nav items
css = css.replace(/(\.admin-nav__item\s*\{[\s\S]*?color:\s*)var\(--clr-text-muted\)(\s*!important;)/, '$1rgba(255, 255, 255, 0.85)$2');
css = css.replace(/(\.admin-nav__icon\s*\{[\s\S]*?color:\s*)var\(--clr-text-muted\)(\s*!important;)/, '$1#FFFFFF$2');
css = css.replace(/(\.admin-nav__item:hover\s*\.admin-nav__icon\s*\{[\s\S]*?color:\s*)var\(--clr-primary\)(\s*!important;)/, '$1#FFFFFF$2');
css = css.replace(/(\.admin-nav__item:hover\s*\{[\s\S]*?color:\s*)var\(--clr-primary\)(\s*!important;)/, '$1#FFFFFF$2');
css = css.replace(/(\.admin-nav__item:hover\s*\{[\s\S]*?background:\s*)rgba\(0, 89, 78, 0\.04\)(\s*!important;)/, '$1rgba(255, 255, 255, 0.14)$2');

css = css.replace(/(\.admin-nav__item\.active\s*\{[\s\S]*?color:\s*)#FFFFFF(\s*!important;)/, '$1#041815$2');
css = css.replace(/(\.admin-nav__item\.active\s*\{[\s\S]*?background:\s*)#00594E(\s*!important;)/, '$1#B5A160$2');
css = css.replace(/(\.admin-nav__item\.active\s*\.admin-nav__icon\s*\{[\s\S]*?color:\s*)#FFFFFF(\s*!important;)/, '$1#041815$2');

// 4. Main content border
css = css.replace(/(\.admin-main\s*\{[\s\S]*?border-left:\s*)none(\s*!important;)/, '$12px solid #B5A160$2');

// 5. Responsive sidebar
css = css.replace(/(\.admin-sidebar\s*\{[\s\S]*?border-bottom:\s*)1px solid rgba\(0,0,0,0\.06\)(\s*!important;)/g, '$12.5px solid var(--clr-accent)$2');

fs.writeFileSync('src/styles/global.css', css);

let astro = fs.readFileSync('src/layouts/AdminLayout.astro', 'utf8');

// Logo colors
astro = astro.replace(/color:var\(--clr-text-muted\)/g, 'color:rgba(255,255,255,0.65)');

// Toggle buttons
astro = astro.replace(/background:#F3F4F6;border:none;border-radius:8px;padding:0\.45rem 0\.65rem;color:var\(--clr-text\);/g, 'background:rgba(181,161,96,0.25);border:1.5px solid #B5A160;border-radius:8px;padding:0.45rem 0.65rem;color:#FFFFFF;');
astro = astro.replace(/background:#F3F4F6;border:none;border-radius:8px;padding:0\.45rem 0\.85rem;color:var\(--clr-text\);/g, 'background:rgba(181,161,96,0.25);border:1.5px solid #B5A160;border-radius:8px;padding:0.45rem 0.85rem;color:#FFFFFF;');

// Remove "+ Nuevo Proyecto"
astro = astro.replace(/<a href="\/admin\/proyectos" onclick="sessionStorage\.setItem\('openNewProject', 'true'\)"[^>]*>[\s\S]*?<\/a>/, '');

fs.writeFileSync('src/layouts/AdminLayout.astro', astro);
console.log('Colors reverted and button removed!');
