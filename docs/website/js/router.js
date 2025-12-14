// WorkMirror Website - View Router

// Track current doc for language switching
let currentDocId = 'install';

// Cache for loaded documents
const docCache = {};

// Simple View Router
function switchView(viewName, docId = null) {
    // 1. Handle View Toggling
    const views = ['home', 'docs'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (v === viewName) {
            el.classList.remove('hidden');
            el.classList.add('block');
        } else {
            el.classList.add('hidden');
            el.classList.remove('block');
        }
    });

    // 2. Handle Scroll Reset
    window.scrollTo(0, 0);

    // 3. If switching to docs, optional deep link
    if (viewName === 'docs' && docId) {
        showDoc(docId);
    }
}

// Handle Nav Clicks (Conditional Logic)
function handleNavClick(sectionId) {
    const homeView = document.getElementById('view-home');
    if (homeView.classList.contains('hidden')) {
        // If on docs, switch to home first
        switchView('home');
        // Wait for render then scroll
        setTimeout(() => {
            document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
        }, 10);
    } else {
        // Just scroll
        document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
    }
}

// Load document content from external file
async function loadDocContent(docId, lang) {
    const cacheKey = `${lang}/${docId}`;

    // Return cached content if available
    if (docCache[cacheKey]) {
        return docCache[cacheKey];
    }

    try {
        const response = await fetch(`docs/${lang}/${docId}.html`);
        if (!response.ok) {
            // Fallback to Chinese if English version doesn't exist
            if (lang === 'en') {
                return loadDocContent(docId, 'zh');
            }
            throw new Error(`Failed to load ${cacheKey}`);
        }
        const content = await response.text();
        docCache[cacheKey] = content;
        return content;
    } catch (error) {
        console.error('Error loading doc:', error);
        return `<article class="doc-content"><h1>加载失败</h1><p>无法加载文档内容。</p></article>`;
    }
}

// Internal Doc Router
async function showDoc(docId) {
    currentDocId = docId;

    const container = document.getElementById('doc-container');
    const lang = typeof getCurrentLang === 'function' ? getCurrentLang() : 'zh';

    // Show loading state
    container.innerHTML = '<div class="text-zinc-500 text-center py-12">Loading...</div>';

    // Load and display content
    const content = await loadDocContent(docId, lang);
    container.innerHTML = content;

    // Update Sidebar Active State
    document.querySelectorAll('[id^="nav-"]').forEach(el => el.classList.remove('nav-active'));
    const navBtn = document.getElementById(`nav-${docId}`);
    if (navBtn) navBtn.classList.add('nav-active');

    // Update mobile select
    const mobileSelect = document.getElementById('mobile-doc-select');
    if (mobileSelect) mobileSelect.value = docId;
}

// Get current doc ID (for i18n module)
function getCurrentDocId() {
    return currentDocId;
}

// Clear doc cache (called when language changes)
function clearDocCache() {
    Object.keys(docCache).forEach(key => delete docCache[key]);
}
