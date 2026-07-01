/**
 * Forthcoming Covers Gallery - Client-side JavaScript
 * Loads books.json, renders cover cards (image only), lazy loading, filtering, click-to-download.
 */

(function () {
  'use strict';

  let allBooks = [];
  let filteredBooks = [];
  let activeGenre = 'all';
  let activePublisher = 'all';

  const gallery = document.getElementById('gallery');
  const bookCount = document.getElementById('book-count');
  const publisherFilter = document.getElementById('publisher-filter');
  const genreButtons = document.querySelectorAll('.genre-btn');

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async function init() {
    try {
      const response = await fetch('../data/books.json');
      if (!response.ok) throw new Error('Failed to load books.json');
      const manifest = await response.json();
      allBooks = manifest.books || [];
      populatePublisherDropdown();
      applyFilters();
    } catch (err) {
      gallery.innerHTML = '<p class="error">No covers available.</p>';
      console.error('Gallery init error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderGallery() {
    gallery.innerHTML = '';

    for (const book of filteredBooks) {
      const card = document.createElement('div');
      card.className = 'book-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('title', book.title + ' — ' + book.publisher);

      const img = document.createElement('img');
      img.setAttribute('data-src', '../covers/thumbs/' + book.thumbFilename);
      img.setAttribute('alt', book.title + ' by ' + book.publisher);
      img.width = 300;
      img.height = 450;

      card.appendChild(img);

      // Click to download hi-res
      card.addEventListener('click', function () {
        downloadHires(book);
      });

      gallery.appendChild(card);
    }

    updateCount();
    observeLazyImages();
  }

  function updateCount() {
    const count = filteredBooks.length;
    bookCount.textContent = count + (count === 1 ? ' cover' : ' covers');
  }

  // ---------------------------------------------------------------------------
  // Lazy Loading with Intersection Observer
  // ---------------------------------------------------------------------------

  function observeLazyImages() {
    const images = gallery.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
            img.addEventListener('load', function () {
              img.classList.add('loaded');
            });
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      images.forEach(function (img) {
        observer.observe(img);
      });
    } else {
      // Fallback: load all images immediately
      images.forEach(function (img) {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        img.classList.add('loaded');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  function applyFilters() {
    filteredBooks = allBooks.filter(function (book) {
      const genreMatch = activeGenre === 'all' || (book.genres && book.genres.includes(activeGenre));
      const publisherMatch = activePublisher === 'all' || book.publisher === activePublisher;
      return genreMatch && publisherMatch;
    });

    renderGallery();
  }

  function populatePublisherDropdown() {
    const publishers = [...new Set(allBooks.map(function (b) { return b.publisher; }))].sort();
    publisherFilter.innerHTML = '<option value="all">All Publishers</option>';
    publishers.forEach(function (pub) {
      const option = document.createElement('option');
      option.value = pub;
      option.textContent = pub;
      publisherFilter.appendChild(option);
    });
  }

  // Genre filter buttons
  genreButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      genreButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeGenre = btn.getAttribute('data-genre');
      applyFilters();
    });
  });

  // Publisher dropdown
  publisherFilter.addEventListener('change', function () {
    activePublisher = publisherFilter.value;
    applyFilters();
  });

  // ---------------------------------------------------------------------------
  // Download
  // ---------------------------------------------------------------------------

  function downloadHires(book) {
    const link = document.createElement('a');
    link.href = '../covers/hires/' + book.hiresFilename;
    link.download = book.hiresFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  init();
})();
