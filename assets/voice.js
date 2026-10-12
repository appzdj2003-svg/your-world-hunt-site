/* Shared voice input (Web Speech API) for Ask Hawk boxes. Usage: <button class="mic" data-voice-for="inputId" data-voice-submit="buttonId|formId">.
   Speech is handled by the browser's own recognizer; this site sends nothing anywhere. */
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MSG_NO = "Voice input isn't supported in this browser. In a Tesla, tap the box, then press the steering-wheel mic and speak; otherwise type your trip.";
  const MSG_DENIED = "Microphone access was blocked. Allow it in your browser settings, or type your trip instead.";
  const NAV = typeof navigator !== "undefined" ? navigator : {};
  const UAD = NAV.userAgentData ? JSON.stringify(NAV.userAgentData.brands || []) + (NAV.userAgentData.platform || "") : "";
  const TESLA = /Tesla|QtCarBrowser/i.test((NAV.userAgent || "") + UAD);
  const MSG_TESLA = "In a Tesla, tap the box, then press the steering-wheel mic and speak.";
  function note(btn, text) {
    let n = document.getElementById(btn.dataset.voiceFor + "-vmsg");
    if (!n) { n = document.createElement("p"); n.id = btn.dataset.voiceFor + "-vmsg"; n.className = "vmsg"; n.setAttribute("role", "status");
      const host = btn.closest(".quick") || btn.parentNode; host.insertAdjacentElement("afterend", n); }
    n.textContent = text || ""; n.hidden = !text;
  }
  function submit(btn) {
    const t = document.getElementById(btn.dataset.voiceSubmit); if (!t) return;
    if (t.tagName === "FORM") t.requestSubmit ? t.requestSubmit() : t.dispatchEvent(new Event("submit", { cancelable: true })); else t.click();
  }
  function wire(btn) {
    const input = document.getElementById(btn.dataset.voiceFor); let rec = null, base = "", gotFinal = false;
    btn.addEventListener("click", () => {
      if (TESLA) { note(btn, MSG_TESLA); try { input.focus(); } catch (e) {} return; }   // car browser: use the car's own voice keyboard
      if (!SR) { note(btn, MSG_NO); try { input.focus(); } catch (e) {} return; }
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = document.documentElement.lang === "en" ? "en-US" : (document.documentElement.lang || "en-US");
      rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      base = ""; gotFinal = false; input.value = ""; note(btn, "Listening… speak your trip or question.");
      btn.classList.add("listening"); btn.setAttribute("aria-pressed", "true"); btn.setAttribute("aria-label", "Stop listening");
      rec.onresult = e => { let fin = "", tmp = "";
        for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; (r.isFinal ? (fin += r[0].transcript) : (tmp += r[0].transcript)); }
        if (fin) { base += fin; gotFinal = true; } input.value = (base + tmp).trim(); };
      rec.onerror = e => { note(btn, e.error === "not-allowed" || e.error === "service-not-allowed" ? MSG_DENIED : e.error === "no-speech" ? "Didn't catch that. Tap the mic and try again." : MSG_NO); };
      rec.onend = () => { btn.classList.remove("listening"); btn.setAttribute("aria-pressed", "false"); btn.setAttribute("aria-label", "Speak your trip"); rec = null;
        if (gotFinal && input.value.trim()) { note(btn, ""); submit(btn); } };
      try { rec.start(); } catch (err) { rec = null; btn.classList.remove("listening"); note(btn, MSG_NO); }
    });
  }
  document.querySelectorAll("[data-voice-for]").forEach(wire);
  window.YWVoice = { supported: !!SR, tesla: TESLA };
})();
