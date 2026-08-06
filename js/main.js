// CHARTIA — Interactions, motion, calculator, loader, nav dropdown

document.addEventListener('DOMContentLoaded', () => {
  // —— Page loader ——
  const loader = document.getElementById('pageLoader');
  if (loader) {
    const hide = () => loader.classList.add('is-done');
    if (document.readyState === 'complete') {
      setTimeout(hide, 600);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 500));
      setTimeout(hide, 2200); // fallback
    }
  }

  const nav = document.querySelector('.nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile hamburger
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // Dropdown (Learn)
  document.querySelectorAll('.nav__dropdown').forEach((dd) => {
    const trigger = dd.querySelector('.nav__dropdown-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = dd.classList.contains('open');
      document.querySelectorAll('.nav__dropdown').forEach((d) => d.classList.remove('open'));
      if (!wasOpen) dd.classList.add('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav__dropdown').forEach((d) => d.classList.remove('open'));
  });

  // Scroll fade-up
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.animate-in').forEach((el) => observer.observe(el));

  // —— Position Size Calculator (flexible R:R) ——
  const accountSize = document.getElementById('accountSize');
  const riskPercent = document.getElementById('riskPercent');
  const stopPips = document.getElementById('stopPips');
  const pipValue = document.getElementById('pipValue');
  const targetRR = document.getElementById('targetRR');
  const calcBtn = document.getElementById('calcBtn');
  const riskAmountEl = document.getElementById('riskAmount');
  const lotSizeEl = document.getElementById('lotSize');
  const rrTargetEl = document.getElementById('rrTarget');
  const potentialLossEl = document.getElementById('potentialLoss');
  const potentialProfitEl = document.getElementById('potentialProfit');
  const rrLabelEl = document.getElementById('rrLabel');

  function runCalc() {
    if (!accountSize || !riskAmountEl) return;
    const account = parseFloat(accountSize.value) || 0;
    const riskPct = parseFloat(riskPercent.value) || 0;
    const stop = parseFloat(stopPips.value) || 1;
    const pip = parseFloat(pipValue.value) || 10;
    const rr = parseFloat(targetRR?.value) || 5;

    const riskUsd = account * (riskPct / 100);
    const lots = stop > 0 && pip > 0 ? riskUsd / (stop * pip) : 0;
    const targetPips = stop * rr;
    const profitUsd = riskUsd * rr;

    riskAmountEl.textContent = '$' + riskUsd.toFixed(2);
    lotSizeEl.textContent = lots.toFixed(2) + ' lots';
    if (rrTargetEl) rrTargetEl.textContent = targetPips.toFixed(0) + ' pips';
    if (rrLabelEl) rrLabelEl.textContent = 'Suggested target (1:' + rr + ' R:R)';
    if (potentialLossEl) potentialLossEl.textContent = '−$' + riskUsd.toFixed(2);
    if (potentialProfitEl) potentialProfitEl.textContent = '+$' + profitUsd.toFixed(2);
  }

  if (calcBtn) {
    calcBtn.addEventListener('click', runCalc);
    [accountSize, riskPercent, stopPips, pipValue, targetRR].forEach((el) => {
      if (el) el.addEventListener('input', runCalc);
    });
    runCalc();
  }

  // Asset sample prices (Coverage removed or static)
  const sample = {
    EURUSD: '1.0842',
    GBPUSD: '1.2631',
    XAUUSD: '2,341.80',
    NAS100: '18,420.5',
    USOIL: '78.42',
    BTCUSD: '64,280'
  };
  document.querySelectorAll('.asset-card__price[data-symbol]').forEach((el) => {
    const sym = el.getAttribute('data-symbol');
    if (sample[sym]) el.textContent = sample[sym];
  });

  // —— Lead magnet form → API + Telegram redirect ——
  const leadForm = document.getElementById('leadForm');
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('leadName')?.value?.trim() || '';
      const email = document.getElementById('leadEmail')?.value?.trim() || '';
      const code = document.getElementById('leadCountry')?.value || '';
      const phone = document.getElementById('leadPhone')?.value?.trim() || '';
      const msg = document.getElementById('leadMsg');

      if (!name || !email || !code || !phone) {
        if (msg) {
          msg.textContent = 'Please fill name, email, country code and phone number.';
          msg.style.color = '#ff6b6b';
        }
        return;
      }

      const payload = {
        name,
        email,
        phone: code + ' ' + phone,
        countryCode: code,
        ts: new Date().toISOString(),
        source: 'checklist'
      };

      try {
        const leads = JSON.parse(localStorage.getItem('chartia_leads') || '[]');
        leads.push(payload);
        localStorage.setItem('chartia_leads', JSON.stringify(leads));
      } catch (_) {}

      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {}

      if (msg) {
        msg.textContent = '✓ Saved. Opening Telegram…';
        msg.style.color = '#00FFFF';
      }
      // Telegram channel post / group
      setTimeout(() => {
        window.open('https://t.me/Chartiatrading', '_blank', 'noopener');
      }, 400);
      leadForm.reset();
    });
  }

  // Card pointer glow
  document.querySelectorAll('.card, .path-card, .testi-card, .pricing-card').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Blog overlay
  document.querySelectorAll('[data-blog-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-blog-open');
      const overlay = document.getElementById('blogOverlay');
      const body = document.getElementById('blogOverlayBody');
      const title = document.getElementById('blogOverlayTitle');
      if (!overlay || !body) return;
      const src = document.getElementById(id);
      if (src) {
        if (title) title.textContent = src.getAttribute('data-title') || 'Article';
        body.innerHTML = src.innerHTML;
      }
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
  });
  const closeBlog = () => {
    const overlay = document.getElementById('blogOverlay');
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  document.getElementById('blogOverlayClose')?.addEventListener('click', closeBlog);
  document.getElementById('blogOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'blogOverlay') closeBlog();
  });
});
