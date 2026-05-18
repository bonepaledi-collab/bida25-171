// ════════════════════════════════
// AUTH SYSTEM (localStorage)
// ════════════════════════════════

const protectedPages = ['home.html', 'booking.html', 'index.html', 'review.html', 'payment.html', 'activity.html'];
const currentPage = window.location.pathname.split('/').pop();

if (protectedPages.includes(currentPage)) {
  const loggedIn = localStorage.getItem('ch_loggedIn');
  if (!loggedIn) {
    window.location.href = 'login.html';
  }
}

// ── REGISTER ──
function handleRegister() {
  const name     = document.getElementById('regName')?.value.trim();
  const email    = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPass')?.value;
  const confirm  = document.getElementById('confirmPass')?.value;
  const terms    = document.getElementById('termsCheck')?.checked;
  const errEl    = document.getElementById('registerError');

  if (!name || !email || !password || !confirm) {
    errEl.textContent = 'Please fill in all fields.'; return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.'; return;
  }
  if (password !== confirm) {
    errEl.textContent = 'Passwords do not match.'; return;
  }
  if (!terms) {
    errEl.textContent = 'You must agree to the Terms of Service.'; return;
  }

  const users = JSON.parse(localStorage.getItem('ch_users') || '[]');
  if (users.find(u => u.email === email)) {
    errEl.textContent = 'An account with this email already exists.'; return;
  }

  users.push({ name, email, password });
  localStorage.setItem('ch_users', JSON.stringify(users));
  localStorage.setItem('ch_loggedIn', 'true');
  localStorage.setItem('ch_currentUser', JSON.stringify({ name, email }));

  window.location.href = 'index.html';
}

// ── LOGIN ──
function handleLogin() {
  const email    = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPass')?.value;
  const remember = document.getElementById('rememberMe')?.checked;
  const errEl    = document.getElementById('loginError');

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.'; return;
  }

  const users = JSON.parse(localStorage.getItem('ch_users') || '[]');
  const user  = users.find(u => u.email === email && u.password === password);

  if (!user) {
    errEl.textContent = 'Invalid email or password.'; return;
  }

  localStorage.setItem('ch_loggedIn', 'true');
  localStorage.setItem('ch_currentUser', JSON.stringify({ name: user.name, email: user.email }));

  if (remember) localStorage.setItem('ch_remember', 'true');

  window.location.href = 'index.html';
}

// ── LOGOUT ──
function handleLogout() {
  localStorage.removeItem('ch_loggedIn');
  localStorage.removeItem('ch_currentUser');
  localStorage.removeItem('ch_remember');
  window.location.href = 'login.html';
}

// ════════════════════════════════
// DOM READY
// ════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── User initials in navbar ──
  const userStr    = localStorage.getItem('ch_currentUser');
  const userCircle = document.querySelector('.icon-circle .fa-user');
  if (userStr && userCircle) {
    const user     = JSON.parse(userStr);
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    userCircle.parentElement.innerHTML = `
      <span class="user-initials" title="Logged in as ${user.name} — Click to logout" onclick="handleLogout()">${initials}</span>
    `;
  }

  // ── Trailer thumbnails ──
  document.querySelectorAll('.trailer-thumb').forEach(vid => {
    vid.addEventListener('loadedmetadata', () => { vid.currentTime = 3; });
  });

  // ── Init booking page ──
  if (currentPage === 'booking.html') initBookingPage();

  // ── Init review page ──
  if (currentPage === 'review.html') initReviewPage();
});

// ════════════════════════════════
// SLIDER
// ════════════════════════════════
function slide(rowId, direction) {
  const row = document.getElementById(rowId);
  if (row) row.scrollBy({ left: direction * 260, behavior: 'smooth' });
}

// ════════════════════════════════
// BOOK BUTTON → pass movie data to booking page
// ════════════════════════════════
document.querySelectorAll('.book-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.movie-card');
    if (!card) return;

    const params = new URLSearchParams({
      title:    card.dataset.title,
      year:     card.dataset.year,
      rating:   card.dataset.rating,
      genre:    card.dataset.genre,
      duration: card.dataset.duration,
      desc:     card.dataset.desc,
      img:      card.dataset.img
    });

    window.location.href = `booking.html?${params.toString()}`;
  });
});

// ════════════════════════════════
// BOOKING PAGE
// ════════════════════════════════
function initBookingPage() {
  const params   = new URLSearchParams(window.location.search);
  const title    = params.get('title')    || 'Unknown Movie';
  const year     = params.get('year')     || '';
  const rating   = params.get('rating')   || '';
  const genre    = params.get('genre')    || '';
  const duration = params.get('duration') || '';
  const desc     = params.get('desc')     || '';
  const img      = params.get('img')      || '';

  // Populate movie info
  document.querySelectorAll('.booking-poster img, .summary-movie img').forEach(el => {
    el.src = img; el.alt = title;
  });
  document.querySelectorAll('.booking-title').forEach(el => el.textContent = title);
  const metaEl = document.querySelector('.movie-meta');
  if (metaEl) metaEl.textContent = `${genre} • ${year} • ${duration}`;
  const descEl = document.querySelector('.movie-desc');
  if (descEl) descEl.textContent = desc;
  const ratingEl = document.querySelector('.booking-poster .rating-pill');
  if (ratingEl) ratingEl.innerHTML = `<i class="fas fa-star"></i> ${rating}`;
  const sumTitle = document.querySelector('.sum-title');
  if (sumTitle) sumTitle.textContent = title;

  // ── Real-time seat selection ──
  let selectedSeats = [];
  const TICKET_PRICE   = 200;
  const CONVENIENCE_FEE = 40;
  const TAXES           = 60;

  // Date pills
  document.querySelectorAll('.date-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.closest('.date-row').querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      updateSummary();
    });
  });

  // Time pills
  document.querySelectorAll('.time-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.closest('.time-row').querySelectorAll('.time-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      updateSummary();
    });
  });

  // Seat clicks
  document.addEventListener('click', (e) => {
    const seat = e.target.closest('.seat');
    if (!seat || seat.classList.contains('booked')) return;

    const row     = seat.closest('.seat-row')?.dataset.row || '';
    const allSeats = Array.from(seat.closest('.seats')?.querySelectorAll('.seat') || []);
    const seatIdx  = allSeats.indexOf(seat) + 1;
    const seatId   = `${row}${seatIdx}`;

    if (seat.classList.contains('selected')) {
      seat.classList.remove('selected');
      selectedSeats = selectedSeats.filter(s => s !== seatId);
    } else {
      seat.classList.add('selected');
      selectedSeats.push(seatId);
    }

    updateSummary();
  });

  function getSelectedDate() {
    const active = document.querySelector('.date-pill.active');
    if (!active) return '';
    const day  = active.querySelector('.day-label')?.textContent || '';
    const date = active.querySelector('.date-label')?.textContent || '';
    return `${day}, ${date}`;
  }

  function getSelectedTime() {
    return document.querySelector('.time-pill.active')?.textContent.trim() || '';
  }

  function updateSummary() {
    const count    = selectedSeats.length;
    const subtotal = count * TICKET_PRICE;
    const total    = subtotal + CONVENIENCE_FEE + TAXES;

    const seatsEl = document.querySelector('.sum-val.red');
    if (seatsEl) seatsEl.textContent = count > 0 ? selectedSeats.join(', ') : 'None';

    const allSumVals = document.querySelectorAll('.sum-val');
    if (allSumVals[0]) allSumVals[0].textContent = getSelectedDate();
    if (allSumVals[1]) allSumVals[1].textContent = getSelectedTime();
    if (allSumVals[3]) allSumVals[3].textContent = `${count} Adult`;

    const priceRows = document.querySelectorAll('.price-row');
    if (priceRows[0]) {
      priceRows[0].querySelector('span:first-child').textContent = `Ticket Price (P${TICKET_PRICE} x ${count})`;
      priceRows[0].querySelector('span:last-child').textContent  = `P${subtotal}.00`;
    }
    if (priceRows[2]) priceRows[2].querySelector('span:last-child').textContent = `P${TAXES}.00`;

    const totalEl = document.querySelector('.price-row.total span:last-child');
    if (totalEl) totalEl.textContent = `P${total}.00`;

    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) payBtn.textContent = count > 0
      ? `Pay & Confirm — P${total}.00`
      : 'Select Seats to Continue';
  }

  // ── Proceed to Review ──
  const payBtn = document.querySelector('.pay-btn');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      if (selectedSeats.length === 0) {
        alert('Please select at least one seat.'); return;
      }

      const bookingData = {
        type:        'ticket',
        title, year, rating, genre, duration, img,
        seats:       selectedSeats,
        date:        getSelectedDate(),
        time:        getSelectedTime(),
        ticketCount: selectedSeats.length,
        ticketPrice: TICKET_PRICE,
        convenience: CONVENIENCE_FEE,
        taxes:       TAXES,
        subtotal:    selectedSeats.length * TICKET_PRICE,
        total:       selectedSeats.length * TICKET_PRICE + CONVENIENCE_FEE + TAXES,
        cinema:      'Cinemaholic Multiplex',
        screen:      'Screen 4'
      };

      localStorage.setItem('ch_pendingBooking', JSON.stringify(bookingData));
      window.location.href = 'review.html';
    });
  }

  updateSummary();
}

// ════════════════════════════════
// REVIEW PAGE
// ════════════════════════════════
function initReviewPage() {
  const booking = JSON.parse(localStorage.getItem('ch_pendingBooking') || 'null');
  if (!booking) { window.location.href = 'booking.html'; return; }

  document.querySelectorAll('.review-poster').forEach(el => { el.src = booking.img; el.alt = booking.title; });
  document.querySelectorAll('.review-title').forEach(el => el.textContent = booking.title);
  const metaEl = document.querySelector('.review-meta');
  if (metaEl) metaEl.textContent = `${booking.genre} • ${booking.year} • ${booking.duration}`;

  setText('review-date',          booking.date);
  setText('review-time',          booking.time);
  setText('review-seats',         booking.seats.join(', '));
  setText('review-tickets',       `${booking.ticketCount} Adult`);
  setText('review-cinema',        booking.cinema);
  setText('review-screen',        booking.screen);
  setText('review-date-2',        booking.date);
  setText('review-time-2',        booking.time);
  setText('review-seats-2',       booking.seats.join(', '));
  setText('review-ticket-label',  `Ticket Price (P${booking.ticketPrice} x ${booking.ticketCount})`);
  setText('review-subtotal',      `P${booking.subtotal}.00`);
  setText('review-convenience',   `P${booking.convenience}.00`);
  setText('review-taxes',         `P${booking.taxes}.00`);
  setText('review-total',         `P${booking.total}.00`);

  document.querySelectorAll('.review-cinema-2').forEach(el => el.textContent = booking.cinema);
  document.querySelectorAll('[id="review-screen-2"]').forEach(el => el.textContent = booking.screen);
  document.querySelectorAll('.review-poster').forEach(el => { el.src = booking.img; el.alt = booking.title; });

  const proceedBtn = document.getElementById('proceedToPayment');
  if (proceedBtn) {
    proceedBtn.innerHTML = `<i class="fas fa-lock"></i> Proceed to Payment — P${booking.total}.00`;
    proceedBtn.addEventListener('click', () => {
      const pendingOrder = {
        type:     'ticket',
        title:    booking.title,
        img:      booking.img,
        seats:    booking.seats,
        date:     booking.date,
        time:     booking.time,
        cinema:   booking.cinema,
        screen:   booking.screen,
        subtotal: booking.subtotal,
        total:    booking.total,
        items: [{
          name:  booking.title,
          size:  `${booking.ticketCount} x Adult Ticket`,
          price: booking.subtotal,
          qty:   1,
          img:   booking.img
        }]
      };
      localStorage.setItem('ch_pendingOrder', JSON.stringify(pendingOrder));
      window.location.href = 'payment.html';
    });
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ════════════════════════════════
// VIDEO TRAILER MODAL
// ════════════════════════════════
function openTrailer(src) {
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('trailerVideo');
  if (!modal || !video) return;
  video.src = src;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTrailer(e) {
  if (e && e.target !== document.getElementById('videoModal') &&
      !e.target.closest('.video-close')) return;
  const modal = document.getElementById('videoModal');
  const video = document.getElementById('trailerVideo');
  if (!modal || !video) return;
  video.pause();
  video.src = '';
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTrailer({ target: document.getElementById('videoModal') });
});