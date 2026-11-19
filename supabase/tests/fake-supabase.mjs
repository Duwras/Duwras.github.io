/* ==========================================================================
   Ál-Supabase kliens HELYI teszthez: a supabase-js azon részét utánozza,
   amit a vezetoi-portal/js/api.js használ, de egy PGlite (WASM Postgres)
   adatbázison, a VALÓDI migrációval és RLS-sel.

   Minden lekérdezés egy tranzakcióban fut, „authenticated” (vagy „anon”)
   szerepkörrel és a felhasználó azonosítójával a request.jwt.claims-ben —
   pont úgy, ahogy a Supabase PostgREST-je teszi. Így az RLS ugyanúgy dönt.

   Node-ban (local-test.mjs) és böngészőben (felület-teszt) is fut.
   Élesben SOHA nem kerül be: a vezetoi-portal/ nem hivatkozik rá.
   ========================================================================== */

const IDENT = /^[a-z_][a-z0-9_]*$/;
const id = (s) => {
  if (!IDENT.test(s)) throw new Error("Érvénytelen azonosító: " + s);
  return '"' + s + '"';
};
const cols = (s) => (s.trim() === "*" ? "*" : s.split(",").map((c) => id(c.trim())).join(", "));

/* PGlite eredmény → a Supabase-hez hasonló JSON (dátum szövegként, int8 számként). */
export const PGLITE_PARSERS = {
  20: (v) => Number(v), // int8
  1082: (v) => v, // date
  1114: (v) => v.replace(" ", "T"), // timestamp
  1184: (v) => {
    // timestamptz: '2026-11-19 14:00:00.12+00' → ISO
    let s = v.replace(" ", "T");
    if (/[+-]\d\d$/.test(s)) s += ":00";
    return s;
  },
};

const pgErr = (e) => ({ message: e.message, code: e.code || "", details: e.detail || null });

class Query {
  constructor(c, table) {
    this.c = c;
    this.table = table;
    this.mode = "select";
    this.cols = "*";
    this.retCols = null;
    this.wh = [];
    this.ord = [];
    this.lim = null;
    this.one = null;
  }
  select(c = "*") {
    if (this.mode === "select") this.cols = c;
    else this.retCols = c;
    return this;
  }
  insert(rows) { this.mode = "insert"; this.rows = [].concat(rows); return this; }
  upsert(rows, opt = {}) { this.mode = "upsert"; this.rows = [].concat(rows); this.conflict = opt.onConflict; return this; }
  update(patch) { this.mode = "update"; this.patch = patch; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(c, v) { this.wh.push([c, "=", v]); return this; }
  neq(c, v) { this.wh.push([c, "<>", v]); return this; }
  lt(c, v) { this.wh.push([c, "<", v]); return this; }
  lte(c, v) { this.wh.push([c, "<=", v]); return this; }
  gt(c, v) { this.wh.push([c, ">", v]); return this; }
  gte(c, v) { this.wh.push([c, ">=", v]); return this; }
  in(c, arr) { this.wh.push([c, "in", arr]); return this; }
  order(c, o = {}) { this.ord.push([c, o.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }
  then(res, rej) { return this.exec().then(res, rej); }

  async exec() {
    try {
      const types = await this.c.types(this.table);
      const P = [];
      const val = (col, v) => {
        if (types[col] === "jsonb" || types[col] === "json") v = JSON.stringify(v);
        P.push(v);
        return "$" + P.length;
      };
      const where = () => {
        if (!this.wh.length) return "";
        return " where " + this.wh.map(([c, op, v]) => {
          if (op === "in") return v.length ? `${id(c)} in (${v.map((x) => val(c, x)).join(", ")})` : "false";
          if (v === null && op === "=") return `${id(c)} is null`;
          return `${id(c)} ${op} ${val(c, v)}`;
        }).join(" and ");
      };
      const tail = () =>
        (this.ord.length ? " order by " + this.ord.map(([c, a]) => `${id(c)} ${a ? "asc" : "desc"}`).join(", ") : "") +
        (this.lim != null ? ` limit ${Number(this.lim) | 0}` : "");
      const ret = () => (this.retCols ? ` returning ${cols(this.retCols)}` : "");
      const T = "public." + id(this.table);

      let sql;
      if (this.mode === "select") {
        sql = `select ${cols(this.cols)} from ${T}${where()}${tail()}`;
      } else if (this.mode === "insert" || this.mode === "upsert") {
        const keys = [...new Set(this.rows.flatMap((r) => Object.keys(r)))];
        const values = this.rows.map((r) => "(" + keys.map((k) => (k in r ? val(k, r[k]) : "default")).join(", ") + ")");
        sql = `insert into ${T} (${keys.map(id).join(", ")}) values ${values.join(", ")}`;
        if (this.mode === "upsert") {
          const conf = String(this.conflict || "id").split(",").map((s) => s.trim());
          const upd = keys.filter((k) => !conf.includes(k));
          sql += ` on conflict (${conf.map(id).join(", ")}) ` +
            (upd.length ? `do update set ${upd.map((k) => `${id(k)} = excluded.${id(k)}`).join(", ")}` : "do nothing");
        }
        sql += ret();
      } else if (this.mode === "update") {
        const sets = Object.entries(this.patch).map(([k, v]) => `${id(k)} = ${val(k, v)}`);
        sql = `update ${T} set ${sets.join(", ")}${where()}${ret()}`;
      } else {
        sql = `delete from ${T}${where()}${ret()}`;
      }

      const r = await this.c.run(sql, P);
      let data = this.mode === "select" || this.retCols ? r.rows : null;
      if (this.one && data) {
        if (data.length === 1) data = data[0];
        else if (!data.length && this.one === "maybe") data = null;
        else return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
      }
      return { data, error: null };
    } catch (e) {
      return { data: null, error: pgErr(e) };
    }
  }
}

export function createFakeSupabase(db, { users = [], blobs = new Map(), store = null, storeKey = "fake-sb-session" } = {}) {
  let session = null;
  if (store) {
    try { session = JSON.parse(store.getItem(storeKey)) || null; } catch { session = null; }
  }
  const listeners = new Set();
  const emit = (ev) => { for (const cb of listeners) cb(ev, session); };
  const save = () => { if (store) { if (session) store.setItem(storeKey, JSON.stringify(session)); else store.removeItem(storeKey); } };
  const typeCache = new Map();

  const c = {
    db,
    users,
    blobs,
    async types(table) {
      if (!typeCache.has(table)) {
        const r = await db.query(
          "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1",
          [table]
        );
        typeCache.set(table, Object.fromEntries(r.rows.map((x) => [x.column_name, x.data_type])));
      }
      return typeCache.get(table);
    },
    async run(sql, params = []) {
      const uid = session?.user?.id || null;
      return db.transaction(async (tx) => {
        await tx.exec(`set local role ${uid ? "authenticated" : "anon"}`);
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
        ]);
        return tx.query(sql, params);
      });
    },
  };

  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    async getUser() { return { data: { user: session?.user || null }, error: null }; },
    onAuthStateChange(cb) {
      listeners.add(cb);
      queueMicrotask(() => cb("INITIAL_SESSION", session));
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signInWithPassword({ email, password }) {
      const u = users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      if (!u || u.password !== password) return { data: { session: null, user: null }, error: { message: "Invalid login credentials", status: 400 } };
      session = { access_token: "fake." + u.id, user: { id: u.id, email: u.email } };
      save();
      emit("SIGNED_IN");
      return { data: { session, user: session.user }, error: null };
    },
    async signOut() { session = null; save(); emit("SIGNED_OUT"); return { error: null }; },
    async resetPasswordForEmail() { return { data: {}, error: null }; },
    async updateUser({ password }) {
      const u = session && users.find((x) => x.id === session.user.id);
      if (!u) return { data: { user: null }, error: { message: "Auth session missing!" } };
      if (password) u.password = password;
      emit("USER_UPDATED");
      return { data: { user: session.user }, error: null };
    },
  };

  const storage = {
    from(bucket) {
      return {
        async upload(path, file, opt = {}) {
          try {
            const b = (await db.query("select * from storage.buckets where id = $1", [bucket])).rows[0];
            const size = file.size ?? file.byteLength ?? 0;
            const type = opt.contentType || file.type || "";
            if (!b) return { data: null, error: { message: "Bucket not found", statusCode: "404" } };
            if (b.file_size_limit && size > Number(b.file_size_limit)) return { data: null, error: { message: "The object exceeded the maximum allowed size", statusCode: "413" } };
            if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) return { data: null, error: { message: `mime type ${type} is not supported`, statusCode: "415" } };
            await c.run("insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3)", [bucket, path, JSON.stringify({ size, mimetype: type })]);
            blobs.set(bucket + "/" + path, file);
            return { data: { path }, error: null };
          } catch (e) {
            return { data: null, error: { message: e.message, statusCode: "403" } };
          }
        },
        async createSignedUrl(path, expiresIn) {
          const r = await c.run("select name from storage.objects where bucket_id = $1 and name = $2", [bucket, path]);
          if (!r.rows.length) return { data: null, error: { message: "Object not found", statusCode: "404" } };
          const blob = blobs.get(bucket + "/" + path);
          const browser = typeof Blob !== "undefined" && blob instanceof Blob && typeof URL.createObjectURL === "function";
          return { data: { signedUrl: browser ? URL.createObjectURL(blob) : `fake://signed/${bucket}/${path}?expiresIn=${expiresIn}` }, error: null };
        },
        async remove(paths) {
          if (!paths.length) return { data: [], error: null };
          const ph = paths.map((_, i) => "$" + (i + 2)).join(", ");
          const r = await c.run(`delete from storage.objects where bucket_id = $1 and name in (${ph}) returning name`, [bucket, ...paths]);
          for (const x of r.rows) blobs.delete(bucket + "/" + x.name);
          return { data: r.rows.map((x) => ({ name: x.name })), error: null };
        },
      };
    },
  };

  /* Edge Function utánzat: csak admin hívhatja; a meghívás új Auth-felhasználót
     szúr be (a profilt a migráció triggere hozza létre). */
  const functions = {
    async invoke(name, { body } = {}) {
      const fail = (msg) => ({ data: null, error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ error: msg }) } } });
      if (name !== "vezeto-admin") return fail("Ismeretlen függvény.");
      const adm = (await c.run("select app.is_admin() as a")).rows[0]?.a;
      if (!adm) return fail("Csak admin teheti meg.");
      if (body.action === "invite") {
        if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) return fail("Ez az e-mail-cím már szerepel.");
        const r = await db.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [body.email, JSON.stringify({ nev: body.nev })]);
        users.push({ id: r.rows[0].id, email: body.email, password: "meghivo-" + Math.random().toString(36).slice(2) });
        return { data: { ok: true, user_id: r.rows[0].id }, error: null };
      }
      if (body.action === "disable" || body.action === "enable") return { data: { ok: true }, error: null };
      return fail("Ismeretlen művelet.");
    },
  };

  return {
    auth,
    storage,
    functions,
    from: (table) => new Query(c, table),
    async rpc(fn, args = {}) {
      try {
        const keys = Object.keys(args);
        const r = await c.run(
          `select * from public.${id(fn)}(${keys.map((k, i) => `${id(k)} => $${i + 1}`).join(", ")}) as r`,
          keys.map((k) => args[k])
        );
        const row = r.rows[0];
        return { data: row ? Object.values(row)[0] : null, error: null };
      } catch (e) {
        return { data: null, error: pgErr(e) };
      }
    },
    _internal: c,
  };
}
