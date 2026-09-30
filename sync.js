(function () {
  var c = window.APP_CONFIG || {};
  if (!window.supabase || !c.SUPABASE_URL || c.SUPABASE_URL.indexOf("YOUR") > -1) return; // без настроек работает localStorage
  var sb = supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
  var ready = null, name = null;
  try { name = localStorage.getItem("full_name"); } catch (e) {}
  function init() {
    if (ready) return ready;
    ready = sb.auth.getSession().then(function (r) {
      if (r.data.session) return r.data.session.user;
      return sb.auth.signInAnonymously().then(function (x) { if (x.error) throw x.error; return x.data.user; });
    }).then(function (u) {
      if (!name) {
        name = (prompt("Введите фамилию и имя (увидит наставник)") || "").trim();
        try { localStorage.setItem("full_name", name); } catch (e) {}
      }
      return sb.from("profiles").upsert({ user_id: u.id, full_name: name, last_seen: new Date().toISOString() })
        .then(function () { return u; }, function () { return u; });
    });
    return ready;
  }
  window.Sync = {
    load: function (rm) {
      return init().then(function () { return sb.from("progress").select("block_id,done").eq("roadmap", rm); })
        .then(function (r) {
          if (r.error) throw r.error;
          var m = {}; r.data.forEach(function (x) { if (x.done) m[x.block_id] = 1; }); return m;
        }).catch(function (e) { console.warn(e); return null; });
    },
    save: function (rm, id, v) {
      init().then(function (u) {
        return sb.from("progress").upsert(
          { user_id: u.id, roadmap: rm, block_id: id, done: v, full_name: name, updated_at: new Date().toISOString() },
          { onConflict: "user_id,roadmap,block_id" });
      }).then(function (r) { if (r && r.error) console.warn(r.error); }).catch(function (e) { console.warn(e); });
    }
  };
})();
