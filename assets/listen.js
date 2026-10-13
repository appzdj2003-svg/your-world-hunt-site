/* Listen: read guides aloud with the device's built-in voice (Web Speech API speechSynthesis).
   Nothing is sent from this site. Pure helpers (extract, chunk) are exported for node tests. */
(function (G) {
  "use strict";
  var READ = "h2,h3,h4,p,li,summary,blockquote,figcaption";
  var SKIP = "nav,header,footer,aside,button,.btn,code,pre,script,style,svg,table,form,.listen,.crumbs,.jump,.meta,.ad,.ads,.adsbygoogle,.gear,.gearcard,.deal,.dealband,.deals,.card,.pcard,.upsell,.disclosure,.finalcta,.tier,.tiers,.shopgrid,.prod,[aria-hidden=true],[data-nolisten]";
  function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  /* Text of el minus skipped descendants (buttons, code, cards...). */
  function textOf(el) {
    var kids = el.childNodes || el.children || [], t = "";
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.nodeType === 3 || k.text != null) t += " " + (k.nodeValue != null ? k.nodeValue : k.text);
      else if (k.nodeType === 1 || k.tagName) { if (!(k.matches && k.matches(SKIP))) t += " " + textOf(k); }
    }
    return t;
  }
  function inSkip(el, root) { for (var e = el; e && e !== root; e = e.parentNode) if (e.matches && e.matches(SKIP)) return true; return false; }
  function hasReadAncestor(el, root) { for (var e = el.parentNode; e && e !== root; e = e.parentNode) if (e.matches && e.matches(READ)) return true; return false; }
  /* -> [{el, text}] in document order: headings, paragraphs, list items; skips nav/ads/cards/buttons/code. */
  function extract(root) {
    var out = [], els = root.querySelectorAll(READ);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (inSkip(el, root) || hasReadAncestor(el, root)) continue;
      var t = clean(textOf(el));
      if (t.length < 2 || !/[A-Za-z0-9]/.test(t)) continue;
      if (/^H[2-4]$/.test(el.tagName) && !/[.!?:]$/.test(t)) t += ".";
      out.push({ el: el, text: t });
    }
    return out;
  }
  /* Split into sentence chunks <= max chars (Chrome stops long utterances after ~15 s). */
  function chunk(text, max) {
    max = max || 180; text = clean(text); if (!text) return [];
    var sents = text.split(/(?<=[.!?]["')\]]?)\s+/), out = [], cur = "";
    function pushLong(s) {
      while (s.length > max) {
        var cut = s.lastIndexOf(", ", max - 1); if (cut < max * 0.4) cut = s.lastIndexOf(" ", max);
        if (cut < 1) { out.push(s.slice(0, max)); s = s.slice(max); continue; }
        out.push(s.slice(0, cut + (s[cut] === "," ? 1 : 0)).trim()); s = s.slice(cut + 1).trim();
      }
      return s;
    }
    sents.forEach(function (s) {
      s = clean(s); if (!s) return;
      if ((cur + " " + s).trim().length <= max) { cur = (cur + " " + s).trim(); return; }
      if (cur) out.push(cur);
      cur = pushLong(s);
    });
    if (cur) out.push(cur);
    return out;
  }
  /* lang "es": es-US > es-MX > es-ES > any es; otherwise en-US > any en. Natural/neural voices first. */
  function pickVoice(vs, lang) {
    var es = /^es/i.test(lang || ""), en = [];
    var pref = es ? [/^es[-_]US/i, /^es[-_]MX/i, /^es[-_]ES/i, /^es/i] : [/^en[-_]US/i, /^en/i];
    for (var k = 0; k < pref.length && !en.length; k++) en = vs.filter(function (v) { return pref[k].test(v.lang); });
    var nat = en.filter(function (v) { return /natural|neural|premium|enhanced|online|google/i.test(v.name); });
    return (nat[0] || en.filter(function (v) { return v.default; })[0] || en[0] || vs[0] || null);
  }
  var EN = { listen: "Listen", play: "Play", pause: "Pause", resume: "Resume", stop: "Stop", speed: "Speed", voice: "Voice", group: "Listen to this page",
    note: "Uses your device's built-in voice. Nothing is sent from this site.",
    no: "🔊 Listen isn't supported in this browser. Try Chrome, Edge or Safari, or read on screen.",
    tesla: "🔊 Listen isn't available in the Tesla browser. Open this page on your phone to hear it, or read on screen." };
  var ES = { listen: "Escuchar", play: "Reproducir", pause: "Pausa", resume: "Continuar", stop: "Detener", speed: "Velocidad", voice: "Voz", group: "Escuchar esta página",
    note: "Usa la voz integrada de tu dispositivo. Este sitio no envía nada.",
    no: "🔊 Escuchar no funciona en este navegador. Prueba Chrome, Edge o Safari, o lee en pantalla.",
    tesla: "🔊 Escuchar no está disponible en el navegador de Tesla. Abre esta página en tu teléfono para oírla, o lee en pantalla." };
  var API = { extract: extract, chunk: chunk, pickVoice: pickVoice, EN: EN, ES: ES, SKIP: SKIP, READ: READ };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  G.Listen = API;

  function init() {
    var box = document.querySelector(".listen[data-listen]"); if (!box) return;
    var root = document.querySelector(box.getAttribute("data-listen")) || document.querySelector("main .wrap");
    var LANG = /^es/i.test(document.documentElement.lang) ? "es" : "en", T = LANG === "es" ? ES : EN;
    var ss = G.speechSynthesis, UA = (navigator.userAgent || "");
    var tesla = /Tesla|QtCarBrowser/i.test(UA);
    if (!ss || typeof G.SpeechSynthesisUtterance !== "function") {
      box.innerHTML = '<p class="listen-note">' + (tesla ? T.tesla : T.no) + "</p>";
      box.hidden = false; return;
    }
    var items = extract(root), queue = [];
    items.forEach(function (it, i) { chunk(it.text).forEach(function (c) { queue.push({ i: i, t: c }); }); });
    if (!queue.length) return;
    box.innerHTML =
      '<div class="listen-bar" role="group" aria-label="' + T.group + '">' +
      '<button type="button" class="lbtn lplay" aria-label="' + T.play + '">▶ <span>' + T.listen + '</span></button>' +
      '<button type="button" class="lbtn lstop" aria-label="' + T.stop + '" disabled>■</button>' +
      '<label class="lsel"><span class="sr">' + T.speed + '</span><select class="lrate" aria-label="' + T.speed + '"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>' +
      '<label class="lsel lvwrap"><span class="sr">' + T.voice + '</span><select class="lvoice" aria-label="' + T.voice + '"></select></label>' +
      '<span class="lstat" aria-live="polite"></span></div>' +
      '<p class="listen-note">' + T.note + "</p>";
    box.hidden = false;
    var hdr = document.querySelector("header.top");
    function stick() { box.style.top = (hdr && getComputedStyle(hdr).position === "sticky" ? hdr.offsetHeight : 0) + "px"; }
    stick(); addEventListener("resize", stick);
    var bPlay = box.querySelector(".lplay"), bStop = box.querySelector(".lstop"), selR = box.querySelector(".lrate"), selV = box.querySelector(".lvoice"), stat = box.querySelector(".lstat");
    var voices = [], voice = null, pos = 0, state = "idle", gen = 0, lastEl = null;
    try { var sr = localStorage.getItem("listenRate"); if (sr) selR.value = sr; } catch (e) {}
    function loadVoices() {
      var all = ss.getVoices(); voices = all.filter(function (v) { return v.lang.slice(0, 2).toLowerCase() === LANG; }); if (!voices.length) voices = all;
      var saved = null; try { saved = localStorage.getItem("listenVoice_" + LANG); } catch (e) {}
      voice = voices.filter(function (v) { return v.name === saved; })[0] || pickVoice(voices, LANG);
      selV.innerHTML = voices.map(function (v, k) { return '<option value="' + k + '"' + (v === voice ? " selected" : "") + ">" + v.name.replace(/</g, "") + " (" + v.lang + ")</option>"; }).join("");
      box.querySelector(".lvwrap").hidden = voices.length < 2;
    }
    loadVoices(); if ("onvoiceschanged" in ss) ss.onvoiceschanged = loadVoices;
    function mark(el) {
      if (lastEl) lastEl.classList.remove("listen-on"); lastEl = el;
      if (!el) return; el.classList.add("listen-on");
      var r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 40) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    function ui() {
      var playing = state === "playing";
      bPlay.innerHTML = playing ? "❚❚ <span>" + T.pause + "</span>" : state === "paused" ? "▶ <span>" + T.resume + "</span>" : "▶ <span>" + T.listen + "</span>";
      bPlay.setAttribute("aria-label", playing ? T.pause : state === "paused" ? T.resume : T.play);
      bStop.disabled = state === "idle";
      stat.textContent = state === "idle" ? "" : (Math.min(pos + 1, queue.length) + " / " + queue.length);
    }
    function speakNext(g) {
      if (g !== gen || state !== "playing") return;
      if (pos >= queue.length) { stop(); return; }
      var q = queue[pos], u = new SpeechSynthesisUtterance(q.t);
      u.rate = +selR.value || 1; if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = LANG === "es" ? "es-US" : "en-US";
      u.onend = function () { if (g !== gen) return; pos++; speakNext(g); };
      u.onerror = function (e) { if (g !== gen) return; if (e && (e.error === "interrupted" || e.error === "canceled")) return; pos++; speakNext(g); };
      mark(items[q.i].el); ui(); ss.speak(u);
    }
    /* Pause = cancel + remember position: native pause/resume is unreliable on iOS Safari and Chrome Android. */
    function play() { ss.cancel(); state = "playing"; gen++; var g = gen; if (ss.paused) ss.resume(); setTimeout(function () { speakNext(g); }, 60); ui(); }
    function pause() { state = "paused"; gen++; ss.cancel(); ui(); }
    function stop() { state = "idle"; gen++; ss.cancel(); pos = 0; mark(null); ui(); }
    bPlay.onclick = function () { state === "playing" ? pause() : play(); };
    bStop.onclick = stop;
    selR.onchange = function () { try { localStorage.setItem("listenRate", selR.value); } catch (e) {} if (state === "playing") play(); };
    selV.onchange = function () { voice = voices[+selV.value] || voice; try { localStorage.setItem("listenVoice_" + LANG, voice.name); } catch (e) {} if (state === "playing") play(); };
    document.addEventListener("visibilitychange", function () { if (document.hidden && state === "playing" && /iPhone|iPad|iPod/.test(UA)) pause(); });
    addEventListener("pagehide", function () { ss.cancel(); });
    items.forEach(function (it, i) { it.el.addEventListener("dblclick", function () { for (var k = 0; k < queue.length; k++) if (queue[k].i === i) { pos = k; break; } play(); }); });
    ui();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
