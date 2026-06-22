const sections = Array.from(document.querySelectorAll('.doc-section'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const searchInput = document.getElementById('docSearch');
const searchResults = document.getElementById('searchResults');
const readingProgress = document.getElementById('readingProgress');
const breadcrumb = document.getElementById('breadcrumb');
const backToTop = document.getElementById('backToTop');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

function setActiveLink(id) {
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', active);
  });

  const activeSection = sections.find((s) => s.id === id);
  if (activeSection) {
    const title = activeSection.querySelector('h2')?.textContent || 'Section';
    breadcrumb.textContent = `Home / ${title}`;
  }
}

function observeSections() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        setActiveLink(entry.target.id);
      }
    });
  }, { threshold: 0.25 });

  sections.forEach((section) => observer.observe(section));
}

function updateReadingProgress() {
  const scrollTop = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const percent = total > 0 ? (scrollTop / total) * 100 : 0;
  readingProgress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function initFeatureDropdown() {
  document.querySelectorAll('.feature-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.nextElementSibling;
      const expanded = group.classList.toggle('expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  });
}

function clearHighlights() {
  document.querySelectorAll('mark.search-hit').forEach((el) => {
    const text = document.createTextNode(el.textContent);
    el.replaceWith(text);
  });
}

function highlightTerm(term) {
  if (!term) return;
  const walker = document.createTreeWalker(document.getElementById('content'), NodeFilter.SHOW_TEXT);
  const nodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement && ['SCRIPT', 'STYLE', 'MARK'].includes(node.parentElement.tagName)) continue;
    if (node.textContent.toLowerCase().includes(term.toLowerCase())) nodes.push(node);
  }

  nodes.slice(0, 120).forEach((node) => {
    const value = node.textContent;
    const index = value.toLowerCase().indexOf(term.toLowerCase());
    if (index < 0) return;

    const before = document.createTextNode(value.slice(0, index));
    const match = document.createElement('mark');
    match.className = 'search-hit';
    match.textContent = value.slice(index, index + term.length);
    const after = document.createTextNode(value.slice(index + term.length));

    const frag = document.createDocumentFragment();
    frag.append(before, match, after);
    node.parentNode.replaceChild(frag, node);
  });
}

function runSearch(term) {
  searchResults.innerHTML = '';
  clearHighlights();

  if (!term.trim()) {
    searchResults.style.display = 'none';
    navLinks.forEach((l) => (l.style.display = 'block'));
    return;
  }

  highlightTerm(term);

  const matches = sections
    .map((section) => {
      const text = section.innerText.toLowerCase();
      return {
        id: section.id,
        title: section.querySelector('h2')?.textContent || section.id,
        score: text.includes(term.toLowerCase()) ? text.split(term.toLowerCase()).length - 1 : 0,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!matches.length) {
    const empty = document.createElement('a');
    empty.href = '#';
    empty.textContent = 'No matching documentation sections.';
    empty.addEventListener('click', (e) => e.preventDefault());
    searchResults.appendChild(empty);
  } else {
    matches.forEach((match) => {
      const item = document.createElement('a');
      item.href = `#${match.id}`;
      item.textContent = match.title;
      item.addEventListener('click', () => {
        searchResults.style.display = 'none';
      });
      searchResults.appendChild(item);
    });
  }

  searchResults.style.display = 'block';

  navLinks.forEach((link) => {
    const text = link.textContent.toLowerCase();
    link.style.display = text.includes(term.toLowerCase()) ? 'block' : 'none';
  });
}

function initFaq() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.faq-item').classList.toggle('open');
    });
  });
}

function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (!target) return;

      try {
        await navigator.clipboard.writeText(target.textContent);
        const old = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => {
          btn.textContent = old;
        }, 1200);
      } catch (e) {
        btn.textContent = 'Copy failed';
      }
    });
  });
}

function initBackToTop() {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function handleScrollUi() {
  updateReadingProgress();
  if (window.scrollY > 360) {
    backToTop.classList.add('show');
  } else {
    backToTop.classList.remove('show');
  }
}

function initMobileMenu() {
  menuToggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

searchInput.addEventListener('input', (e) => runSearch(e.target.value));
window.addEventListener('scroll', handleScrollUi);
window.addEventListener('click', (e) => {
  if (!searchResults.contains(e.target) && e.target !== searchInput) {
    searchResults.style.display = 'none';
  }
});

observeSections();
initFeatureDropdown();
initFaq();
initCopyButtons();
initBackToTop();
initMobileMenu();
handleScrollUi();
