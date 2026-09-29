// Contact form: DOS-style validation, then a MAIL.EXE panel that dials, transmits and reports back.
// The form service and request are unchanged; success is only printed once the service confirms.
// Without JS the form posts normally, with the browser's own validation.
//
// This file stands alone (retro.js failing, or a stale cached copy of it, can't stop it), and it's
// built so the message always goes out once JavaScript runs: the submit handler is attached first and
// cancels the native submit before anything else, the request is sent before any UI step, and if a
// step of the sequence throws, the visitor gets a plain MESSAGE SENT. or Abort, Retry, Fail? instead.
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const log = (step, err) => console.error(`[contact] ${step} failed:`, err);
  const LINKEDIN = 'https://www.linkedin.com/in/russellgreene/';
  let data = null, run = 0, ui = null;

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid;
    try {
      valid = ui ? ui.validate() : form.reportValidity();
    } catch (err) {
      log('validation', err);
      valid = form.reportValidity();
    }
    if (!valid) return;
    data = new FormData(form);
    send();
  });

  // The same request as ever; any failure (network, non-OK, or fetch itself) resolves to false
  function post() {
    try {
      return fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
      }).then(res => res.ok, () => false);
    } catch (err) {
      log('request', err);
      return Promise.resolve(false);
    }
  }

  function send() {
    const id = ++run;
    const request = post();
    let sequence;
    try {
      sequence = ui ? ui.sequence(id, request) : Promise.reject(new Error('panel not set up'));
    } catch (err) {
      sequence = Promise.reject(err);
    }
    sequence.catch(err => {
      log('send sequence', err);
      if (id === run) request.then(plain);
    });
  }

  // The result with no animation, for when the sequence broke. If even the panel is unusable, a line
  // of text under the form says what happened.
  function plain(ok) {
    document.documentElement.classList.remove('cursor-wait');
    try {
      ui.plain(ok);
    } catch (err) {
      log('plain result', err);
      if (ok) form.reset();
      form.hidden = false;
      let note = document.getElementById('contact-status');
      if (!note) {
        note = document.createElement('div');
        note.id = 'contact-status';
        note.className = 'form-error';
        note.setAttribute('role', 'status');
        form.after(note);
      }
      note.textContent = ok ? 'MESSAGE SENT.' : 'ERROR: TRANSMISSION FAILED. Please try again.';
    }
  }

  try {
    ui = setUp();
  } catch (err) {
    log('set up', err); // the browser's own validation stays on; the handler above still sends
    ui = null;
  }

  function setUp() {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const PROMPT = 'C:\\>';
    const MIN_DIAL_MS = 600;           // dialling dots, before the bar starts
    const BAR_STEP_MS = 50, HOLD = 0.9; // the bar climbs 5% a step and waits at 90% for the service
    const BAR_CELLS = 16;
    const DOTS = 10, DOT_MS = MIN_DIAL_MS / DOTS;
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const fields = [
      { input: form.elements.name, check: v => (v.trim() ? '' : 'ERROR: NAME REQUIRED') },
      { input: form.elements.email, check: v => (!v.trim() ? 'ERROR: EMAIL REQUIRED' : EMAIL.test(v.trim()) ? '' : 'ERROR: EMAIL ADDRESS INVALID') },
      { input: form.elements.message, check: v => (v.trim() ? '' : 'ERROR: MESSAGE REQUIRED') },
    ];

    // ── Validation: one DOS error line under each field, cleared as soon as the field is fixed ──
    function setError(field, text) {
      let el = field.error;
      if (text && !el) {
        el = field.error = document.createElement('div');
        el.className = 'form-error';
        el.id = `${field.input.id}-error`;
        field.input.after(el);
      }
      if (!el) return;
      el.textContent = text;
      el.hidden = !text;
      if (text) {
        field.input.setAttribute('aria-invalid', 'true');
        field.input.setAttribute('aria-describedby', el.id);
      } else {
        field.input.removeAttribute('aria-invalid');
        field.input.removeAttribute('aria-describedby');
      }
    }

    fields.forEach(field => field.input.addEventListener('input', () => {
      if (field.error && !field.error.hidden) setError(field, field.check(field.input.value));
    }));

    function validate() {
      let first = null;
      for (const field of fields) {
        const text = field.check(field.input.value);
        setError(field, text);
        if (text && !first) first = field.input;
      }
      if (first) first.focus();
      return !first;
    }

    // ── The MAIL.EXE panel ──
    const panel = document.createElement('div');
    panel.className = 'mail-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="mail-frame">' +
        '<div class="mail-title" aria-hidden="true"><span>[■]</span><span>C:\\RUSSELL\\MAIL.EXE</span></div>' +
        '<div class="mail-screen"></div>' +
      '</div>';
    const screen = panel.querySelector('.mail-screen');
    const announcer = document.createElement('div');
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', 'polite');
    form.after(panel, announcer);

    const announce = text => {
      announcer.textContent = '';
      setTimeout(() => { announcer.textContent = text; }, 50);
    };

    // Printed lines are visual; each stage is announced once instead. Headings are real text.
    function line(text = '', { tag = 'div', cls = '' } = {}) {
      const el = document.createElement(tag);
      el.className = `mail-line ${cls}`.trim();
      if (tag === 'div') el.setAttribute('aria-hidden', 'true');
      el.textContent = text;
      screen.append(el);
      return el;
    }

    function button(label, onClick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dos-button mail-button';
      b.innerHTML = '<span class="dos-button-label"></span><b class="block-cursor dos-button-cursor" aria-hidden="true"></b>';
      b.querySelector('.dos-button-label').textContent = label;
      b.addEventListener('click', onClick);
      return b;
    }

    function actions(...buttons) {
      const row = document.createElement('div');
      row.className = 'mail-actions';
      row.append(...buttons);
      screen.append(row);
      return row;
    }

    // The bar is block characters (█ filled, ░ empty); VT323 has no block glyphs, so each cell is
    // also drawn as a solid or dithered pixel block over its character
    function bar(el, p) {
      const filled = Math.floor(p * BAR_CELLS + 1e-9);
      el.textContent = 'Transmitting [';
      const cells = document.createElement('span');
      cells.className = 'mail-cells';
      for (let i = 0; i < BAR_CELLS; i++) {
        const cell = document.createElement('span');
        cell.className = i < filled ? 'mail-cell is-on' : 'mail-cell';
        cell.textContent = i < filled ? '█' : '░';
        cells.append(cell);
      }
      el.append(cells, `] ${Math.round(p * 100)}%`);
    }

    const wait = ms => new Promise(resolve => setTimeout(resolve, reduceMotion.matches ? 0 : ms));

    function showForm(focusEl) {
      panel.hidden = true;
      screen.textContent = '';
      form.hidden = false;
      if (focusEl) focusEl.focus();
    }

    // The request is already out; this only paces what's printed
    async function sequence(id, request) {
      const live = () => id === run;
      form.hidden = true;
      panel.hidden = false;
      screen.textContent = '';
      if (fine) root.classList.add('cursor-wait');
      announce('Sending message…');
      let result = null;
      request.then(ok => { result = ok; });

      line(`${PROMPT}MAIL RUSSELL /SEND`);
      await wait(150);
      if (!live()) return;
      const dial = line('Dialing RUSSELL.NET');
      if (reduceMotion.matches) dial.textContent += `${'.'.repeat(DOTS)} CONNECTED`;
      else {
        for (let i = 0; i < DOTS; i++) {
          await wait(DOT_MS);
          if (!live()) return;
          dial.textContent += '.';
        }
        dial.textContent += ' CONNECTED';
      }

      const progress = line('', { cls: 'mail-bar' });
      bar(progress, 0);
      let p = 0;
      if (reduceMotion.matches) {
        p = HOLD;
        bar(progress, p);
      } else {
        // Climb to 90%, then hold there until the service answers
        while (p < HOLD - 1e-9) {
          await wait(BAR_STEP_MS);
          if (!live()) return;
          p = Math.min(HOLD, p + 0.05);
          bar(progress, p);
        }
      }
      if (result === null) progress.classList.add('is-holding');
      const ok = await request;
      if (!live()) return;
      progress.classList.remove('is-holding');

      if (ok) {
        // Confirmed: finish the bar, and only then say it went
        if (reduceMotion.matches) bar(progress, 1);
        else {
          while (p < 1 - 1e-9) {
            await wait(BAR_STEP_MS);
            if (!live()) return;
            p = Math.min(1, p + 0.05);
            bar(progress, p);
          }
        }
        form.reset();
        const sent = line('MESSAGE SENT.');
        root.classList.remove('cursor-wait');
        if (!reduceMotion.matches) {
          try {
            await flyEnvelope(sent);
          } catch (err) {
            log('envelope', err); // decoration only: carry on to the result
          }
        }
        if (!live()) return;
        line();
        received('MESSAGE RECEIVED.');
      } else {
        root.classList.remove('cursor-wait');
        line();
        failed();
      }
    }

    // Success ending: the heading, the sign-off and SEND ANOTHER
    function received(text) {
      const heading = line(text, { tag: 'h3', cls: 'mail-result' });
      heading.tabIndex = -1;
      line('RUSSELL WILL BE IN TOUCH.', { tag: 'p', cls: 'mail-result-sub' });
      actions(button('Send another', () => showForm(fields[0].input)));
      announce('Message sent. Russell will be in touch.');
      heading.focus();
    }

    // Failure ending: the error and Abort, Retry, Fail?
    function failed() {
      const heading = line('ERROR: TRANSMISSION FAILED', { tag: 'h3', cls: 'mail-result' });
      heading.id = 'mail-failed';
      heading.tabIndex = -1;
      const ask = line('Abort, Retry, Fail?', { tag: 'p', cls: 'mail-ask' });
      ask.id = 'mail-ask';
      const row = actions(
        button('Abort', () => showForm(form.querySelector('.btn-submit'))),
        button('Retry', () => send()),
        button('Fail', () => fail(row)),
      );
      row.setAttribute('role', 'group');
      row.setAttribute('aria-labelledby', 'mail-failed mail-ask');
      announce('Transmission failed. Abort, Retry, Fail?');
      row.querySelector('button').focus();
    }

    // Fail: the old-fashioned way round
    function fail(row) {
      row.remove();
      line(`${PROMPT}`);
      const note = line('', { tag: 'p', cls: 'mail-fallback' });
      note.tabIndex = -1;
      const link = document.createElement('a');
      link.href = LINKEDIN;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'LinkedIn ↗';
      note.append('Mail is down. Reach Russell on ', link, ' instead.');
      actions(button('Back to form', () => showForm(form.querySelector('.btn-submit'))));
      note.focus();
    }

    // The envelope lifts off the MESSAGE SENT. line in steps, shrinking as it climbs, and a click
    // effect bursts where it leaves
    // Its art and burst come from retro.js; without them the envelope is skipped. It never holds up the
    // result for more than a moment, even if the animation stalls.
    let clickFx = null;
    function flyEnvelope(from) {
      if (typeof gridSvg !== 'function' || typeof makeClickEffects !== 'function') return Promise.resolve();
      return new Promise(resolve => {
        setTimeout(resolve, 1500);
        const env = document.createElement('div');
        env.className = 'mail-envelope';
        env.setAttribute('aria-hidden', 'true');
        env.innerHTML = gridSvg(PIXEL_ICONS.envelope[0].slice(2), 6);
        document.body.append(env);
        const r = from.getBoundingClientRect();
        const x = Math.round(r.left + Math.min(r.width, 240) / 2 - 30), y = Math.round(r.bottom - 42);
        env.style.translate = `${x}px ${y}px`;
        const RISE = [0, 16, 40, 72, 112, 160];
        const frames = RISE.map((dy, i) => ({
          offset: i / RISE.length, easing: 'steps(1, end)',
          transform: `translate(${i % 2 ? 4 : 0}px, ${-dy}px) scale(${i < 3 ? 1 : i < 5 ? 0.75 : 0.5})`, opacity: 1,
        }));
        frames.push({ offset: 1, transform: 'translate(0px, -160px) scale(0.5)', opacity: 0 });
        const anim = env.animate(frames, { duration: 720, fill: 'forwards' });
        // Burst as the envelope blinks out at the top of its climb
        setTimeout(() => {
          try {
            clickFx = clickFx || makeClickEffects();
            clickFx(x + 30, y + 21 - 160);
          } catch (err) {
            log('burst', err);
          }
        }, 720 * (RISE.length - 1) / RISE.length);
        anim.finished.then(() => { env.remove(); setTimeout(resolve, 150); }, () => { env.remove(); resolve(); });
      });
    }

    // Everything above set up: DOS validation takes over from the browser's
    form.noValidate = true;

    return {
      validate,
      sequence,
      // The plain result: MESSAGE SENT. or Abort, Retry, Fail?, with no dialing, bar or envelope
      plain(ok) {
        form.hidden = true;
        panel.hidden = false;
        screen.textContent = '';
        if (ok) {
          form.reset();
          received('MESSAGE SENT.');
        } else failed();
      },
    };
  }
})();
