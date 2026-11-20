// HTML builders for generated pages (posts, the home and Divorce Blog grids, category archives), in the live site's
// own Divi 4 markup (theme single-post and archive templates, Divi blog grid module) so the carried Divi CSS styles them
// exactly as before. Adapted from the LLM/BLG builds; markup copied from the rendered live pages (harvest/rendered).
import { BYLINE } from '../site.config.mjs';
import { catsOf, tagsOf, gridExcerpt, archiveExcerpt, esc, fmtDate, CATEGORIES } from './content.mjs';

// Sidebar as on the live posts and archives: the Search widget (the two empty block widgets are not carried). WordPress
// search does not exist on a static site: the form goes to /search/, which searches the posts in the browser.
const sidebar = () => `<div id="sidebar">
<div id="block-2" class="et_pb_widget widget_block widget_search"><form role="search" method="get" action="/search/" class="wp-block-search__button-outside wp-block-search__text-button wp-block-search"><label class="wp-block-search__label" for="wp-block-search__input-1">Search</label><div class="wp-block-search__inside-wrapper"><input class="wp-block-search__input" id="wp-block-search__input-1" placeholder="" value="" type="search" name="q" required=""><button aria-label="Search" class="wp-block-search__button wp-element-button" type="submit">Search</button></div></form></div>
</div>`;

const catLinks = (p, rel = 'category tag') => catsOf(p).slice().sort((a, b) => (a.parent ? -1 : 1) - (b.parent ? -1 : 1))
  .map((c) => `<a href="${c.path}" rel="${rel}">${esc(c.name)}</a>`).join(', ');
const postClasses = (p) => `et_pb_post post-${p.id} post type-post status-publish format-standard${p.featured ? ' has-post-thumbnail' : ''} hentry ${catsOf(p).map((c) => 'category-' + c.slug).join(' ')} ${tagsOf(p).map((t) => 'tag-' + t.slug).join(' ')}`.replace(/\s+/g, ' ').trim();
const byline = (p) => ` by <span class="author vcard">${esc(p.author || (p.reviewed ? 'Allison J. Brandt' : BYLINE))}</span> | <span class="published">${fmtDate(p.date)}</span>${p.updated && p.updatedDate ? ` | Updated <span class="updated">${fmtDate(p.updatedDate)}</span>` : ''}${catsOf(p).length ? ' | ' + catLinks(p) : ''}`;
const bigImg = (f, eager) => f ? `<img src="${f.src}" width="1080" height="675" alt="${esc(f.alt)}" decoding="async"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}>` : '';

// Single post (Divi theme single.php, right sidebar as on the live site). The comment count link is not carried (no comments).
export function postBody(p) {
  return `<div id="main-content"><div class="container"><div id="content-area" class="clearfix"><div id="left-area">
<article id="post-${p.id}" class="${postClasses(p)}">
<div class="et_post_meta_wrapper">
<h1 class="entry-title">${esc(p.title)}</h1>
<p class="post-meta">${byline(p)}</p>${bigImg(p.featured, true)}
</div>
<div class="entry-content">
${p.html}
</div>
<div class="et_post_meta_wrapper">
</div>
</article>
</div>
${sidebar()}
</div></div></div>`;
}

function pagination(base, page, pages) {
  const older = page < pages ? `<a href="${base}page/${page + 1}/">« Older Entries</a>` : '';
  const newer = page > 1 ? `<a href="${page === 2 ? base : `${base}page/${page - 1}/`}">Next Entries »</a>` : '';
  return `<div><div class="pagination clearfix"><div class="alignleft">${older}</div><div class="alignright">${newer}</div></div></div>`;
}

// Divi blog module, grid layout (3 columns, items dealt into the columns in turn as Salvattore does; public/js/site.js
// re-flows them into 2 or 1 columns on smaller screens). Home: no post meta, "read more"; Divorce Blog: categories, no "read more".
export function gridList(posts, page, pages, base, { meta = false, more = false } = {}) {
  const cols = [[], [], []];
  posts.forEach((p, i) => {
    const f = p.featured;
    const im = f ? `<img src="${f.grid}" srcset="${f.grid} 479w, ${f.grid} 480w " sizes="(max-width:479px) 479px, 100vw " width="400" height="250" alt="${esc(f.alt)}" decoding="async"${i === 0 && page === 1 ? ' fetchpriority="high"' : ' loading="lazy"'}>` : '';
    cols[i % 3].push(`<article id="post-${p.id}" class="et_pb_post clearfix et_pb_blog_item_0_${i} ${postClasses(p).replace(/^et_pb_post /, '')}">
${f ? `<div class="et_pb_image_container"><a class="entry-featured-image-url" href="${p.path}">${im}</a></div>` : ''}
<h2 class="entry-title"><a href="${p.path}">${esc(p.title)}</a></h2>
${meta ? `<p class="post-meta"><span class="published">${fmtDate(p.date)}</span>${catsOf(p).length ? ' | ' + catLinks(p, 'tag') : ''}</p>` : ''}<div class="post-content"><div class="post-content-inner"><p>${esc(gridExcerpt(p))}</p>
</div>${more ? `<a class="more-link" href="${p.path}">read more</a>` : ''}</div>
</article>`);
  });
  return `<div class="et_pb_salvattore_content" data-columns="3">${cols.map((c) => `<div class="column size-1of3">${c.join('')}</div>`).join('')}</div>${pagination(base, page, pages)}`;
}
export const withList = (carriedHtml, listHtml) => carriedHtml.replace('<!--JB-BLOGLIST-->', listHtml);

// Category archives (theme index.php: featured image, title, byline + categories, 270-character excerpt)
export function archiveBody(c, posts, page, pages) {
  const items = posts.map((p, i) => `<article id="post-${p.id}" class="${postClasses(p)}">
<a class="entry-featured-image-url" href="${p.path}">${bigImg(p.featured, i === 0)}</a>
<h2 class="entry-title"><a href="${p.path}">${esc(p.title)}</a></h2>
<p class="post-meta">${byline(p)}</p>${esc(archiveExcerpt(p))}
</article>`).join('\n');
  const older = page < pages ? `<a href="${c.path}page/${page + 1}/">« Older Entries</a>` : '';
  const newer = page > 1 ? `<a href="${page === 2 ? c.path : `${c.path}page/${page - 1}/`}">Next Entries »</a>` : '';
  return `<div id="main-content"><div class="container"><div id="content-area" class="clearfix"><div id="left-area">
${items}
<div class="pagination clearfix"><div class="alignleft">${older}</div><div class="alignright">${newer}</div></div>
</div>
${sidebar()}
</div></div></div>`;
}

// Home post slider (Divi fullwidth post slider, 5 newest posts, image background, "Read More"), markup as on the live
// home page; the carried page holds <!--JB-SLIDES--> and <!--JB-DOTS--> where they go.
export function sliderSlides(posts) {
  const slides = posts.map((p, i) => `<div class="et_pb_slide et_pb_bg_layout_dark et_pb_post_slide-${p.id}${i === 0 ? ' et-pb-active-slide' : ''}"${p.featured ? ` style="background-image: url(${p.featured.src});"` : ''}>
<div class="et_pb_slide_overlay_container"></div>
<div class="et_pb_container clearfix">
<div class="et_pb_slider_container_inner">
<div class="et_pb_slide_description">
<h2 class="et_pb_slide_title"><a href="${p.path}">${esc(p.title)}</a></h2>
<div class="et_pb_slide_content">
<div>${esc(gridExcerpt(p))}</div> </div>
<div class="et_pb_button_wrapper"><a class="et_pb_button et_pb_more_button" href="${p.path}">Read More</a></div> </div>
</div>
</div>
</div>`).join('\n');
  const dots = posts.map((p, i) => `<a${i === 0 ? ' class="et-pb-active-control"' : ''} href="#">${i + 1}</a>`).join('');
  return (html) => html.replace('<!--JB-SLIDES-->', slides).replace('<!--JB-DOTS-->', dots);
}

// Blog search (/search/): the sidebar's Search widget posts here; public/js/brandt.js searches /search-index.json
export function searchBody() {
  return `<div id="main-content"><div class="container"><div id="content-area" class="clearfix"><div id="left-area">
<h1 class="entry-title main_title">Search the Blog</h1>
<form role="search" method="get" action="/search/" class="jb-search-form"><label for="jb-search-q">Search for</label> <input id="jb-search-q" type="search" name="q" required> <button type="submit" class="et_pb_button">Search</button></form>
<div id="jb-search-results" aria-live="polite"></div>
</div>
${sidebar()}
</div></div></div>`;
}
