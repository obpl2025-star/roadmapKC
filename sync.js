(function () {
  var c = window.APP_CONFIG || {};
  if (!window.supabase || !c.SUPABASE_URL || c.SUPABASE_URL.indexOf("YOUR") > -1) return; // без настроек работает localStorage
  var sb = supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
  var user = null, name = "", mode = "in";

  var st = document.createElement("style");
  st.textContent =
    "#auth{position:fixed;inset:0;z-index:99;background:#0f1822;display:flex;align-items:center;justify-content:center;padding:20px;font:15px/1.5 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#e8eef4}" +
    "#auth .c{width:100%;max-width:360px;background:#182533;border:1px solid #33455a;border-radius:14px;padding:24px;display:grid;gap:10px}" +
    "#auth h2{margin:0;font-size:22px}#auth p{margin:0;color:#93a3b3;font-size:13px}" +
    "#auth .t{display:flex;gap:6px}#auth .t button{flex:1;background:transparent;color:#93a3b3;border:1px solid #33455a}#auth .t button.on{background:#2f6fdb;color:#fff;border-color:#2f6fdb}" +
    "#auth input,#auth button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #33455a;background:#0f1822;color:#e8eef4}" +
    "#auth .go{background:#0e8a7d;border-color:#0e8a7d;color:#fff;font-weight:600;cursor:pointer}#auth .t button{cursor:pointer}" +
    "#auth .m{min-height:18px;font-size:13px;color:#ff7a88}#auth .m.ok{color:#5fd4b8}" +
    "#ubar{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:7;background:#182533;color:#e8eef4;border:1px solid #33455a;border-radius:20px;padding:6px 8px 6px 14px;font:13px system-ui,Arial,sans-serif;display:flex;gap:8px;align-items:center}" +
    "#ubar button{font:inherit;background:transparent;color:#93a3b3;border:1px solid #33455a;border-radius:14px;padding:2px 10px;cursor:pointer}";
  document.head.appendChild(st);

  var box = document.createElement("div");
  box.id = "auth";
  box.innerHTML =
    '<form class="c" id="af"><h2>Вход в систему</h2><p>Роадмап стажировки</p>' +
    '<div class="t"><button type="button" id="ti" class="on">Вход</button><button type="button" id="tr">Регистрация</button></div>' +
    '<input id="an" placeholder="Фамилия и имя" autocomplete="name" hidden>' +
    '<input id="ae" type="email" placeholder="Email" autocomplete="username" required>' +
    '<input id="ap" type="password" placeholder="Пароль (от 6 символов)" autocomplete="current-password" minlength="6" required>' +
    '<button class="go" id="ag">Войти</button><div class="m" id="am"></div></form>';
  document.body.appendChild(box);
  function $(i) { return document.getElementById(i); }
  function msg(t, ok) { $("am").textContent = t || ""; $("am").className = "m" + (ok ? " ok" : ""); }
  function setMode(m) {
    mode = m;
    $("ti").className = m === "in" ? "on" : ""; $("tr").className = m === "up" ? "on" : "";
    $("an").hidden = m === "in"; $("an").required = m === "up";
    $("ag").textContent = m === "in" ? "Войти" : "Зарегистрироваться"; msg("");
  }
  $("ti").onclick = function () { setMode("in"); };
  $("tr").onclick = function () { setMode("up"); };

  var done;
  var gate = new Promise(function (res) { done = res; });

  function ready(u) {
    user = u;
    name = (u.user_metadata && u.user_metadata.full_name) || u.email;
    box.hidden = true;
    var bar = document.createElement("div");
    bar.id = "ubar";
    bar.innerHTML = "<span></span><button>Выйти</button>";
    bar.firstChild.textContent = name;
    bar.lastChild.onclick = function () { sb.auth.signOut().then(function () { location.reload(); }); };
    document.body.appendChild(bar);
    sb.from("profiles").upsert({ user_id: u.id, full_name: name, email: u.email, last_seen: new Date().toISOString() })
      .then(function (r) { if (r.error) console.warn(r.error); });
    done();
  }

  $("af").onsubmit = function (e) {
    e.preventDefault();
    var em = $("ae").value.trim(), pw = $("ap").value;
    $("ag").disabled = true; msg("");
    var p = mode === "in"
      ? sb.auth.signInWithPassword({ email: em, password: pw })
      : sb.auth.signUp({ email: em, password: pw, options: { data: { full_name: $("an").value.trim() } } });
    p.then(function (r) {
      $("ag").disabled = false;
      if (r.error) {
        var t = r.error.message;
        if (/Invalid login/i.test(t)) t = "Неверный email или пароль";
        else if (/already registered/i.test(t)) t = "Этот email уже зарегистрирован — перейдите на вкладку «Вход»";
        else if (/not confirmed/i.test(t)) t = "Email не подтверждён — проверьте почту";
        return msg(t);
      }
      if (r.data.session) return ready(r.data.session.user);
      msg("Почти готово: подтвердите email по ссылке из письма и войдите.", true);
    });
  };

  sb.auth.getSession().then(function (r) {
    if (r.data.session) ready(r.data.session.user);
  });

  window.Sync = {
    load: function (rm) {
      return gate.then(function () { return sb.from("progress").select("block_id,done").eq("roadmap", rm); })
        .then(function (r) {
          if (r.error) throw r.error;
          var m = {}; r.data.forEach(function (x) { if (x.done) m[x.block_id] = 1; }); return m;
        }).catch(function (e) { console.warn(e); return null; });
    },
    save: function (rm, id, v) {
      gate.then(function () {
        return sb.from("progress").upsert(
          { user_id: user.id, roadmap: rm, block_id: id, done: v, full_name: name, updated_at: new Date().toISOString() },
          { onConflict: "user_id,roadmap,block_id" });
      }).then(function (r) { if (r && r.error) console.warn(r.error); }).catch(function (e) { console.warn(e); });
    }
  };
})();
