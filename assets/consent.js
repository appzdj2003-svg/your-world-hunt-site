/* Your World Hunt: cookie consent for Google Analytics (EU/EEA, UK, Switzerland by browser time zone). No libraries. */
(function () {
  var KEY = "yw_consent", GA = window.ywGA || { eu: true, load: function () {} };
  var es = (document.documentElement.lang || "").slice(0, 2) === "es";
  var T = es ? {
    msg: "Usamos Google Analytics para contar visitas y ver qué páginas se usan. Solo se activa si aceptas.",
    acc: "Aceptar", dec: "Rechazar", more: "Privacidad", label: "Cookies"
  } : {
    msg: "We use Google Analytics to count visits and see which pages get used. It only runs if you accept.",
    acc: "Accept", dec: "Decline", more: "Privacy", label: "Cookies"
  };
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function clearGa() {
    var host = location.hostname, parts = host.split("."), doms = [""];
    for (var i = 0; i < parts.length - 1; i++) doms.push("." + parts.slice(i).join("."));
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n === "_ga" || n.indexOf("_ga_") === 0 || n === "_gid") doms.forEach(function (d) {
        document.cookie = n + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
      });
    });
  }
  var box;
  function hide() { if (box) { box.remove(); box = null; } }
  function choose(v) {
    set(v);
    if (window.gtag) gtag("consent", "update", { analytics_storage: v });
    if (v === "granted") GA.load(); else clearGa();
    hide();
  }
  function show() {
    if (box) return;
    var priv = document.querySelector('footer a[href$="privacy.html"]');
    box = document.createElement("div");
    box.className = "ywconsent"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", T.label);
    box.innerHTML = '<p></p><div class="ywc-btns"><button type="button" class="btn" data-v="granted"></button><button type="button" class="btn" data-v="denied"></button></div>';
    var p = box.querySelector("p"); p.textContent = T.msg + " ";
    var a = document.createElement("a"); a.href = priv ? priv.getAttribute("href") : "/privacy.html"; a.textContent = T.more; p.appendChild(a);
    var b = box.querySelectorAll("button"); b[0].textContent = T.acc; b[1].textContent = T.dec;
    for (var i = 0; i < b.length; i++) b[i].addEventListener("click", function () { choose(this.getAttribute("data-v")); });
    document.body.appendChild(box);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-yw-cookies]");
    if (t) { e.preventDefault(); show(); }
  });
  var c = get();
  if (GA.eu && c !== "granted" && c !== "denied") show();
  if (location.hash === "#cookie-settings") show();
})();
