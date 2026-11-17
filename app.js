const feed = document.querySelector('#feed');
const notice = document.querySelector('#notice');
const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const newsLimit = document.querySelector('#news-limit');
const languageToggle = document.querySelector('#language-toggle');
const translations = {
  tr: {
    pageTitle: 'Indago — Dünyadan haberin olsun', pageDescription: 'Kültür, sanat, edebiyat ve popüler kültürden güncel haberler.',
    navLabel: 'Görünüm ayarları', fontGroup: 'Yazı boyutu', fontSmaller: 'Yazıyı küçült', fontDefault: 'Varsayılan yazı boyutu', fontDefaultSelected: 'Varsayılan yazı boyutu seçili', fontLarger: 'Yazıyı büyüt',
    themeLight: 'Açık temaya geç', themeDark: 'Gece', themeDay: 'Gündüz', themeDarkAction: 'Koyu temaya geç', sourcesLink: 'Kaynaklar', brandHome: 'Indago ana sayfa',
    eyebrow: 'GÜNCEL AKIŞ', heroStart: 'Dünyadan ', heroEmphasis: 'haberin olsun.', introLine1: 'Edebiyattan sinemaya, müzikten popüler kültüre…', introLine2: 'Merak ettiğin her şey, sevdiğin kaynaklardan.', liveFeed: 'Canlı RSS akışı', loadingNews: 'Haberler alınıyor…',
    feedKicker: 'KAYNAKLARINDAN', feedTitle: 'Son haberler', last: 'Son', newsPlural: 'haber', newsLimit: 'Gösterilecek haber sayısı', newsCount: n => `${String(n).padStart(2, '0')} HABER`, scanningSources: 'Kaynaklar taranıyor…',
    sourcesKicker: 'TAKİPTEYİZ', sourcesTitle: 'İyi kaynaklar,', sourcesSubtitle: 'iyi hikâyeler.', loadingSources: 'Kaynaklar yükleniyor…',
    summaryKicker: 'AI HABER ÖZETİ', summaryTitle: 'Haber özeti', closeSummary: 'Özeti kapat', summaryMethods: 'Özetleme yöntemi', localAI: 'Yerel AI', openAI: 'OpenAI', preparing: name => `${name} hazırlıyor…`, readingArticle: name => `${name} haber içeriğini inceliyor…`,
    noNews: 'Şu an gösterilecek haber bulunamadı. Kaynakların RSS akışlarına ulaşılamıyor olabilir; biraz sonra tekrar yenileyebilirsin.',
    sourceWarning: n => `${n} kaynağa şu anda ulaşılamadı; görünen haberler erişilebilen akışlardan derlendi.`,
    loadError: 'Haberler şu an yüklenemedi. Sunucunun çalıştığından emin olup sayfayı yenileyebilirsin.', feedUnavailable: 'Akışa ulaşılamadı', fetchError: 'Haberler alınamadı.', summarizeError: 'Özet oluşturulamadı.', openStory: 'haberini yeni sekmede aç',
    footerTagline: 'Dünyadan haberin olsun.', footerNote: 'BAĞIMSIZ MERAKIN GÜNLÜK AKIŞI'
  },
  en: {
    pageTitle: 'Indago — Stay in the know', pageDescription: 'The latest in culture, arts, literature and pop culture.',
    navLabel: 'Display settings', fontGroup: 'Text size', fontSmaller: 'Decrease text size', fontDefault: 'Default text size', fontDefaultSelected: 'Default text size selected', fontLarger: 'Increase text size',
    themeLight: 'Switch to light theme', themeDark: 'Night', themeDay: 'Day', themeDarkAction: 'Switch to dark theme', sourcesLink: 'Sources', brandHome: 'Indago home',
    eyebrow: 'THE DAILY FEED', heroStart: 'Stay in the ', heroEmphasis: 'know.', introLine1: 'From literature and film to music and pop culture…', introLine2: 'Stories you care about, from sources you trust.', liveFeed: 'Live RSS feed', loadingNews: 'Loading stories…',
    feedKicker: 'FROM YOUR SOURCES', feedTitle: 'Latest stories', last: 'Last', newsPlural: 'stories', newsLimit: 'Number of stories to show', newsCount: n => `${String(n).padStart(2, '0')} STORIES`, scanningSources: 'Checking sources…',
    sourcesKicker: 'ON OUR READING LIST', sourcesTitle: 'Good sources,', sourcesSubtitle: 'good stories.', loadingSources: 'Loading sources…',
    summaryKicker: 'AI NEWS SUMMARY', summaryTitle: 'Story summary', closeSummary: 'Close summary', summaryMethods: 'Summary method', localAI: 'Local AI', openAI: 'OpenAI', preparing: name => `${name} is preparing a summary…`, readingArticle: name => `${name} is reading the story…`,
    noNews: 'There are no stories to show right now. RSS feeds may be temporarily unavailable; try refreshing in a little while.',
    sourceWarning: n => `${n} source${n === 1 ? '' : 's'} could not be reached; showing stories from available feeds.`,
    loadError: 'Stories could not be loaded. Check that the server is running, then refresh the page.', feedUnavailable: 'Feed unavailable', fetchError: 'Could not load stories.', summarizeError: 'Could not create a summary.', openStory: 'Open story in a new tab',
    footerTagline: 'Stay in the know.', footerNote: 'AN INDEPENDENT DAILY FEED'
  }
};
let language = localStorage.getItem('indago-language') === 'en' ? 'en' : 'tr';
let lastUpdatedAt = null;
let lastItems = [];
let displayedNewsCount = null;
let feedState = 'loading';
let failedSourceCount = 0;
let activeProvider = null;
let summaryPending = false;
const t = key => translations[language][key];
const dateFormatter = () => new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const savedLimit = localStorage.getItem('indago-news-limit') ?? localStorage.getItem('feedia-news-limit');
newsLimit.value = ['5', '10', '15', '20'].includes(savedLimit) ? savedLimit : '5';
const fontSteps = ['2.67px', '4px', '5.33px'];
const savedTheme = localStorage.getItem('indago-theme') ?? localStorage.getItem('feedia-theme');
const savedFontSize = Number(localStorage.getItem('indago-font-size') ?? localStorage.getItem('feedia-font-size'));

function applyLanguage() {
  const strings = translations[language];
  document.documentElement.lang = language;
  document.title = strings.pageTitle;
  document.querySelector('#page-description').content = strings.pageDescription;
  document.querySelector('#hero-title').firstChild.nodeValue = strings.heroStart;
  document.querySelector('#top-actions').setAttribute('aria-label', strings.navLabel);
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = strings[element.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', strings[element.dataset.i18nAria]); });
  document.querySelectorAll('[data-i18n-title]').forEach(element => { element.title = strings[element.dataset.i18nTitle]; });
  document.querySelectorAll('#language-toggle button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  themeToggle.setAttribute('aria-label', root.dataset.theme === 'dark' ? strings.themeLight : strings.themeDarkAction);
  themeToggle.title = themeToggle.getAttribute('aria-label');
  if (lastUpdatedAt) document.querySelector('#updated').textContent = `${language === 'tr' ? 'Son kontrol' : 'Last checked'} ${new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(lastUpdatedAt))}`;
  document.querySelector('#article-count').textContent = displayedNewsCount === null ? (language === 'tr' ? '— HABER' : '— STORIES') : strings.newsCount(displayedNewsCount);
  if (failedSourceCount) notice.textContent = strings.sourceWarning(failedSourceCount);
  const reset = document.querySelector('#font-reset');
  if (reset) reset.setAttribute('aria-label', Number(localStorage.getItem('indago-font-size')) === 1 ? strings.fontDefaultSelected : strings.fontDefault);
  if (summaryDialog.open) {
    summaryClose.setAttribute('aria-label', strings.closeSummary);
    if (activeProvider) summaryProvider.textContent = activeProvider === 'openai' ? strings.openAI : `${strings.localAI} · Qwen 3.8`;
    if (summaryPending && activeProvider) summaryBody.textContent = strings.readingArticle(activeProvider === 'openai' ? strings.openAI : strings.localAI);
  } else summaryTitle.textContent = strings.summaryTitle;
}

function setLanguage(nextLanguage) {
  language = nextLanguage === 'en' ? 'en' : 'tr';
  localStorage.setItem('indago-language', language);
  applyLanguage();
  if (feedState === 'items') renderItems(lastItems);
  else if (feedState === 'loading') feed.querySelector('[data-i18n="scanningSources"]').textContent = t('scanningSources');
  else if (feedState === 'error') feed.innerHTML = `<div class="empty-state">${t('loadError')}</div>`;
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('indago-theme', theme);
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-label', isDark ? t('themeLight') : t('themeDarkAction'));
  themeToggle.title = themeToggle.getAttribute('aria-label');
  themeToggle.querySelector('.theme-label').textContent = isDark ? t('themeDay') : t('themeDark');
  document.querySelector('#theme-color').content = isDark ? '#1d201c' : '#f6f5f1';
}

function setFontSize(step) {
  const value = Math.max(0, Math.min(fontSteps.length - 1, step));
  root.style.setProperty('--type-adjust', fontSteps[value]);
  localStorage.setItem('indago-font-size', String(value));
  document.querySelector('#font-smaller').disabled = value === 0;
  document.querySelector('#font-larger').disabled = value === fontSteps.length - 1;
  document.querySelector('#font-reset').setAttribute('aria-label', value === 1 ? t('fontDefaultSelected') : t('fontDefault'));
}

setTheme(savedTheme === 'light' ? 'light' : 'dark');
setFontSize(Number.isInteger(savedFontSize) && savedFontSize >= 0 && savedFontSize < fontSteps.length ? savedFontSize : 0);
languageToggle.addEventListener('click', event => {
  const button = event.target.closest('[data-language]');
  if (button) setLanguage(button.dataset.language);
});
themeToggle.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
document.querySelector('#font-smaller').addEventListener('click', () => setFontSize(Number(localStorage.getItem('indago-font-size')) - 1));
document.querySelector('#font-larger').addEventListener('click', () => setFontSize(Number(localStorage.getItem('indago-font-size')) + 1));
document.querySelector('#font-reset').addEventListener('click', () => setFontSize(0));
newsLimit.addEventListener('change', () => {
  localStorage.setItem('indago-news-limit', newsLimit.value);
  loadNews();
});

function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '#'; }
  catch { return '#'; }
}

function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderItems(items) {
  feedState = 'items';
  lastItems = items;
  if (!items.length) {
    feed.innerHTML = `<div class="empty-state">${t('noNews')}</div>`;
    return;
  }
  feed.innerHTML = items.map(item => {
    const link = safeUrl(item.link);
    const image = safeUrl(item.image || '');
    const time = item.date ? dateFormatter().format(new Date(item.date)) : '';
    return `<article class="article">
      <div class="article-thumb${image === '#' ? ' article-thumb-empty' : ''}" aria-hidden="true"><span class="article-thumb-mark"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg></span>${image !== '#' ? `<img class="article-image" src="${escapeHtml(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</div>
      <div class="article-main">
        <div class="article-meta"><span class="source-tag">${escapeHtml(item.source)}</span><span class="meta-separator"></span><time class="article-date" datetime="${escapeHtml(item.date || '')}">${escapeHtml(time)}</time></div>
        <h3 class="article-title"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        ${item.description ? `<p class="article-description">${escapeHtml(item.description)}</p>` : ''}
        <div class="summary-actions" aria-label="${t('summaryMethods')}">
          <button class="summary-button" type="button" data-provider="ollama" data-title="${escapeHtml(item.title)}" data-content="${escapeHtml(item.content || item.description || '')}"><span aria-hidden="true">◉</span> ${t('localAI')}</button>
          <button class="summary-button summary-button-openai" type="button" data-provider="openai" data-title="${escapeHtml(item.title)}" data-content="${escapeHtml(item.content || item.description || '')}"><span aria-hidden="true">✳</span> ${t('openAI')}</button>
        </div>
      </div>
      <a class="article-arrow" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.source)} — ${t('openStory')}"><svg class="article-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
    </article>`;
  }).join('');
  feed.querySelectorAll('.article-image').forEach(image => {
    image.addEventListener('error', () => { image.hidden = true; image.parentElement.classList.add('article-thumb-empty'); }, { once: true });
  });
}

const summaryDialog = document.querySelector('#summary-dialog');
const summaryTitle = document.querySelector('#summary-title');
const summaryBody = document.querySelector('#summary-body');
const summaryProvider = document.querySelector('#summary-provider');
const summaryClose = document.querySelector('#summary-close');
applyLanguage();

feed.addEventListener('click', async event => {
  const button = event.target.closest('.summary-button');
  if (!button) return;
  button.disabled = true;
  const provider = button.dataset.provider;
  activeProvider = provider;
  summaryPending = true;
  const buttonLabel = provider === 'openai' ? t('openAI') : t('localAI');
  button.textContent = t('preparing')(buttonLabel);
  summaryTitle.textContent = button.dataset.title;
  summaryProvider.textContent = provider === 'openai' ? 'OpenAI' : `${t('localAI')} · Qwen 3.8`;
  summaryProvider.hidden = false;
  summaryBody.textContent = t('readingArticle')(buttonLabel);
  summaryDialog.showModal();
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: button.dataset.title, content: button.dataset.content, provider, language })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t('summarizeError'));
    summaryPending = false;
    summaryBody.textContent = data.summary;
  } catch (error) {
    summaryPending = false;
    summaryBody.textContent = error.message;
  } finally {
    activeProvider = null;
    button.disabled = false;
    button.innerHTML = provider === 'openai' ? `<span aria-hidden="true">✳</span> ${t('openAI')}` : `<span aria-hidden="true">◉</span> ${t('localAI')}`;
  }
});

summaryClose.addEventListener('click', () => summaryDialog.close());
summaryDialog.addEventListener('click', event => {
  if (event.target === summaryDialog) summaryDialog.close();
});

async function loadNews() {
  try {
    const response = await fetch(`/api/news?limit=${newsLimit.value}`);
    if (!response.ok) throw new Error(t('fetchError'));
    const data = await response.json();
    renderItems(data.items || []);
    displayedNewsCount = data.items?.length || 0;
    document.querySelector('#article-count').textContent = t('newsCount')(displayedNewsCount);
    lastUpdatedAt = data.updatedAt;
    document.querySelector('#updated').textContent = `${language === 'tr' ? 'Son kontrol' : 'Last checked'} ${new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt))}`;
    notice.hidden = !data.failedCount;
    failedSourceCount = data.failedCount;
    notice.textContent = failedSourceCount ? t('sourceWarning')(failedSourceCount) : '';
    document.querySelector('#source-list').innerHTML = data.sources.map(name => `<span class="source-chip">${escapeHtml(name)}</span>`).join('');
  } catch {
    feedState = 'error';
    feed.innerHTML = `<div class="empty-state">${t('loadError')}</div>`;
    document.querySelector('#updated').textContent = t('feedUnavailable');
    notice.hidden = true;
  }
}
loadNews();
